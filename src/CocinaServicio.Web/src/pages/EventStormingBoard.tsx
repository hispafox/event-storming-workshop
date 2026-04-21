import { useState } from 'react';

const COLORS = {
  event: '#FF8C00',
  command: '#3B82F6',
  actor: '#FBBF24',
  aggregate: '#EAB308',
  readModel: '#22C55E',
  policy: '#8B5CF6',
  external: '#EC4899',
  hotspot: '#EF4444',
  bg: '#f5f5f0',
  surface: '#ffffff',
  text: '#1e293b',
  muted: '#64748b',
} as const;

type TipoElemento = 'event' | 'command' | 'actor' | 'aggregate' | 'readModel' | 'policy' | 'external' | 'hotspot';

const ELEMENT_TYPES: Record<TipoElemento, { label: string; color: string; icon: string }> = {
  event: { label: 'Eventos de Dominio', color: COLORS.event, icon: '⚡' },
  command: { label: 'Comandos', color: COLORS.command, icon: '▶' },
  actor: { label: 'Actores', color: COLORS.actor, icon: '👤' },
  aggregate: { label: 'Agregados', color: COLORS.aggregate, icon: '📦' },
  readModel: { label: 'Modelos de Lectura', color: COLORS.readModel, icon: '📖' },
  policy: { label: 'Políticas', color: COLORS.policy, icon: '⚙' },
  external: { label: 'Sistemas Externos', color: COLORS.external, icon: '🔗' },
  hotspot: { label: 'Hotspots / Dudas', color: COLORS.hotspot, icon: '🔥' },
};

type CatalogItem = {
  name: string;
  desc: string;
  flow?: string;
  actor?: string;
  trigger?: string;
  attrs?: string;
  fields?: string;
  rule?: string;
  criteria?: string;
  impact?: string;
  integration?: string;
};

