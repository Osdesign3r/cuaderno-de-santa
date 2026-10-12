'use client';

import { useEffect, useState } from 'react';
import { detenerMusica, iniciarMusica } from '@/lib/sonido';

const CLAVE = 'santa_musica';

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}
function guardar(v: boolean) {
  try {
    localStorage.setItem(CLAVE, v ? '1' : '0');
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function MusicaBoton() {
  const [on, setOn] = useState(false);
  const [listo, setListo] = useState(false);

  // Los navegadores no dejan sonar sin un toque: si la música estaba activada, arranca en el primer toque.
  useEffect(() => {
    setListo(true);
    if (!leer()) return;
    setOn(true);
    const arrancar = () => void iniciarMusica();
    window.addEventListener('pointerdown', arrancar, { once: true });
    return () => window.removeEventListener('pointerdown', arrancar);
  }, []);

  async function alternar() {
    if (on) {
      detenerMusica();
      setOn(false);
      guardar(false);
    } else {
      const ok = await iniciarMusica();
      setOn(ok);
      guardar(ok);
    }
  }

  if (!listo) return null;
  return (
    <button
      onClick={() => void alternar()}
      aria-label={on ? 'Apagar música navideña' : 'Encender música navideña'}
      aria-pressed={on}
      className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur active:scale-95"
    >
      {on ? '🎵' : '🔇'}
    </button>
  );
}
