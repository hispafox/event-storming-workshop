import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export type EventoPush = {
  tipo: 'ServicioActivado' | 'EventoPublicado' | 'EstadoSagaCambiado' | 'CompensacionEjecutada' | 'FlujoCompletado';
  correlationId: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export function useCocinaHub(apiUrl: string) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [eventos, setEventos] = useState<EventoPush[]>([]);
  const [servicioActivo, setServicioActivo] = useState<string | null>(null);
  const [estadoSaga, setEstadoSaga] = useState<string>('Idle');

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/cocina`)
      .withAutomaticReconnect()
      .build();

    conn.on('ServicioActivado', (moduleName: string, correlationId: string) => {
      setServicioActivo(moduleName);
      setEventos(prev => [...prev, {
        tipo: 'ServicioActivado',
        correlationId,
        payload: { moduleName },
        timestamp: new Date().toISOString()
      }]);
    });

    conn.on('EventoPublicado', (eventName: string, payload: unknown, correlationId: string) => {
      setEventos(prev => [...prev, {
        tipo: 'EventoPublicado',
        correlationId,
        payload: { eventName, ...(typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}) },
        timestamp: new Date().toISOString()
      }]);
    });

    conn.on('EstadoSagaCambiado', (_correlationId: string, newState: string) => {
      setEstadoSaga(newState);
    });

    conn.on('CompensacionEjecutada', (correlationId: string, compensation: string) => {
      setEventos(prev => [...prev, {
        tipo: 'CompensacionEjecutada',
        correlationId,
        payload: { compensation },
        timestamp: new Date().toISOString()
      }]);
    });

    conn.on('FlujoCompletado', (correlationId: string, success: boolean) => {
      setEstadoSaga(success ? 'Completed' : 'Failed');
      setEventos(prev => [...prev, {
        tipo: 'FlujoCompletado',
        correlationId,
        payload: { success },
        timestamp: new Date().toISOString()
      }]);
    });

    const startConnection = async () => {
      try {
        await conn.start();
        setConnection(conn);
      } catch (err) {
        console.error('Error conectando al hub:', err);
      }
    };

    startConnection();

    return () => {
      const stopConnection = async () => {
        await conn.stop();
      };
      stopConnection();
    };
  }, [apiUrl]);

  return { connection, eventos, servicioActivo, estadoSaga };
}
