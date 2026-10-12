'use client';

import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calcular, hoyBogota, type Stats } from './santa';
import type { Config, Habito, Nino, Registro, Visita } from './types';

export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Datos = { ninos: Nino[]; habitos: Habito[]; registros: Registro[]; visitas: Visita[]; cfg: Config };

/** PostgREST corta en 1000 filas: paginamos para no perder registros en diciembre. */
async function todos<T>(tabla: string, orden: string, desempate?: string): Promise<T[]> {
  const out: T[] = [];
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    let q = sb.from(tabla).select('*').order(orden);
    if (desempate) q = q.order(desempate); // orden estable al paginar
    const { data, error } = await q.range(desde, desde + paso - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < paso) break;
  }
  return out;
}

export async function cargar(): Promise<Datos> {
  const [ninos, habitos, visitas, cfgRows, registros] = await Promise.all([
    todos<Nino>('santa_ninos', 'orden', 'id'),
    todos<Habito>('santa_habitos', 'orden', 'id'),
    todos<Visita>('santa_visitas', 'desde', 'id'),
    todos<{ clave: string; valor: string }>('santa_config', 'clave'), // sin columna id
    todos<Registro>('santa_registros', 'created_at', 'id'),
  ]);
  const c = Object.fromEntries(cfgRows.map((r) => [r.clave, r.valor]));
  const cfg: Config = {
    inicio: c.temporada_inicio ?? '2026-10-12',
    fin: c.temporada_fin ?? '2026-12-24',
    maxBonosDia: Number(c.max_bonos_dia ?? 2),
  };
  return { ninos, habitos, registros, visitas, cfg };
}

/** Datos del cuaderno + "hoy" en hora de Colombia. `hoy` queda vacío hasta montar (evita desajustes de hidratación). */
export function useSanta() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [hoy, setHoy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const vivo = useRef(true);

  const recargar = useCallback(async () => {
    try {
      const d = await cargar();
      if (!vivo.current) return;
      setDatos(d);
      setHoy(hoyBogota());
      setError(null);
    } catch {
      if (vivo.current) setError('No pude hablar con el Polo Norte. Revisa la conexión.');
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    setHoy(hoyBogota());
    void recargar();
    const visible = () => {
      if (document.visibilityState === 'visible') void recargar();
    };
    const t = setInterval(visible, 30_000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    return () => {
      vivo.current = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('focus', visible);
    };
  }, [recargar]);

  return { datos, hoy, error, recargar };
}

export function useStats(datos: Datos | null, hoy: string): Record<string, Stats> {
  return useMemo(() => {
    if (!datos || !hoy) return {};
    const out: Record<string, Stats> = {};
    for (const n of datos.ninos) {
      out[n.slug] = calcular(
        n,
        datos.habitos,
        datos.registros,
        datos.visitas.filter((v) => v.nino_id === n.id),
        datos.cfg,
        hoy,
      );
    }
    return out;
  }, [datos, hoy]);
}

/* ───────── Escritura (solo con sesión de padres; la validación real vive en la base) ───────── */

export type Resp = { ok: boolean; error?: string; token?: string; restantes?: number; hasta?: string; accion?: string };

async function rpc(fn: string, args?: Record<string, unknown>): Promise<Resp> {
  const { data, error } = await sb.rpc(fn, args);
  if (error || !data) return { ok: false, error: 'red' };
  return data as Resp;
}

export const api = {
  pinConfigurado: async (): Promise<boolean | null> => {
    const { data, error } = await sb.rpc('santa_pin_configurado');
    return error ? null : (data as boolean);
  },
  setPin: (pin: string) => rpc('santa_set_pin', { p_pin: pin }),
  login: (pin: string) => rpc('santa_login', { p_pin: pin }),
  cambiarPin: (token: string, nuevo: string) => rpc('santa_cambiar_pin', { p_token: token, p_nuevo: nuevo }),
  registrar: (token: string, nino: string, habito: string, fecha: string) =>
    rpc('santa_registrar', { p_token: token, p_nino: nino, p_habito: habito, p_fecha: fecha }),
  quitar: (token: string, id: string) => rpc('santa_quitar', { p_token: token, p_registro: id }),
  guardarVisita: (token: string, nino: string, desde: string, hasta: string, nota?: string) =>
    rpc('santa_guardar_visita', { p_token: token, p_nino: nino, p_desde: desde, p_hasta: hasta, p_id: null, p_nota: nota ?? null }),
  setAvatar: (token: string, nino: string, emoji: string, tono: string) =>
    rpc('santa_set_avatar', { p_token: token, p_nino: nino, p_emoji: emoji, p_tono: tono }),
  borrarVisita: (token: string, id: string) => rpc('santa_borrar_visita', { p_token: token, p_id: id }),
};

export const ERRORES: Record<string, string> = {
  red: 'Sin conexión con el Polo Norte. Intenta de nuevo.',
  sesion: 'Tu sesión venció. Entra de nuevo con el PIN.',
  fecha: 'Solo se puede registrar hoy y los 3 días anteriores.',
  fuera_de_temporada: 'Ese día está fuera de la temporada de Santa.',
  no_en_casa: 'Ese niño no está en casa ese día. Marca la visita primero.',
  no_aplica: 'Ese hábito no aplica para este niño.',
  tope_bonos: 'Máximo 2 ayudas extra por día.',
  hubo_retroceso: 'Hubo un tropiezo hoy: "Día en paz" no se puede marcar.',
  nada_que_reparar: 'No hay ningún tropiezo reciente que reparar.',
  formato: 'El PIN debe tener exactamente 6 números.',
  ya_configurado: 'El PIN ya estaba creado. Entra con él.',
  pin: 'PIN incorrecto.',
  bloqueado: 'Demasiados intentos. Espera unos minutos.',
  sin_pin: 'Todavía no hay un PIN. Crea uno.',
  fechas: 'Las fechas de la visita no son válidas.',
  no_existe: 'No encontré ese registro.',
};
