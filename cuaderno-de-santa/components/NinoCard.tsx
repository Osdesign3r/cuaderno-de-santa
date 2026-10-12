import Link from 'next/link';
import { fmtDia, type Stats } from '@/lib/santa';
import type { Nino } from '@/lib/types';
import { MiniTrack } from './SledTrack';
import { TONOS } from './tono';
import { Avatar, NivelPill, StarsRow } from './ui';

export function NinoCard({ nino, s }: { nino: Nino; s: Stats }) {
  const t = TONOS[nino.tono];
  const peque = false; // Anthony ve lo mismo que sus hermanos
  const lejos = !nino.siempre_en_casa && !s.enCasaHoy;

  return (
    <Link
      href={`/nino/${nino.slug}`}
      className="card block p-4 transition-transform active:scale-[0.98]"
      style={{ borderColor: t.soft, boxShadow: `0 10px 30px -12px ${t.glow}` }}
      aria-label={`Ver el cuaderno de ${nino.nombre}`}
    >
      <div className="flex items-center gap-4">
        <Avatar emoji={nino.emoji} tono={nino.tono} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-2xl font-semibold leading-tight">{nino.nombre}</h2>
            <NivelPill nivel={s.nivel} tono={nino.tono} />
          </div>
          <MiniTrack progreso={s.progreso} tono={nino.tono} carbon={s.carbon} />
          <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
            {peque ? <StarsRow n={Math.floor(s.total / 10)} max={6} size="text-base" /> : <span className="font-medium text-ink">⭐ {s.total} puntos</span>}
            <span className="flex items-center gap-2">
              {s.racha > 0 && <span aria-label={`Racha de ${s.racha} días`}>🔥 {s.racha}</span>}
              {s.carbon > 0 && <span aria-label="Hay carbón en el trineo">🪨</span>}
            </span>
          </div>
        </div>
      </div>
      {lejos && s.proximaVisita && (
        <p className="mt-3 rounded-2xl bg-white/5 px-3 py-2 text-sm text-gold-soft">
          🛷 Te espero el {fmtDia(s.proximaVisita.desde, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      )}
    </Link>
  );
}