const CATALOG: Record<TipoElemento, CatalogItem[]> = {
  actor: [
    { name: 'Cocinero', desc: 'Persona que decide el menú, prepara los alimentos y monta las bandejas en la cocina. Es el actor principal de todo el flujo.', flow: 'Principal' },
    { name: 'Comensal (Comedor)', desc: 'Persona que recibe la bandeja en el comedor y consume la comida sentada a la mesa. Inicia el flujo de recogida al terminar.', flow: 'Flujo A' },
    { name: 'Comensal (Cama)', desc: 'Persona que recibe la bandeja especial en la habitación y come recostada en la cama. Mayor riesgo de derrames.', flow: 'Flujo B' },
  ],
  command: [
    { name: 'Decidir Menú', desc: 'El cocinero elige qué platos va a preparar. Puede basarse en ingredientes disponibles, preferencias o antojo del momento.', actor: 'Cocinero', flow: 'Principal' },
    { name: 'Preparar Comida', desc: 'Cocinar los alimentos elegidos: cortar, calentar, emplatar. Incluye preparación de todos los platos del menú.', actor: 'Cocinero', flow: 'Principal' },
    { name: 'Preparar Bandeja Comedor', desc: 'Montar una bandeja estándar plana con los platos, cubiertos, servilleta y vaso. Configuración clásica para llevar a la mesa.', actor: 'Cocinero', flow: 'Flujo A' },
    { name: 'Preparar Bandeja Cama', desc: 'Montar una bandeja especial con patas plegables, superficie antideslizante, y opcionalmente tapa para bebidas. Adaptada para usar sobre el colchón.', actor: 'Cocinero', flow: 'Flujo B' },
    { name: 'Llevar al Comedor', desc: 'Transportar la bandeja desde la cocina hasta la mesa del comedor. Trayecto corto, sin restricciones especiales.', actor: 'Cocinero', flow: 'Flujo A' },
    { name: 'Llevar a la Habitación', desc: 'Transportar la bandeja con patas desde la cocina hasta la cama. Requiere cuidado extra para no derramar líquidos en el trayecto.', actor: 'Cocinero', flow: 'Flujo B' },
    { name: 'Recoger Bandeja', desc: 'Retirar la bandeja usada (del comedor o de la cama) y llevarla de vuelta a la cocina para su limpieza.', actor: 'Cocinero', flow: 'Flujo C' },
    { name: 'Limpiar y Guardar', desc: 'Fregar platos, cubiertos y bandeja (manual o lavavajillas), secar y almacenar todo en su sitio. Dejar la cocina despejada.', actor: 'Cocinero', flow: 'Flujo C' },
  ],
  aggregate: [
    { name: 'Menú', desc: 'Conjunto de platos seleccionados para la comida. Contiene la lista de recetas, ingredientes necesarios y orden de preparación.', attrs: 'platos[], ingredientes[], tiempoEstimado' },
    { name: 'Comida', desc: 'Los alimentos ya preparados y listos para emplatar. Representa el resultado del proceso de cocción.', attrs: 'platos[], estado (crudo → cocinado → emplatado), temperatura' },
    { name: 'Bandeja Comedor', desc: 'Bandeja plana estándar. Incluye los slots para platos, cubiertos, servilleta y vaso. Sin características especiales.', attrs: 'tipo: plana, contenido[], cubiertos, servilleta, vaso' },
    { name: 'Bandeja Cama', desc: 'Bandeja con patas plegables y superficie antideslizante. Diseñada para estabilidad sobre colchón. Puede incluir tapa para bebidas.', attrs: 'tipo: conPatas, patasDesplegadas, antideslizante, tapaLíquidos, contenido[]' },
    { name: 'Bandeja (post-uso)', desc: 'Agregado genérico de bandeja tras la comida. Ya sin distinguir tipo, solo pendiente de limpieza y almacenaje.', attrs: 'estado (sucia → limpia → guardada), restos[]' },
  ],
  event: [
    { name: 'MenúDecidido', desc: 'Se ha elegido qué platos se van a preparar. Desencadena el inicio de la preparación de comida.', trigger: 'Decidir Menú', flow: 'Principal' },
    { name: 'ComidaPreparada', desc: 'Todos los platos están cocinados y emplatados. Evento pivote que activa la política de elegir destino (comedor o cama).', trigger: 'Preparar Comida', flow: 'Principal → bifurcación' },
    { name: 'BandejaComedorPreparada', desc: 'La bandeja plana estándar está montada con platos, cubiertos, servilleta y vaso. Lista para transportar al comedor.', trigger: 'Preparar Bandeja Comedor', flow: 'Flujo A' },
    { name: 'BandejaCamaPreparada', desc: 'La bandeja con patas está montada con alimentos asegurados, antideslizante activo y bebida con tapa (opcional). Lista para la habitación.', trigger: 'Preparar Bandeja Cama', flow: 'Flujo B' },
    { name: 'ComidaServidaEnComedor', desc: 'La bandeja ha llegado al comedor y el comensal ya tiene la comida en la mesa. Servicio completado en comedor.', trigger: 'Llevar al Comedor', flow: 'Flujo A' },
    { name: 'ComidaServidaEnCama', desc: 'La bandeja con patas está colocada sobre la cama y el comensal puede empezar a comer. Servicio completado en habitación.', trigger: 'Llevar a la Habitación', flow: 'Flujo B' },
    { name: 'ComidaConsumida', desc: 'El comensal ha terminado de comer (en comedor o en cama). Inicia el proceso de recogida.', trigger: 'Acción del comensal', flow: 'Flujo C' },
    { name: 'BandejaRecogida', desc: 'La bandeja usada ha sido retirada y devuelta a la cocina. Activa la política de limpieza.', trigger: 'Recoger Bandeja', flow: 'Flujo C' },
    { name: 'CocinaDespejada', desc: 'Todo está limpio, seco y guardado. La cocina vuelve a su estado inicial, lista para el próximo ciclo.', trigger: 'Limpiar y Guardar', flow: 'Flujo C' },
  ],
  policy: [
    { name: 'ElegirDestino', rule: 'WHEN ComidaPreparada THEN ElegirDestino', desc: 'Tras preparar la comida, el cocinero decide si la sirve en el comedor (bandeja plana) o en la habitación (bandeja con patas). Es el punto de bifurcación del flujo.', criteria: 'Depende del estado del comensal, hora del día, tipo de comida, o preferencia personal.' },
    { name: 'LimpiarYGuardar', rule: 'WHEN BandejaRecogida THEN LimpiarYGuardar', desc: 'Automáticamente al recoger la bandeja, se inicia el proceso de limpieza. No se deja acumular.', criteria: 'Se aplica siempre, sin excepciones. Puede usar lavavajillas o lavado manual.' },
    { name: 'TapaParaLíquidos', rule: 'WHEN destino=CAMA AND hayBebida THEN UsarTapa', desc: 'Si el destino es la cama y hay líquidos en la bandeja, se recomienda usar tapa o vaso con cierre para evitar derrames sobre la ropa de cama.', criteria: 'Solo aplica al flujo de cama. Condicional a la presencia de bebidas.' },
  ],
  readModel: [
    { name: 'Estado Bandeja Comedor', desc: 'Vista del contenido de la bandeja para comedor. Permite verificar que todos los elementos están antes de transportar.', fields: 'platos (sí/no), cubiertos (tenedor, cuchillo, cuchara), servilleta, vaso, salero/especias' },
    { name: 'Estado Bandeja Cama', desc: 'Vista del contenido y configuración de la bandeja para cama. Incluye checklist de seguridad anti-derrame.', fields: 'platos, cubiertos, patas desplegadas (sí/no), antideslizante activo, bebida con tapa, servilleta extra' },
    { name: 'Inventario Cocina', desc: 'Vista rápida de ingredientes disponibles para decidir el menú. Consultada antes de arrancar a cocinar.', fields: 'ingredientes frescos, ingredientes despensa, caducidades próximas, platos posibles' },
    { name: 'Estado Cocina', desc: 'Vista general del estado de la cocina: si está libre, ocupada cocinando, o pendiente de limpieza.', fields: 'estado (libre / cocinando / sucia / limpiando), bandejas disponibles, lavavajillas (lleno/vacío)' },
  ],
  hotspot: [
    { name: '¿Bandeja con patas o sin patas?', desc: 'Al preparar la bandeja para la cama, ¿siempre se usan patas plegables o a veces se usa una bandeja plana con cojín? ¿Depende del tipo de comida?', impact: 'Afecta al agregado BandejaCama y a la política de preparación.' },
    { name: '¿Bebida con tapa obligatoria?', desc: '¿Los líquidos SIEMPRE llevan tapa cuando van a la cama, o solo si es sopa/café? ¿Qué pasa con un vaso de agua?', impact: 'Afecta a la política TapaParaLíquidos y al modelo de lectura de la bandeja.' },
    { name: '¿Quién recoge la bandeja?', desc: '¿La recoge siempre el cocinero o a veces el propio comensal la devuelve a la cocina? ¿Cambia según destino (comedor vs cama)?', impact: 'Podría añadir un actor adicional o una política de recogida diferenciada.' },
    { name: '¿Servicio simultáneo?', desc: '¿Puede haber dos comensales simultáneos, uno en comedor y otro en cama? Si es así, ¿se preparan dos bandejas distintas en paralelo?', impact: 'Afecta a la concurrencia del flujo y posible paralelización de Flujo A y B.' },
    { name: '¿Postre en viaje separado?', desc: '¿El postre/café se sirve en la misma bandeja o requiere un segundo viaje? ¿Se considera un nuevo comando o extensión del actual?', impact: 'Podría generar eventos adicionales (PostreServido) o un subflujo.' },
  ],
  external: [
    { name: 'Lavavajillas', desc: 'Electrodoméstico que automatiza parte del proceso de limpieza. Recibe platos, cubiertos y vasos sucios.', integration: 'Entrada: vajilla sucia. Salida: vajilla limpia. Ciclo: 1-2h. Requiere detergente y sal.' },
    { name: 'Nevera / Despensa', desc: 'Sistema de almacenamiento de ingredientes. Consultado al decidir el menú para verificar disponibilidad.', integration: 'Lectura: inventario de ingredientes. No se modifica desde el flujo (reposición es otro proceso).' },
    { name: 'Horno / Vitrocerámica', desc: 'Fuentes de calor para la preparación de comida. Sistemas externos que el cocinero controla durante PrepararComida.', integration: 'Control: temperatura, tiempo. Señal: comida lista (temporizador/alarma).' },
  ],
};

