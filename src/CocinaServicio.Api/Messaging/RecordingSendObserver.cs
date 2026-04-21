using CocinaServicio.Api.Demo;
using MassTransit;

namespace CocinaServicio.Api.Messaging;

public class RecordingSendObserver : ISendObserver
{
    private readonly ISagaRecorder _recorder;

    public RecordingSendObserver(ISagaRecorder recorder) => _recorder = recorder;

    public Task PreSend<T>(SendContext<T> context) where T : class => Task.CompletedTask;

    public Task PostSend<T>(SendContext<T> context) where T : class
    {
        var correlationId = context.CorrelationId ?? Guid.Empty;
        _recorder.Registrar(
            correlationId,
            TipoRegistro.ComandoEnviado,
            typeof(T).Name,
            context.Message);
        return Task.CompletedTask;
    }

    public Task SendFault<T>(SendContext<T> context, Exception exception) where T : class =>
        Task.CompletedTask;
}
