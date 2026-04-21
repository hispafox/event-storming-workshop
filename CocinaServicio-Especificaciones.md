# CocinaServicio — Especificaciones completas del proyecto

> Demo de microservicios con .NET Aspire + MassTransit InMemory + React (Vite).
> Sin broker externo. Sin Docker. Sin base de datos. Sin instalaciones adicionales.
> Objetivo: formación — ver el patrón saga funcionando en vivo con visualización del flujo.

---

## 0. TL;DR para Claude Code

Vas a construir:

- Una solución .NET 10 con Aspire como orquestador.
- Un **monolito modular** con 7 bounded contexts organizados por carpetas (no 7 proyectos separados — MassTransit InMemory es process-local).
- MassTransit InMemory con saga state machine y repositorio en memoria.
- Persistencia en `ConcurrentDictionary` dentro de cada módulo (sin base de datos).
- Un frontend **React + Vite + TypeScript** con SignalR client que visualiza el flujo en tiempo real.
- Aspire AppHost que orquesta el backend + el frontend (Aspire soporta proyectos Node.js/npm nativamente).

**Lo que no hay que hacer:**
- No instalar RabbitMQ, Docker ni ningún broker.
- No usar EF Core ni base de datos alguna.
- No separar cada microservicio como proyecto independiente — la demo se rompe con InMemory transport.
- No meter autenticación ni autorización — fuera de alcance.
- No usar Blazor — el frontend es React puro.

**Regla de oro de código:**
- Siempre `async/await` en todo lo que sea asíncrono, tanto en C# como en TypeScript.
- Nada de `.then()` en TypeScript, nada de `.Result` / `.Wait()` / `Task.FromResult` en C#.
- Todos los métodos asíncronos en C# acaban en `Async` y reciben `CancellationToken`.
- Todos los handlers de eventos en React que hagan llamadas async se escriben como funciones `async` separadas, no inline en el `onClick`.

---

## 1. Contexto del dominio

El sistema modela el flujo completo de preparar comida en una cocina, montarla en una bandeja y servirla en dos destinos posibles: el comedor (bandeja plana estándar) o la cama (bandeja con patas y antideslizante). Tras el consumo, la bandeja se recoge, se limpia y la cocina vuelve a su estado inicial.

Es un dominio simple que ilustra conceptos reales de microservicios: bounded contexts, eventos de dominio, agregados, saga con compensaciones y orquestación con Aspire.

---

## 2. Flujos del dominio

### Flujo Principal — Preparar comida
`Cocinero → DecidirMenú → Menú → MenúDecidido → PrepararComida → Comida → ComidaPreparada → ElegirDestino`

### Flujo A — Servir en comedor
`ComidaPreparada → PrepararBandejaComedor → BandejaComedor → BandejaComedorPreparada → LlevarAlComedor → ComidaServidaEnComedor`

### Flujo B — Servir en cama
`ComidaPreparada → PrepararBandejaCama → BandejaCama → BandejaCamaPreparada → LlevarALaHabitación → ComidaServidaEnCama`

### Flujo C — Recoger y limpiar
`ComidaConsumida → RecogerBandeja → Bandeja → BandejaRecogida → LimpiarYGuardar → CocinaDespejada`

---

## 3. Modelo de dominio

### 3.1 Actores (3)

| Actor | Descripción | Flujo |
|---|---|---|
| Cocinero | Decide menú, cocina, monta bandejas y transporta. Actor principal de todo el flujo | Todos |
| Comensal (Comedor) | Recibe bandeja en comedor, come en la mesa | Flujo A |
| Comensal (Cama) | Recibe bandeja con patas en habitación, come recostado | Flujo B |

### 3.2 Comandos (8)

Todos ejecutados por el Cocinero.

| Comando | Descripción | Flujo |
|---|---|---|
| DecidirMenú | Elegir platos según ingredientes disponibles | Principal |
| PrepararComida | Cocinar, emplatar todos los platos | Principal |
| PrepararBandejaComedor | Montar bandeja plana estándar | A |
| PrepararBandejaCama | Montar bandeja con patas, antideslizante, tapa | B |
| LlevarAlComedor | Transportar al comedor | A |
| LlevarALaHabitación | Transportar a la cama con cuidado | B |
| RecogerBandeja | Retirar bandeja usada | C |
| LimpiarYGuardar | Fregar, secar, guardar todo | C |

### 3.3 Agregados (5)

**Menú**
```csharp
public class Menu
{
    public Guid Id { get; }
    public List<Plato> Platos { get; }
    public List<string> Ingredientes { get; }
    public int TiempoEstimadoMinutos { get; }
}
```

**Comida**
```csharp
public class Comida
{
    public Guid Id { get; }
    public Guid MenuId { get; }
    public List<Plato> Platos { get; }
    public EstadoComida Estado { get; } // Crudo | Cocinado | Emplatado
    public int TemperaturaCelsius { get; }
}
```

**BandejaComedor**
```csharp
public class BandejaComedor
{
    public Guid Id { get; }
    public Guid ComidaId { get; }
    public List<Plato> Contenido { get; }
    public bool TieneCubiertos { get; }
    public bool TieneServilleta { get; }
    public bool TieneVaso { get; }
}
```

**BandejaCama**
```csharp
public class BandejaCama
{
    public Guid Id { get; }
    public Guid ComidaId { get; }
    public List<Plato> Contenido { get; }
    public bool PatasDesplegadas { get; }
    public bool AntideslizanteActivo { get; }
    public bool TapaLiquidos { get; }
}
```

**Bandeja (post-uso)**
```csharp
public class BandejaUsada
{
    public Guid Id { get; }
    public Guid BandejaOrigenId { get; }
    public EstadoLimpieza Estado { get; } // Sucia | Limpiando | Limpia | Guardada
    public List<string> Restos { get; }
}
```

### 3.4 Eventos de dominio (9)

| Evento | Trigger | Flujo | Payload principal |
|---|---|---|---|
| MenuDecidido | DecidirMenú | Principal | MenuId, Platos |
| ComidaPreparada | PrepararComida | Principal → bifurcación | ComidaId, MenuId |
| BandejaComedorPreparada | PrepararBandejaComedor | A | BandejaId, ComidaId |
| BandejaCamaPreparada | PrepararBandejaCama | B | BandejaId, ComidaId |
| ComidaServidaEnComedor | LlevarAlComedor | A | BandejaId |
| ComidaServidaEnCama | LlevarALaHabitación | B | BandejaId |
| ComidaConsumida | Acción del comensal | C | BandejaId |
| BandejaRecogida | RecogerBandeja | C | BandejaUsadaId |
| CocinaDespejada | LimpiarYGuardar | C | CiclId |

`ComidaPreparada` es el evento pivote — dispara la política `ElegirDestino`.

### 3.5 Políticas (3)

**ElegirDestino**
- Regla: `WHEN ComidaPreparada THEN ElegirDestino`
- Descripción: Decide si sirve en comedor o cama según preferencia del pedido
- Implementación: en la demo, se determina por un campo `DestinoPreferido` incluido al iniciar el flujo

**LimpiarYGuardar**
- Regla: `WHEN BandejaRecogida THEN LimpiarYGuardar`
- Descripción: Siempre se aplica, sin excepciones
- Implementación: automática, sin condiciones

**TapaParaLíquidos**
- Regla: `WHEN destino=CAMA AND hayBebida THEN UsarTapa`
- Descripción: Solo aplica al flujo B con bebidas
- Implementación: en `PrepararBandejaCama`, si el menú contiene líquidos, marca `TapaLiquidos=true`

### 3.6 Modelos de lectura (4)

**Estado Bandeja Comedor** — `platos, cubiertos, servilleta, vaso, salero`
**Estado Bandeja Cama** — `platos, cubiertos, patasDesplegadas, antideslizante, tapaLiquidos, servilletaExtra`
**Inventario Cocina** — `ingredientesFrescos, ingredientesDespensa, caducidadesProximas, platosPosibles`
**Estado Cocina** — `estado (libre|cocinando|sucia|limpiando), bandejasDisponibles, lavavajillasLleno`

### 3.7 Sistemas externos (3)

