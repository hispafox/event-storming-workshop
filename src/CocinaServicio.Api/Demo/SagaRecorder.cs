using System.Collections.Concurrent;
using System.Text.Json;

namespace CocinaServicio.Api.Demo;

public enum TipoRegistro { ComandoEnviado, EventoPublicado, Completado }

public record RegistroEvento(
    DateTime TimestampUtc,
    TipoRegistro Tipo,
    string Nombre,
    string Modulo,
    object? Payload);

public record Grabacion(
    Guid CorrelationId,
    DateTime InicioUtc,
    bool Completado,
    string? Outcome,
    IReadOnlyList<RegistroEvento> Eventos);

public record GrabacionResumen(
    Guid CorrelationId,
    DateTime InicioUtc,
    bool Completado,
    string? Outcome,
    int EventosCount,
    double DuracionSegundos,
    string? Etiqueta);

public interface ISagaRecorder
{
    void Registrar(Guid correlationId, TipoRegistro tipo, string nombre, object? payload);
    void MarcarCompletado(Guid correlationId, string outcome);
    Grabacion? Obtener(Guid correlationId);
    IReadOnlyList<GrabacionResumen> Listar();
    bool Borrar(Guid correlationId);
    bool Etiquetar(Guid correlationId, string etiqueta);
}

public class SagaRecorder : ISagaRecorder, IDisposable
{
    private readonly ConcurrentDictionary<Guid, List<RegistroEvento>> _eventos = new();
    private readonly ConcurrentDictionary<Guid, DateTime> _inicios = new();
    private readonly ConcurrentDictionary<Guid, string> _outcomes = new();
    private readonly ConcurrentDictionary<Guid, string> _etiquetas = new();
    private readonly HashSet<Guid> _persistidos = new();
    private readonly object _lock = new();
    private readonly string _carpeta;
    private readonly ILogger<SagaRecorder> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public SagaRecorder(ILogger<SagaRecorder> logger)
    {
        _logger = logger;
        _carpeta = Path.Combine(AppContext.BaseDirectory, "grabaciones");
        Directory.CreateDirectory(_carpeta);
        CargarDelDisco();
    }

    public void Registrar(Guid correlationId, TipoRegistro tipo, string nombre, object? payload)
    {
        if (correlationId == Guid.Empty) return;

        _inicios.TryAdd(correlationId, DateTime.UtcNow);

        var lista = _eventos.GetOrAdd(correlationId, _ => new List<RegistroEvento>());
        lock (_lock)
        {
            lista.Add(new RegistroEvento(
                DateTime.UtcNow,
                tipo,
                nombre,
                ResolverModulo(nombre),
                payload));
        }

        if (tipo == TipoRegistro.EventoPublicado && nombre == "CocinaDespejada")
        {
            MarcarCompletado(correlationId, "Success");
            return;
        }

        Persistir(correlationId);
    }

    public void MarcarCompletado(Guid correlationId, string outcome)
    {
        if (_outcomes.ContainsKey(correlationId)) return;
        _outcomes[correlationId] = outcome;
        var lista = _eventos.GetOrAdd(correlationId, _ => new List<RegistroEvento>());
        lock (_lock)
        {
            lista.Add(new RegistroEvento(DateTime.UtcNow, TipoRegistro.Completado, outcome, "—", null));
        }
        Persistir(correlationId);
    }

    public Grabacion? Obtener(Guid correlationId)
    {
        if (!_eventos.TryGetValue(correlationId, out var lista)) return null;
        var inicio = _inicios.GetValueOrDefault(correlationId, DateTime.UtcNow);
        var outcome = _outcomes.GetValueOrDefault(correlationId);
        List<RegistroEvento> snapshot;
        lock (_lock) { snapshot = lista.ToList(); }
        return new Grabacion(correlationId, inicio, outcome is not null, outcome, snapshot);
    }

    public IReadOnlyList<GrabacionResumen> Listar()
    {
        var resultado = new List<GrabacionResumen>();
        foreach (var kv in _inicios)
        {
            if (!_eventos.TryGetValue(kv.Key, out var lista)) continue;
            List<RegistroEvento> snapshot;
            lock (_lock) { snapshot = lista.ToList(); }
            var duracion = snapshot.Count > 0
                ? (snapshot[^1].TimestampUtc - kv.Value).TotalSeconds
                : 0;
            resultado.Add(new GrabacionResumen(
                kv.Key,
                kv.Value,
                _outcomes.ContainsKey(kv.Key),
                _outcomes.GetValueOrDefault(kv.Key),
                snapshot.Count,
                duracion,
                _etiquetas.GetValueOrDefault(kv.Key)));
        }
        return resultado.OrderByDescending(r => r.InicioUtc).ToList();
    }

