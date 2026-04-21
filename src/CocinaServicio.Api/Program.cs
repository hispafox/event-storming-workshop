using CocinaServicio.Api.Demo;
using CocinaServicio.Api.Hubs;
using CocinaServicio.Api.Messaging;
using CocinaServicio.Api.Modules.Cleanup;
using CocinaServicio.Api.Modules.Delivery;
using CocinaServicio.Api.Modules.Inventory;
using CocinaServicio.Api.Modules.Kitchen;
using CocinaServicio.Api.Modules.MenuPlanning;
using CocinaServicio.Api.Modules.Routing;
using CocinaServicio.Api.Modules.TrayAssembly;
using CocinaServicio.Api.Sagas;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddInventoryModule();
builder.Services.AddMenuPlanningModule();
builder.Services.AddKitchenModule();
builder.Services.AddTrayAssemblyModule();
builder.Services.AddDeliveryModule();
builder.Services.AddCleanupModule();
builder.Services.AddRoutingModule();

builder.Services.AddSingleton<IFailureInjector, FailureInjector>();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumersFromNamespaceContaining<Program>();

    x.AddSagaStateMachine<ServicioComidaSaga, ServicioComidaSagaState>()
     .InMemoryRepository();

    x.UsingInMemory((context, cfg) =>
    {
        cfg.ConcurrentMessageLimit = 10;
        cfg.UseMessageRetry(r => r.Immediate(3));

        cfg.ConnectPublishObserver(new SignalRPublishObserver(
            context.GetRequiredService<IHubContext<CocinaHub>>()));

        cfg.ConnectSendObserver(new SignalRSendObserver(
            context.GetRequiredService<IHubContext<CocinaHub>>()));

        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

app.UseCors("Frontend");

app.MapHub<CocinaHub>("/hubs/cocina");

app.MapInventoryEndpoints();
app.MapDemoEndpoints();

await app.RunAsync();