type FlowStep = { type: TipoElemento; text: string };
type Flow = { id: string; title: string; steps: FlowStep[] };

const flows: Flow[] = [
  {
    id: 'main', title: 'Flujo Principal — Preparar Comida',
    steps: [
      { type: 'actor', text: 'Cocinero' },
      { type: 'command', text: 'Decidir Menú' },
      { type: 'aggregate', text: 'Menú' },
      { type: 'event', text: 'MenúDecidido' },
      { type: 'command', text: 'Preparar\nComida' },
      { type: 'aggregate', text: 'Comida' },
      { type: 'event', text: 'Comida\nPreparada' },
      { type: 'policy', text: 'WHEN Comida\nPreparada THEN\nElegirDestino' },
    ],
  },
  {
    id: 'A', title: 'Flujo A — Servir en Comedor',
    steps: [
      { type: 'event', text: 'Comida\nPreparada' },
      { type: 'command', text: 'Preparar Bandeja\nComedor' },
      { type: 'aggregate', text: 'Bandeja\nComedor' },
      { type: 'event', text: 'Bandeja Comedor\nPreparada' },
      { type: 'readModel', text: 'Estado Bandeja:\nplatos, cubiertos,\nservilleta, vaso' },
      { type: 'command', text: 'Llevar al\nComedor' },
      { type: 'event', text: 'ComidaServida\nEnComedor' },
      { type: 'actor', text: 'Comensal\n(Comedor)' },
    ],
  },
  {
    id: 'B', title: 'Flujo B — Servir en Cama',
    steps: [
      { type: 'event', text: 'Comida\nPreparada' },
      { type: 'command', text: 'Preparar Bandeja\nCama' },
      { type: 'aggregate', text: 'Bandeja\nCama' },
      { type: 'event', text: 'Bandeja Cama\nPreparada' },
      { type: 'readModel', text: 'Estado Bandeja:\npatas, antideslizante,\ntapa bebida' },
      { type: 'hotspot', text: '¿Patas? ¿Tapa\nbebida? ¿Cojín?' },
      { type: 'command', text: 'Llevar a la\nHabitación' },
      { type: 'event', text: 'ComidaServida\nEnCama' },
      { type: 'actor', text: 'Comensal\n(Cama)' },
    ],
  },
  {
    id: 'C', title: 'Flujo C — Recoger y Limpiar',
    steps: [
      { type: 'event', text: 'Comida\nConsumida' },
      { type: 'command', text: 'Recoger\nBandeja' },
      { type: 'aggregate', text: 'Bandeja' },
      { type: 'event', text: 'Bandeja\nRecogida' },
      { type: 'policy', text: 'WHEN Bandeja\nRecogida THEN\nLimpiarYGuardar' },
      { type: 'command', text: 'Limpiar y\nGuardar' },
      { type: 'external', text: 'Lavavajillas' },
      { type: 'event', text: 'Cocina\nDespejada' },
    ],
  },
];

