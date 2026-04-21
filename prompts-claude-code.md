# Prompts para Claude Code — CocinaServicio

Guía de uso: copia y pega cada prompt en Claude Code cuando toque. Avanza fase a fase y valida antes de seguir. No te saltes la validación — un error en la fase 1 multiplica en las siguientes.

Antes de empezar, asegúrate de tener en la carpeta del proyecto:
- `CocinaServicio-Especificaciones.md` (el documento canónico)
- `CLAUDE.md` (el archivo de contexto del proyecto)

---

## Prompt inicial — Setup de contexto

Usa este prompt la primera vez que abras Claude Code en el proyecto:

```
Lee completo el archivo CocinaServicio-Especificaciones.md antes de hacer nada.
Después lee CLAUDE.md.

Cuando termines, confirma que has entendido:
1. Que es un monolito modular, no 7 proyectos separados.
2. Que usamos MassTransit InMemory (sin broker externo).
3. Que no hay base de datos (ConcurrentDictionary).
4. Que el frontend es React con Vite.
5. Que toda la comunicación asíncrona es con async/await (nada de .then() ni .Result).

No escribas código todavía. Solo confirma que tienes el contexto claro y dime si ves alguna ambigüedad en las especificaciones.
```

Valida que responde coherentemente. Si menciona algo raro (RabbitMQ, Blazor, EF Core...), pásale de nuevo las reglas críticas del CLAUDE.md.

---

## Fase 1 — Scaffolding

```
Ejecuta la Fase 1 del checklist (sección 17 del documento de especificaciones):

1. Crea la solución CocinaServicio.sln con la estructura de carpetas src/, shared/, infrastructure/.
2. Crea el proyecto CocinaServicio.AppHost (Aspire).
3. Añade el paquete Aspire.Hosting.NodeJs al AppHost.
4. Crea CocinaServicio.Contracts como class library .NET 10.
5. Crea CocinaServicio.Api como ASP.NET Core Minimal API.
6. Crea CocinaServicio.Web con Vite + React + TypeScript dentro de src/ (no lo añadas al .sln, es un proyecto npm).
7. Referencia Contracts desde la Api.
8. Configura el AppHost con AddProject para la Api y AddNpmApp para el Web tal como indica la sección 11 del documento.
9. Configura CORS en la Api para los puertos 3000 y 5173.
10. Instala cross-env en CocinaServicio.Web y configura el script "dev" del package.json como indica la sección 11.

Al terminar, ejecuta "dotnet build" para confirmar que compila y párate. No implementes ni contratos ni módulos todavía.
```

**Validación:** `dotnet build` tiene que pasar sin errores. El AppHost tiene que poder arrancar (aunque el Web aún no haga nada útil, el API tiene que levantar).

---

## Fase 2 — Contratos

```
Ejecuta la Fase 2: implementa todos los contratos en CocinaServicio.Contracts según las secciones 7.1 a 7.4 del documento de especificaciones.

Concretamente:
- Value objects en Contracts/ValueObjects/: Plato, Destino, TipoPlato, EstadoComida, EstadoLimpieza.
- Eventos de dominio en Contracts/Events/: los 9 eventos del happy path más los 4 eventos de fallo (ComidaQuemada, DestinoNoDisponible, BandejaNoDisponible, DerrameEnTransporte) indicados en la sección 5.6.
- Comandos en Contracts/Commands/: DecidirMenu, CocinarComida, PrepararBandeja, LlevarBandeja, IniciarLimpieza.
- Comandos de compensación en Contracts/Commands/: DescartarComida, RerouteDestino, MantenerCaliente, RetornarBandeja.

Todos los tipos son records inmutables. Usa los namespaces tal como aparecen en el documento.

Cuando termines, "dotnet build" debe seguir pasando.
```

**Validación:** Compila. Los records están distribuidos por carpetas coherentes.

---

## Fase 3 — Módulos del monolito

Esta fase es la más larga. Hazla módulo por módulo, validando entre medias. Ejemplo con el primero:

```
Implementa el módulo Inventory en src/CocinaServicio.Api/Modules/Inventory/ siguiendo las secciones 4.2 y 8.7 del documento.

Estructura requerida:
- Domain/
- Application/
- Infrastructure/ con el InMemoryInventoryService
- Endpoints/ con el GET /api/inventory y GET /api/inventory/platos-posibles
- InventoryModule.cs con el método de extensión AddInventoryModule y MapInventoryEndpoints

Sigue el patrón async/await con Task.Yield() en el repositorio in-memory, tal como se especifica.

Cuando termines: dotnet build, luego dotnet run --project infrastructure/CocinaServicio.AppHost y verifica que GET /api/inventory responde con los 9 platos del catálogo.
```