| Sistema | Descripción | Integración |
|---|---|---|
| Lavavajillas | Automatiza limpieza. Ciclo 1-2h | Fake en demo — Task.Delay + log |
| Nevera / Despensa | Stock de ingredientes | Fake in-memory en Inventory module |
| Horno / Vitrocerámica | Fuentes de calor | Fake — Task.Delay simulando cocción |

### 3.8 Hotspots (5)

Son preguntas abiertas del Event Storming. Se documentan pero **no se implementan** — son debate para la clase.

1. ¿Bandeja con patas o sin patas para la cama? (simplificación: siempre con patas)
2. ¿Bebida con tapa obligatoria? (simplificación: si hay bebida, siempre tapa)
3. ¿Quién recoge la bandeja? (simplificación: siempre el cocinero)
4. ¿Servicio simultáneo en comedor y cama? (simplificación: flujos secuenciales en la demo)
5. ¿Postre en viaje separado? (simplificación: todo en el mismo viaje)

---

## 4. Arquitectura

### 4.1 Decisión arquitectónica

Es un **monolito modular**. Un único proceso .NET con 7 bounded contexts organizados como módulos internos. Razón: MassTransit InMemory es process-local y no cruza fronteras de proceso.

Pedagógicamente funciona perfecto: los alumnos ven los bounded contexts, los eventos, la saga, las compensaciones — todo el patrón real. Cuando pregunten "¿y en producción?", la respuesta es: cada módulo sería un proyecto separado y cambiamos `UsingInMemory` por `UsingRabbitMq`. Los contratos, la saga y los consumers no cambian.

### 4.2 Los 7 bounded contexts

| # | Módulo | Tipo | Responsabilidad |
|---|---|---|---|
| 1 | MenuPlanning | planificación | Decide el menú consultando Inventory |
| 2 | Kitchen | core | Cocina la comida. Emite ComidaPreparada |
| 3 | Routing | decisión | Decide destino (comedor/cama) |
| 4 | TrayAssembly | core | Monta la bandeja según destino |
| 5 | Delivery | core | Transporta la bandeja |
| 6 | Cleanup | core | Recoge y limpia |
| 7 | Inventory | soporte | Gestiona stock de ingredientes |

### 4.3 Comunicación

| Origen | Destino | Mensaje | Tipo |
|---|---|---|---|
| MenuPlanning | Kitchen | MenuDecidido | Evento async |
| Kitchen | Saga/Routing | ComidaPreparada | Evento async |
| Saga | TrayAssembly | PrepararBandeja | Comando sync |
| TrayAssembly | Delivery | BandejaPreparada | Evento async |
| Delivery | Cleanup | ComidaConsumida | Evento async |
| Cleanup | (cierre ciclo) | CocinaDespejada | Evento async |
| MenuPlanning | Inventory | GetIngredientes | Llamada directa en proceso |
| Kitchen | Horno | StartCocción | Fake Task.Delay |
| Cleanup | Lavavajillas | StartCiclo | Fake Task.Delay |

---

## 5. Saga: ServicioComidaSaga

Orquestación central del flujo core. Se implementa con `MassTransitStateMachine` + `InMemoryRepository`.

La saga actúa como **orquestador puro**: escucha eventos, envía comandos al siguiente módulo, y así sucesivamente. Los módulos nunca se hablan entre sí directamente — todo pasa por la saga. Esto hace que la demo sea muy visual: los alumnos ven claramente quién orquesta qué.

### 5.1 Disparo del flujo

El flujo arranca cuando el usuario pulsa un botón en el frontend. La cadena es:

```
1. Frontend → POST /api/demo/iniciar-flujo-demo
2. Endpoint → envía comando DecidirMenu a MenuPlanning
3. MenuPlanning → consulta Inventory → publica MenuDecidido
4. Saga escucha MenuDecidido → inicia instancia con CorrelationId = MenuId
5. (resto del flujo orquestado)
```

### 5.2 Estados

```
Initial → Cooking → Routing → AssemblingTray → Delivering → Serving → Consumed → CleaningUp → Completed
                                                                                 ↘ Compensating → Failed
```

### 5.3 Happy path

| Paso | Evento entrante | Estado destino | Acción de la saga |
|---|---|---|---|
| 1 | MenuDecidido (trigger inicial) | Cooking | Send CocinarComida a Kitchen |
| 2 | ComidaPreparada | Routing | Aplica política ElegirDestino → Send PrepararBandeja a TrayAssembly |
| 3 | BandejaComedorPreparada ó BandejaCamaPreparada | Delivering | Send LlevarBandeja a Delivery |
| 4 | ComidaServidaEnComedor ó ComidaServidaEnCama | Serving | Nada (espera consumo) |
| 5 | ComidaConsumida | CleaningUp | Send IniciarLimpieza a Cleanup |
| 6 | CocinaDespejada | Completed | Finalize |

### 5.4 Datos de la saga

```csharp
// CocinaServicio.Api/Sagas/ServicioComidaSagaState.cs

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
```

### 5.5 Implementación de la state machine

```csharp
// CocinaServicio.Api/Sagas/ServicioComidaSaga.cs

using CocinaServicio.Contracts.Commands;
using CocinaServicio.Contracts.Events;
using MassTransit;

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

    // Eventos de fallo para compensación
    public Event<ComidaQuemada> ComidaQuemadaEvent { get; private set; } = null!;
    public Event<DestinoNoDisponible> DestinoNoDisponibleEvent { get; private set; } = null!;
    public Event<BandejaNoDisponible> BandejaNoDisponibleEvent { get; private set; } = null!;
    public Event<DerrameEnTransporte> DerrameEnTransporteEvent { get; private set; } = null!;

    public ServicioComidaSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => MenuDecididoEvent, x => x.CorrelateBy((saga, ctx) => saga.MenuId == ctx.Message.MenuId)
                                              .SelectId(ctx => ctx.Message.MenuId));
        Event(() => ComidaPreparadaEvent, x => x.CorrelateBy((saga, ctx) => saga.MenuId == ctx.Message.MenuId));
        Event(() => BandejaComedorPreparadaEvent, x => x.CorrelateBy((saga, ctx) => saga.ComidaId == ctx.Message.ComidaId));
        Event(() => BandejaCamaPreparadaEvent, x => x.CorrelateBy((saga, ctx) => saga.ComidaId == ctx.Message.ComidaId));
        Event(() => ComidaServidaEnComedorEvent, x => x.CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));
        Event(() => ComidaServidaEnCamaEvent, x => x.CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));
        Event(() => ComidaConsumidaEvent, x => x.CorrelateBy((saga, ctx) => saga.BandejaId == ctx.Message.BandejaId));
        Event(() => CocinaDespejadaEvent, x => x.CorrelateBy((saga, ctx) => saga.BandejaUsadaId == ctx.Message.BandejaUsadaId));

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
                .Send(ctx => new CocinarComida(ctx.Saga.CorrelationId, ctx.Message.MenuId, ctx.Message.Platos))
                .TransitionTo(Cooking));

        During(Cooking,
            When(ComidaPreparadaEvent)
                .Then(ctx => ctx.Saga.ComidaId = ctx.Message.ComidaId)
                .TransitionTo(Routing)
                // Política ElegirDestino aplicada aquí
                .Send(ctx => new PrepararBandeja(
                    ctx.Saga.CorrelationId,
                    ctx.Saga.ComidaId!.Value,
                    ctx.Saga.Destino,
                    ctx.Saga.TieneBebida))
                .TransitionTo(AssemblingTray));

        During(AssemblingTray,
            When(BandejaComedorPreparadaEvent)
                .Then(ctx => ctx.Saga.BandejaId = ctx.Message.BandejaId)
                .Send(ctx => new LlevarBandeja(ctx.Saga.CorrelationId, ctx.Message.BandejaId, Destino.Comedor))
                .TransitionTo(Delivering),
            When(BandejaCamaPreparadaEvent)
                .Then(ctx => ctx.Saga.BandejaId = ctx.Message.BandejaId)
                .Send(ctx => new LlevarBandeja(ctx.Saga.CorrelationId, ctx.Message.BandejaId, Destino.Cama))
                .TransitionTo(Delivering));

        During(Delivering,
            When(ComidaServidaEnComedorEvent).TransitionTo(Serving),
            When(ComidaServidaEnCamaEvent).TransitionTo(Serving));

        During(Serving,
            When(ComidaConsumidaEvent)
                .Send(ctx => new IniciarLimpieza(ctx.Saga.CorrelationId, ctx.Message.BandejaId))
                .TransitionTo(CleaningUp));

        During(CleaningUp,
            When(CocinaDespejadaEvent)
                .Then(ctx => ctx.Saga.CompletedAt = DateTime.UtcNow)
                .Finalize());

        SetCompletedWhenFinalized();

        // === COMPENSACIONES ===

        During(Cooking,
            When(ComidaQuemadaEvent)
                .Then(ctx => ctx.Saga.FailureReason = "Comida quemada")
                .Send(ctx => new DescartarComida(ctx.Saga.CorrelationId, ctx.Saga.ComidaId ?? Guid.Empty, "quemada"))
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
```

