using CocinaServicio.Api.Demo;
using MassTransit;

namespace CocinaServicio.Api.Messaging;

public class RecordingPublishObserver : IPublishObserver
{
    private readonly ISagaRecorder _recorder;

    public RecordingPublishObserver(ISagaRecorder recorder) => _recorder = recorder;

    public Task PrePublish<T>(PublishContext<T> context) where T : class => Task.CompletedTask;

    public Task PostPublish<T>(PublishContext<T> context) where T : class
    {
        var correlationId = context.CorrelationId ?? Guid.Empty;
        _recorder.Registrar(
            correlationId,
            TipoRegistro.EventoPublicado,
            typeof(T).Name,
            context.Message);
        return Task.CompletedTask;
    }

    public Task PublishFault<T>(PublishContext<T> context, Exception exception) where T : class =>
        Task.CompletedTask;
}