Una vez validado Inventory, repite para cada uno de los demás módulos en este orden:

1. ~~Inventory~~ (ya hecho)
2. **MenuPlanning** — consume `DecidirMenu`, consulta Inventory, publica `MenuDecidido`.
3. **Kitchen** — consume `CocinarComida`, publica `ComidaPreparada`. Consulta el `IFailureInjector` para ver si debe publicar `ComidaQuemada`.
4. **TrayAssembly** — consume `PrepararBandeja`, publica `BandejaComedorPreparada` o `BandejaCamaPreparada`.
5. **Delivery** — consume `LlevarBandeja`, publica `ComidaServidaEn*`. Tras el delay publica también `ComidaConsumida` (el comensal come automáticamente).
6. **Cleanup** — consume `IniciarLimpieza`, publica `BandejaRecogida` y `CocinaDespejada`.
7. **Routing** — en realidad la lógica vive en la saga, así que este módulo puede ser mínimo o desaparecer. Déjalo vacío o simbólico.

Prompt para cada módulo:

```
Implementa el módulo [NOMBRE] en src/CocinaServicio.Api/Modules/[NOMBRE]/ siguiendo las especificaciones.

Debe:
- Consumir: [EVENTOS/COMANDOS que consume]
- Publicar: [EVENTOS que publica]
- Usar el Task.Delay indicado en la sección 16.1 del documento ([X]s).
- Consultar el IFailureInjector para el step [STEP] y publicar el evento de fallo correspondiente si procede.
- Usar async/await en todas las operaciones.

Crea el XxxModule.cs con AddXxxModule() como método de extensión.

Cuando termines, valida que dotnet build pasa.
```

**Validación después de todos los módulos:** compila todo, el AppHost arranca, el swagger de la API (si lo has añadido) muestra los endpoints.

---

## Fase 4 — Saga

```
Implementa la saga ServicioComidaSaga en src/CocinaServicio.Api/Sagas/ siguiendo exactamente el código de la sección 5.5 del documento de especificaciones.

Incluye:
- ServicioComidaSagaState.cs con todos los campos de la sección 5.4.
- ServicioComidaSaga.cs con el happy path completo y las 4 compensaciones.
- Registro en Program.cs con AddSagaStateMachine y InMemoryRepository.

IMPORTANTE: el orden en Program.cs es crítico. ConnectPublishObserver y ConnectSendObserver van ANTES de ConfigureEndpoints(context). Verifica eso.

Cuando termines, dotnet build debe pasar y dotnet run --project infrastructure/CocinaServicio.AppHost debe arrancar sin errores. Aún no podremos probarla porque falta el endpoint demo.
```

**Validación:** compila, arranca, no crashea. Los warnings de MassTransit sobre configuración son normales.

---

## Fase 5 — SignalR y visualización backend

```
Implementa el sistema de reenvío de eventos a SignalR siguiendo la sección 12 del documento:

1. CocinaHub.cs en src/CocinaServicio.Api/Hubs/ (sección 12.1).
2. SignalRPublishObserver.cs en src/CocinaServicio.Api/Messaging/ (sección 12.2).
3. SignalRSendObserver.cs en la misma carpeta.
4. Registra el hub con app.MapHub<CocinaHub>("/hubs/cocina") en Program.cs.
5. Conecta los observers en la configuración de MassTransit — ANTES de ConfigureEndpoints.

Cuando termines: arranca el AppHost, abre el navegador en la URL del hub (/hubs/cocina) y verifica que responde (aunque sea con un 404 estándar de SignalR sin negotiate, significa que el endpoint existe).
```

**Validación:** el hub está mapeado. Si conectas manualmente desde un cliente SignalR (o desde la devtools del navegador) debe aceptarte.

---

## Fase 6 — Frontend React

Esta fase también la divido en sub-prompts para no abrumar:

### 6.1 — Config del frontend