### 5.6 Eventos adicionales de fallo (añadir a Contracts)

```csharp
// CocinaServicio.Contracts/Events/FalloEvents.cs

public record ComidaQuemada(Guid MenuId, Guid ComidaId, string Razon);
public record DestinoNoDisponible(Guid ComidaId, Destino DestinoIntentado);
public record BandejaNoDisponible(Guid ComidaId, Destino Destino);
public record DerrameEnTransporte(Guid BandejaId, Destino Destino);
```

### 5.7 Comando adicional faltante

```csharp
// Añadir a CocinaServicio.Contracts/Commands/
public record CocinarComida(Guid CorrelationId, Guid MenuId, List<Plato> Platos);
public record DecidirMenu(Guid CorrelationId, Destino DestinoPreferido, List<Plato> PlatosDeseados);
```

### 5.8 Simulación de fallos

Endpoint `POST /api/demo/simulate-failure` que configura un flag en el `FailureInjector` singleton. El siguiente flujo disparado activará el fallo en el step indicado.

```csharp
public record SimulateFailureRequest(string Step, string FailureType);
// Step: "Cooking" | "Routing" | "AssemblingTray" | "Delivering"
// FailureType: "Quemada" | "SinDestino" | "SinBandeja" | "Derrame"
```

Ver sección 8.5 para el código del `FailureInjector`.

---

## 6. Estructura de la solución

```
CocinaServicio.sln
│
├── src/
│   ├── CocinaServicio.Api/                    ← Monolito con los 7 módulos
│   │   ├── Modules/
│   │   │   ├── MenuPlanning/
│   │   │   │   ├── Domain/
│   │   │   │   ├── Application/
│   │   │   │   ├── Infrastructure/
│   │   │   │   ├── Endpoints/
│   │   │   │   └── MenuPlanningModule.cs
│   │   │   ├── Kitchen/
│   │   │   ├── Routing/
│   │   │   ├── TrayAssembly/
│   │   │   ├── Delivery/
│   │   │   ├── Cleanup/
│   │   │   └── Inventory/
│   │   ├── Sagas/
│   │   │   ├── ServicioComidaSaga.cs
│   │   │   └── ServicioComidaSagaState.cs
│   │   ├── Demo/
│   │   │   ├── DemoEndpoints.cs
│   │   │   └── FailureInjector.cs
│   │   ├── Hubs/
│   │   │   └── CocinaHub.cs                   ← SignalR para frontend
│   │   ├── Program.cs
│   │   └── CocinaServicio.Api.csproj
│   │
│   └── CocinaServicio.Web/                    ← Frontend React + Vite + TypeScript
│       ├── src/
│       │   ├── components/
│       │   │   ├── MapaCocina.tsx            ← Diagrama SVG animado
│       │   │   ├── ServicioNode.tsx          ← Cada "servicio" en el mapa
│       │   │   ├── PlatoViajero.tsx          ← El plato animado
│       │   │   ├── TimelineEventos.tsx       ← Panel lateral de eventos
│       │   │   └── PanelControl.tsx          ← Botones iniciar/simular
│       │   ├── hooks/
│       │   │   └── useCocinaHub.ts           ← Hook custom para SignalR
│       │   ├── services/
│       │   │   └── api.ts                    ← Cliente fetch a la API
│       │   ├── types/
│       │   │   └── contracts.ts              ← Types TS que espejan los Contracts C#
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── public/
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── tailwind.config.js
│
├── shared/
│   └── CocinaServicio.Contracts/              ← DTOs, eventos, comandos
│       ├── Events/
│       ├── Commands/
│       ├── ValueObjects/
│       └── CocinaServicio.Contracts.csproj
│
└── infrastructure/
    └── CocinaServicio.AppHost/                ← Aspire orquestador
        ├── Program.cs
        └── CocinaServicio.AppHost.csproj
```

---

## 7. Contratos (CocinaServicio.Contracts)

### 7.1 Value Objects

```csharp
public record Plato(string Nombre, TipoPlato Tipo, bool EsLiquido);
public enum TipoPlato { Entrante, Principal, Postre, Bebida }
public enum Destino { Comedor, Cama }
public enum EstadoComida { Crudo, Cocinado, Emplatado }
public enum EstadoLimpieza { Sucia, Limpiando, Limpia, Guardada }
```

### 7.2 Eventos de integración

```csharp
namespace CocinaServicio.Contracts.Events;

public record MenuDecidido(Guid MenuId, List<Plato> Platos, Destino DestinoPreferido);
public record ComidaPreparada(Guid ComidaId, Guid MenuId, Destino DestinoPreferido, bool TieneBebida);
public record BandejaComedorPreparada(Guid BandejaId, Guid ComidaId);
public record BandejaCamaPreparada(Guid BandejaId, Guid ComidaId, bool TapaLiquidos);
public record ComidaServidaEnComedor(Guid BandejaId, DateTime ServidaAt);
public record ComidaServidaEnCama(Guid BandejaId, DateTime ServidaAt);
public record ComidaConsumida(Guid BandejaId, DateTime ConsumidaAt);
public record BandejaRecogida(Guid BandejaUsadaId, Guid BandejaOrigenId);
public record CocinaDespejada(Guid CicloId, DateTime CompletadoAt);
```

### 7.3 Comandos

```csharp
namespace CocinaServicio.Contracts.Commands;

public record IniciarServicio(Guid CorrelationId, Destino DestinoPreferido, List<Plato> PlatosDeseados);
public record PrepararBandeja(Guid CorrelationId, Guid ComidaId, Destino Destino, bool TieneBebida);
public record LlevarBandeja(Guid CorrelationId, Guid BandejaId, Destino Destino);
public record IniciarLimpieza(Guid CorrelationId, Guid BandejaUsadaId);
```

### 7.4 Comandos de compensación

```csharp
public record DescartarComida(Guid CorrelationId, Guid ComidaId, string Razon);
public record RerouteDestino(Guid CorrelationId, Destino DestinoAlternativo);
public record MantenerCaliente(Guid CorrelationId, Guid ComidaId);
public record RetornarBandeja(Guid CorrelationId, Guid BandejaId);
```

---

## 8. Endpoints API por módulo

### 8.1 MenuPlanning

```
POST /api/menu/planificar
  Body: { destinoPreferido: "Comedor"|"Cama", platos: [...] }
  Response: 202 Accepted { correlationId: "..." }
  Efecto: Inicia la saga con IniciarServicio
```

### 8.2 Inventory

```
GET /api/inventory
  Response: 200 OK { ingredientes: [...], platosPosibles: [...] }

GET /api/inventory/platos-posibles
  Response: 200 OK [ { nombre, tipo, esLiquido }, ... ]
```

### 8.3 Demo / Visualización

```
POST /api/demo/iniciar-flujo-demo
  Body: { destino: "Comedor"|"Cama", conBebida: true|false }
  Response: 202 { correlationId }

POST /api/demo/simulate-failure
  Body: { step: "Cooking"|"Routing"|"AssemblingTray"|"Delivering", failureType: "..." }
  Response: 202 { correlationId }

GET /api/demo/saga/{correlationId}
  Response: estado actual de la saga

GET /api/demo/eventos/{correlationId}
  Response: lista de eventos publicados hasta ahora
```

### 8.4 SignalR Hub

```
/hubs/cocina

Eventos push al cliente:
  - ServicioActivado(moduleName, correlationId)
  - EventoPublicado(eventName, payload, correlationId)
  - EstadoSagaCambiado(correlationId, newState)
  - CompensacionEjecutada(correlationId, compensation)
  - FlujoCompletado(correlationId, success)
```

