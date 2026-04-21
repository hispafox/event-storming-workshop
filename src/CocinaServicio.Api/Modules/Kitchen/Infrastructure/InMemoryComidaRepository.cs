using CocinaServicio.Api.Modules.Kitchen.Domain;
using System.Collections.Concurrent;

namespace CocinaServicio.Api.Modules.Kitchen.Infrastructure;

public interface IComidaRepository
{
    Task<Comida?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Comida comida, CancellationToken ct = default);
}

public class InMemoryComidaRepository : IComidaRepository
{
    private readonly ConcurrentDictionary<Guid, Comida> _store = new();

    public async Task<Comida?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        await Task.Yield();
        return _store.GetValueOrDefault(id);
    }

    public async Task AddAsync(Comida comida, CancellationToken ct = default)
    {
        await Task.Yield();
        _store[comida.Id] = comida;
    }
}