const MS_TYPES = {
  core: { label: 'core', color: '#3B82F6' },
  decision: { label: 'decisión', color: '#8B5CF6' },
  planning: { label: 'planificación', color: '#22C55E' },
  support: { label: 'soporte', color: '#888780' },
} as const;

type MsType = keyof typeof MS_TYPES;

type Microservice = {
  id: number; name: string; type: MsType; desc: string;
  aggregates: string[]; events: string[]; policies: string[]; readModels: string[]; externals: string[];
};

const MICROSERVICES: Microservice[] = [
  { id: 1, name: 'Menu Planning Service', type: 'planning', desc: 'Gestiona la decisión de qué cocinar. Consulta el inventario disponible (nevera/despensa) y genera el evento MenúDecidido. Punto de entrada de todo el flujo.',
    aggregates: ['Menú'], events: ['MenúDecidido'], policies: [], readModels: ['Inventario Cocina'], externals: [] },
  { id: 2, name: 'Kitchen Service', type: 'core', desc: 'Recibe MenúDecidido y orquesta la preparación de alimentos: cortar, cocinar, emplatar. Integra con horno/vitrocerámica. Emite el evento pivote ComidaPreparada.',
    aggregates: ['Comida'], events: ['ComidaPreparada'], policies: [], readModels: [], externals: ['Horno / Vitrocerámica'] },
  { id: 3, name: 'Routing Service', type: 'decision', desc: 'Servicio ligero sin agregado propio. Escucha ComidaPreparada, aplica la política ElegirDestino y emite un comando hacia Tray Assembly con el destino (comedor o cama).',
    aggregates: [], events: ['ComidaPreparada → bifurcación'], policies: ['ElegirDestino'], readModels: [], externals: [] },
  { id: 4, name: 'Tray Assembly Service', type: 'core', desc: 'Monta la bandeja según destino. Bandeja plana para comedor o bandeja con patas para cama. Aplica la política TapaParaLíquidos si corresponde.',
    aggregates: ['Bandeja Comedor', 'Bandeja Cama'], events: ['BandejaComedorPreparada', 'BandejaCamaPreparada'], policies: ['TapaParaLíquidos'], readModels: ['Estado Bandeja Comedor', 'Estado Bandeja Cama'], externals: [] },
  { id: 5, name: 'Delivery Service', type: 'core', desc: 'Ejecuta el transporte físico de la bandeja. Sin agregado propio. Recibe la bandeja preparada, ejecuta el traslado al comedor o a la habitación.',
    aggregates: [], events: ['ComidaServidaEnComedor', 'ComidaServidaEnCama'], policies: [], readModels: [], externals: [] },
  { id: 6, name: 'Cleanup Service', type: 'core', desc: 'Escucha ComidaConsumida, ejecuta la recogida de bandeja, aplica la política LimpiarYGuardar y deja la cocina en estado inicial. Integra con el lavavajillas.',
    aggregates: ['Bandeja (post-uso)'], events: ['BandejaRecogida', 'CocinaDespejada'], policies: ['LimpiarYGuardar'], readModels: ['Estado Cocina'], externals: ['Lavavajillas'] },
  { id: 7, name: 'Inventory Service', type: 'support', desc: 'Gestiona el stock de la nevera y despensa. Expone el modelo de lectura que consulta Menu Planning. No genera eventos propios en este flujo.',
    aggregates: [], events: [], policies: [], readModels: ['Inventario Cocina'], externals: ['Nevera / Despensa'] },
];

