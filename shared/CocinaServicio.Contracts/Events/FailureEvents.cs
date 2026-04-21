using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Contracts.Events;

public record ComidaQuemada(Guid MenuId, Guid ComidaId, string Razon);
public record DestinoNoDisponible(Guid ComidaId, Destino DestinoIntentado);
public record BandejaNoDisponible(Guid ComidaId, Destino Destino);
public record DerrameEnTransporte(Guid BandejaId, Destino Destino);
