import { useEffect, useMemo, useRef, useState } from 'react';
import type { EventoGrabado, Grabacion } from '../services/api';
import type {
  CompensacionId, EstadoDiagrama, EventoId, ServicioId,
} from '../pages/DiagramaArquitectura';

export type EstadoReproductor = 'vacio' | 'cargando' | 'listo' | 'reproduciendo' | 'pausado' | 'terminado';

const RESALTADO_MS = 1400;

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

function calcularEstado(eventos: EventoGrabado[], cursorMs: number): EstadoDiagrama {
  const servicios: EstadoDiagrama['servicios'] = {};
  const eventosActivos: EstadoDiagrama['eventos'] = {};
  const compensaciones: EstadoDiagrama['compensaciones'] = {};

  for (const ev of eventos) {
    if (ev.offsetMs > cursorMs) break;

    const enResaltado = cursorMs - ev.offsetMs <= RESALTADO_MS;

    const par = PARES_EXTERNO[ev.nombre];
    if (par) {
      const fin = eventos.find(e => e.nombre === par.fin && e.offsetMs > ev.offsetMs);
      const finAlcanzado = fin !== undefined && fin.offsetMs <= cursorMs;
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
  const lastTickRef = useRef<number | null>(null);

  const duracionMs = useMemo(() => {
    if (!grabacion || grabacion.eventos.length === 0) return 0;
    return grabacion.eventos[grabacion.eventos.length - 1].offsetMs + RESALTADO_MS;
  }, [grabacion]);

  useEffect(() => {
    setCursorMs(0);
    setReproduciendo(false);
  }, [grabacion?.correlationId]);

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
    return calcularEstado(grabacion.eventos, cursorMs);
  }, [grabacion, cursorMs]);

  const eventoActualIdx = useMemo(() => {
    if (!grabacion) return -1;
    let idx = -1;
    for (let i = 0; i < grabacion.eventos.length; i++) {
      if (grabacion.eventos[i].offsetMs <= cursorMs) idx = i; else break;
    }
    return idx;
  }, [grabacion, cursorMs]);

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
    play, pause, restart,
    setCursor: setCursorMs,
  };
}
