import { useState } from 'react';
import EventStormingBoard from './pages/EventStormingBoard';
import DiagramaArquitectura from './pages/DiagramaArquitectura';

type Tab = 'storming' | 'arquitectura' | 'saga';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'storming', label: 'Event Storming', icon: '🧠' },
  { id: 'arquitectura', label: 'Arquitectura', icon: '🏗️' },
  { id: 'saga', label: 'Saga en vivo', icon: '▶️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('storming');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f0' }}>
      <header style={{
        background: '#0f172a',
        color: '#fff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🧑‍🍳</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>CocinaServicio Workshop</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: active ? '#1e293b' : 'transparent',
                  color: active ? '#fff' : '#94a3b8',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'storming' && <EventStormingBoard />}
        {tab === 'arquitectura' && <DiagramaArquitectura />}
        {tab === 'saga' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Saga en vivo — reproductor diferido</div>
            <div style={{ fontSize: 13 }}>En construcción. Usa el mismo diagrama de Arquitectura con animación al estilo ByteByteGo.</div>
          </div>
        )}
      </main>
    </div>
  );
}
