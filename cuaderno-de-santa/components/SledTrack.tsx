import type { Tono } from '@/lib/types';
import { TONOS } from './tono';

const W = 320;
const H = 120;
const PAD = 22;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const y = (x: number) => 78 - 15 * Math.sin((x / W) * Math.PI * 2.2 + 0.6);
const px = (p: number) => PAD + clamp(p) * (W - PAD * 2);

function camino(hasta: number): string {
  const fin = px(hasta);
  const pasos = Math.max(2, Math.ceil(((fin - PAD) / (W - PAD * 2)) * 48));
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const x = PAD + (i * (fin - PAD)) / pasos;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y(x).toFixed(1)}`;
  }).join(' ');
}

type Props = {
  progreso: number;
  ritmo?: number;
  carbon?: number;
  tono: Tono;
  grande?: boolean;
  mostrarRitmo?: boolean;
};

/** El camino al Polo: el trineo avanza con los puntos y da marcha atrás con los tropiezos. */
export function SledTrack({ progreso, ritmo = 0, carbon = 0, tono, grande, mostrarRitmo }: Props) {
  const t = TONOS[tono];
  const vis = 0.03 + clamp(progreso) * 0.94; // el trineo nunca se pega a los extremos
  const sx = px(vis);
  const sy = y(sx);
  const rx = px(0.03 + clamp(ritmo) * 0.94);
  const ry = y(rx);
  const pct = Math.round(clamp(progreso) * 100);

  return (
    <div
      role="img"
      aria-label={`El trineo va al ${pct}% del camino a Nochebuena${carbon > 0 ? ', con carbón a bordo' : ''}`}
      className="relative w-full select-none"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={camino(1)} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        <path d={camino(vis)} fill="none" stroke={t.c} strokeWidth="4.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${t.glow})` }} />
      </svg>

      <span aria-hidden className="absolute text-2xl" style={{ left: `${(PAD / W) * 100}%`, top: `${(y(PAD) / H) * 100 + 12}%`, transform: 'translateX(-50%)' }}>
        🏠
      </span>
      <span aria-hidden className="absolute text-3xl" style={{ left: `${((W - PAD) / W) * 100}%`, top: `${(y(W - PAD) / H) * 100 - 30}%`, transform: 'translateX(-50%)' }}>
        🎄
      </span>

      {mostrarRitmo && ritmo > 0 && (
        <span aria-hidden title="Ritmo para ser Lista Buena" className="absolute text-lg opacity-45" style={{ left: `${(rx / W) * 100}%`, top: `${(ry / H) * 100}%`, transform: 'translate(-50%,-55%)' }}>
          ⭐
        </span>
      )}

      {carbon > 0 && (
        <span aria-hidden className="absolute text-xl" style={{ left: `${(sx / W) * 100 - 6}%`, top: `${(sy / H) * 100 + 4}%`, transform: 'translate(-50%,-50%) rotate(-12deg)' }}>
          🪨
        </span>
      )}

      <span aria-hidden className={`sled ${grande ? 'text-5xl' : 'text-4xl'}`} style={{ left: `${(sx / W) * 100}%`, top: `${(sy / H) * 100}%` }}>
        🛷
      </span>
    </div>
  );
}

/** Versión delgada para las tarjetas del tablero. */
export function MiniTrack({ progreso, tono, carbon }: { progreso: number; tono: Tono; carbon?: number }) {
  const t = TONOS[tono];
  const p = clamp(progreso) * 100;
  return (
    <div className="relative mt-3 h-3 rounded-full bg-white/10" role="img" aria-label={`Va al ${Math.round(p)}% del camino`}>
      <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${Math.max(p, 2)}%`, background: `linear-gradient(90deg, ${t.soft}, ${t.c})` }} />
      <span aria-hidden className="absolute -top-3.5 text-xl transition-[left] duration-1000" style={{ left: `calc(${Math.max(p, 2)}% - 12px)` }}>
        🛷
      </span>
      {!!carbon && (
        <span aria-hidden className="absolute -top-2 text-sm" style={{ left: `calc(${Math.max(p, 2)}% - 28px)` }}>
          🪨
        </span>
      )}
      <span aria-hidden className="absolute -top-3 right-0 text-lg">
        🎄
      </span>
    </div>
  );
}
