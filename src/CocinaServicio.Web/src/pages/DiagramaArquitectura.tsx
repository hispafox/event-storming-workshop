import type { CSSProperties } from 'react';

export type EstadoServicio = 'idle' | 'active' | 'completed' | 'failed' | 'compensating';
export type EstadoFlecha = 'idle' | 'flowing';
export type EstadoEvento = 'pending' | 'firing' | 'done';

export type ServicioId =
  | 'inventory' | 'menuPlanning' | 'kitchen' | 'routing'
  | 'trayAssembly' | 'delivery' | 'cleanup'
  | 'nevera' | 'hornoVitro' | 'lavavajillas';

export type EventoId =
  | 'MenuDecidido' | 'ComidaPreparada' | 'ElegirDestino'
  | 'BandejaPreparada' | 'ComidaConsumida' | 'CocinaDespejada';

export type CompensacionId =
  | 'ReplanificarMenu' | 'MantenerCaliente' | 'RetornarBandeja';

export type EstadoDiagrama = {
  servicios: Partial<Record<ServicioId, EstadoServicio>>;
  eventos: Partial<Record<EventoId, EstadoEvento>>;
  compensaciones: Partial<Record<CompensacionId, boolean>>;
};

const COLORS = {
  sync: '#185FA5',
  async: '#BA7517',
  ext: '#993C1D',
  comp: '#A32D2D',
  text: '#1e293b',
  muted: '#64748b',
  bg: '#f5f5f0',
  surface: '#ffffff',
};

function stylesPorEstado(estado: EstadoServicio, base: CSSProperties): CSSProperties {
  switch (estado) {
    case 'active':
      return { ...base, boxShadow: '0 0 0 3px #FF8C00aa, 0 6px 28px #FF8C0055', transform: 'scale(1.04)' };
    case 'completed':
      return { ...base, boxShadow: '0 0 0 2px #22C55E88, 0 3px 12px #22C55E33' };
    case 'failed':
      return { ...base, boxShadow: '0 0 0 3px #EF4444cc, 0 6px 28px #EF444455', transform: 'scale(1.02)' };
    case 'compensating':
      return { ...base, boxShadow: '0 0 0 3px #A32D2Daa, 0 6px 28px #A32D2D55' };
    default:
      return base;
  }
}

function Servicio({
  className, name, sub, estado = 'idle', maxWidth, extraStyle,
}: {
  className: 'green' | 'teal' | 'purple' | 'gray' | 'coral';
  name: string;
  sub: string;
  estado?: EstadoServicio;
  maxWidth?: number;
  extraStyle?: CSSProperties;
}) {
  const palette: Record<typeof className, { bg: string; border: string; color: string }> = {
    green: { bg: '#EAF3DE', border: '#3B6D11', color: '#27500A' },
    teal:  { bg: '#E1F5EE', border: '#0F6E56', color: '#085041' },
    purple:{ bg: '#EEEDFE', border: '#534AB7', color: '#3C3489' },
    gray:  { bg: '#F1EFE8', border: '#5F5E5A', color: '#444441' },
    coral: { bg: '#FAECE7', border: '#993C1D', color: '#712B13' },
  };
  const p = palette[className];
  const base: CSSProperties = {
    padding: '14px 20px',
    borderRadius: 10,
    border: `1px solid ${p.border}`,
    background: p.bg,
    color: p.color,
    minWidth: 220,
    maxWidth,
    textAlign: 'center',
    position: 'relative',
    transition: 'all 0.4s ease',
    ...extraStyle,
  };
  return (
    <div style={stylesPorEstado(estado, base)}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{sub}</div>
    </div>
  );
}

