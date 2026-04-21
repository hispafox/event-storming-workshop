using CocinaServicio.Api.Demo;
using CocinaServicio.Api.Modules.TrayAssembly.Domain;
using CocinaServicio.Api.Modules.TrayAssembly.Infrastructure;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Modules.TrayAssembly.Application;

public class PrepararBandejaConsumer : IConsumer<PrepararBandeja>
{
    private readonly IBandejaRepository _repository;
    private readonly IFailureInjector _failureInjector;
    private readonly ISagaRecorder _recorder;
    private readonly ILogger<PrepararBandejaConsumer> _logger;

    public PrepararBandejaConsumer(
        IBandejaRepository repository,
        IFailureInjector failureInjector,
        ISagaRecorder recorder,
        ILogger<PrepararBandejaConsumer> logger)
    {
        _repository = repository;
        _failureInjector = failureInjector;
        _recorder = recorder;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PrepararBandeja> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Preparando bandeja para comida {ComidaId}, destino {Destino}", msg.ComidaId, msg.Destino);

        var cid = context.CorrelationId ?? msg.ComidaId;

        if (_failureInjector.DebeFallar("AssemblingTray", out _))
        {
            _failureInjector.Consumir("AssemblingTray");
            await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);
            await context.PublishYGrabar(new BandejaNoDisponible(msg.ComidaId, msg.Destino), _recorder, cid);
            return;
        }

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);

        if (msg.Destino == Destino.Comedor)
        {
            var bandeja = BandejaComedor.Crear(msg.ComidaId);
            await _repository.AddAsync(bandeja, context.CancellationToken);
            await context.PublishYGrabar(new BandejaComedorPreparada(bandeja.Id, msg.ComidaId), _recorder, cid);
        }
        else
        {
            var bandeja = BandejaCama.Crear(msg.ComidaId, msg.TieneBebida);
            await _repository.AddAsync(bandeja, context.CancellationToken);
            await context.PublishYGrabar(new BandejaCamaPreparada(bandeja.Id, msg.ComidaId, msg.TieneBebida), _recorder, cid);
        }
    }
}
