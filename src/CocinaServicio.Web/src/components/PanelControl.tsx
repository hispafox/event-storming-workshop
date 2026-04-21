import { useState } from 'react';
import { iniciarFlujo, simularFallo } from '../services/api';

export function PanelControl({ estadoSaga }: { estadoSaga: string }) {
  const [fallo, setFallo] = useState('Quemada');
  const [enProceso, setEnProceso] = useState(false);

  const handleIniciarComedor = async () => {
    setEnProceso(true);
    try {
      await iniciarFlujo('Comedor', false);
    } catch (error) {
      console.error(error);
    } finally {
      setEnProceso(false);
    }
  };

  const handleIniciarCama = async () => {
    setEnProceso(true);
    try {
      await iniciarFlujo('Cama', true);
    } catch (error) {
      console.error(error);
    } finally {
      setEnProceso(false);
    }
  };

  const handleSimularFallo = async () => {
    try {
      await simularFallo(fallo);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border-t shadow flex-wrap">
      <button
        onClick={handleIniciarComedor}
        disabled={enProceso}
        className="px-4 py-2 bg-amber-500 text-white rounded font-semibold hover:bg-amber-600 disabled:opacity-50"
      >
        Servir en comedor
      </button>
      <button
        onClick={handleIniciarCama}
        disabled={enProceso}
        className="px-4 py-2 bg-purple-500 text-white rounded font-semibold hover:bg-purple-600 disabled:opacity-50"
      >
        Servir en cama (con bebida)
      </button>

      <div className="h-8 w-px bg-slate-300" />

      <span className="text-sm text-slate-600">Simular fallo:</span>
      <select
        value={fallo}
        onChange={e => setFallo(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="Quemada">Comida quemada</option>
        <option value="SinDestino">Destino no disponible</option>
        <option value="SinBandeja">Sin bandeja disponible</option>
        <option value="Derrame">Derrame en transporte</option>
      </select>
      <button
        onClick={handleSimularFallo}
        className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        Simular
      </button>

      <div className="ml-auto">
        <span className="text-sm text-slate-500">Estado saga:</span>
        <span className="ml-2 font-bold text-slate-900">{estadoSaga}</span>
      </div>
    </div>
  );
}
