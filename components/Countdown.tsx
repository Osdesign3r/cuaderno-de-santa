import { diffDays } from '@/lib/santa';
import type { Config } from '@/lib/types';

export function Countdown({ hoy, cfg }: { hoy: string; cfg: Config }) {
  let emoji = '🎄';
  let texto: string;
  if (hoy < cfg.inicio) {
    const n = diffDays(hoy, cfg.inicio);
    emoji = '✏️';
    texto = n === 1 ? 'Mañana Santa empieza a anotar' : `Santa empieza a anotar en ${n} días`;
  } else if (hoy > cfg.fin) {
    texto = '¡Feliz Navidad!';
  } else {
    const n = diffDays(hoy, cfg.fin);
    texto = n === 0 ? '¡Hoy es Nochebuena!' : n === 1 ? 'Falta 1 día para Nochebuena' : `Faltan ${n} días para Nochebuena`;
  }
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-gold-soft">
      <span aria-hidden>{emoji}</span>
      {texto}
    </p>
  );
}
