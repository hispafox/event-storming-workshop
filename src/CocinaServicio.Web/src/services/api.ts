import type { Destino } from '../types/contracts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function iniciarFlujo(destino: Destino, conBebida: boolean) {
  const res = await fetch(`${API_URL}/api/demo/iniciar-flujo-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destino, conBebida }),
  });

  if (!res.ok) {
    throw new Error(`Error iniciando flujo: ${res.statusText}`);
  }

  return await res.json();
}

export async function simularFallo(failureType: string) {
  const res = await fetch(`${API_URL}/api/demo/simulate-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'Cooking', failureType }),
  });

  if (!res.ok) {
    throw new Error(`Error simulando fallo: ${res.statusText}`);
  }

  return await res.json();
}
