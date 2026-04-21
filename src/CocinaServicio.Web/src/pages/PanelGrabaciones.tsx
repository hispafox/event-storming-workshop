import { useEffect, useRef, useState } from 'react';
import { borrarGrabacion, etiquetarGrabacion, listarGrabaciones, type GrabacionResumen } from '../services/api';

type Props = {
  activa: string | null;
  onCargar: (correlationId: string) => void;
  refreshToken: number;
};

export default function PanelGrabaciones({ activa, onCargar, refreshToken }: Props) {
  const [grabaciones, setGrabaciones] = useState<GrabacionResumen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const grabacionesRef = useRef<GrabacionResumen[]>([]);

  const recargar = async () => {
    try {
      const lista = await listarGrabaciones();
      setGrabaciones(lista);
      grabacionesRef.current = lista;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  useEffect(() => { recargar(); }, [refreshToken]);

  // Auto-refresh cada 2s mientras haya alguna grabación sin completar
  useEffect(() => {
    const interval = window.setInterval(() => {
      const hayPendiente = grabacionesRef.current.some(g => !g.completado);
      if (hayPendiente) recargar();
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  const onBorrar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Borrar esta grabación?')) return;
    try {
      await borrarGrabacion(id);
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const onEmpezarEditar = (id: string, etiquetaActual: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditando(id);
    setBorrador(etiquetaActual ?? '');
  };

  const onConfirmarEditar = async () => {
    if (!editando) return;
    try {
      await etiquetarGrabacion(editando, borrador);
      setEditando(null);
      recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <aside style={{
      width: 260, background: '#fff', borderRadius: 10, border: '1px solid #00000009',
      padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Sesiones grabadas</div>
        <button onClick={recargar} title="Recargar" style={{
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b',
        }}>↻</button>
      </div>

      {error && <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>}
      {grabaciones.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>Sin grabaciones. Lanza un flujo.</div>}

      {grabaciones.map(g => {
        const act = activa === g.correlationId;
        const estEditando = editando === g.correlationId;
        const fecha = new Date(g.inicioUtc);
        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nombre = g.etiqueta || `${hora} · ${g.correlationId.slice(0, 6)}`;
        return (
          <div
            key={g.correlationId}
            onClick={() => onCargar(g.correlationId)}
            style={{
              padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
              background: act ? '#dbeafe' : '#f8fafc',
              border: `1px solid ${act ? '#3b82f6' : '#e5e7eb'}`,
              transition: 'all 0.15s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 3,
                background: g.completado ? '#dcfce7' : '#fef3c7',
                color: g.completado ? '#166534' : '#854d0e',
              }}>{g.completado ? '✓' : '…'}</span>
              {estEditando ? (
                <input
                  autoFocus
                  value={borrador}
                  onChange={e => setBorrador(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onBlur={onConfirmarEditar}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onConfirmarEditar();
                    if (e.key === 'Escape') setEditando(null);
                  }}
                  style={{ flex: 1, fontSize: 12, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              ) : (
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nombre}
                </div>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>{g.eventosCount} eventos · {g.duracionSegundos.toFixed(1)}s</span>
              <span style={{ display: 'flex', gap: 4 }}>
                <button title="Renombrar" onClick={e => onEmpezarEditar(g.correlationId, g.etiqueta, e)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: '#64748b', padding: 0 }}>✎</button>
                <button title="Borrar" onClick={e => onBorrar(g.correlationId, e)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ef4444', padding: 0 }}>🗑</button>
              </span>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
