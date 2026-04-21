namespace CocinaServicio.Contracts.Events;

public record CatalogoConsultado(Guid MenuId, int PlatosPosibles, DateTime Cuando);

public record NeveraConsultada(Guid MenuId, int IngredientesDisponibles, DateTime Cuando);

public record HornoEncendido(Guid MenuId, DateTime Cuando);
public record HornoApagado(Guid MenuId, DateTime Cuando);

public record LavavajillasIniciado(Guid BandejaId, DateTime Cuando);
public record LavavajillasTerminado(Guid BandejaId, DateTime Cuando);
