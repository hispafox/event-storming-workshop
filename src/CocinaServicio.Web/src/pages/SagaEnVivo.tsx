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
    if (idx < 0 || idx >= grabacion.eventos.length) return;
    rep.setCursor(grabacion.eventos[idx].offsetMs);
  };

  const pct = rep.duracionMs > 0 ? (rep.cursorMs / rep.duracionMs) * 100 : 0;
  const eventos = grabacion?.eventos ?? [];
  const hayGrabacion = grabacion !== null;

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '10px 16px', borderRadius: 10, border: '1px solid #00000009' }}>
          <button onClick={() => saltarEvento(-1)} disabled={rep.eventoActualIdx <= 0} style={btn('#475569', rep.eventoActualIdx <= 0)}>⏮</button>
          <button onClick={rep.reproduciendo ? rep.pause : rep.play} style={btn('#0f172a', false)}>
            {rep.reproduciendo ? '⏸ Pausa' : rep.terminado ? '↻ Repetir' : '▶ Play'}
          </button>
          <button onClick={() => saltarEvento(1)} disabled={rep.eventoActualIdx >= eventos.length - 1} style={btn('#475569', rep.eventoActualIdx >= eventos.length - 1)}>⏭</button>
          <button onClick={rep.restart} style={btn('#64748b', false)}>🔄 Inicio</button>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>Velocidad:</span>
          {VELOCIDADES.map(v => (
            <button key={v} onClick={() => rep.setVelocidad(v)} style={{ ...btn(rep.velocidad === v ? '#0ea5e9' : '#cbd5e1', false), fontSize: 11, padding: '4px 10px' }}>{v}x</button>
          ))}
          <div
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pc = (e.clientX - rect.left) / rect.width;
              rep.setCursor(Math.max(0, Math.min(1, pc)) * rep.duracionMs);
            }}
            style={{ flex: 1, minWidth: 200, height: 6, background: '#e5e5e0', borderRadius: 3, position: 'relative', margin: '0 12px', cursor: 'pointer' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', borderRadius: 3, transition: 'width 0.05s linear' }} />
          </div>
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', minWidth: 90, textAlign: 'right' }}>
            {(rep.cursorMs / 1000).toFixed(1)}s / {(rep.duracionMs / 1000).toFixed(1)}s
          </span>
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
            return (
              <div key={i}
                onClick={() => rep.setCursor(e.offsetMs)}
                style={{
                  padding: '6px 8px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                  borderLeft: `3px solid ${e.tipo === 'ComandoEnviado' ? '#3B82F6' : e.tipo === 'Completado' ? '#22c55e' : '#f59e0b'}`,
                  background: activo ? '#fef3c7' : pasado ? '#f8fafc' : '#fff',
                  opacity: pasado ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{(e.offsetMs / 1000).toFixed(2)}s · {e.tipo === 'ComandoEnviado' ? 'cmd' : e.tipo === 'Completado' ? 'end' : 'evt'}</div>
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
