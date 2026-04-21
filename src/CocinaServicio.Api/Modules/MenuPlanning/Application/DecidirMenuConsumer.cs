using CocinaServicio.Api.Modules.Inventory.Infrastructure;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using MassTransit;

namespace CocinaServicio.Api.Modules.MenuPlanning.Application;

public class DecidirMenuConsumer : IConsumer<DecidirMenu>
{
    private readonly IInventoryService _inventory;
    private readonly ILogger<DecidirMenuConsumer> _logger;

    public DecidirMenuConsumer(IInventoryService inventory, ILogger<DecidirMenuConsumer> logger)
    {
        _inventory = inventory;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<DecidirMenu> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Decidiendo menú para correlación {CorrelationId}", msg.CorrelationId);

        await context.Publish(new CatalogoConsultado(msg.CorrelationId, 0, DateTime.UtcNow), context.CancellationToken);
        var posibles = await _inventory.GetPlatosPorDefectoAsync(conBebida: false, context.CancellationToken);
        await context.Publish(new NeveraConsultada(msg.CorrelationId, posibles.Count, DateTime.UtcNow), context.CancellationToken);

        await Task.Delay(TimeSpan.FromMilliseconds(100), context.CancellationToken);

        var platos = msg.PlatosDeseados.Count > 0 ? msg.PlatosDeseados : posibles;
        var menuId = msg.CorrelationId;

        await context.Publish(new MenuDecidido(menuId, platos, msg.DestinoPreferido), context.CancellationToken);
    }
}
