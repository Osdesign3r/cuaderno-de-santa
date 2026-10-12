'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  titulo: string;
  subtitulo?: string;
  mensaje?: string | null;
  deshabilitado?: boolean;
  onCompleto: (pin: string) => Promise<void> | void;
};

export function PinPad({ titulo, subtitulo, mensaje, deshabilitado, onCompleto }: Props) {
  const [pin, setPin] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const ref = useRef(pin);
  ref.current = pin;

  const digito = useCallback(
    async (d: string) => {
      if (ocupado || deshabilitado || ref.current.length >= 6) return;
      const next = ref.current + d;
      setPin(next);
      if (next.length === 6) {
        setOcupado(true);
        try {
          await onCompleto(next);
        } finally {
          setPin('');
          setOcupado(false);
        }
      }
    },
    [ocupado, deshabilitado, onCompleto],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) void digito(e.key);
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [digito]);

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center text-center">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}

      <div className="my-6 flex gap-3" aria-label={`${pin.length} de 6 números`} role="img">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-gold transition-colors ${i < pin.length ? 'bg-gold' : 'bg-transparent'}`} />
        ))}
      </div>

      <p className="min-h-6 text-sm text-coal" role="alert">
        {mensaje}
      </p>

      <div className="mt-2 grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => void digito(d)} disabled={ocupado || deshabilitado} className="card min-h-16 text-2xl font-medium active:scale-95 disabled:opacity-40">
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => void digito('0')} disabled={ocupado || deshabilitado} className="card min-h-16 text-2xl font-medium active:scale-95 disabled:opacity-40">
          0
        </button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Borrar" className="card min-h-16 text-xl active:scale-95">
          ⌫
        </button>
      </div>
    </div>
  );
}
