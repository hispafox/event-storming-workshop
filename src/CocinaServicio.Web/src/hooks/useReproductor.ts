import { useEffect, useMemo, useRef, useState } from 'react';
import type { EventoGrabado, Grabacion } from '../services/api';
import type {
  CompensacionId, EstadoDiagrama, EventoId, ServicioId,
} from '../pages/DiagramaArquitectura';

export type ModoReproduccion = 'pasos' | 'tiempo';

const RESALTADO_MS_TIEMPO = 1000;
const FACTOR_FIRING_PASO = 0.6;

const MAPA_SERVICIOS: Record<string, ServicioId> = {
  DecidirMenu: 'menuPlanning', MenuDecidido: 'menuPlanning',
  CocinarComida: 'kitchen', ComidaPreparada: 'kitchen', ComidaQuemada: 'kitchen', DescartarComida: 'kitchen',
  RerouteDestino: 'routing', DestinoNoDisponible: 'routing',
  PrepararBandeja: 'trayAssembly', BandejaComedorPreparada: 'trayAssembly', BandejaCamaPreparada: 'trayAssembly',
  BandejaNoDisponible: 'trayAssembly', MantenerCaliente: 'trayAssembly', RetornarBandeja: 'trayAssembly',
  LlevarBandeja: 'delivery', ComidaServidaEnComedor: 'delivery', ComidaServidaEnCama: 'delivery',
  DerrameEnTransporte: 'delivery', ComidaConsumida: 'delivery',
  IniciarLimpieza: 'cleanup', BandejaRecogida: 'cleanup', CocinaDespejada: 'cleanup',
  CatalogoConsultado: 'inventory',
  NeveraConsultada: 'nevera',
  HornoEncendido: 'hornoVitro', HornoApagado: 'hornoVitro',
  LavavajillasIniciado: 'lavavajillas', LavavajillasTerminado: 'lavavajillas',
};

const MAPA_EVENTOS: Record<string, EventoId> = {
  MenuDecidido: 'MenuDecidido',
  ComidaPreparada: 'ComidaPreparada',
  PrepararBandeja: 'ElegirDestino',
  BandejaComedorPreparada: 'BandejaPreparada',
  BandejaCamaPreparada: 'BandejaPreparada',
  ComidaConsumida: 'ComidaConsumida',
  CocinaDespejada: 'CocinaDespejada',
};

const MAPA_COMPENSACIONES: Record<string, CompensacionId> = {
  DestinoNoDisponible: 'ReplanificarMenu',
  RerouteDestino: 'ReplanificarMenu',
  BandejaNoDisponible: 'MantenerCaliente',
  MantenerCaliente: 'MantenerCaliente',
  DerrameEnTransporte: 'RetornarBandeja',
  RetornarBandeja: 'RetornarBandeja',
};

const PARES_EXTERNO: Record<string, { fin: string; servicio: ServicioId }> = {
  HornoEncendido: { fin: 'HornoApagado', servicio: 'hornoVitro' },
  LavavajillasIniciado: { fin: 'LavavajillasTerminado', servicio: 'lavavajillas' },
};

type EventoVirtual = EventoGrabado & { offsetVirtualMs: number };

function calcularEstado(eventos: EventoVirtual[], cursorMs: number, resaltadoMs: number): EstadoDiagrama {
  const servicios: EstadoDiagrama['servicios'] = {};
  const eventosActivos: EstadoDiagrama['eventos'] = {};
  const compensaciones: EstadoDiagrama['compensaciones'] = {};

  for (const ev of eventos) {
    if (ev.offsetVirtualMs > cursorMs) break;

    const enResaltado = cursorMs - ev.offsetVirtualMs <= resaltadoMs;

    const par = PARES_EXTERNO[ev.nombre];
    if (par) {
      const fin = eventos.find(e => e.nombre === par.fin && e.offsetVirtualMs > ev.offsetVirtualMs);
      const finAlcanzado = fin !== undefined && fin.offsetVirtualMs <= cursorMs;
      servicios[par.servicio] = finAlcanzado ? 'completed' : 'active';
      continue;
    }
    if (Object.values(PARES_EXTERNO).some(p => p.fin === ev.nombre)) {
      continue;
    }

    const servicio = MAPA_SERVICIOS[ev.nombre];
    if (servicio) {
      servicios[servicio] = enResaltado ? 'active' : 'completed';
    }

    const evento = MAPA_EVENTOS[ev.nombre];
    if (evento) {
      eventosActivos[evento] = enResaltado ? 'firing' : 'done';
    }

    const comp = MAPA_COMPENSACIONES[ev.nombre];
    if (comp && enResaltado) {
      compensaciones[comp] = true;
    }
  }

  return { servicios, eventos: eventosActivos, compensaciones };
}

