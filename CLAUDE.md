# CLAUDE.md

Este archivo da contexto a Claude Code sobre el proyecto. Se lee automáticamente al abrir el repositorio.

## Qué es este proyecto

Demo de microservicios para formación. Un dominio de cocina que prepara comida, monta bandejas y las sirve en comedor o cama. Ilustra patrones de microservicios (bounded contexts, eventos de dominio, saga con compensaciones) usando .NET Aspire, MassTransit y React.

El documento canónico de especificaciones es `CocinaServicio-Especificaciones.md`. Si hay cualquier duda sobre qué construir, ese es el sitio donde mirar antes de preguntar.

## Reglas críticas — NO negociables

1. **Sin broker externo.** Toda la mensajería es MassTransit InMemory. No instalar RabbitMQ, Azure Service Bus, Kafka ni nada.
2. **Sin Docker.** La demo corre con `dotnet run` del AppHost de Aspire. Ningún contenedor.
3. **Sin base de datos.** Persistencia con `ConcurrentDictionary<Guid, T>` en memoria. Cada módulo tiene su repositorio in-memory. Nada de EF Core, SQL Server, PostgreSQL o similar.
4. **Monolito modular, no microservicios separados.** MassTransit InMemory es process-local — los 7 bounded contexts viven en el mismo proceso `CocinaServicio.Api` como carpetas/módulos. No crear un proyecto por cada servicio.
5. **Sin autenticación.** Fuera de alcance para la demo.
6. **Frontend React + Vite + TypeScript.** No Blazor, no Angular, no Vue.

## Reglas de código

### C# / .NET

- **async/await en todo lo asíncrono.** Nunca `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`.
- **Nunca `Task.FromResult` ni `Task.CompletedTask`** en métodos que deban ser asíncronos. Usar `await Task.Yield()` si el método no hace I/O real pero debe ser asíncrono.
- Métodos asíncronos acaban en `Async` y reciben `CancellationToken ct = default`.
- Minimal APIs, no Controllers.
- Records para DTOs, eventos y comandos. Clases para agregados.
- Nullable reference types habilitado (`<Nullable>enable</Nullable>`).

### TypeScript / React

- **async/await siempre**, nunca `.then()`.
- Handlers de eventos en React que hagan llamadas async se escriben como funciones `async` separadas (`const handleX = async () => {...}`), no inline en `onClick`.
- `try/catch` en todas las llamadas async que puedan fallar.
- Types en `src/types/` espejan exactamente los contratos C#.
- Componentes funcionales con hooks, nada de clases.

### Estilo general

- Código en inglés; comentarios y textos de UI en español.
- Sin código comentado. Si sobra, se borra.
- Nombres descriptivos > comentarios explicativos.

## Estructura del proyecto

```
CocinaServicio.sln
├── src/
│   ├── CocinaServicio.Api/          Monolito modular (backend)
│   │   └── Modules/                 7 bounded contexts como carpetas
│   └── CocinaServicio.Web/          Frontend React (npm project)
├── shared/
│   └── CocinaServicio.Contracts/    DTOs, eventos, comandos compartidos
└── infrastructure/
    └── CocinaServicio.AppHost/      Orquestador Aspire
```

Cada módulo en `src/CocinaServicio.Api/Modules/` sigue la misma estructura interna:
- `Domain/` — agregados y value objects
- `Application/` — consumers y handlers
- `Infrastructure/` — repositorio in-memory
- `Endpoints/` — endpoints REST si el módulo los expone
- `XxxModule.cs` — método de extensión `AddXxxModule` para DI

## Comandos frecuentes

```bash
# Arrancar todo (backend + frontend)
dotnet run --project infrastructure/CocinaServicio.AppHost

# Restaurar dependencias .NET
dotnet restore

# Instalar deps del frontend (solo primera vez)
cd src/CocinaServicio.Web && npm install

# Build del backend
dotnet build

# Tests
dotnet test
```

El dashboard de Aspire se abre automáticamente al ejecutar el AppHost. Desde ahí se accede al frontend y a la API.

