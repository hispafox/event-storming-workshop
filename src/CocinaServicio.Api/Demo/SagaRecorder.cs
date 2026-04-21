using System.Collections.Concurrent;

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

public interface ISagaRecorder
{
    void Registrar(Guid correlationId, TipoRegistro tipo, string nombre, object? payload);
    void MarcarCompletado(Guid correlationId, string outcome);
    Grabacion? Obtener(Guid correlationId);
    IReadOnlyList<Guid> ListarRecientes(int count = 10);
}

public class SagaRecorder : ISagaRecorder
{
    private readonly ConcurrentDictionary<Guid, List<RegistroEvento>> _eventos = new();
    private readonly ConcurrentDictionary<Guid, DateTime> _inicios = new();
    private readonly ConcurrentDictionary<Guid, string> _outcomes = new();
    private readonly object _lock = new();

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
    }

    public void MarcarCompletado(Guid correlationId, string outcome)
    {
        _outcomes[correlationId] = outcome;
        Registrar(correlationId, TipoRegistro.Completado, outcome, null);
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

    public IReadOnlyList<Guid> ListarRecientes(int count = 10) =>
        _inicios.OrderByDescending(kv => kv.Value).Take(count).Select(kv => kv.Key).ToList();

    private static string ResolverModulo(string nombre) => nombre switch
    {
        "DecidirMenu" or "MenuDecidido" => "MenuPlanning",
        "CocinarComida" or "ComidaPreparada" or "ComidaQuemada" => "Kitchen",
        "RerouteDestino" or "DestinoNoDisponible" => "Routing",
        "PrepararBandeja" or "BandejaComedorPreparada" or "BandejaCamaPreparada" or "BandejaNoDisponible" or "MantenerCaliente" or "RetornarBandeja" => "TrayAssembly",
        "LlevarBandeja" or "ComidaServidaEnComedor" or "ComidaServidaEnCama" or "DerrameEnTransporte" or "ComidaConsumida" => "Delivery",
        "IniciarLimpieza" or "BandejaRecogida" or "CocinaDespejada" => "Cleanup",
        "DescartarComida" => "Kitchen",
        _ => "Unknown"
    };
}
