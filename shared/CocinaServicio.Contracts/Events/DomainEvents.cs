using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Contracts.Events;

public record MenuDecidido(Guid MenuId, List<Plato> Platos, Destino DestinoPreferido);
public record ComidaPreparada(Guid ComidaId, Guid MenuId, Destino DestinoPreferido, bool TieneBebida);
public record BandejaComedorPreparada(Guid BandejaId, Guid ComidaId);
public record BandejaCamaPreparada(Guid BandejaId, Guid ComidaId, bool TapaLiquidos);
public record ComidaServidaEnComedor(Guid BandejaId, DateTime ServidaAt);
public record ComidaServidaEnCama(Guid BandejaId, DateTime ServidaAt);
public record ComidaConsumida(Guid BandejaId, DateTime ConsumidaAt);
public record BandejaRecogida(Guid BandejaUsadaId, Guid BandejaOrigenId);
public record CocinaDespejada(Guid CicloId, Guid BandejaUsadaId, DateTime CompletadoAt);
