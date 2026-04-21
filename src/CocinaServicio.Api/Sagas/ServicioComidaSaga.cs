using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;

namespace CocinaServicio.Api.Sagas;

public class ServicioComidaSaga : MassTransitStateMachine<ServicioComidaSagaState>
{
    public State Cooking { get; private set; } = null!;
    public State Routing { get; private set; } = null!;
    public State AssemblingTray { get; private set; } = null!;
    public State Delivering { get; private set; } = null!;
    public State Serving { get; private set; } = null!;
    public State CleaningUp { get; private set; } = null!;
    public State Compensating { get; private set; } = null!;
    public State Failed { get; private set; } = null!;

    public Event<MenuDecidido> MenuDecididoEvent { get; private set; } = null!;
    public Event<ComidaPreparada> ComidaPreparadaEvent { get; private set; } = null!;
    public Event<BandejaComedorPreparada> BandejaComedorPreparadaEvent { get; private set; } = null!;
    public Event<BandejaCamaPreparada> BandejaCamaPreparadaEvent { get; private set; } = null!;
    public Event<ComidaServidaEnComedor> ComidaServidaEnComedorEvent { get; private set; } = null!;
    public Event<ComidaServidaEnCama> ComidaServidaEnCamaEvent { get; private set; } = null!;
    public Event<ComidaConsumida> ComidaConsumidaEvent { get; private set; } = null!;
    public Event<CocinaDespejada> CocinaDespejadaEvent { get; private set; } = null!;
    public Event<ComidaQuemada> ComidaQuemadaEvent { get; private set; } = null!;
    public Event<DestinoNoDisponible> DestinoNoDisponibleEvent { get; private set; } = null!;
    public Event<BandejaNoDisponible> BandejaNoDisponibleEvent { get; private set; } = null!;
    public Event<DerrameEnTransporte> DerrameEnTransporteEvent { get; private set; } = null!;

    public ServicioComidaSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => MenuDecididoEvent, x => x
            .CorrelateBy((saga, ctx) => saga.MenuId == ctx.Message.MenuId)
            .SelectId(ctx => ctx.Message.MenuId));

        Event(() => ComidaPreparadaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.MenuId == ctx.Message.MenuId));

        Event(() => BandejaComedorPreparadaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.ComidaId == ctx.Message.ComidaId));

        Event(() => BandejaCamaPreparadaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.ComidaId == ctx.Message.ComidaId));

        Event(() => ComidaServidaEnComedorEvent, x => x
            .CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));

        Event(() => ComidaServidaEnCamaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));

        Event(() => ComidaConsumidaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));

        Event(() => CocinaDespejadaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.BandejaUsadaId == ctx.Message.BandejaUsadaId));

        Event(() => ComidaQuemadaEvent, x => x
            .CorrelateBy((saga, ctx) => saga.MenuId == ctx.Message.MenuId));

        Event(() => DestinoNoDisponibleEvent, x => x
            .CorrelateBy((saga, ctx) => saga.ComidaId == ctx.Message.ComidaId));

        Event(() => BandejaNoDisponibleEvent, x => x
            .CorrelateBy((saga, ctx) => saga.ComidaId == ctx.Message.ComidaId));

        Event(() => DerrameEnTransporteEvent, x => x
            .CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));

        // === HAPPY PATH ===

        Initially(
            When(MenuDecididoEvent)
                .Then(ctx =>
                {
                    ctx.Saga.MenuId = ctx.Message.MenuId;
                    ctx.Saga.Destino = ctx.Message.DestinoPreferido;
                    ctx.Saga.TieneBebida = ctx.Message.Platos.Any(p => p.EsLiquido);
                    ctx.Saga.StartedAt = DateTime.UtcNow;
                })
                .Send(ctx => new CocinarComida(
                    ctx.Saga.CorrelationId,
                    ctx.Message.MenuId,
                    ctx.Message.Platos))
                .TransitionTo(Cooking));

        During(Cooking,
            When(ComidaPreparadaEvent)
                .Then(ctx => ctx.Saga.ComidaId = ctx.Message.ComidaId)
                .TransitionTo(Routing)
                .Send(ctx => new PrepararBandeja(
                    ctx.Saga.CorrelationId,
                    ctx.Saga.ComidaId!.Value,
                    ctx.Saga.Destino,
                    ctx.Saga.TieneBebida))
                .TransitionTo(AssemblingTray));

        During(AssemblingTray,
            When(BandejaComedorPreparadaEvent)
                .Then(ctx => ctx.Saga.BandejaId = ctx.Message.BandejaId)
                .Send(ctx => new LlevarBandeja(
                    ctx.Saga.CorrelationId,
                    ctx.Message.BandejaId,
                    Destino.Comedor))
                .TransitionTo(Delivering),
            When(BandejaCamaPreparadaEvent)
                .Then(ctx => ctx.Saga.BandejaId = ctx.Message.BandejaId)
                .Send(ctx => new LlevarBandeja(
                    ctx.Saga.CorrelationId,
                    ctx.Message.BandejaId,
                    Destino.Cama))
                .TransitionTo(Delivering));

        During(Delivering,
            When(ComidaServidaEnComedorEvent).TransitionTo(Serving),
            When(ComidaServidaEnCamaEvent).TransitionTo(Serving));

        During(Serving,
            When(ComidaConsumidaEvent)
                .Then(ctx => ctx.Saga.BandejaUsadaId = ctx.Message.BandejaId)
                .Send(ctx => new IniciarLimpieza(
                    ctx.Saga.CorrelationId,
                    ctx.Message.BandejaId))
                .TransitionTo(CleaningUp));

        During(CleaningUp,
            When(CocinaDespejadaEvent)
                .Then(ctx =>
                {
                    ctx.Saga.BandejaUsadaId = ctx.Message.BandejaUsadaId;
                    ctx.Saga.CompletedAt = DateTime.UtcNow;
                })
                .Finalize());

        SetCompletedWhenFinalized();

        // === COMPENSACIONES ===

        During(Cooking,
            When(ComidaQuemadaEvent)
                .Then(ctx => ctx.Saga.FailureReason = "Comida quemada")
                .Send(ctx => new DescartarComida(
                    ctx.Saga.CorrelationId,
                    ctx.Saga.ComidaId ?? Guid.Empty,
                    "quemada"))
                .TransitionTo(Failed));

        During(Routing,
            When(DestinoNoDisponibleEvent)
                .Then(ctx =>
                {
                    var alternativo = ctx.Saga.Destino == Destino.Comedor ? Destino.Cama : Destino.Comedor;
                    ctx.Saga.Destino = alternativo;
                    ctx.Saga.IntentosCompensacion++;
                })
                .Send(ctx => new RerouteDestino(ctx.Saga.CorrelationId, ctx.Saga.Destino))
                .TransitionTo(AssemblingTray));

        During(AssemblingTray,
            When(BandejaNoDisponibleEvent)
                .Send(ctx => new MantenerCaliente(ctx.Saga.CorrelationId, ctx.Saga.ComidaId!.Value))
                .TransitionTo(Compensating));

        During(Delivering,
            When(DerrameEnTransporteEvent)
                .Send(ctx => new RetornarBandeja(ctx.Saga.CorrelationId, ctx.Saga.BandejaId!.Value))
                .TransitionTo(AssemblingTray));
    }
}
