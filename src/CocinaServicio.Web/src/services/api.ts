import type { Destino } from '../types/contracts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export type TipoRegistro = 'ComandoEnviado' | 'EventoPublicado' | 'Completado';

export type EventoGrabado = {
  offsetMs: number;
  tipo: TipoRegistro;
  nombre: string;
  modulo: string;
  payload: unknown;
};

export type Grabacion = {
  correlationId: string;
  inicioUtc: string;
  completado: boolean;
  outcome: string | null;
  eventos: EventoGrabado[];
};

export async function iniciarFlujo(destino: Destino, conBebida: boolean): Promise<{ correlationId: string }> {
  const res = await fetch(`${API_URL}/api/demo/iniciar-flujo-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destino, conBebida }),
  });
  if (!res.ok) throw new Error(`Error iniciando flujo: ${res.statusText}`);
  return await res.json();
}

export async function simularFallo(failureType: string): Promise<{ correlationId: string }> {
  const res = await fetch(`${API_URL}/api/demo/simulate-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'Cooking', failureType }),
  });
  if (!res.ok) throw new Error(`Error simulando fallo: ${res.statusText}`);
  return await res.json();
}

export async function obtenerGrabacion(correlationId: string): Promise<Grabacion | null> {
  const res = await fetch(`${API_URL}/api/demo/recording/${correlationId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Error obteniendo grabación: ${res.statusText}`);
  return await res.json();
}

export type GrabacionResumen = {
  correlationId: string;
  inicioUtc: string;
  completado: boolean;
  outcome: string | null;
  eventosCount: number;
  duracionSegundos: number;
  etiqueta: string | null;
};

export async function listarGrabaciones(): Promise<GrabacionResumen[]> {
  const res = await fetch(`${API_URL}/api/demo/recordings`);
  if (!res.ok) throw new Error(`Error listando grabaciones: ${res.statusText}`);
  return await res.json();
}

export async function borrarGrabacion(correlationId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/demo/recording/${correlationId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Error borrando: ${res.statusText}`);
}

export async function etiquetarGrabacion(correlationId: string, etiqueta: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/demo/recording/${correlationId}/label`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ etiqueta }),
  });
  if (!res.ok) throw new Error(`Error etiquetando: ${res.statusText}`);
}