function SideService({
  className, name, sub, estado = 'idle',
}: {
  className: 'gray' | 'coral';
  name: string;
  sub: string;
  estado?: EstadoServicio;
}) {
  const palette = {
    gray:  { bg: '#F1EFE8', border: '#5F5E5A', color: '#444441' },
    coral: { bg: '#FAECE7', border: '#993C1D', color: '#712B13' },
  };
  const p = palette[className];
  const base: CSSProperties = {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${p.border}`,
    background: p.bg,
    color: p.color,
    textAlign: 'center',
    minWidth: 140,
    transition: 'all 0.4s ease',
  };
  return (
    <div style={stylesPorEstado(estado, base)}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 10, opacity: 0.65 }}>{sub}</div>
    </div>
  );
}

function Connector({ eventName, type, estado = 'pending' }: { eventName: string; type: 'sync' | 'async'; estado?: EstadoEvento }) {
  const color = type === 'sync' ? COLORS.sync : COLORS.async;
  const firing = estado === 'firing';
  const SVG_H = 56;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0', gap: 2 }}>
      <svg width={24} height={SVG_H} style={{ overflow: 'visible' }}>
        <line
          x1={12} y1={2} x2={12} y2={SVG_H - 6}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={type === 'async' ? '5,3' : undefined}
          opacity={firing ? 0.9 : 0.5}
        />
        <polygon
          points={`7,${SVG_H - 6} 17,${SVG_H - 6} 12,${SVG_H}`}
          fill={color}
          opacity={firing ? 1 : 0.6}
        />
        {firing && (
          <>
            <circle r={5} fill={color} opacity={0.95}>
              <animate attributeName="cy" from={2} to={SVG_H - 6} dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="1s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="12,0" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle r={4} fill={color} opacity={0.7}>
              <animate attributeName="cy" from={2} to={SVG_H - 6} dur="1s" begin="0.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.15;0.85;1" dur="1s" begin="0.3s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="12,0" dur="1s" begin="0.3s" repeatCount="indefinite" />
            </circle>
            <circle r={3} fill={color} opacity={0.5}>
              <animate attributeName="cy" from={2} to={SVG_H - 6} dur="1s" begin="0.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.5;0.5;0" keyTimes="0;0.15;0.85;1" dur="1s" begin="0.6s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="12,0" dur="1s" begin="0.6s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
      <span style={{
        fontSize: 11,
        color: firing ? color : COLORS.muted,
        fontWeight: firing ? 700 : 500,
        background: firing ? color + '18' : 'transparent',
        padding: firing ? '2px 8px' : 0,
        borderRadius: 4,
        transition: 'all 0.3s',
      }}>{eventName}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
        background: color + '12', color,
      }}>{type}</span>
    </div>
  );
}

function CompLabel({ text, activa }: { text: string; activa: boolean }) {
  return (
    <div style={{ position: 'absolute', left: -90, top: '50%', transform: 'translateY(-50%)', textAlign: 'right' }}>
      <div style={{
        fontSize: 9,
        color: activa ? '#fff' : COLORS.comp,
        fontWeight: 600,
        lineHeight: 1.3,
        background: activa ? COLORS.comp : 'transparent',
        padding: activa ? '4px 8px' : 0,
        borderRadius: 4,
        boxShadow: activa ? `0 0 0 2px ${COLORS.comp}55, 0 4px 12px ${COLORS.comp}44` : 'none',
        transition: 'all 0.3s',
      }}>{text}</div>
    </div>
  );
}

const emptyEstado: EstadoDiagrama = { servicios: {}, eventos: {}, compensaciones: {} };

export default function DiagramaArquitectura({ estado = emptyEstado, titulo = 'Comunicaciones entre microservicios' }: { estado?: EstadoDiagrama; titulo?: string }) {
  const s = (id: ServicioId): EstadoServicio => estado.servicios[id] ?? 'idle';
  const e = (id: EventoId): EstadoEvento => estado.eventos[id] ?? 'pending';
  const c = (id: CompensacionId): boolean => estado.compensaciones[id] ?? false;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100%', padding: '20px 16px', fontFamily: "'Segoe UI', system-ui, sans-serif", color: COLORS.text }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{titulo}</h1>
      <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 20 }}>Sync / async + patrón saga con compensaciones</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20, padding: '12px 16px', background: COLORS.surface, borderRadius: 10, border: '1px solid #00000009' }}>
        <LegendItem label="sync" color={COLORS.sync} dashed={false} />
        <LegendItem label="async" color={COLORS.async} dashed={true} />
        <LegendItem label="externo" color={COLORS.ext} dashed={true} />
        <LegendItem label="compensación" color={COLORS.comp} dashed={true} />
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#FCEBEB', color: COLORS.comp, border: `1px solid ${COLORS.comp}44` }}>saga boundary</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 720, justifyContent: 'center' }}>
          <SideService className="gray" name="Inventory service" sub="soporte" estado={s('inventory')} />
          <span style={{ fontSize: 11, color: COLORS.sync, fontWeight: 700 }}>sync →</span>
          <Servicio className="green" name="Menu planning service" sub="planificación" estado={s('menuPlanning')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 1, background: `repeating-linear-gradient(90deg, ${COLORS.ext} 0 3px, transparent 3px 6px)` }} />
            <SideService className="coral" name="Nevera / despensa" sub="externo sync" estado={s('nevera')} />
          </div>
        </div>

        <Connector eventName="MenuDecidido" type="async" estado={e('MenuDecidido')} />

        <div style={{ border: `2px dashed ${COLORS.comp}88`, borderRadius: 16, padding: '20px 14px', background: `${COLORS.comp}05`, position: 'relative', maxWidth: 480, width: '100%' }}>
          <span style={{ position: 'absolute', top: -11, left: 20, background: COLORS.bg, padding: '0 8px', fontSize: 12, fontWeight: 600, color: COLORS.comp }}>
            SAGA: Preparar y servir comida (coreografía)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center', position: 'relative' }}>
            <Servicio className="teal" name="Kitchen service" sub="core — saga step 1" estado={s('kitchen')} maxWidth={280} extraStyle={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 1, background: `repeating-linear-gradient(90deg, ${COLORS.ext} 0 3px, transparent 3px 6px)` }} />
              <SideService className="coral" name="Horno / vitro" sub="externo sync" estado={s('hornoVitro')} />
            </div>
          </div>

          <Connector eventName="ComidaPreparada" type="async" estado={e('ComidaPreparada')} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center', position: 'relative' }}>
            <CompLabel text={'Replanificar\nmenú ↑'} activa={c('ReplanificarMenu')} />
            <Servicio className="purple" name="Routing service" sub="decisión — saga step 2" estado={s('routing')} maxWidth={280} extraStyle={{ flex: 1 }} />
          </div>

          <Connector eventName="ElegirDestino" type="sync" estado={e('ElegirDestino')} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center', position: 'relative' }}>
            <CompLabel text={'Mantener\ncaliente ↑'} activa={c('MantenerCaliente')} />
            <Servicio className="teal" name="Tray assembly service" sub="core — saga step 3" estado={s('trayAssembly')} maxWidth={280} extraStyle={{ flex: 1 }} />
          </div>

          <Connector eventName="BandejaPreparada" type="async" estado={e('BandejaPreparada')} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center', position: 'relative' }}>
            <CompLabel text={'Retornar\nbandeja ↑'} activa={c('RetornarBandeja')} />
            <Servicio className="teal" name="Delivery service" sub="core — saga step 4" estado={s('delivery')} maxWidth={280} extraStyle={{ flex: 1 }} />
          </div>
        </div>

        <Connector eventName="ComidaConsumida" type="async" estado={e('ComidaConsumida')} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 640, justifyContent: 'center' }}>
          <Servicio className="teal" name="Cleanup service" sub="core" estado={s('cleanup')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 1, background: `repeating-linear-gradient(90deg, ${COLORS.ext} 0 3px, transparent 3px 6px)` }} />
            <SideService className="coral" name="Lavavajillas" sub="externo async" estado={s('lavavajillas')} />
          </div>
        </div>

        <Connector eventName="CocinaDespejada" type="async" estado={e('CocinaDespejada')} />

        <div style={{ fontSize: 11, color: COLORS.muted, padding: '6px 14px', background: COLORS.surface, borderRadius: 6, border: '1px solid #00000009' }}>
          ↻ Ciclo completo — cocina lista para el siguiente servicio
        </div>
      </div>

      <div style={{ marginTop: 20, padding: '16px 20px', background: '#FCEBEB88', border: `1px solid ${COLORS.comp}33`, borderRadius: 10, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
        <h3 style={{ fontSize: 14, color: '#791F1F', marginBottom: 10, fontWeight: 600 }}>Compensaciones de la saga</h3>
        {[
          { step: 'Step 4 ✗', text: 'Derrame en transporte → RetornarBandeja → DesmontarBandeja → ReplanificarMenu' },
          { step: 'Step 3 ✗', text: 'Sin bandeja disponible → MantenerCaliente en Kitchen → lanzar Cleanup urgente' },
          { step: 'Step 2 ✗', text: 'Destino no disponible → Reroute al destino alternativo (comedor ↔ cama)' },
          { step: 'Step 1 ✗', text: 'Comida quemada → DescartarComida → volver a MenuDecidido (menú simplificado)' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 12, color: COLORS.comp, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, minWidth: 52, flexShrink: 0 }}>{row.step}</span>
            <span>{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendItem({ label, color, dashed }: { label: string; color: string; dashed: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLORS.muted, fontWeight: 600 }}>
      <div style={{
        width: 28, height: 2, borderRadius: 1,
        background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 9px)` : color,
      }} />
      {label}
    </div>
  );
}