### 8.5 Demo endpoints (código completo)

```csharp
// CocinaServicio.Api/Demo/DemoEndpoints.cs

using CocinaServicio.Contracts.Commands;
using MassTransit;

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

            await publisher.Publish(new DecidirMenu(correlationId, req.Destino, platos), ct);

            return Results.Accepted($"/api/demo/saga/{correlationId}",
                new { correlationId });
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

            await publisher.Publish(new DecidirMenu(correlationId, Destino.Comedor, platos), ct);

            return Results.Accepted($"/api/demo/saga/{correlationId}",
                new { correlationId });
        });

        demo.MapGet("/saga/{correlationId:guid}", async (
            Guid correlationId,
            ISagaStateReader reader,
            CancellationToken ct) =>
        {
            var state = await reader.GetStateAsync(correlationId, ct);
            return state is null ? Results.NotFound() : Results.Ok(state);
        });
    }
}

public record IniciarFlujoRequest(Destino Destino, bool ConBebida);
public record SimulateFailureRequest(string Step, string FailureType);
```

### 8.6 FailureInjector (código completo)

```csharp
// CocinaServicio.Api/Demo/FailureInjector.cs

using System.Collections.Concurrent;

public interface IFailureInjector
{
    void InyectarFalloProximoFlujo(string step, string failureType);
    bool DebeFallar(string step, out string failureType);
    void Consumir(string step);
}

public class FailureInjector : IFailureInjector
{
    private readonly ConcurrentDictionary<string, string> _fallosPendientes = new();

    public void InyectarFalloProximoFlujo(string step, string failureType)
    {
        _fallosPendientes[step] = failureType;
    }

    public bool DebeFallar(string step, out string failureType)
    {
        return _fallosPendientes.TryGetValue(step, out failureType!);
    }

    public void Consumir(string step)
    {
        _fallosPendientes.TryRemove(step, out _);
    }
}
```

Cada consumer consulta el `IFailureInjector` al iniciar su procesamiento. Si hay un fallo pendiente para su step, en vez de ejecutar el happy path, publica el evento de fallo correspondiente:

```csharp
// Ejemplo en CocinarComidaConsumer (Kitchen module)

public async Task Consume(ConsumeContext<CocinarComida> context)
{
    var msg = context.Message;

    if (_failureInjector.DebeFallar("Cooking", out var tipo))
    {
        _failureInjector.Consumir("Cooking");
        await Task.Delay(TimeSpan.FromSeconds(1), context.CancellationToken);
        await context.Publish(new ComidaQuemada(msg.MenuId, Guid.NewGuid(), tipo), context.CancellationToken);
        return;
    }

    // Happy path
    await Task.Delay(TimeSpan.FromSeconds(2.5), context.CancellationToken);
    var comida = new Comida(/* ... */);
    await _repository.AddAsync(comida, context.CancellationToken);
    await context.Publish(new ComidaPreparada(comida.Id, msg.MenuId, Destino.Comedor, false), context.CancellationToken);
}
```

### 8.7 Datos iniciales del Inventory module

El Inventory tiene un catálogo fijo de platos disponibles que se carga al arrancar. Esto permite que la demo funcione sin setup previo.

```csharp
// CocinaServicio.Api/Modules/Inventory/InventoryModule.cs

public static class InventoryModule
{
    public static IServiceCollection AddInventoryModule(this IServiceCollection services)
    {
        services.AddSingleton<IInventoryService>(new InMemoryInventoryService(PlatosIniciales()));
        return services;
    }

    private static List<Plato> PlatosIniciales() => new()
    {
        new("Ensalada César", TipoPlato.Entrante, EsLiquido: false),
        new("Crema de calabaza", TipoPlato.Entrante, EsLiquido: true),
        new("Lubina al horno", TipoPlato.Principal, EsLiquido: false),
        new("Pollo asado", TipoPlato.Principal, EsLiquido: false),
        new("Pasta carbonara", TipoPlato.Principal, EsLiquido: false),
        new("Tarta de queso", TipoPlato.Postre, EsLiquido: false),
        new("Agua mineral", TipoPlato.Bebida, EsLiquido: true),
        new("Vino tinto", TipoPlato.Bebida, EsLiquido: true),
        new("Café", TipoPlato.Bebida, EsLiquido: true)
    };
}

public interface IInventoryService
{
    Task<List<Plato>> GetPlatosPorDefectoAsync(bool conBebida, CancellationToken ct);
    Task<List<Plato>> GetAllPlatosAsync(CancellationToken ct);
}

public class InMemoryInventoryService : IInventoryService
{
    private readonly List<Plato> _catalogo;

    public InMemoryInventoryService(List<Plato> catalogo) => _catalogo = catalogo;

    public async Task<List<Plato>> GetPlatosPorDefectoAsync(bool conBebida, CancellationToken ct)
    {
        await Task.Yield();
        var seleccion = new List<Plato>
        {
            _catalogo.First(p => p.Tipo == TipoPlato.Entrante),
            _catalogo.First(p => p.Tipo == TipoPlato.Principal),
            _catalogo.First(p => p.Tipo == TipoPlato.Postre)
        };

        if (conBebida)
            seleccion.Add(_catalogo.First(p => p.Tipo == TipoPlato.Bebida));

        return seleccion;
    }

    public async Task<List<Plato>> GetAllPlatosAsync(CancellationToken ct)
    {
        await Task.Yield();
        return _catalogo.ToList();
    }
}
```

---

## 9. Persistencia en memoria

Cada módulo gestiona su propia persistencia con `ConcurrentDictionary<Guid, T>` inyectado como singleton. Sin base de datos.

```csharp
// Ejemplo en Kitchen module
public interface IComidaRepository
{
    Task<Comida?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Comida comida, CancellationToken ct = default);
    Task UpdateAsync(Comida comida, CancellationToken ct = default);
    Task<List<Comida>> GetAllAsync(CancellationToken ct = default);
}

public class InMemoryComidaRepository : IComidaRepository
{
    private readonly ConcurrentDictionary<Guid, Comida> _store = new();

    public async Task<Comida?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        // Simulamos latencia mínima para ser realistas — fuerza el uso de async/await
        await Task.Yield();
        return _store.GetValueOrDefault(id);
    }

    public async Task AddAsync(Comida comida, CancellationToken ct = default)
    {
        await Task.Yield();
        _store[comida.Id] = comida;
    }

    public async Task UpdateAsync(Comida comida, CancellationToken ct = default)
    {
        await Task.Yield();
        _store[comida.Id] = comida;
    }

    public async Task<List<Comida>> GetAllAsync(CancellationToken ct = default)
    {
        await Task.Yield();
        return _store.Values.ToList();
    }
}

// Registro en Program.cs
builder.Services.AddSingleton<IComidaRepository, InMemoryComidaRepository>();
```

**Nota:** usamos `await Task.Yield()` en lugar de `Task.FromResult` para que los métodos sean genuinamente asíncronos. Cuando mañana se sustituya el repositorio in-memory por uno con EF Core, las firmas y el patrón `async/await` ya están alineados y no hay que tocar los consumers. Todos los consumers y handlers deben usar `await` en todas las llamadas al repositorio.

### Ejemplo de consumer usando async/await correctamente

```csharp
public class PrepararBandejaConsumer : IConsumer<PrepararBandeja>
{
    private readonly IBandejaRepository _repository;
    private readonly ILogger<PrepararBandejaConsumer> _logger;

    public PrepararBandejaConsumer(IBandejaRepository repository, ILogger<PrepararBandejaConsumer> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PrepararBandeja> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Preparando bandeja para comida {ComidaId}", msg.ComidaId);

        // Simulamos tiempo de montaje
        await Task.Delay(TimeSpan.FromSeconds(2), context.CancellationToken);

        var bandeja = msg.Destino == Destino.Comedor
            ? BandejaComedor.Crear(msg.ComidaId)
            : BandejaCama.Crear(msg.ComidaId, msg.TieneBebida);

        await _repository.AddAsync(bandeja, context.CancellationToken);

        if (msg.Destino == Destino.Comedor)
        {
            await context.Publish(new BandejaComedorPreparada(bandeja.Id, msg.ComidaId), context.CancellationToken);
        }
        else
        {
            await context.Publish(new BandejaCamaPreparada(bandeja.Id, msg.ComidaId, msg.TieneBebida), context.CancellationToken);
        }
    }
}
```

