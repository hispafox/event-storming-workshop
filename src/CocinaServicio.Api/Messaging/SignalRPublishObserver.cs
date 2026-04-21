using CocinaServicio.Api.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

namespace CocinaServicio.Api.Messaging;

public class SignalRPublishObserver : IPublishObserver
{
    private readonly IHubContext<CocinaHub> _hub;

    public SignalRPublishObserver(IHubContext<CocinaHub> hub) => _hub = hub;

    public async Task PrePublish<T>(PublishContext<T> context) where T : class
    {
        await Task.CompletedTask;
    }

    public async Task PostPublish<T>(PublishContext<T> context) where T : class
    {
        var eventName = typeof(T).Name;
        var correlationId = context.CorrelationId ?? Guid.Empty;
        var moduleName = ResolverModulo(eventName);

        await _hub.Clients.All.SendAsync("ServicioActivado", moduleName, correlationId.ToString());
        await _hub.Clients.All.SendAsync("EventoPublicado", eventName, context.Message, correlationId.ToString());

        if (EsCompensacion(eventName))
            await _hub.Clients.All.SendAsync("CompensacionEjecutada", correlationId.ToString(), eventName);
    }

    public async Task PublishFault<T>(PublishContext<T> context, Exception exception) where T : class
    {
        await Task.CompletedTask;
    }

    private static string ResolverModulo(string eventName) => eventName switch
    {
        "MenuDecidido" => "MenuPlanning",
        "ComidaPreparada" or "ComidaQuemada" => "Kitchen",
        "BandejaComedorPreparada" or "BandejaCamaPreparada" or "BandejaNoDisponible" => "TrayAssembly",
        "ComidaServidaEnComedor" or "ComidaServidaEnCama" or "DerrameEnTransporte" => "Delivery",
        "ComidaConsumida" => "Delivery",
        "BandejaRecogida" or "CocinaDespejada" => "Cleanup",
        "DestinoNoDisponible" => "Routing",
        _ => "Unknown"
    };

    private static bool EsCompensacion(string eventName) =>
        eventName is "ComidaQuemada" or "DestinoNoDisponible" or "BandejaNoDisponible" or "DerrameEnTransporte";
}