```
Configura CocinaServicio.Web:

1. Crea vite.config.ts según la sección 10.12.
2. Configura tailwind.config.js con la paleta del Event Storming de la sección 10.12.
3. Crea src/index.css con las directivas de Tailwind.
4. Ajusta src/main.tsx según la sección 10.12.
5. Ajusta index.html.

Cuando termines: "npm run dev" debe arrancar Vite sin errores (aunque el App.tsx aún esté vacío).
```

### 6.2 — Types, servicios y hook

```
Implementa:

1. src/types/contracts.ts según la sección 10.11.
2. src/services/api.ts según la sección 10.9.
3. src/hooks/useCocinaHub.ts según la sección 10.3.

Usa async/await en todas partes. Sin .then(), sin .catch() en cadena — try/catch dentro de funciones async.

Valida con "npm run build" que compila TypeScript sin errores.
```

### 6.3 — Componentes visuales

```
Implementa los componentes React según las secciones 10.4 a 10.8:

1. src/components/MapaCocina.tsx (sección 10.4).
2. src/components/ServicioNode.tsx (sección 10.5).
3. src/components/PlatoViajero.tsx (sección 10.6).
4. src/components/TimelineEventos.tsx (sección 10.7).
5. src/components/PanelControl.tsx (sección 10.8).

Después compón todo en src/App.tsx según la sección 10.10.

Valida con "npm run build" que compila.
```

---

## Fase 7 — Demo helpers y endpoints

```
Implementa los últimos componentes backend para que la demo sea disparable:

1. FailureInjector en src/CocinaServicio.Api/Demo/FailureInjector.cs (sección 8.6).
2. DemoEndpoints en src/CocinaServicio.Api/Demo/DemoEndpoints.cs (sección 8.5).
3. Registra el FailureInjector como singleton en Program.cs.
4. Llama a app.MapDemoEndpoints() en Program.cs.

Cuando termines, arranca el AppHost completo y valida que:
- POST /api/demo/iniciar-flujo-demo con body {"destino":"Comedor","conBebida":false} responde 202 con un correlationId.
- El frontend conecta al hub sin errores en la consola del navegador.
- Al pulsar el botón "Servir en comedor", se ven eventos llegando al timeline del frontend y el plato moviéndose entre nodos.
```

**Validación final — el momento de la verdad:**

Abre el frontend, pulsa "Servir en comedor" y observa:
- El plato viaja por los 7 nodos en orden.
- Los nodos se iluminan (amber) al procesar y vuelven a blanco al terminar.
- El timeline muestra los eventos en orden con timestamp.
- El estado de la saga en el panel de control cambia: `Cooking → Routing → AssemblingTray → Delivering → Serving → CleaningUp → Completed`.
- Al final, estado `Completed`.

Después prueba las compensaciones: selecciona "Comida quemada" en el selector y pulsa "Simular". Debes ver el flujo arrancar, llegar a Kitchen, y ahí mostrarse `ComidaQuemada` en el timeline con borde rojo.

---

## Fase 8 — Testing mínimo

```
Crea un proyecto de tests CocinaServicio.Api.Tests usando xUnit.

Añade:
1. Un test del happy path completo de la saga usando MassTransit InMemoryTestHarness. Publica MenuDecidido, avanza los eventos manualmente y verifica que la saga termina en estado Completed.
2. Un test por cada compensación: ComidaQuemada, DestinoNoDisponible, BandejaNoDisponible, DerrameEnTransporte.

Usa async/await en todos los tests. Nada de .Result.

Cuando termines: "dotnet test" debe pasar todos los tests.
```

---

## Si algo sale mal

Cuando un paso falle, en vez de pedirle a Claude Code que "arregle lo que rompiste", dale contexto específico:

```
Ejecuto "dotnet run --project infrastructure/CocinaServicio.AppHost" y obtengo este error:

[pegar el error completo]

Antes de tocar nada, dime qué crees que está pasando y qué cambio mínimo lo arregla. No escribas código todavía.
```

Este patrón evita que entre en bucle tocando cosas sin entender el problema.

---

## Cuando la demo funcione

Último prompt para dejarlo limpio:

```
La demo funciona. Haz una revisión final:

1. Verifica que no hay código muerto o comentado.
2. Revisa que todos los métodos asíncronos usan async/await (ni .then ni .Result ni Task.FromResult).
3. Confirma que no hay dependencias NuGet o npm que no se usen.
4. Asegúrate de que el README.md de la raíz explica cómo arrancar la demo en 3 comandos.

Lista lo que has cambiado y párate.
```

Después, haz un `git commit` y estás listo para la clase.
