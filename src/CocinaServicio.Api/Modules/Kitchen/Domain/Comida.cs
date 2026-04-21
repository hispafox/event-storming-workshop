using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Api.Modules.Kitchen.Domain;

public class Comida
{
    public Guid Id { get; }
    public Guid MenuId { get; }
    public List<Plato> Platos { get; }
    public EstadoComida Estado { get; private set; }
    public int TemperaturaCelsius { get; private set; }

    public Comida(Guid menuId, List<Plato> platos)
    {
        Id = Guid.NewGuid();
        MenuId = menuId;
        Platos = platos;
        Estado = EstadoComida.Emplatado;
        TemperaturaCelsius = 75;
    }
}
