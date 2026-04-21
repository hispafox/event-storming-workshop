using CocinaServicio.Api.Hubs;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

namespace CocinaServicio.Api.Messaging;

public class SignalRSendObserver : ISendObserver
{
    private readonly IHubContext<CocinaHub> _hub;

    public SignalRSendObserver(IHubContext<CocinaHub> hub) => _hub = hub;

    public async Task PreSend<T>(SendContext<T> context) where T : class
    {
        await Task.CompletedTask;
    }

    public async Task PostSend<T>(SendContext<T> context) where T : class
    {
        var commandName = typeof(T).Name;
        var correlationId = context.CorrelationId ?? Guid.Empty;

        await _hub.Clients.All.SendAsync(
            "EventoPublicado",
            $"Command: {commandName}",
            context.Message,
            correlationId.ToString());
    }

    public async Task SendFault<T>(SendContext<T> context, Exception exception) where T : class
    {
        await Task.CompletedTask;
    }
}