function StickyNote({ type, text, isHighlighted, dimmed }: { type: TipoElemento; text: string; isHighlighted: boolean; dimmed: boolean }) {
  const config = ELEMENT_TYPES[type];
  return (
    <div style={{
      background: config.color,
      color: type === 'actor' || type === 'aggregate' ? '#1e293b' : '#fff',
      padding: '10px 12px',
      borderRadius: type === 'actor' ? '50% / 40%' : '4px',
      minWidth: 115, maxWidth: 145, minHeight: 68,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      opacity: dimmed ? 0.2 : isHighlighted ? 1 : 0.88,
      boxShadow: isHighlighted ? `0 0 0 2px ${config.color}, 0 6px 20px ${config.color}55` : `0 2px 8px ${config.color}22`,
      transform: isHighlighted ? 'scale(1.06)' : 'none',
      transition: 'all 0.25s ease', flexShrink: 0,
    }}>
      <span style={{ fontSize: 13, marginBottom: 1 }}>{config.icon}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{text}</span>
      <span style={{ fontSize: 7.5, opacity: 0.65, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
        {config.label.replace(/s$/, '').replace(/e$/, '')}
      </span>
    </div>
  );
}

function FlowLane({ flow, activeType }: { flow: Flow; activeType: TipoElemento | null }) {
  const isMain = flow.id === 'main';
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${isMain ? COLORS.event + '33' : '#00000009'}`,
      borderRadius: 10, padding: '14px 18px', marginBottom: 12, boxShadow: '0 1px 4px #00000008',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          background: isMain ? COLORS.event : COLORS.command, color: '#fff', fontSize: 9, fontWeight: 800,
          padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '1px',
        }}>{flow.id}</span>
        <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{flow.title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
        {flow.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote type={step.type} text={step.text} isHighlighted={activeType === step.type} dimmed={!!activeType && activeType !== step.type} />
            {i < flow.steps.length - 1 && <span style={{ color: activeType ? '#ddd' : COLORS.muted, fontSize: 16, flexShrink: 0 }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CatalogPanel({ type, onClose }: { type: TipoElemento; onClose: () => void }) {
  const config = ELEMENT_TYPES[type];
  const items = CATALOG[type] || [];
  return (
    <div style={{
      background: COLORS.surface, border: `2px solid ${config.color}55`, borderRadius: 12,
      marginBottom: 20, boxShadow: `0 4px 24px ${config.color}15`, overflow: 'hidden',
    }}>
      <div style={{
        background: `${config.color}0d`, borderBottom: `1px solid ${config.color}22`,
        padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 8, background: config.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>{config.icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{config.label}</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{items.length} elemento{items.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: '#00000008', border: '1px solid #00000011', borderRadius: 6, color: COLORS.muted,
          cursor: 'pointer', fontSize: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
      <div style={{ padding: '6px 12px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            padding: '14px 16px', borderBottom: i < items.length - 1 ? '1px solid #00000008' : 'none',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: config.color, marginTop: 7, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.55, marginBottom: 6 }}>{item.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {item.flow && <span style={{ fontSize: 10, background: '#00000006', border: '1px solid #00000011', borderRadius: 4, padding: '2px 8px', color: COLORS.muted }}>📍 {item.flow}</span>}
                {item.actor && <span style={{ fontSize: 10, background: COLORS.actor + '15', border: `1px solid ${COLORS.actor}33`, borderRadius: 4, padding: '2px 8px', color: COLORS.text }}>👤 {item.actor}</span>}
                {item.trigger && <span style={{ fontSize: 10, background: COLORS.command + '12', border: `1px solid ${COLORS.command}33`, borderRadius: 4, padding: '2px 8px', color: COLORS.text }}>▶ Trigger: {item.trigger}</span>}
                {item.attrs && <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', background: '#00000004', borderRadius: 4, padding: '4px 8px', width: '100%', marginTop: 2 }}>📐 {item.attrs}</div>}
                {item.fields && <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', background: COLORS.readModel + '08', borderRadius: 4, padding: '4px 8px', width: '100%', marginTop: 2, border: `1px solid ${COLORS.readModel}15` }}>📋 {item.fields}</div>}
                {item.rule && <div style={{ fontSize: 10, color: COLORS.policy, fontFamily: 'monospace', fontWeight: 700, background: COLORS.policy + '08', borderRadius: 4, padding: '4px 8px', width: '100%', marginTop: 2, border: `1px solid ${COLORS.policy}20` }}>⚙ {item.rule}</div>}
                {item.criteria && <div style={{ fontSize: 10, color: COLORS.muted, fontStyle: 'italic', marginTop: 2 }}>💡 {item.criteria}</div>}
                {item.impact && <div style={{ fontSize: 10, color: COLORS.hotspot, background: COLORS.hotspot + '08', borderRadius: 4, padding: '4px 8px', width: '100%', marginTop: 2, border: `1px solid ${COLORS.hotspot}20` }}>⚠ Impacto: {item.impact}</div>}
                {item.integration && <div style={{ fontSize: 10, color: COLORS.muted, background: COLORS.external + '08', borderRadius: 4, padding: '4px 8px', width: '100%', marginTop: 2, border: `1px solid ${COLORS.external}15` }}>🔌 {item.integration}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MsTag({ items, color, icon }: { items: string[]; color: string; icon: string }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map((t, i) => (
        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4, background: color + '12', border: `1px solid ${color}25`, color: COLORS.text }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          {icon} {t}
        </span>
      ))}
    </>
  );
}

function MicroservicesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ background: COLORS.surface, border: '2px solid #3B82F655', borderRadius: 12, marginBottom: 20, boxShadow: '0 4px 24px #3B82F615', overflow: 'hidden' }}>
      <div style={{ background: '#3B82F60d', borderBottom: '1px solid #3B82F622', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>MS</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Microservicios</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{MICROSERVICES.length} servicios derivados del Event Storming</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: '#00000008', border: '1px solid #00000011', borderRadius: 6, color: COLORS.muted, cursor: 'pointer', fontSize: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ padding: '6px 12px' }}>
        {MICROSERVICES.map((ms, i) => {
          const msType = MS_TYPES[ms.type];
          return (
            <div key={ms.id} style={{ padding: '16px 16px', borderBottom: i < MICROSERVICES.length - 1 ? '1px solid #00000008' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: msType.color + '18', color: msType.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{ms.id}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{ms.name}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: msType.color + '15', color: msType.color, fontWeight: 600, marginLeft: 'auto', flexShrink: 0 }}>{msType.label}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.55, marginBottom: 10, paddingLeft: 38 }}>{ms.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 38 }}>
                <MsTag items={ms.aggregates} color={COLORS.aggregate} icon="📦" />
                <MsTag items={ms.events} color={COLORS.event} icon="⚡" />
                <MsTag items={ms.policies} color={COLORS.policy} icon="⚙" />
                <MsTag items={ms.readModels} color={COLORS.readModel} icon="📖" />
                <MsTag items={ms.externals} color={COLORS.external} icon="🔗" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EventStormingBoard() {
  const [activeType, setActiveType] = useState<TipoElemento | null>(null);
  const [showMs, setShowMs] = useState(false);
  const toggle = (type: TipoElemento) => { setShowMs(false); setActiveType(prev => (prev === type ? null : type)); };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100%', padding: '20px 16px', fontFamily: "'Segoe UI', system-ui, sans-serif", color: COLORS.text }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 26 }}>🧑‍🍳</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>Event Storming — Cocina & Servicio</h1>
        </div>
        <p style={{ color: COLORS.muted, fontSize: 12, margin: '4px 0 0 38px' }}>Haz clic en cualquier tipo para desplegar su catálogo detallado</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(Object.entries(ELEMENT_TYPES) as [TipoElemento, typeof ELEMENT_TYPES[TipoElemento]][]).map(([type, config]) => {
          const count = (CATALOG[type] || []).length;
          const isActive = activeType === type;
          return (
            <button key={type} onClick={() => toggle(type)} style={{
              background: isActive ? config.color + '15' : COLORS.surface,
              border: `1.5px solid ${isActive ? config.color : '#00000012'}`,
              borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: isActive ? `0 2px 12px ${config.color}22` : '0 1px 3px #00000008',
            }}>
              <span style={{ fontSize: 14 }}>{config.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: config.color }}>{count}</span>
              <span style={{ fontSize: 10, color: isActive ? config.color : COLORS.muted, fontWeight: 600 }}>{config.label}</span>
            </button>
          );
        })}
        <button onClick={() => { setActiveType(null); setShowMs(p => !p); }} style={{
          background: showMs ? '#3B82F615' : COLORS.surface,
          border: `1.5px solid ${showMs ? '#3B82F6' : '#00000012'}`,
          borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: showMs ? '0 2px 12px #3B82F622' : '0 1px 3px #00000008',
        }}>
          <span style={{ fontSize: 14 }}>🧩</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#3B82F6' }}>{MICROSERVICES.length}</span>
          <span style={{ fontSize: 10, color: showMs ? '#3B82F6' : COLORS.muted, fontWeight: 600 }}>Microservicios</span>
        </button>
      </div>

      {activeType && <CatalogPanel type={activeType} onClose={() => setActiveType(null)} />}
      {showMs && <MicroservicesPanel onClose={() => setShowMs(false)} />}

      {flows.map(flow => <FlowLane key={flow.id} flow={flow} activeType={activeType} />)}

      <div style={{
        marginTop: 20, padding: '10px 14px', background: COLORS.surface, borderRadius: 8,
        border: '1px solid #00000008', fontSize: 10, color: COLORS.muted, lineHeight: 1.6,
      }}>
        <strong style={{ color: COLORS.text }}>Flujo canónico:</strong>{' '}
        <span style={{ color: COLORS.actor }}>Actor</span> →{' '}
        <span style={{ color: COLORS.command }}>Comando</span> →{' '}
        <span style={{ color: COLORS.aggregate }}>Agregado</span> →{' '}
        <span style={{ color: COLORS.event }}>Evento</span> →{' '}
        <span style={{ color: COLORS.policy }}>Política</span> |{' '}
        <span style={{ color: COLORS.readModel }}>Modelo Lectura</span> |{' '}
        <span style={{ color: COLORS.external }}>Sist. Externo</span> |{' '}
        <span style={{ color: COLORS.hotspot }}>Hotspot</span>
      </div>
    </div>
  );
}
