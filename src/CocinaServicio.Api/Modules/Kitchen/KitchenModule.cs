using CocinaServicio.Api.Modules.Kitchen.Infrastructure;

namespace CocinaServicio.Api.Modules.Kitchen;

public static class KitchenModule
{
    public static IServiceCollection AddKitchenModule(this IServiceCollection services)
    {
        services.AddSingleton<IComidaRepository, InMemoryComidaRepository>();
        return services;
    }
}