**Regla estricta:** todos los métodos que hagan I/O, publiquen mensajes, accedan a repositorios o hagan `Task.Delay` son `async Task` con el sufijo `Async` cuando corresponda, y se llaman siempre con `await`. No se usa `.Result`, `.Wait()` ni `.GetAwaiter().GetResult()` en ningún sitio.

---

## 10. Frontend React

### 10.1 Setup del proyecto

```bash
# Desde src/
npm create vite@latest CocinaServicio.Web -- --template react-ts
cd CocinaServicio.Web
npm install
npm install @microsoft/signalr framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Stack del frontend:**
- **Vite + React 18 + TypeScript** — build rápido, HMR, tipado fuerte.
- **@microsoft/signalr** — cliente oficial de SignalR para JS.
- **Framer Motion** — animaciones declarativas del plato viajero.
- **Tailwind CSS** — estilado rápido sin archivos CSS dispersos.

### 10.2 Layout de la vista principal

Pantalla completa dividida en tres zonas:

- **Mapa animado** (izquierda, ~70% ancho): SVG con los 7 módulos como nodos conectados. El "plato" viaja entre ellos con Framer Motion. Cada módulo se ilumina al procesar.
- **Timeline de eventos** (derecha, ~30% ancho): lista en tiempo real con timestamp, nombre del evento y payload resumido. Auto-scroll al más reciente.
- **Panel de control** (abajo, franja completa): botones "Servir en comedor", "Servir en cama", selector de fallo a simular, indicador del estado actual de la saga.

### 10.3 Hook custom: useCocinaHub

```typescript
// src/hooks/useCocinaHub.ts
import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export type EventoPush = {
  tipo: 'ServicioActivado' | 'EventoPublicado' | 'EstadoSagaCambiado' | 'CompensacionEjecutada' | 'FlujoCompletado';
  correlationId: string;
  payload: any;
  timestamp: string;
};

export function useCocinaHub(apiUrl: string) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [eventos, setEventos] = useState<EventoPush[]>([]);
  const [servicioActivo, setServicioActivo] = useState<string | null>(null);
  const [estadoSaga, setEstadoSaga] = useState<string>('Idle');

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/cocina`)
      .withAutomaticReconnect()
      .build();

    conn.on('ServicioActivado', (moduleName: string, correlationId: string) => {
      setServicioActivo(moduleName);
      setEventos(prev => [...prev, {
        tipo: 'ServicioActivado',
        correlationId,
        payload: { moduleName },
        timestamp: new Date().toISOString()
      }]);
    });

    conn.on('EventoPublicado', (eventName: string, payload: any, correlationId: string) => {
      setEventos(prev => [...prev, {
        tipo: 'EventoPublicado',
        correlationId,
        payload: { eventName, ...payload },
        timestamp: new Date().toISOString()
      }]);
    });

    conn.on('EstadoSagaCambiado', (correlationId: string, newState: string) => {
      setEstadoSaga(newState);
    });

    conn.on('CompensacionEjecutada', (correlationId: string, compensation: string) => {
      setEventos(prev => [...prev, {
        tipo: 'CompensacionEjecutada',
        correlationId,
        payload: { compensation },
        timestamp: new Date().toISOString()
      }]);
    });

    const startConnection = async () => {
      try {
        await conn.start();
        setConnection(conn);
      } catch (err) {
        console.error('Error conectando al hub:', err);
      }
    };

    startConnection();

    return () => {
      const stopConnection = async () => {
        await conn.stop();
      };
      stopConnection();
    };
  }, [apiUrl]);

  return { connection, eventos, servicioActivo, estadoSaga };
}
```

### 10.4 Componente MapaCocina

```tsx
// src/components/MapaCocina.tsx
import { motion } from 'framer-motion';
import { ServicioNode } from './ServicioNode';
import { PlatoViajero } from './PlatoViajero';

type Props = {
  servicioActivo: string | null;
  estadoSaga: string;
};

const SERVICIOS = [
  { id: 'Inventory', nombre: 'Inventory', x: 100, y: 100 },
  { id: 'MenuPlanning', nombre: 'Menu Planning', x: 100, y: 250 },
  { id: 'Kitchen', nombre: 'Kitchen', x: 300, y: 250 },
  { id: 'Routing', nombre: 'Routing', x: 500, y: 250 },
  { id: 'TrayAssembly', nombre: 'Tray Assembly', x: 700, y: 250 },
  { id: 'Delivery', nombre: 'Delivery', x: 700, y: 400 },
  { id: 'Cleanup', nombre: 'Cleanup', x: 400, y: 400 },
];

export function MapaCocina({ servicioActivo, estadoSaga }: Props) {
  const posPlato = SERVICIOS.find(s => s.id === servicioActivo);

  return (
    <svg viewBox="0 0 900 550" className="w-full h-full">
      {/* Conexiones */}
      <line x1="100" y1="130" x2="100" y2="220" className="stroke-slate-300" strokeWidth="2" />
      <line x1="130" y1="250" x2="270" y2="250" className="stroke-slate-300" strokeWidth="2" />
      <line x1="330" y1="250" x2="470" y2="250" className="stroke-slate-300" strokeWidth="2" />
      <line x1="530" y1="250" x2="670" y2="250" className="stroke-slate-300" strokeWidth="2" />
      <line x1="700" y1="280" x2="700" y2="370" className="stroke-slate-300" strokeWidth="2" />
      <line x1="670" y1="400" x2="430" y2="400" className="stroke-slate-300" strokeWidth="2" />

      {/* Servicios */}
      {SERVICIOS.map(s => (
        <ServicioNode
          key={s.id}
          nombre={s.nombre}
          x={s.x}
          y={s.y}
          activo={servicioActivo === s.id}
        />
      ))}

      {/* Plato viajero */}
      {posPlato && <PlatoViajero x={posPlato.x} y={posPlato.y} />}
    </svg>
  );
}
```

### 10.5 Componente ServicioNode

```tsx
// src/components/ServicioNode.tsx
import { motion } from 'framer-motion';

type Props = {
  nombre: string;
  x: number;
  y: number;
  activo: boolean;
};

export function ServicioNode({ nombre, x, y, activo }: Props) {
  return (
    <motion.g
      animate={{ scale: activo ? 1.1 : 1 }}
      transition={{ duration: 0.3 }}
    >
      <rect
        x={x - 60}
        y={y - 30}
        width="120"
        height="60"
        rx="8"
        className={activo ? 'fill-amber-400 stroke-amber-600' : 'fill-white stroke-slate-300'}
        strokeWidth="2"
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        className={`text-sm font-semibold ${activo ? 'fill-amber-900' : 'fill-slate-700'}`}
      >
        {nombre}
      </text>
      {activo && (
        <motion.circle
          cx={x}
          cy={y - 30}
          r="5"
          className="fill-green-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.g>
  );
}
```

### 10.6 Componente PlatoViajero

```tsx
// src/components/PlatoViajero.tsx
import { motion } from 'framer-motion';

type Props = { x: number; y: number };

export function PlatoViajero({ x, y }: Props) {
  return (
    <motion.circle
      animate={{ cx: x, cy: y }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      r="12"
      className="fill-orange-500 stroke-orange-700"
      strokeWidth="2"
    />
  );
}
```

### 10.7 Componente TimelineEventos

```tsx
// src/components/TimelineEventos.tsx
import { useEffect, useRef } from 'react';
import { EventoPush } from '../hooks/useCocinaHub';

export function TimelineEventos({ eventos }: { eventos: EventoPush[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [eventos]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-slate-50 p-4 space-y-2">
      <h2 className="text-lg font-bold mb-3">Timeline</h2>
      {eventos.map((e, i) => (
        <div key={i} className={`border-l-4 p-2 bg-white rounded shadow-sm ${colorPorTipo(e.tipo)}`}>
          <div className="text-xs text-slate-500">{new Date(e.timestamp).toLocaleTimeString()}</div>
          <div className="font-semibold text-sm">{e.payload.eventName || e.payload.moduleName || e.tipo}</div>
          {e.payload.compensation && <div className="text-xs text-red-600 mt-1">⚠ Compensación: {e.payload.compensation}</div>}
        </div>
      ))}
    </div>
  );
}

function colorPorTipo(tipo: string) {
  switch (tipo) {
    case 'ServicioActivado': return 'border-blue-500';
    case 'EventoPublicado': return 'border-orange-500';
    case 'CompensacionEjecutada': return 'border-red-500';
    case 'FlujoCompletado': return 'border-green-500';
    default: return 'border-slate-300';
  }
}
```

