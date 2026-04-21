using CocinaServicio.Api.Demo;
using CocinaServicio.Api.Messaging;
using CocinaServicio.Api.Modules.Cleanup;
using CocinaServicio.Api.Modules.Cleanup.Application;
using CocinaServicio.Api.Modules.Delivery;
using CocinaServicio.Api.Modules.Delivery.Application;
using CocinaServicio.Api.Modules.Inventory;
using CocinaServicio.Api.Modules.Kitchen;
using CocinaServicio.Api.Modules.Kitchen.Application;
using CocinaServicio.Api.Modules.MenuPlanning;
using CocinaServicio.Api.Modules.MenuPlanning.Application;
using CocinaServicio.Api.Modules.Routing;
using CocinaServicio.Api.Modules.TrayAssembly;
using CocinaServicio.Api.Modules.TrayAssembly.Application;
using CocinaServicio.Api.Sagas;
using CocinaServicio.Contracts.Commands;
using MassTransit;
using System.Text.Json.Serialization;

EndpointConvention.Map<CocinarComida>(new Uri("queue:CocinarComida"));
EndpointConvention.Map<PrepararBandeja>(new Uri("queue:PrepararBandeja"));
EndpointConvention.Map<LlevarBandeja>(new Uri("queue:LlevarBandeja"));
EndpointConvention.Map<IniciarLimpieza>(new Uri("queue:IniciarLimpieza"));
EndpointConvention.Map<DescartarComida>(new Uri("queue:DescartarComida"));
EndpointConvention.Map<RerouteDestino>(new Uri("queue:RerouteDestino"));
EndpointConvention.Map<MantenerCaliente>(new Uri("queue:MantenerCaliente"));
EndpointConvention.Map<RetornarBandeja>(new Uri("queue:RetornarBandeja"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddInventoryModule();
builder.Services.AddMenuPlanningModule();
builder.Services.AddKitchenModule();
builder.Services.AddTrayAssemblyModule();
builder.Services.AddDeliveryModule();
builder.Services.AddCleanupModule();
builder.Services.AddRoutingModule();

builder.Services.AddSingleton<IFailureInjector, FailureInjector>();
builder.Services.AddSingleton<ISagaRecorder, SagaRecorder>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<DecidirMenuConsumer>();
    x.AddConsumer<CocinarComidaConsumer>();
    x.AddConsumer<PrepararBandejaConsumer>();
    x.AddConsumer<LlevarBandejaConsumer>();
    x.AddConsumer<IniciarLimpiezaConsumer>();

    x.AddSagaStateMachine<ServicioComidaSaga, ServicioComidaSagaState>()
     .InMemoryRepository();

    x.UsingInMemory((context, cfg) =>
    {
        cfg.ConcurrentMessageLimit = 10;
        cfg.UseMessageRetry(r => r.Immediate(3));

        var recorder = context.GetRequiredService<ISagaRecorder>();
        cfg.ConnectSendObserver(new RecordingSendObserver(recorder));

        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

app.UseCors("Frontend");

app.MapInventoryEndpoints();
app.MapDemoEndpoints();

await app.RunAsync();
