namespace CocinaServicio.Contracts.Commands;

public record DescartarComida(Guid CorrelationId, Guid ComidaId, string Razon);
public record RerouteDestino(Guid CorrelationId, CocinaServicio.Contracts.ValueObjects.Destino DestinoAlternativo);
public record MantenerCaliente(Guid CorrelationId, Guid ComidaId);
public record RetornarBandeja(Guid CorrelationId, Guid BandejaId);
