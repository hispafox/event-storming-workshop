using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Sagas;

public class ServicioComidaSagaState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; } = string.Empty;
    public Guid MenuId { get; set; }
    public Guid? ComidaId { get; set; }
    public Guid? BandejaId { get; set; }
    public Guid? BandejaUsadaId { get; set; }
    public Destino Destino { get; set; }
    public bool TieneBebida { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? FailureReason { get; set; }
    public int IntentosCompensacion { get; set; }
}