### 10.8 Componente PanelControl

```tsx
// src/components/PanelControl.tsx
import { useState } from 'react';
import { iniciarFlujo, simularFallo } from '../services/api';

export function PanelControl({ estadoSaga }: { estadoSaga: string }) {
  const [fallo, setFallo] = useState('Quemada');
  const [enProceso, setEnProceso] = useState(false);

  const handleIniciarComedor = async () => {
    setEnProceso(true);
    try {
      await iniciarFlujo('Comedor', false);
    } catch (error) {
      console.error(error);
    } finally {
      setEnProceso(false);
    }
  };

  const handleIniciarCama = async () => {
    setEnProceso(true);
    try {
      await iniciarFlujo('Cama', true);
    } catch (error) {
      console.error(error);
    } finally {
      setEnProceso(false);
    }
  };

  const handleSimularFallo = async () => {
    try {
      await simularFallo(fallo);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border-t shadow">
      <button
        onClick={handleIniciarComedor}
        disabled={enProceso}
        className="px-4 py-2 bg-amber-500 text-white rounded font-semibold hover:bg-amber-600 disabled:opacity-50"
      >
        🍽️ Servir en comedor
      </button>
      <button
        onClick={handleIniciarCama}
        disabled={enProceso}
        className="px-4 py-2 bg-purple-500 text-white rounded font-semibold hover:bg-purple-600 disabled:opacity-50"
      >
        🛏️ Servir en cama (con bebida)
      </button>

      <div className="h-8 w-px bg-slate-300" />

      <span className="text-sm text-slate-600">Simular fallo:</span>
      <select value={fallo} onChange={e => setFallo(e.target.value)} className="border rounded px-2 py-1">
        <option value="Quemada">Comida quemada</option>
        <option value="SinDestino">Destino no disponible</option>
        <option value="SinBandeja">Sin bandeja disponible</option>
        <option value="Derrame">Derrame en transporte</option>
      </select>
      <button
        onClick={handleSimularFallo}
        className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        ⚠ Simular
      </button>

      <div className="ml-auto">
        <span className="text-sm text-slate-500">Estado saga:</span>
        <span className="ml-2 font-bold text-slate-900">{estadoSaga}</span>
      </div>
    </div>
  );
}
```

### 10.9 Cliente API

```typescript
// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:5001';

export async function iniciarFlujo(destino: 'Comedor' | 'Cama', conBebida: boolean) {
  const res = await fetch(`${API_URL}/api/demo/iniciar-flujo-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destino, conBebida }),
  });

  if (!res.ok) {
    throw new Error(`Error iniciando flujo: ${res.statusText}`);
  }

  return await res.json();
}

