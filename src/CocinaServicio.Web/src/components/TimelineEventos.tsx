import { useEffect, useRef } from 'react';
import type { EventoPush } from '../hooks/useCocinaHub';

export function TimelineEventos({ eventos }: { eventos: EventoPush[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [eventos]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-slate-50 p-4 space-y-2">
      <h2 className="text-lg font-bold mb-3 text-slate-800">Timeline</h2>
      {eventos.map((e, i) => (
        <div key={i} className={`border-l-4 p-2 bg-white rounded shadow-sm ${colorPorTipo(e.tipo)}`}>
          <div className="text-xs text-slate-500">{new Date(e.timestamp).toLocaleTimeString()}</div>
          <div className="font-semibold text-sm">
            {(e.payload.eventName as string) || (e.payload.moduleName as string) || e.tipo}
          </div>
          {e.payload.compensation != null && (
            <div className="text-xs text-red-600 mt-1">Compensación: {String(e.payload.compensation)}</div>
          )}
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
