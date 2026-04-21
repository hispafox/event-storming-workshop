using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Contracts.Commands;

public record DecidirMenu(Guid CorrelationId, Destino DestinoPreferido, List<Plato> PlatosDeseados);
public record CocinarComida(Guid CorrelationId, Guid MenuId, List<Plato> Platos);
public record PrepararBandeja(Guid CorrelationId, Guid ComidaId, Destino Destino, bool TieneBebida);
public record LlevarBandeja(Guid CorrelationId, Guid BandejaId, Destino Destino);
public record IniciarLimpieza(Guid CorrelationId, Guid BandejaId);
