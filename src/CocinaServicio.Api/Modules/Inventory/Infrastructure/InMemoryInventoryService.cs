using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Api.Modules.Inventory.Infrastructure;

public interface IInventoryService
{
    Task<List<Plato>> GetPlatosPorDefectoAsync(bool conBebida, CancellationToken ct = default);
    Task<List<Plato>> GetAllPlatosAsync(CancellationToken ct = default);
}

public class InMemoryInventoryService : IInventoryService
{
    private readonly List<Plato> _catalogo;

    public InMemoryInventoryService(List<Plato> catalogo) => _catalogo = catalogo;

    public async Task<List<Plato>> GetPlatosPorDefectoAsync(bool conBebida, CancellationToken ct = default)
    {
        await Task.Yield();
        var seleccion = new List<Plato>
        {
            _catalogo.First(p => p.Tipo == TipoPlato.Entrante),
            _catalogo.First(p => p.Tipo == TipoPlato.Principal),
            _catalogo.First(p => p.Tipo == TipoPlato.Postre)
        };

        if (conBebida)
            seleccion.Add(_catalogo.First(p => p.Tipo == TipoPlato.Bebida));

        return seleccion;
    }

    public async Task<List<Plato>> GetAllPlatosAsync(CancellationToken ct = default)
    {
        await Task.Yield();
        return _catalogo.ToList();
    }
}
