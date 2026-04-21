using CocinaServicio.Api.Demo;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using MassTransit;

namespace CocinaServicio.Api.Modules.Cleanup.Application;

public class IniciarLimpiezaConsumer : IConsumer<IniciarLimpieza>
{
    private readonly ISagaRecorder _recorder;
    private readonly ILogger<IniciarLimpiezaConsumer> _logger;

    public IniciarLimpiezaConsumer(ISagaRecorder recorder, ILogger<IniciarLimpiezaConsumer> logger)
    {
        _recorder = recorder;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<IniciarLimpieza> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Iniciando limpieza de bandeja {BandejaId}", msg.BandejaId);

        var cid = context.CorrelationId ?? msg.BandejaId;

        await context.PublishYGrabar(new LavavajillasIniciado(msg.BandejaId, DateTime.UtcNow), _recorder, cid);

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);

        await context.PublishYGrabar(new LavavajillasTerminado(msg.BandejaId, DateTime.UtcNow), _recorder, cid);

        var bandejaUsadaId = Guid.NewGuid();
        await context.PublishYGrabar(new BandejaRecogida(bandejaUsadaId, msg.BandejaId), _recorder, cid);

        await context.PublishYGrabar(
            new CocinaDespejada(Guid.NewGuid(), bandejaUsadaId, DateTime.UtcNow),
            _recorder, cid);
    }
}
