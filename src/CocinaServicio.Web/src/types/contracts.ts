export type Destino = 'Comedor' | 'Cama';
export type TipoPlato = 'Entrante' | 'Principal' | 'Postre' | 'Bebida';

export interface Plato {
  nombre: string;
  tipo: TipoPlato;
  esLiquido: boolean;
}

export interface SagaState {
  correlationId: string;
  currentState: string;
  destino: Destino;
  tieneBebida: boolean;
  failureReason?: string;
}
