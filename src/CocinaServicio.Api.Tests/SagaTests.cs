using CocinaServicio.Api.Demo;
using CocinaServicio.Api.Sagas;
using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using CocinaServicio.Contracts.ValueObjects;
using MassTransit;
using MassTransit.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace CocinaServicio.Api.Tests;

public class SagaTests
{
    private static List<Plato> PlatosDemo() =>
    [
        new("Ensalada César", TipoPlato.Entrante, EsLiquido: false),
        new("Pollo asado", TipoPlato.Principal, EsLiquido: false),
        new("Tarta de queso", TipoPlato.Postre, EsLiquido: false)
    ];

    private static ServiceProvider BuildServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IFailureInjector, FailureInjector>();
        services.AddMassTransitTestHarness(x =>
        {
            x.AddSagaStateMachine<ServicioComidaSaga, ServicioComidaSagaState>()
             .InMemoryRepository();
        });
        return services.BuildServiceProvider(true);
    }

    // InMemory transport does not call EndpointConvention.Map<T> during ConfigureEndpoints,
    // so the saga's Send() would throw "No endpoint convention found". We map them here to
    // a loopback address so the send succeeds and appears in harness.Sent.
    private static void MapCommandConventions()
    {
        EndpointConvention.Map<CocinarComida>(new Uri("loopback://localhost/cocinar-comida"));
        EndpointConvention.Map<PrepararBandeja>(new Uri("loopback://localhost/preparar-bandeja"));
        EndpointConvention.Map<LlevarBandeja>(new Uri("loopback://localhost/llevar-bandeja"));
        EndpointConvention.Map<IniciarLimpieza>(new Uri("loopback://localhost/iniciar-limpieza"));
        EndpointConvention.Map<DescartarComida>(new Uri("loopback://localhost/descartar-comida"));
        EndpointConvention.Map<RerouteDestino>(new Uri("loopback://localhost/reroute-destino"));
        EndpointConvention.Map<MantenerCaliente>(new Uri("loopback://localhost/mantener-caliente"));
        EndpointConvention.Map<RetornarBandeja>(new Uri("loopback://localhost/retornar-bandeja"));
    }

    [Fact]
    public async Task HappyPath_MenuDecidido_EnviaComandoCocinarComida()
    {
        await using var provider = BuildServiceProvider();
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();
        MapCommandConventions();

        var sagaHarness = provider.GetRequiredService<ISagaStateMachineTestHarness<ServicioComidaSaga, ServicioComidaSagaState>>();

        var menuId = Guid.NewGuid();
        await harness.Bus.Publish(new MenuDecidido(menuId, PlatosDemo(), Destino.Comedor));

        Assert.True(await sagaHarness.Consumed.Any<MenuDecidido>(), "Saga no consumió MenuDecidido");
        Assert.True(await harness.Sent.Any<CocinarComida>(), "No se envió CocinarComida");
    }

    [Fact]
    public async Task HappyPath_ComidaPreparada_EnviaComandoPrepararBandeja()
    {
        await using var provider = BuildServiceProvider();
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();
        MapCommandConventions();

        var sagaHarness = provider.GetRequiredService<ISagaStateMachineTestHarness<ServicioComidaSaga, ServicioComidaSagaState>>();

        var menuId = Guid.NewGuid();
        var comidaId = Guid.NewGuid();

        await harness.Bus.Publish(new MenuDecidido(menuId, PlatosDemo(), Destino.Comedor));
        Assert.True(await sagaHarness.Consumed.Any<MenuDecidido>(), "Saga no consumió MenuDecidido");

        await harness.Bus.Publish(new ComidaPreparada(comidaId, menuId, Destino.Comedor, false));

        Assert.True(await sagaHarness.Consumed.Any<ComidaPreparada>(), "Saga no consumió ComidaPreparada");
        Assert.True(await harness.Sent.Any<PrepararBandeja>(), "No se envió PrepararBandeja");
    }

    [Fact]
    public async Task Compensacion_ComidaQuemada_EnviaDescartarComida()
    {
        await using var provider = BuildServiceProvider();
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();
        MapCommandConventions();

        var sagaHarness = provider.GetRequiredService<ISagaStateMachineTestHarness<ServicioComidaSaga, ServicioComidaSagaState>>();

        var menuId = Guid.NewGuid();
        var comidaId = Guid.NewGuid();

        await harness.Bus.Publish(new MenuDecidido(menuId, PlatosDemo(), Destino.Comedor));
        Assert.True(await sagaHarness.Consumed.Any<MenuDecidido>(), "Saga no consumió MenuDecidido");

        await harness.Bus.Publish(new ComidaQuemada(menuId, comidaId, "quemada"));

        Assert.True(await sagaHarness.Consumed.Any<ComidaQuemada>(), "Saga no consumió ComidaQuemada");
        Assert.True(
            await harness.Sent.Any<DescartarComida>(m => m.Context!.Message.Razon == "quemada"),
            "No se envió DescartarComida con razón 'quemada'");
    }

    [Fact]
    public async Task Compensacion_BandejaNoDisponible_EnviaMantenerCaliente()
    {
        await using var provider = BuildServiceProvider();
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();
        MapCommandConventions();

        var sagaHarness = provider.GetRequiredService<ISagaStateMachineTestHarness<ServicioComidaSaga, ServicioComidaSagaState>>();

        var menuId = Guid.NewGuid();
        var comidaId = Guid.NewGuid();

        await harness.Bus.Publish(new MenuDecidido(menuId, PlatosDemo(), Destino.Comedor));
        Assert.True(await sagaHarness.Consumed.Any<MenuDecidido>(), "Saga no consumió MenuDecidido");

        await harness.Bus.Publish(new ComidaPreparada(comidaId, menuId, Destino.Comedor, false));
        Assert.True(await sagaHarness.Consumed.Any<ComidaPreparada>(), "Saga no consumió ComidaPreparada");

        await harness.Bus.Publish(new BandejaNoDisponible(comidaId, Destino.Comedor));

        Assert.True(await sagaHarness.Consumed.Any<BandejaNoDisponible>(), "Saga no consumió BandejaNoDisponible");
        Assert.True(
            await harness.Sent.Any<MantenerCaliente>(m => m.Context!.Message.ComidaId == comidaId),
            "No se envió MantenerCaliente");
    }

    [Fact]
    public async Task Compensacion_DerrameEnTransporte_EnviaRetornarBandeja()
    {
        await using var provider = BuildServiceProvider();
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();
        MapCommandConventions();

        var sagaHarness = provider.GetRequiredService<ISagaStateMachineTestHarness<ServicioComidaSaga, ServicioComidaSagaState>>();

        var menuId = Guid.NewGuid();
        var comidaId = Guid.NewGuid();
        var bandejaId = Guid.NewGuid();

        await harness.Bus.Publish(new MenuDecidido(menuId, PlatosDemo(), Destino.Comedor));
        Assert.True(await sagaHarness.Consumed.Any<MenuDecidido>(), "Saga no consumió MenuDecidido");

        await harness.Bus.Publish(new ComidaPreparada(comidaId, menuId, Destino.Comedor, false));
        Assert.True(await sagaHarness.Consumed.Any<ComidaPreparada>(), "Saga no consumió ComidaPreparada");

        await harness.Bus.Publish(new BandejaComedorPreparada(bandejaId, comidaId));
        Assert.True(await sagaHarness.Consumed.Any<BandejaComedorPreparada>(), "Saga no consumió BandejaComedorPreparada");

        await harness.Bus.Publish(new DerrameEnTransporte(bandejaId, Destino.Comedor));

        Assert.True(await sagaHarness.Consumed.Any<DerrameEnTransporte>(), "Saga no consumió DerrameEnTransporte");
        Assert.True(
            await harness.Sent.Any<RetornarBandeja>(m => m.Context!.Message.BandejaId == bandejaId),
            "No se envió RetornarBandeja");
    }
}
