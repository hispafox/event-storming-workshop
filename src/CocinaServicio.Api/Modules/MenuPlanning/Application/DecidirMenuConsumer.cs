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

        await Task.Delay(TimeSpan.FromSeconds(7), context.CancellationToken);

        var platos = msg.PlatosDeseados.Count > 0
            ? msg.PlatosDeseados
            : await _inventory.GetPlatosPorDefectoAsync(conBebida: false, context.CancellationToken);

        var menuId = msg.CorrelationId;

        await context.Publish(new MenuDecidido(menuId, platos, msg.DestinoPreferido), context.CancellationToken);
    }
}
