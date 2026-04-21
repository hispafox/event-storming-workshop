using CocinaServicio.Api.Modules.Inventory.Infrastructure;
using CocinaServicio.Contracts.ValueObjects;

namespace CocinaServicio.Api.Modules.Inventory;

public static class InventoryModule
{
    public static IServiceCollection AddInventoryModule(this IServiceCollection services)
    {
        services.AddSingleton<IInventoryService>(new InMemoryInventoryService(PlatosIniciales()));
        return services;
    }

    public static void MapInventoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/inventory");

        group.MapGet("/", async (IInventoryService inventory, CancellationToken ct) =>
        {
            var platos = await inventory.GetAllPlatosAsync(ct);
            return Results.Ok(new { ingredientes = new List<string>(), platosPosibles = platos });
        });

        group.MapGet("/platos-posibles", async (IInventoryService inventory, CancellationToken ct) =>
        {
            var platos = await inventory.GetAllPlatosAsync(ct);
            return Results.Ok(platos);
        });
    }

    private static List<Plato> PlatosIniciales() => new()
    {
        new("Ensalada César", TipoPlato.Entrante, EsLiquido: false),
        new("Crema de calabaza", TipoPlato.Entrante, EsLiquido: true),
        new("Lubina al horno", TipoPlato.Principal, EsLiquido: false),
        new("Pollo asado", TipoPlato.Principal, EsLiquido: false),
        new("Pasta carbonara", TipoPlato.Principal, EsLiquido: false),
        new("Tarta de queso", TipoPlato.Postre, EsLiquido: false),
        new("Agua mineral", TipoPlato.Bebida, EsLiquido: true),
        new("Vino tinto", TipoPlato.Bebida, EsLiquido: true),
        new("Café", TipoPlato.Bebida, EsLiquido: true)
    };
}
