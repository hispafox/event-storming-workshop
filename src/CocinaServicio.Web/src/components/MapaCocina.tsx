import { ServicioNode } from './ServicioNode';
import { PlatoViajero } from './PlatoViajero';

type Props = {
  servicioActivo: string | null;
  estadoSaga: string;
};

const SERVICIOS = [
  { id: 'Inventory', nombre: 'Inventory', x: 100, y: 100 },
  { id: 'MenuPlanning', nombre: 'Menu Planning', x: 100, y: 250 },
  { id: 'Kitchen', nombre: 'Kitchen', x: 300, y: 250 },
  { id: 'Routing', nombre: 'Routing', x: 500, y: 250 },
  { id: 'TrayAssembly', nombre: 'Tray Assembly', x: 700, y: 250 },
  { id: 'Delivery', nombre: 'Delivery', x: 700, y: 400 },
  { id: 'Cleanup', nombre: 'Cleanup', x: 400, y: 400 },
];

const CONEXIONES: [number, number, number, number][] = [
  [100, 130, 100, 220],
  [130, 250, 270, 250],
  [330, 250, 470, 250],
  [530, 250, 670, 250],
  [700, 280, 700, 370],
  [670, 400, 430, 400],
];

export function MapaCocina({ servicioActivo, estadoSaga }: Props) {
  const posPlato = SERVICIOS.find(s => s.id === servicioActivo);
  const completado = estadoSaga === 'Completed';

  return (
    <div className="w-full h-full flex flex-col items-center">
      {completado && (
        <div className="text-green-600 text-2xl font-bold mb-2 animate-bounce">
          Flujo completado
        </div>
      )}
      <svg viewBox="0 0 850 520" className="w-full h-full">
        {CONEXIONES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="2" />
        ))}

        {SERVICIOS.map(s => (
          <ServicioNode
            key={s.id}
            nombre={s.nombre}
            x={s.x}
            y={s.y}
            activo={servicioActivo === s.id}
          />
        ))}

        {posPlato && <PlatoViajero x={posPlato.x} y={posPlato.y} />}
      </svg>
    </div>
  );
}