## Patrones y convenciones

### Eventos de dominio
Están en `CocinaServicio.Contracts/Events/`. Son `record`s inmutables. El que los publica es siempre el módulo "dueño" del agregado que ha cambiado de estado.

### Comandos
Están en `CocinaServicio.Contracts/Commands/`. Los envía la saga a los módulos mediante `Send` (no `Publish`). Point-to-point.

### Saga
`ServicioComidaSaga` es el orquestador central. Escucha eventos y envía comandos. Los módulos nunca se hablan entre sí — todo pasa por la saga. Esto es deliberado para que la demo sea didáctica.

### SignalR
El hub `CocinaHub` en `/hubs/cocina` emite eventos al frontend. Los eventos se capturan con `IPublishObserver` e `ISendObserver` de MassTransit, no desde los consumers.

**Orden crítico en `Program.cs`:** `ConnectPublishObserver` y `ConnectSendObserver` deben registrarse **antes** de `ConfigureEndpoints(context)`. Si no, los observers no capturan nada.

### CORS
Configurado para aceptar `http://localhost:3000` y `http://localhost:5173` (puertos típicos de Vite dev server). Si Aspire asigna otro puerto al frontend, actualizar la policy.

### Fakes de sistemas externos
Horno, Vitrocerámica, Lavavajillas se simulan con `Task.Delay`. Los tiempos están en la sección 16.1 del documento de especificaciones — no cambiarlos sin razón, están calibrados para que la demo sea visible pero no lenta.

## Cuándo pedir confirmación antes de actuar

- Cambios en contratos (añadir/modificar eventos o comandos) — impactan a toda la solución.
- Cambios en la saga state machine — son delicados, un cambio mal hecho rompe el happy path.
- Añadir paquetes NuGet o npm nuevos — verificar primero si ya tenemos algo que haga lo mismo.
- Crear proyectos nuevos en la solución — la estructura está fijada y debería ser estable.

## Cuándo NO pedir confirmación

- Implementar un consumer nuevo si ya está descrito en las especificaciones.
- Añadir endpoints REST que ya están documentados.
- Crear componentes React siguiendo los ejemplos del documento.
- Refactors internos de un módulo que no cambian su API pública.

## Troubleshooting común

**El frontend conecta al hub pero no recibe eventos:**
Los observers de MassTransit no se registraron antes de `ConfigureEndpoints`. Revisar el orden en `Program.cs`.

**La saga no reacciona a un evento:**
Revisar la configuración de `CorrelateBy` en el `Event()` correspondiente. Los IDs tienen que coincidir entre el estado de la saga y el payload del evento.

**CORS bloquea la conexión desde el frontend:**
El puerto del dev server de Vite no coincide con la policy. Añadirlo a la lista de orígenes permitidos o mirar qué puerto asignó Aspire.

**`npm install` falla en Windows:**
Comprobar que Node.js está instalado y que la versión es >= 18.

**La saga no se inicia:**
Verificar que `MenuDecidido` se publica con un `MenuId` correcto y que está configurado como evento inicial en la state machine (`Initially(When(MenuDecididoEvent)...)`).

## Documentación de referencia

- **Especificaciones completas:** `CocinaServicio-Especificaciones.md` (raíz del repo)
- **MassTransit:** https://masstransit.io/documentation/patterns/saga
- **Aspire:** https://learn.microsoft.com/dotnet/aspire
- **Vite + React:** https://vitejs.dev/guide/

## Qué NO hacer, nunca

- Añadir persistencia con EF Core "porque mejoraría la demo". No.
- Separar los módulos en proyectos distintos "para que parezcan microservicios de verdad". No — rompe la demo por cómo funciona InMemory transport.
- Añadir `if (HttpContext.User.IsAuthenticated)` o similar. No hay auth.
- Meter Docker Compose "para que sea más fácil de correr". No, Aspire ya orquesta todo.
- Reemplazar MassTransit InMemory por otro broker "para producción". La demo es para formación, no para producción.
- Hacer pull requests a main sin validar que el happy path funciona end-to-end en el navegador.
