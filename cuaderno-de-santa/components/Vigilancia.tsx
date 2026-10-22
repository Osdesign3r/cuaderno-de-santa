'use client';

import { useEffect, useRef, useState } from 'react';
import { diffDays } from '@/lib/santa';
import type { Config } from '@/lib/types';

const MENSAJES = [
  'Mis duendes están observando tu comportamiento',
  'Cada buena acción queda anotada en el cuaderno',
  'Los duendes lo ven todo… hasta los gestos pequeños',
  'Santa revisa el cuaderno todas las noches',
];

function Ojo({ lado }: { lado: 'izq' | 'der' }) {
  const inclina = lado === 'izq' ? 'rotate(10 30 14)' : 'rotate(-10 30 14)';
  return (
    <svg viewBox="0 0 60 56" className="ojo h-16 w-[4.5rem]" aria-hidden>
      <path d="M8 13 Q30 3 52 13" fill="none" stroke="#ffe6a3" strokeWidth="4" strokeLinecap="round" transform={inclina} />
      <ellipse cx="30" cy="34" rx="25" ry="19" fill="#f6f8ff" />
      <g className="pupilas">
        <circle cx="30" cy="34" r="11" fill="#243386" />
        <circle cx="30" cy="34" r="6.5" fill="#060a20" />
        <circle cx="26.5" cy="30.5" r="2.6" fill="#fff" />
      </g>
    </svg>
  );
}

/** Portada: ojos de duende que siguen el dedo, mensaje que rota y cuenta regresiva grande. */
export function Vigilancia({ hoy, cfg }: { hoy: string; cfg: Config }) {
  const ojos = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % MENSAJES.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Las pupilas siguen el puntero/dedo; si nadie toca, vuelven a mirar alrededor solas.
  useEffect(() => {
    let reposo: ReturnType<typeof setTimeout> | undefined;
    let cuadro = 0;
    const mover = (e: PointerEvent) => {
      if (cuadro) return;
      cuadro = requestAnimationFrame(() => {
        cuadro = 0;
      });
      const el = ojos.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.min(1, Math.hypot(dx, dy) / 220);
      const a = Math.atan2(dy, dx);
      el.style.setProperty('--px', `${(Math.cos(a) * d * 8).toFixed(1)}px`);
      el.style.setProperty('--py', `${(Math.sin(a) * d * 6).toFixed(1)}px`);
      el.dataset.sigue = '1';
      clearTimeout(reposo);
      reposo = setTimeout(() => {
        delete el.dataset.sigue;
      }, 2500);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerdown', mover);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerdown', mover);
      cancelAnimationFrame(cuadro);
      clearTimeout(reposo);
    };
  }, []);

  const antes = hoy < cfg.inicio;
  const despues = hoy > cfg.fin;
  const dias = antes ? diffDays(hoy, cfg.inicio) : despues ? 0 : diffDays(hoy, cfg.fin);
  const total = Math.max(1, diffDays(cfg.inicio, cfg.fin));
  const avance = antes ? 0 : despues ? 1 : Math.min(1, Math.max(0, diffDays(cfg.inicio, hoy) / total));

  const etiqueta = despues
    ? '¡Feliz Navidad!'
    : antes
      ? dias === 1
        ? 'día para que Santa empiece a anotar'
        : 'días para que Santa empiece a anotar'
      : dias === 0
        ? '¡Hoy es Nochebuena!'
        : dias === 1
          ? 'día para Nochebuena'
          : 'días para Nochebuena';

  return (
    <section className="mt-5" aria-label="Cuenta regresiva a Nochebuena">
      <div ref={ojos} className="flex items-end justify-center gap-1" aria-hidden>
        <span className="mb-1 text-3xl">🎄</span>
        <Ojo lado="izq" />
        <Ojo lado="der" />
        <span className="mb-1 text-3xl">🎄</span>
      </div>

      <p key={i} className="mensaje-duendes mx-auto mt-1 min-h-[3.25rem] max-w-xs text-center text-lg font-medium leading-snug text-gold-soft">
        {MENSAJES[i]}
      </p>

      <div className="card mt-3 px-4 py-5 text-center" style={{ borderColor: 'rgba(255,200,87,0.35)' }}>
        {despues ? (
          <p className="text-3xl font-semibold text-gold">🎅 {etiqueta}</p>
        ) : (
          <>
            <p className="cuenta text-7xl font-semibold leading-none text-gold tabular-nums">{dias}</p>
            <p className="mt-2 text-lg font-medium text-ink">{etiqueta}</p>
            <div className="mx-auto mt-4 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance * 100)} aria-label="Avance de la temporada">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold" style={{ width: `${Math.max(3, avance * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">{Math.round(avance * 100)}% del camino al Polo Norte</p>
          </>
        )}
      </div>
    </section>
  );
}
