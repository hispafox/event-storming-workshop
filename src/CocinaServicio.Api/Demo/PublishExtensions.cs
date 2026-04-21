using MassTransit;

namespace CocinaServicio.Api.Demo;

public static class PublishExtensions
{
    public static async Task PublishYGrabar<T>(
        this ConsumeContext context,
        T mensaje,
        ISagaRecorder recorder,
        Guid correlationId)
        where T : class
    {
        await context.Publish(mensaje, context.CancellationToken);
        recorder.Registrar(correlationId, TipoRegistro.EventoPublicado, typeof(T).Name, mensaje);
    }
}
