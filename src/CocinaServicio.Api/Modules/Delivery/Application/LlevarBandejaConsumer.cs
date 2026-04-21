using CocinaServicio.Api.Demo;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Modules.Delivery.Application;

public class LlevarBandejaConsumer : IConsumer<LlevarBandeja>
{
    private readonly IFailureInjector _failureInjector;
    private readonly ILogger<LlevarBandejaConsumer> _logger;

    public LlevarBandejaConsumer(IFailureInjector failureInjector, ILogger<LlevarBandejaConsumer> logger)
    {
        _failureInjector = failureInjector;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<LlevarBandeja> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Llevando bandeja {BandejaId} a {Destino}", msg.BandejaId, msg.Destino);

        if (_failureInjector.DebeFallar("Delivering", out _))
        {
            _failureInjector.Consumir("Delivering");
            await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);
            await context.Publish(new DerrameEnTransporte(msg.BandejaId, msg.Destino), context.CancellationToken);
            return;
        }

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);

        var ahora = DateTime.UtcNow;
        if (msg.Destino == Destino.Comedor)
            await context.Publish(new ComidaServidaEnComedor(msg.BandejaId, ahora), context.CancellationToken);
        else
            await context.Publish(new ComidaServidaEnCama(msg.BandejaId, ahora), context.CancellationToken);

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);
        await context.Publish(new ComidaConsumida(msg.BandejaId, DateTime.UtcNow), context.CancellationToken);
    }
}
