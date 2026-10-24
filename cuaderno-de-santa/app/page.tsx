'use client';

import Link from 'next/link';
import { Vigilancia } from '@/components/Vigilancia';
import { NinoCard } from '@/components/NinoCard';
import { Icono } from '@/components/Icon';
import { Cargando, ErrorCaja } from '@/components/ui';
import { useSanta, useStats } from '@/lib/data';

export default function Inicio() {
  const { datos, hoy, error, recargar } = useSanta();
  const stats = useStats(datos, hoy);

  return (
    <main>
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-soft">Desde el Polo Norte</p>
        <h1 className="mt-1 text-4xl font-semibold leading-tight">
          El Cuaderno <span className="text-gold">de Santa</span>
        </h1>
      </header>

      {datos && hoy && <Vigilancia hoy={hoy} cfg={datos.cfg} />}

      {error && !datos && <ErrorCaja texto={error} onReintentar={() => void recargar()} />}
      {!datos && !error && <Cargando />}

      {datos && hoy && (
        <section className="mt-6 flex flex-col gap-4" aria-label="Los niños en la lista de Santa">
          {datos.ninos.map((n) => (stats[n.slug] ? <NinoCard key={n.id} nino={n} s={stats[n.slug]} /> : null))}
          {error && <p className="text-center text-sm text-coal">{error}</p>}
        </section>
      )}

      <nav aria-label="Zona de padres" className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Link href="/padres" className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-night-800/90 px-5 text-sm text-muted ring-1 ring-white/15 backdrop-blur active:scale-95">
          <Icono nombre="candado" size={18} /> Padres
        </Link>
      </nav>
    </main>
  );
}
