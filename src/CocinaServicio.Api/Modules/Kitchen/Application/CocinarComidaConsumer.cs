using CocinaServicio.Api.Demo;
using CocinaServicio.Api.Modules.Kitchen.Domain;
using CocinaServicio.Api.Modules.Kitchen.Infrastructure;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Modules.Kitchen.Application;

public class CocinarComidaConsumer : IConsumer<CocinarComida>
{
    private readonly IComidaRepository _repository;
    private readonly IFailureInjector _failureInjector;
    private readonly ILogger<CocinarComidaConsumer> _logger;

    public CocinarComidaConsumer(
        IComidaRepository repository,
        IFailureInjector failureInjector,
        ILogger<CocinarComidaConsumer> logger)
    {
        _repository = repository;
        _failureInjector = failureInjector;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<CocinarComida> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Cocinando para menú {MenuId}", msg.MenuId);

        await context.Publish(new HornoEncendido(msg.MenuId, DateTime.UtcNow), context.CancellationToken);

        if (_failureInjector.DebeFallar("Cooking", out var tipo))
        {
            _failureInjector.Consumir("Cooking");
            await Task.Delay(TimeSpan.FromSeconds(7), context.CancellationToken);
            await context.Publish(new HornoApagado(msg.MenuId, DateTime.UtcNow), context.CancellationToken);
            await context.Publish(new ComidaQuemada(msg.MenuId, Guid.NewGuid(), tipo), context.CancellationToken);
            return;
        }

        await Task.Delay(TimeSpan.FromSeconds(7), context.CancellationToken);

        await context.Publish(new HornoApagado(msg.MenuId, DateTime.UtcNow), context.CancellationToken);

        var tieneBebida = msg.Platos.Any(p => p.EsLiquido);
        var destino = Destino.Comedor;

        var comida = new Comida(msg.MenuId, msg.Platos);
        await _repository.AddAsync(comida, context.CancellationToken);

        await context.Publish(
            new ComidaPreparada(comida.Id, msg.MenuId, destino, tieneBebida),
            context.CancellationToken);
    }
}
