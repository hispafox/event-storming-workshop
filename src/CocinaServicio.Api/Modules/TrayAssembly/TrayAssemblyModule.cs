using CocinaServicio.Api.Modules.TrayAssembly.Infrastructure;

namespace CocinaServicio.Api.Modules.TrayAssembly;

public static class TrayAssemblyModule
{
    public static IServiceCollection AddTrayAssemblyModule(this IServiceCollection services)
    {
        services.AddSingleton<IBandejaRepository, InMemoryBandejaRepository>();
        return services;
    }
}
