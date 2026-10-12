import type { Nivel } from '@/lib/santa';
import type { Tono } from '@/lib/types';
import { TONOS } from './tono';

export function Avatar({ emoji, tono, size = 72 }: { emoji: string; tono: Tono; size?: number }) {
  const t = TONOS[tono];
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        background: `radial-gradient(circle at 30% 25%, ${t.soft}, rgba(255,255,255,0.04))`,
        boxShadow: `0 0 0 3px ${t.c}, 0 0 ${size / 2}px ${t.glow}`,
      }}
    >
      {emoji}
    </span>
  );
}

export function NivelPill({ nivel, tono }: { nivel: Nivel; tono: Tono }) {
  const t = TONOS[tono];
  return (
    <span className="pill" style={{ background: t.soft, color: t.c }}>
      <span aria-hidden>{nivel.emoji}</span>
      {nivel.nombre}
    </span>
  );
}

/** Una estrella por cada 10 puntos (un día perfecto). Para los más pequeños: íconos, sin cifras grandes. */
export function StarsRow({ n, max = 10, size = 'text-xl' }: { n: number; max?: number; size?: string }) {
  const mostrar = Math.min(n, max);
  if (n <= 0) return <span className="text-sm text-muted">Tu primera estrella te espera ✨</span>;
  return (
    <span className={`inline-flex flex-wrap items-center gap-0.5 ${size}`} aria-label={`${n} estrellas`}>
      {Array.from({ length: mostrar }, (_, i) => (
        <span key={i} aria-hidden>
          ⭐
        </span>
      ))}
      {n > max && <span className="ml-1 text-base font-semibold text-gold">+{n - max}</span>}
    </span>
  );
}

export function Cargando({ texto = 'Los elfos están abriendo el cuaderno…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-muted" role="status">
      <span className="text-5xl motion-safe:animate-pulse">🛷</span>
      <p>{texto}</p>
    </div>
  );
}

export function ErrorCaja({ texto, onReintentar }: { texto: string; onReintentar?: () => void }) {
  return (
    <div className="card mt-8 p-6 text-center" role="alert">
      <p className="text-4xl">🌨️</p>
      <p className="mt-2 text-ink">{texto}</p>
      {onReintentar && (
        <button onClick={onReintentar} className="mt-4 min-h-12 rounded-2xl bg-gold px-6 font-semibold text-night-900">
          Reintentar
        </button>
      )}
    </div>
  );
}
