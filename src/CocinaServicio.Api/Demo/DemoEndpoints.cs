using CocinaServicio.Api.Modules.Inventory.Infrastructure;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Demo;

public static class DemoEndpoints
{
    public static void MapDemoEndpoints(this WebApplication app)
    {
        var demo = app.MapGroup("/api/demo");

        demo.MapPost("/iniciar-flujo-demo", async (
            IniciarFlujoRequest req,
            IPublishEndpoint publisher,
            IInventoryService inventory,
            CancellationToken ct) =>
        {
            var correlationId = Guid.NewGuid();
            var platos = await inventory.GetPlatosPorDefectoAsync(req.ConBebida, ct);

            await publisher.Publish(
                new DecidirMenu(correlationId, req.Destino, platos),
                ct);

            return Results.Accepted($"/api/demo/saga/{correlationId}", new { correlationId });
        });

        demo.MapPost("/simulate-failure", async (
            SimulateFailureRequest req,
            IFailureInjector injector,
            IPublishEndpoint publisher,
            IInventoryService inventory,
            CancellationToken ct) =>
        {
            injector.InyectarFalloProximoFlujo(req.Step, req.FailureType);

            var correlationId = Guid.NewGuid();
            var platos = await inventory.GetPlatosPorDefectoAsync(conBebida: false, ct);

            await publisher.Publish(
                new DecidirMenu(correlationId, Destino.Comedor, platos),
                ct);

            return Results.Accepted($"/api/demo/saga/{correlationId}", new { correlationId });
        });

        demo.MapGet("/saga/{correlationId:guid}", (Guid correlationId) =>
        {
            return Results.Ok(new { correlationId, message = "Estado disponible via SignalR /hubs/cocina" });
        });
    }
}

public record IniciarFlujoRequest(Destino Destino, bool ConBebida);
public record SimulateFailureRequest(string Step, string FailureType);
