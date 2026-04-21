using CocinaServicio.Api.Demo;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Modules.Delivery.Application;

public class LlevarBandejaConsumer : IConsumer<LlevarBandeja>
{
    private readonly IFailureInjector _failureInjector;
    private readonly ISagaRecorder _recorder;
    private readonly ILogger<LlevarBandejaConsumer> _logger;

    public LlevarBandejaConsumer(IFailureInjector failureInjector, ISagaRecorder recorder, ILogger<LlevarBandejaConsumer> logger)
    {
        _failureInjector = failureInjector;
        _recorder = recorder;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<LlevarBandeja> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Llevando bandeja {BandejaId} a {Destino}", msg.BandejaId, msg.Destino);

        var cid = context.CorrelationId ?? msg.BandejaId;

        if (_failureInjector.DebeFallar("Delivering", out _))
        {
            _failureInjector.Consumir("Delivering");
            await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);
            await context.PublishYGrabar(new DerrameEnTransporte(msg.BandejaId, msg.Destino), _recorder, cid);
            return;
        }

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);

        var ahora = DateTime.UtcNow;
        if (msg.Destino == Destino.Comedor)
            await context.PublishYGrabar(new ComidaServidaEnComedor(msg.BandejaId, ahora), _recorder, cid);
        else
            await context.PublishYGrabar(new ComidaServidaEnCama(msg.BandejaId, ahora), _recorder, cid);

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);
        await context.PublishYGrabar(new ComidaConsumida(msg.BandejaId, DateTime.UtcNow), _recorder, cid);
    }
}
