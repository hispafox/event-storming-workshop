import { useCocinaHub } from './hooks/useCocinaHub';
import { MapaCocina } from './components/MapaCocina';
import { TimelineEventos } from './components/TimelineEventos';
import { PanelControl } from './components/PanelControl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const { eventos, servicioActivo, estadoSaga } = useCocinaHub(API_URL);

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-900 text-white p-4">
        <h1 className="text-xl font-bold">CocinaServicio — Saga en vivo</h1>
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