export async function simularFallo(failureType: string) {
  const res = await fetch(`${API_URL}/api/demo/simulate-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'Cooking', failureType }),
  });

  if (!res.ok) {
    throw new Error(`Error simulando fallo: ${res.statusText}`);
  }

  return await res.json();
}

export async function getSagaState(correlationId: string) {
  const res = await fetch(`${API_URL}/api/demo/saga/${correlationId}`);

  if (!res.ok) {
    throw new Error(`Error obteniendo estado de saga: ${res.statusText}`);
  }

  return await res.json();
}
```

### 10.10 App.tsx — composición final

```tsx
// src/App.tsx
import { useCocinaHub } from './hooks/useCocinaHub';
import { MapaCocina } from './components/MapaCocina';
import { TimelineEventos } from './components/TimelineEventos';
import { PanelControl } from './components/PanelControl';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:5001';

export default function App() {
  const { eventos, servicioActivo, estadoSaga } = useCocinaHub(API_URL);

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-900 text-white p-4">
        <h1 className="text-xl font-bold">🍳 CocinaServicio — Saga en vivo</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4">
          <MapaCocina servicioActivo={servicioActivo} estadoSaga={estadoSaga} />
        </div>
        <aside className="w-80 border-l bg-white">
          <TimelineEventos eventos={eventos} />
        </aside>
      </div>

      <PanelControl estadoSaga={estadoSaga} />
    </div>
  );
}
```

### 10.11 Types TypeScript (espejo de contratos C#)

```typescript
// src/types/contracts.ts
export type Destino = 'Comedor' | 'Cama';
export type TipoPlato = 'Entrante' | 'Principal' | 'Postre' | 'Bebida';

export interface Plato {
  nombre: string;
  tipo: TipoPlato;
  esLiquido: boolean;
}

export interface SagaState {
  correlationId: string;
  currentState: string;
  destino: Destino;
  tieneBebida: boolean;
  failureReason?: string;
}
```

### 10.12 Archivos de configuración del frontend

```typescript
// CocinaServicio.Web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: Number(process.env.PORT) || 3000
  }
});
```

```javascript
// CocinaServicio.Web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores del Event Storming
        eventoDominio: '#FF9800',
        comando: '#2196F3',
        agregado: '#FFC107',
        politica: '#9C27B0',
        modeloLectura: '#4CAF50',
        sistemaExterno: '#E91E63',
        hotspot: '#F44336',
        actor: '#FFEB3B'
      }
    }
  },
  plugins: []
};
```

```postcss
/* CocinaServicio.Web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

```tsx
// CocinaServicio.Web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```html
<!-- CocinaServicio.Web/index.html -->
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CocinaServicio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 11. Aspire AppHost

Aspire soporta proyectos Node.js nativamente. Para el frontend React usamos `AddNpmApp`.

```csharp
// CocinaServicio.AppHost/Program.cs

var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.CocinaServicio_Api>("api")
                 .WithExternalHttpEndpoints();

var web = builder.AddNpmApp("web", "../CocinaServicio.Web", "dev")
                 .WithReference(api)
                 .WithEnvironment("VITE_API_URL", api.GetEndpoint("https"))
                 .WithHttpEndpoint(env: "PORT")
                 .WithExternalHttpEndpoints();

builder.Build().Run();
```

**Notas:**
- `AddNpmApp` necesita Node.js instalado (si ya tienes Claude Code, probablemente ya lo tienes).
- `npm install` debe ejecutarse una vez en `CocinaServicio.Web` antes de arrancar el AppHost.
- Aspire inyecta la variable de entorno `PORT` que Vite debe respetar. Para que funcione cross-platform (Windows/Linux/macOS) se usa el paquete `cross-env`:

```bash
# Dentro de CocinaServicio.Web
npm install -D cross-env
```

```json
// CocinaServicio.Web/package.json (fragmento)
{
  "scripts": {
    "dev": "cross-env-shell \"vite --port ${PORT:-3000} --host\"",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

- `VITE_API_URL` se inyecta como variable de entorno para que el frontend sepa a qué URL conectar el SignalR client.

Dashboard de Aspire muestra:
- `api` (el monolito con todos los módulos)
- `web` (el frontend React con Vite dev server)

---

## 12. Configuración del backend (Program.cs completo)

```csharp
// CocinaServicio.Api/Program.cs

using CocinaServicio.Api.Hubs;
using CocinaServicio.Api.Modules;
using CocinaServicio.Api.Sagas;
using CocinaServicio.Api.Messaging;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

// === SignalR ===
builder.Services.AddSignalR();

// === CORS para el dev server de Vite ===
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// === Módulos ===
builder.Services.AddMenuPlanningModule();
builder.Services.AddKitchenModule();
builder.Services.AddRoutingModule();
builder.Services.AddTrayAssemblyModule();
builder.Services.AddDeliveryModule();
builder.Services.AddCleanupModule();
builder.Services.AddInventoryModule();

// === FailureInjector para la demo ===
builder.Services.AddSingleton<IFailureInjector, FailureInjector>();

// === MassTransit con InMemory + Saga ===
builder.Services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);

    x.AddSagaStateMachine<ServicioComidaSaga, ServicioComidaSagaState>()
     .InMemoryRepository();

    x.UsingInMemory((context, cfg) =>
    {
        cfg.ConcurrentMessageLimit = 10;
        cfg.UseMessageRetry(r => r.Immediate(3));

        // Filtro que reenvía todos los eventos publicados al SignalR Hub
        cfg.ConnectPublishObserver(new SignalRPublishObserver(
            context.GetRequiredService<IHubContext<CocinaHub>>()));

        // Observer que emite cambios de estado de la saga a SignalR
        cfg.ConnectSendObserver(new SignalRSendObserver(
            context.GetRequiredService<IHubContext<CocinaHub>>()));

        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

app.UseCors("Frontend");

app.MapHub<CocinaHub>("/hubs/cocina");

// Mapeo de endpoints por módulo
app.MapMenuPlanningEndpoints();
app.MapInventoryEndpoints();
app.MapDemoEndpoints();

await app.RunAsync();
```

### 12.1 CocinaHub (SignalR)

```csharp
// CocinaServicio.Api/Hubs/CocinaHub.cs

using Microsoft.AspNetCore.SignalR;

public class CocinaHub : Hub
{
    // Los clientes solo escuchan — no hay métodos invocables desde cliente.
    // El servidor emite: ServicioActivado, EventoPublicado, EstadoSagaCambiado,
    // CompensacionEjecutada, FlujoCompletado.

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", new { connectionId = Context.ConnectionId });
        await base.OnConnectedAsync();
    }
}
```

### 12.2 Observers: reenvío de eventos a SignalR

En MassTransit, `IPublishObserver` se dispara cada vez que se publica un evento. Lo usamos para reenviar cada publicación al hub SignalR.

```csharp
// CocinaServicio.Api/Messaging/SignalRPublishObserver.cs

using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class SignalRPublishObserver : IPublishObserver
{
    private readonly IHubContext<CocinaHub> _hub;

    public SignalRPublishObserver(IHubContext<CocinaHub> hub)
    {
        _hub = hub;
    }

    public async Task PrePublish<T>(PublishContext<T> context) where T : class
    {
        // No hacer nada antes de publicar
        await Task.CompletedTask;
    }

    public async Task PostPublish<T>(PublishContext<T> context) where T : class
    {
        var eventName = typeof(T).Name;
        var correlationId = context.CorrelationId ?? Guid.Empty;

        // Detectamos el módulo emisor por el nombre del evento
        var moduleName = ResolverModulo(eventName);

        await _hub.Clients.All.SendAsync("ServicioActivado", moduleName, correlationId);
        await _hub.Clients.All.SendAsync("EventoPublicado", eventName, context.Message, correlationId);

        // Si es un evento de compensación, notificar específicamente
        if (EsCompensacion(eventName))
        {
            await _hub.Clients.All.SendAsync("CompensacionEjecutada", correlationId, eventName);
        }
    }

    public async Task PublishFault<T>(PublishContext<T> context, Exception exception) where T : class
    {
        await Task.CompletedTask;
    }

    private static string ResolverModulo(string eventName) => eventName switch
    {
        "MenuDecidido" => "MenuPlanning",
        "ComidaPreparada" or "ComidaQuemada" => "Kitchen",
        "BandejaComedorPreparada" or "BandejaCamaPreparada" or "BandejaNoDisponible" => "TrayAssembly",
        "ComidaServidaEnComedor" or "ComidaServidaEnCama" or "DerrameEnTransporte" => "Delivery",
        "ComidaConsumida" => "Delivery",
        "BandejaRecogida" or "CocinaDespejada" => "Cleanup",
        _ => "Unknown"
    };

    private static bool EsCompensacion(string eventName) =>
        eventName is "ComidaQuemada" or "DestinoNoDisponible" or "BandejaNoDisponible" or "DerrameEnTransporte";
}
```

```csharp
// CocinaServicio.Api/Messaging/SignalRSendObserver.cs

using MassTransit;
using Microsoft.AspNetCore.SignalR;

public class SignalRSendObserver : ISendObserver
{
    private readonly IHubContext<CocinaHub> _hub;

    public SignalRSendObserver(IHubContext<CocinaHub> hub)
    {
        _hub = hub;
    }

    public async Task PreSend<T>(SendContext<T> context) where T : class
    {
        await Task.CompletedTask;
    }

    public async Task PostSend<T>(SendContext<T> context) where T : class
    {
        var commandName = typeof(T).Name;
        var correlationId = context.CorrelationId ?? Guid.Empty;

        await _hub.Clients.All.SendAsync("EventoPublicado",
            $"Command: {commandName}",
            context.Message,
            correlationId);
    }

    public async Task SendFault<T>(SendContext<T> context, Exception exception) where T : class
    {
        await Task.CompletedTask;
    }
}
```

### 12.3 Configuración de MassTransit (resumen)

Todo lo anterior queda integrado en `AddMassTransit` del `Program.cs`. Los puntos clave:

- `InMemoryRepository()` para la saga — cero infraestructura.
- `UseMessageRetry(r => r.Immediate(3))` — 3 reintentos inmediatos ante excepciones.
- `ConnectPublishObserver` — reenvía eventos a SignalR.
- `ConnectSendObserver` — reenvía comandos a SignalR.
- `ConfigureEndpoints(context)` — MassTransit crea automáticamente los endpoints por convención.

---

## 13. Stack técnico

| Componente | Tecnología |
|---|---|
| Orquestador | .NET Aspire |
| Backend framework | .NET 10 / ASP.NET Core |
| API | Minimal APIs |
| Mensajería | MassTransit InMemory |
| Saga | MassTransit StateMachine + InMemoryRepository |
| Persistencia | ConcurrentDictionary (sin BD) |
| Frontend | React 18 + Vite + TypeScript |
| Animaciones | Framer Motion |
| Estilos | Tailwind CSS |
| Push real-time | SignalR (cliente @microsoft/signalr) |
| Testing backend | MassTransit InMemoryTestHarness + xUnit |

---

## 14. Paquetes requeridos

**CocinaServicio.Api** (NuGet)
- `MassTransit` (latest)
- `Microsoft.AspNetCore.SignalR`
- `Microsoft.AspNetCore.Cors` (para permitir requests desde el dev server de Vite)

**CocinaServicio.AppHost** (NuGet)
- `Aspire.Hosting.AppHost`
- `Aspire.Hosting.NodeJs`

**CocinaServicio.Contracts** (NuGet)
- Sin dependencias externas — solo DTOs puros

**CocinaServicio.Web** (npm)
- `react`, `react-dom`
- `@microsoft/signalr`
- `framer-motion`
- `tailwindcss`, `postcss`, `autoprefixer` (dev)
- `typescript`, `@types/react`, `@types/react-dom` (dev)
- `vite`, `@vitejs/plugin-react` (dev)

---

## 15. Flujo de ejecución típico

1. Usuario arranca el AppHost: `dotnet run --project CocinaServicio.AppHost`.
2. Aspire arranca la API y el dev server de Vite en paralelo.
3. Usuario abre `http://localhost:{port_web}` en el navegador.
4. El hook `useCocinaHub` conecta al SignalR Hub `/hubs/cocina` de la API.
5. Usuario pulsa "Servir en comedor".
6. React llama a `POST /api/demo/iniciar-flujo-demo`.
7. La API inicia la saga con `IniciarServicio(correlationId, Destino.Comedor)`.
8. MenuPlanning consulta Inventory (llamada directa) → publica `MenuDecidido`.
9. Kitchen consume → `Task.Delay(2s)` simulando cocción → publica `ComidaPreparada`.
10. Saga recibe → aplica política `ElegirDestino` → envía comando `PrepararBandeja(Comedor)`.
11. TrayAssembly consume → monta bandeja → publica `BandejaComedorPreparada`.
12. Delivery consume → `Task.Delay(1s)` → publica `ComidaServidaEnComedor`.
13. (Consumo simulado `Task.Delay(3s)`) → publica `ComidaConsumida`.
14. Cleanup consume → `Task.Delay(2s)` simulando lavavajillas → publica `CocinaDespejada`.
15. Saga transita a `Completed`.
16. Durante todo el proceso, cada consumer/saga publica vía SignalR los eventos → el hook `useCocinaHub` actualiza el estado React → Framer Motion anima el plato viajero y los nodos, el timeline se actualiza en tiempo real.

---

## 16. Configuración de tiempos y colores

### 16.1 Tiempos de `Task.Delay` por módulo

Para que la demo sea visible pero no aburrida:

| Módulo | Task.Delay | Razón |
|---|---|---|
| MenuPlanning | 1.0s | Decidir menú es rápido |
| Kitchen | 2.5s | Cocinar es el paso más largo |
| TrayAssembly | 2.0s | Montar bandeja con cuidado |
| Delivery | 1.5s | Transporte |
| (Consumo simulado automático) | 2.5s | Dar tiempo a que se vea "servido" |
| Cleanup (con lavavajillas) | 2.0s | Lavar |

Total del happy path: ~11.5 segundos. Suficiente para que los alumnos vean cada paso sin que sea lento.

### 16.2 Paleta de colores del Event Storming

Aplicar en el mapa y el timeline del frontend. Ya están definidos en `tailwind.config.js`:

| Concepto | Color hex | Uso en la UI |
|---|---|---|
| Evento de dominio | `#FF9800` naranja | Borde de eventos en timeline |
| Comando | `#2196F3` azul | Borde de comandos en timeline |
| Agregado | `#FFC107` amarillo | (opcional) |
| Política | `#9C27B0` violeta | Indicador de política ElegirDestino |
| Modelo de lectura | `#4CAF50` verde | Borde verde al completar paso |
| Sistema externo | `#E91E63` rosa | Conexiones a Horno / Lavavajillas |
| Hotspot | `#F44336` rojo | Compensaciones en timeline |
| Actor | `#FFEB3B` amarillo claro | (no usado en UI principal) |

### 16.3 Cómo arrancar el proyecto por primera vez

```bash
# 1. Restaurar dependencias de .NET
dotnet restore

# 2. Instalar dependencias del frontend
cd src/CocinaServicio.Web
npm install
cd ../..

# 3. Arrancar todo con Aspire
dotnet run --project infrastructure/CocinaServicio.AppHost
```

El dashboard de Aspire se abre automáticamente (normalmente en `https://localhost:17000`). Desde ahí se ven los proyectos `api` y `web`. Click en el endpoint de `web` abre el frontend React en el navegador.

---

## 17. Checklist de implementación para Claude Code

### Fase 1 — Scaffolding

- [ ] Crear solución `CocinaServicio.sln`
- [ ] Crear `CocinaServicio.AppHost` (Aspire template)
- [ ] Añadir `Aspire.Hosting.NodeJs` al AppHost
- [ ] Crear `CocinaServicio.Contracts` (class library .NET 10)
- [ ] Crear `CocinaServicio.Api` (ASP.NET Core Minimal API)
- [ ] Crear `CocinaServicio.Web` con Vite + React + TypeScript (fuera del .sln, es npm project)
- [ ] Referenciar Contracts desde la Api
- [ ] Configurar AppHost para orquestar Api + Web (con `AddNpmApp` para el frontend)
- [ ] Configurar CORS en la Api para aceptar el origen del dev server de Vite

### Fase 2 — Contratos

- [ ] Definir value objects (Plato, Destino, enums)
- [ ] Definir todos los eventos de integración
- [ ] Definir todos los comandos (incluyendo compensaciones)

### Fase 3 — Módulos del monolito

Para cada módulo (MenuPlanning, Kitchen, Routing, TrayAssembly, Delivery, Cleanup, Inventory):

- [ ] Carpeta `Modules/{Name}/`
- [ ] Estructura: `Domain/`, `Application/`, `Infrastructure/`, `Endpoints/`
- [ ] Agregado (si aplica)
- [ ] Repositorio in-memory (si aplica)
- [ ] Consumers de MassTransit (si aplica)
- [ ] Endpoints REST (si aplica)
- [ ] Método de extensión `AddXxxModule(this IServiceCollection)` para registro

### Fase 4 — Saga

- [ ] `ServicioComidaSagaState` con todos los campos
- [ ] `ServicioComidaSaga` state machine completa
- [ ] Todos los estados y transiciones del happy path
- [ ] Todas las compensaciones con sus commands
- [ ] Registro en `Program.cs` con `InMemoryRepository()`

### Fase 5 — SignalR y visualización

- [ ] `CocinaHub` en la API con métodos para push
- [ ] Filtro de MassTransit (`PublishObserver`) que intercepta todos los eventos publicados y los reenvía vía SignalR
- [ ] Configuración de CORS en la API para permitir el origen del dev server de Vite

### Fase 6 — Frontend React

- [ ] Crear proyecto Vite: `npm create vite@latest CocinaServicio.Web -- --template react-ts`
- [ ] Instalar dependencias: `@microsoft/signalr`, `framer-motion`, `tailwindcss`
- [ ] Configurar Tailwind: `npx tailwindcss init -p`
- [ ] Configurar `vite.config.ts` para usar `process.env.PORT`
- [ ] Ajustar `package.json` con script `dev` usando `--port $PORT`
- [ ] `src/types/contracts.ts` — types TS espejo de los contratos C#
- [ ] `src/services/api.ts` — cliente fetch para los endpoints
- [ ] `src/hooks/useCocinaHub.ts` — hook custom para SignalR
- [ ] `src/components/MapaCocina.tsx` — SVG con los 7 nodos y conexiones
- [ ] `src/components/ServicioNode.tsx` — nodo individual con animación Framer Motion
- [ ] `src/components/PlatoViajero.tsx` — círculo animado que se desplaza
- [ ] `src/components/TimelineEventos.tsx` — lista lateral con auto-scroll
- [ ] `src/components/PanelControl.tsx` — botones iniciar + simular fallo
- [ ] `src/App.tsx` — composición final
- [ ] Verificar CORS en la API para permitir el origen del dev server de Vite

### Fase 7 — Demo helpers

- [ ] Endpoints de `/api/demo/*`
- [ ] `FailureInjector` para inyectar fallos en cada consumer
- [ ] Fakes de Horno y Lavavajillas con `Task.Delay`

### Fase 8 — Testing mínimo

- [ ] Test del happy path de la saga con `InMemoryTestHarness`
- [ ] Un test por cada compensación

---

## 18. Criterios de "demo funcionando"

La demo está lista cuando:

1. `dotnet run --project CocinaServicio.AppHost` arranca todo sin errores.
2. El dashboard de Aspire muestra `api` y `web` en verde.
3. Abres el frontend y ves el mapa de la cocina con los 7 módulos.
4. Pulsas "Servir en comedor" y ves:
   - El plato moviéndose entre los módulos.
   - Los módulos iluminándose en orden.
   - Los eventos apareciendo en el timeline.
   - El estado de la saga cambiando.
   - Al final, todos los módulos verdes y saga en `Completed`.
5. Simulas un fallo y ves la compensación retrocediendo visualmente.

---

## 19. Fuera de alcance

- Base de datos (todo in-memory)
- Broker de mensajería (MassTransit InMemory)
- Autenticación / autorización
- Docker / contenedores
- CI/CD
- Observabilidad avanzada (basta con logs por consola + dashboard Aspire)
- Resilience con Polly (innecesario para demo)
- Los 5 hotspots (se documentan pero no se implementan)

---

## 20. Consideraciones finales para la clase

- Los tiempos de `Task.Delay` en cada módulo deben ser visibles — entre 1.5s y 3s — para que los alumnos vean la animación sin aburrirse.
- El color de cada módulo en el mapa debe coincidir con el código del Event Storming (naranja=eventos, azul=comandos, amarillo=agregados, etc.).
- El timeline debe mostrar el tipo de mensaje (evento/comando/compensación) con un icono diferenciado.
- Al terminar un flujo con éxito, mostrar un pequeño confetti o check verde grande.
- Al ejecutar compensaciones, mostrar en pantalla el nombre del comando de compensación que se está ejecutando.

Cuando pregunten "¿y en producción?":
1. Cada módulo pasaría a ser su propio proyecto/servicio.
2. Cambiar `UsingInMemory` por `UsingRabbitMq` (desarrollo) o `UsingAzureServiceBus` (prod).
3. Cambiar `InMemoryRepository` por `EntityFrameworkRepository` con SQL Server.
4. Añadir Outbox Pattern para garantizar consistencia.
5. Los contratos, la saga y los consumers **no cambian**.

Esa es la lección clave de la demo.