export function useReproductor(grabacion: Grabacion | null) {
  const [cursorMs, setCursorMs] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [modo, setModo] = useState<ModoReproduccion>('pasos');
  const [duracionPasoMs, setDuracionPasoMs] = useState(1500);
  const lastTickRef = useRef<number | null>(null);

  const eventosVirtuales: EventoVirtual[] = useMemo(() => {
    if (!grabacion) return [];
    if (modo === 'tiempo') {
      return grabacion.eventos.map(e => ({ ...e, offsetVirtualMs: e.offsetMs }));
    }
    return grabacion.eventos.map((e, i) => ({ ...e, offsetVirtualMs: i * duracionPasoMs }));
  }, [grabacion, modo, duracionPasoMs]);

  const duracionMs = useMemo(() => {
    if (eventosVirtuales.length === 0) return 0;
    const cola = modo === 'pasos' ? duracionPasoMs : RESALTADO_MS_TIEMPO;
    return eventosVirtuales[eventosVirtuales.length - 1].offsetVirtualMs + cola;
  }, [eventosVirtuales, modo, duracionPasoMs]);

  const resaltadoMs = modo === 'pasos' ? duracionPasoMs * FACTOR_FIRING_PASO : RESALTADO_MS_TIEMPO;

  useEffect(() => {
    setCursorMs(0);
    setReproduciendo(false);
  }, [grabacion?.correlationId]);

  useEffect(() => {
    setCursorMs(0);
  }, [modo, duracionPasoMs]);

  useEffect(() => {
    if (!reproduciendo) {
      lastTickRef.current = null;
      return;
    }
    let rafId = 0;
    const tick = (ts: number) => {
      if (lastTickRef.current === null) lastTickRef.current = ts;
      const delta = (ts - lastTickRef.current) * velocidad;
      lastTickRef.current = ts;
      setCursorMs(prev => {
        const siguiente = prev + delta;
        if (siguiente >= duracionMs) {
          setReproduciendo(false);
          return duracionMs;
        }
        return siguiente;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [reproduciendo, velocidad, duracionMs]);

  const estado: EstadoDiagrama = useMemo(() => {
    if (!grabacion) return { servicios: {}, eventos: {}, compensaciones: {} };
    return calcularEstado(eventosVirtuales, cursorMs, resaltadoMs);
  }, [grabacion, eventosVirtuales, cursorMs, resaltadoMs]);

  const eventoActualIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < eventosVirtuales.length; i++) {
      if (eventosVirtuales[i].offsetVirtualMs <= cursorMs) idx = i; else break;
    }
    return idx;
  }, [eventosVirtuales, cursorMs]);

  const play = () => {
    if (cursorMs >= duracionMs) setCursorMs(0);
    setReproduciendo(true);
  };
  const pause = () => setReproduciendo(false);
  const restart = () => { setCursorMs(0); setReproduciendo(true); };
  const terminado = cursorMs >= duracionMs && duracionMs > 0;

  return {
    estado,
    cursorMs,
    duracionMs,
    velocidad,
    setVelocidad,
    reproduciendo,
    terminado,
    eventoActualIdx,
    eventosVirtuales,
    modo,
    setModo,
    duracionPasoMs,
    setDuracionPasoMs,
    play, pause, restart,
    setCursor: setCursorMs,
  };
}
