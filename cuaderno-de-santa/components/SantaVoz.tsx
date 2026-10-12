'use client';

import { useEffect, useState } from 'react';
import { callarSanta, santaHabla, vozDisponible } from '@/lib/sonido';

/** Botón grande para quien no lee (Anthony): Santa le dice el mensaje en voz alta. */
export function SantaVoz({ texto, grande }: { texto: string; grande?: boolean }) {
  const [hablando, setHablando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setOk(vozDisponible());
    // En Android/Chrome las voces cargan tarde
    if (vozDisponible()) window.speechSynthesis.getVoices();
    return () => callarSanta();
  }, []);

  if (!ok) return null;
  return (
    <button
      onClick={() => {
        if (hablando) {
          callarSanta();
          setHablando(false);
        } else {
          setHablando(true);
          santaHabla(texto, () => setHablando(false));
        }
      }}
      aria-label={hablando ? 'Callar a Santa' : 'Escuchar a Santa'}
      className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold font-semibold text-night-900 active:scale-95 ${grande ? 'text-xl' : ''}`}
    >
      <span aria-hidden className={hablando ? 'motion-safe:animate-pulse' : ''}>{hablando ? '🔊' : '🎅'}</span>
      {hablando ? 'Santa está hablando…' : 'Escuchar a Santa'}
    </button>
  );
}
