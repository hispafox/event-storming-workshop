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
            return Results.Ok(new { correlationId, message = "Estado disponible via /api/demo/recording/{correlationId}" });
        });

        demo.MapGet("/recording/{correlationId:guid}", (Guid correlationId, ISagaRecorder recorder) =>
        {
            var grabacion = recorder.Obtener(correlationId);
            if (grabacion is null) return Results.NotFound();

            var inicio = grabacion.InicioUtc;
            var eventos = grabacion.Eventos.Select(e => new
            {
                offsetMs = (long)(e.TimestampUtc - inicio).TotalMilliseconds,
                tipo = e.Tipo.ToString(),
                nombre = e.Nombre,
                modulo = e.Modulo,
                payload = e.Payload,
            }).ToList();

            return Results.Ok(new
            {
                correlationId = grabacion.CorrelationId,
                inicioUtc = grabacion.InicioUtc,
                completado = grabacion.Completado,
                outcome = grabacion.Outcome,
                eventos,
            });
        });

        demo.MapGet("/recordings", (ISagaRecorder recorder) =>
            Results.Ok(recorder.ListarRecientes()));
    }
}

public record IniciarFlujoRequest(Destino Destino, bool ConBebida);
public record SimulateFailureRequest(string Step, string FailureType);
