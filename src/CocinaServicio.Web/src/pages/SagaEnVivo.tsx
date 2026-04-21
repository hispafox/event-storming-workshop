import { useState } from 'react';
import DiagramaArquitectura from './DiagramaArquitectura';
import PanelGrabaciones from './PanelGrabaciones';
import { iniciarFlujo, obtenerGrabacion, simularFallo, type Grabacion } from '../services/api';
import { useReproductor } from '../hooks/useReproductor';

const FALLOS = [
  { value: 'Quemada', label: 'Comida quemada' },
  { value: 'SinDestino', label: 'Destino no disponible' },
  { value: 'SinBandeja', label: 'Sin bandeja disponible' },
  { value: 'Derrame', label: 'Derrame en transporte' },
];

const VELOCIDADES = [0.5, 1, 2, 4];
const DURACIONES_PASO = [
  { value: 800, label: 'Rápido' },
  { value: 1500, label: 'Normal' },
  { value: 2500, label: 'Lento' },
];

export default function SagaEnVivo() {
  const [grabacion, setGrabacion] = useState<Grabacion | null>(null);
  const [lanzando, setLanzando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallo, setFallo] = useState(FALLOS[0].value);
  const [refreshPanel, setRefreshPanel] = useState(0);

  const rep = useReproductor(grabacion);

  const dispararSaga = async (disparador: () => Promise<{ correlationId: string }>) => {
    try {
      setError(null);
      setLanzando(true);
      const { correlationId } = await disparador();
      setAviso(`Saga lanzada (${correlationId.slice(0, 8)}). Aparecerá en el panel al terminar.`);
      setRefreshPanel(x => x + 1);
      window.setTimeout(() => setAviso(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLanzando(false);
    }
  };

  const onComedor = () => dispararSaga(() => iniciarFlujo('Comedor', false));
  const onCama = () => dispararSaga(() => iniciarFlujo('Cama', true));
  const onFallo = () => dispararSaga(() => simularFallo(fallo));

  const cargarGrabacion = async (correlationId: string) => {
    try {
      setError(null);
      const g = await obtenerGrabacion(correlationId);
      setGrabacion(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const saltarEvento = (direccion: 1 | -1) => {
    if (!grabacion) return;
    const idx = rep.eventoActualIdx + direccion;
    if (idx < 0 || idx >= rep.eventosVirtuales.length) return;
    rep.setCursor(rep.eventosVirtuales[idx].offsetVirtualMs);
  };

  const pct = rep.duracionMs > 0 ? (rep.cursorMs / rep.duracionMs) * 100 : 0;
  const eventos = grabacion?.eventos ?? [];
  const hayGrabacion = grabacion !== null;
  const totalPasos = rep.eventosVirtuales.length;
  const pasoActual = rep.eventoActualIdx >= 0 ? rep.eventoActualIdx + 1 : 0;

  return (
    <div style={{ minHeight: '100%', background: '#f5f5f0', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: 10, border: '1px solid #00000009' }}>
        <button onClick={onComedor} disabled={lanzando} style={btn('#f59e0b', lanzando)}>🍽 Servir en comedor</button>
        <button onClick={onCama} disabled={lanzando} style={btn('#8b5cf6', lanzando)}>🛏 Servir en cama</button>
        <span style={{ width: 1, height: 28, background: '#e5e5e0' }} />
        <span style={{ fontSize: 12, color: '#64748b' }}>Simular fallo:</span>
        <select value={fallo} onChange={e => setFallo(e.target.value)} disabled={lanzando}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}>
          {FALLOS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button onClick={onFallo} disabled={lanzando} style={btn('#ef4444', lanzando)}>⚠ Simular</button>
        {aviso && <span style={{ fontSize: 12, color: '#0ea5e9', marginLeft: 'auto' }}>{aviso}</span>}
        {error && <span style={{ fontSize: 12, color: '#ef4444', marginLeft: 'auto' }}>{error}</span>}
      </div>

      {hayGrabacion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', padding: '10px 16px', borderRadius: 10, border: '1px solid #00000009' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => saltarEvento(-1)} disabled={rep.eventoActualIdx <= 0} style={btn('#475569', rep.eventoActualIdx <= 0)} title="Evento anterior">⏮</button>
            <button onClick={rep.reproduciendo ? rep.pause : rep.play} style={btn('#0f172a', false)}>
              {rep.reproduciendo ? '⏸ Pausa' : rep.terminado ? '↻ Repetir' : '▶ Play'}
            </button>
            <button onClick={() => saltarEvento(1)} disabled={rep.eventoActualIdx >= totalPasos - 1} style={btn('#475569', rep.eventoActualIdx >= totalPasos - 1)} title="Evento siguiente">⏭</button>
            <button onClick={rep.restart} style={btn('#64748b', false)}>🔄 Inicio</button>

            <span style={{ width: 1, height: 24, background: '#e5e5e0', marginLeft: 4 }} />

            <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 6, padding: 2 }}>
              <button
                onClick={() => rep.setModo('pasos')}
                style={toggleBtn(rep.modo === 'pasos')}
                title="Cada evento tiene la misma duración visual">
                Pasos
              </button>
              <button
                onClick={() => rep.setModo('tiempo')}
                style={toggleBtn(rep.modo === 'tiempo')}
                title="Usa los tiempos reales de ejecución de la saga">
                Tiempo real
              </button>
            </div>

            {rep.modo === 'pasos' && (
              <>
                <span style={{ fontSize: 12, color: '#64748b' }}>Ritmo:</span>
                {DURACIONES_PASO.map(d => (
                  <button key={d.value} onClick={() => rep.setDuracionPasoMs(d.value)}
                    style={{ ...btn(rep.duracionPasoMs === d.value ? '#22c55e' : '#cbd5e1', false), fontSize: 11, padding: '4px 10px' }}>
                    {d.label}
                  </button>
                ))}
              </>
            )}

            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>Velocidad:</span>
            {VELOCIDADES.map(v => (
              <button key={v} onClick={() => rep.setVelocidad(v)}
                style={{ ...btn(rep.velocidad === v ? '#0ea5e9' : '#cbd5e1', false), fontSize: 11, padding: '4px 10px' }}>{v}x</button>
            ))}

            <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, marginLeft: 'auto' }}>
              {rep.modo === 'pasos'
                ? `Paso ${pasoActual} / ${totalPasos}`
                : `${(rep.cursorMs / 1000).toFixed(1)}s / ${(rep.duracionMs / 1000).toFixed(1)}s`}
            </span>
          </div>

          <div
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pc = (e.clientX - rect.left) / rect.width;
              rep.setCursor(Math.max(0, Math.min(1, pc)) * rep.duracionMs);
            }}
            style={{ width: '100%', height: 16, background: '#e5e5e0', borderRadius: 8, position: 'relative', cursor: 'pointer', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', borderRadius: 8, transition: 'width 0.05s linear' }} />
            {rep.eventosVirtuales.map((ev, i) => {
              const left = rep.duracionMs > 0 ? (ev.offsetVirtualMs / rep.duracionMs) * 100 : 0;
              const activo = i === rep.eventoActualIdx;
              const pasado = i < rep.eventoActualIdx;
              return (
                <div key={i}
                  title={`${ev.nombre} (${ev.modulo})`}
                  style={{
                    position: 'absolute', left: `${left}%`, top: 0, bottom: 0,
                    width: activo ? 3 : 2,
                    background: activo ? '#ef4444' : pasado ? '#ffffff' : '#64748b',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                  }} />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        <PanelGrabaciones
          activa={grabacion?.correlationId ?? null}
          onCargar={cargarGrabacion}
          refreshToken={refreshPanel}
        />

        <div style={{ flex: 1, overflow: 'auto' }}>
          <DiagramaArquitectura estado={rep.estado} titulo={grabacion ? `Saga en vivo · ${grabacion.correlationId.slice(0, 8)}` : 'Saga en vivo'} />
        </div>

        <aside style={{ width: 260, background: '#fff', borderRadius: 10, border: '1px solid #00000009', padding: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Timeline</div>
          {!grabacion && <div style={{ fontSize: 12, color: '#94a3b8' }}>Lanza un flujo o carga una sesión.</div>}
          {eventos.map((e, i) => {
            const activo = i === rep.eventoActualIdx;
            const pasado = i < rep.eventoActualIdx;
            const virtOffset = rep.eventosVirtuales[i]?.offsetVirtualMs ?? e.offsetMs;
            return (
              <div key={i}
                onClick={() => rep.setCursor(virtOffset)}
                style={{
                  padding: '6px 8px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                  borderLeft: `3px solid ${e.tipo === 'ComandoEnviado' ? '#3B82F6' : e.tipo === 'Completado' ? '#22c55e' : '#f59e0b'}`,
                  background: activo ? '#fef3c7' : pasado ? '#f8fafc' : '#fff',
                  opacity: pasado ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                  {rep.modo === 'pasos' ? `#${i + 1}` : `${(e.offsetMs / 1000).toFixed(2)}s`} · {e.tipo === 'ComandoEnviado' ? 'cmd' : e.tipo === 'Completado' ? 'end' : 'evt'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{e.nombre}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{e.modulo}</div>
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function btn(color: string, disabled: boolean) {
  return {
    background: color, color: '#fff', border: 'none',
    padding: '8px 14px', borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12, fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  } as const;
}

function toggleBtn(active: boolean) {
  return {
    background: active ? '#0f172a' : 'transparent',
    color: active ? '#fff' : '#64748b',
    border: 'none',
    padding: '4px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    transition: 'all 0.15s',
  } as const;
}