    public bool Borrar(Guid correlationId)
    {
        var habia = _eventos.TryRemove(correlationId, out _);
        _inicios.TryRemove(correlationId, out _);
        _outcomes.TryRemove(correlationId, out _);
        _etiquetas.TryRemove(correlationId, out _);
        lock (_lock) { _persistidos.Remove(correlationId); }

        var archivo = RutaArchivo(correlationId);
        if (File.Exists(archivo))
        {
            try { File.Delete(archivo); } catch (Exception ex) { _logger.LogWarning(ex, "Error borrando grabación {Id}", correlationId); }
        }
        return habia;
    }

    public bool Etiquetar(Guid correlationId, string etiqueta)
    {
        if (!_eventos.ContainsKey(correlationId)) return false;
        _etiquetas[correlationId] = etiqueta;
        Persistir(correlationId);
        return true;
    }

    public void Dispose() { }

    private string RutaArchivo(Guid id) => Path.Combine(_carpeta, $"{id:N}.json");

    private void Persistir(Guid correlationId)
    {
        var grab = Obtener(correlationId);
        if (grab is null) return;

        var persistible = new PersistedGrabacion(
            grab.CorrelationId,
            grab.InicioUtc,
            grab.Completado,
            grab.Outcome,
            _etiquetas.GetValueOrDefault(correlationId),
            grab.Eventos.Select(e => new PersistedEvento(
                e.TimestampUtc, e.Tipo, e.Nombre, e.Modulo,
                e.Payload is null ? null : JsonSerializer.SerializeToElement(e.Payload, JsonOpts)
            )).ToList());

        try
        {
            var json = JsonSerializer.Serialize(persistible, JsonOpts);
            File.WriteAllText(RutaArchivo(correlationId), json);
            lock (_lock) { _persistidos.Add(correlationId); }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error persistiendo grabación {Id}", correlationId);
        }
    }

    private void CargarDelDisco()
    {
        if (!Directory.Exists(_carpeta)) return;
        var archivos = Directory.GetFiles(_carpeta, "*.json");
        foreach (var archivo in archivos)
        {
            try
            {
                var json = File.ReadAllText(archivo);
                var p = JsonSerializer.Deserialize<PersistedGrabacion>(json, JsonOpts);
                if (p is null) continue;

                _inicios[p.CorrelationId] = p.InicioUtc;
                if (p.Outcome is not null) _outcomes[p.CorrelationId] = p.Outcome;
                if (p.Etiqueta is not null) _etiquetas[p.CorrelationId] = p.Etiqueta;

                var eventos = p.Eventos.Select(e => new RegistroEvento(
                    e.TimestampUtc, e.Tipo, e.Nombre, e.Modulo,
                    e.Payload is null ? null : (object)e.Payload.Value
                )).ToList();
                _eventos[p.CorrelationId] = eventos;
                _persistidos.Add(p.CorrelationId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error cargando grabación de {Archivo}", archivo);
            }
        }
        _logger.LogInformation("Cargadas {Cuantas} grabaciones del disco", archivos.Length);
    }

    private record PersistedGrabacion(
        Guid CorrelationId,
        DateTime InicioUtc,
        bool Completado,
        string? Outcome,
        string? Etiqueta,
        List<PersistedEvento> Eventos);

    private record PersistedEvento(
        DateTime TimestampUtc,
        TipoRegistro Tipo,
        string Nombre,
        string Modulo,
        JsonElement? Payload);

    private static string ResolverModulo(string nombre) => nombre switch
    {
        "DecidirMenu" or "MenuDecidido" => "MenuPlanning",
        "CocinarComida" or "ComidaPreparada" or "ComidaQuemada" or "DescartarComida" => "Kitchen",
        "RerouteDestino" or "DestinoNoDisponible" => "Routing",
        "PrepararBandeja" or "BandejaComedorPreparada" or "BandejaCamaPreparada" or "BandejaNoDisponible" or "MantenerCaliente" or "RetornarBandeja" => "TrayAssembly",
        "LlevarBandeja" or "ComidaServidaEnComedor" or "ComidaServidaEnCama" or "DerrameEnTransporte" or "ComidaConsumida" => "Delivery",
        "IniciarLimpieza" or "BandejaRecogida" or "CocinaDespejada" => "Cleanup",
        "NeveraConsultada" => "Nevera",
        "HornoEncendido" or "HornoApagado" => "Horno",
        "LavavajillasIniciado" or "LavavajillasTerminado" => "Lavavajillas",
        _ => "Unknown"
    };
}
