using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using MassTransit;

namespace CocinaServicio.Api.Modules.Cleanup.Application;

public class IniciarLimpiezaConsumer : IConsumer<IniciarLimpieza>
{
    private readonly ILogger<IniciarLimpiezaConsumer> _logger;

    public IniciarLimpiezaConsumer(ILogger<IniciarLimpiezaConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<IniciarLimpieza> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Iniciando limpieza de bandeja {BandejaId}", msg.BandejaId);

        await Task.Delay(TimeSpan.FromSeconds(2), context.CancellationToken);

        var bandejaUsadaId = Guid.NewGuid();
        await context.Publish(new BandejaRecogida(bandejaUsadaId, msg.BandejaId), context.CancellationToken);

        await context.Publish(
            new CocinaDespejada(Guid.NewGuid(), bandejaUsadaId, DateTime.UtcNow),
            context.CancellationToken);
    }
}
