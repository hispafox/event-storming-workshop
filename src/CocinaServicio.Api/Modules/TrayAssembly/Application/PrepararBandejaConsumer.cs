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
    private readonly ILogger<PrepararBandejaConsumer> _logger;

    public PrepararBandejaConsumer(
        IBandejaRepository repository,
        IFailureInjector failureInjector,
        ILogger<PrepararBandejaConsumer> logger)
    {
        _repository = repository;
        _failureInjector = failureInjector;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PrepararBandeja> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Preparando bandeja para comida {ComidaId}, destino {Destino}", msg.ComidaId, msg.Destino);

        if (_failureInjector.DebeFallar("AssemblingTray", out _))
        {
            _failureInjector.Consumir("AssemblingTray");
            await Task.Delay(TimeSpan.FromSeconds(1), context.CancellationToken);
            await context.Publish(new BandejaNoDisponible(msg.ComidaId, msg.Destino), context.CancellationToken);
            return;
        }

        await Task.Delay(TimeSpan.FromSeconds(2), context.CancellationToken);

        if (msg.Destino == Destino.Comedor)
        {
            var bandeja = BandejaComedor.Crear(msg.ComidaId);
            await _repository.AddAsync(bandeja, context.CancellationToken);
            await context.Publish(new BandejaComedorPreparada(bandeja.Id, msg.ComidaId), context.CancellationToken);
        }
        else
        {
            var bandeja = BandejaCama.Crear(msg.ComidaId, msg.TieneBebida);
            await _repository.AddAsync(bandeja, context.CancellationToken);
            await context.Publish(new BandejaCamaPreparada(bandeja.Id, msg.ComidaId, msg.TieneBebida), context.CancellationToken);
        }
    }
}
