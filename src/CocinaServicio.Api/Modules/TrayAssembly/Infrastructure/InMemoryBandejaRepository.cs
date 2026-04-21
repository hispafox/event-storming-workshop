using System.Collections.Concurrent;

namespace CocinaServicio.Api.Modules.TrayAssembly.Infrastructure;

public interface IBandejaRepository
{
    Task AddAsync(object bandeja, CancellationToken ct = default);
}

public class InMemoryBandejaRepository : IBandejaRepository
{
    private readonly ConcurrentDictionary<Guid, object> _store = new();

    public async Task AddAsync(object bandeja, CancellationToken ct = default)
    {
        await Task.Yield();
        var idProp = bandeja.GetType().GetProperty("Id");
        if (idProp?.GetValue(bandeja) is Guid id)
            _store[id] = bandeja;
    }
}
