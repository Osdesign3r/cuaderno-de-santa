'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Countdown } from '@/components/Countdown';
import { SantaVoz } from '@/components/SantaVoz';
import { SledTrack } from '@/components/SledTrack';
import { TONOS } from '@/components/tono';
import { Avatar, Cargando, ErrorCaja, NivelPill, StarsRow } from '@/components/ui';
import { useSanta, useStats } from '@/lib/data';
import { NIVELES, addDays, fmtDia, habitosPara, mensajeSanta, nombreHabito, veredicto } from '@/lib/santa';

const INICIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function DetalleNino() {
  const { slug } = useParams<{ slug: string }>();
  const { datos, hoy, error, recargar } = useSanta();
  const stats = useStats(datos, hoy);

  const nino = datos?.ninos.find((n) => n.slug === slug);
  const s = nino ? stats[nino.slug] : undefined;

  const volver = (
    <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-muted active:scale-95">
      ← Todos
    </Link>
  );

  if (error && !datos) return <main>{volver}<ErrorCaja texto={error} onReintentar={() => void recargar()} /></main>;
  if (!datos || !hoy) return <main>{volver}<Cargando /></main>;
  if (!nino || !s) return <main>{volver}<ErrorCaja texto="Ese niño no está en la lista de Santa." /></main>;

  const t = TONOS[nino.tono];
  const peque = false; // Anthony ve lo mismo que sus hermanos: puntos, racha, niveles
  const noLee = nino.modo === 'peque';
  const grande = nino.edad >= 8;
  const { cfg, habitos, registros } = datos;
  const lejos = !nino.siempre_en_casa && !s.enCasaHoy;
  const prueba = habitosPara(habitos, nino);
  const diarios = prueba.filter((h) => h.tipo === 'diario');
  const atencion = prueba.filter((h) => h.tipo === 'atencion');
  const porId = new Map(habitos.map((h) => [h.id, h]));

  const misRegistros = registros.filter((r) => r.nino_id === nino.id);
  const ultimos = [...misRegistros].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const semana = s.dias.filter((d) => d.fecha <= hoy && d.fecha >= addDays(hoy, -6));
  const buenosSemana = semana.filter((d) => d.bueno).length;
  const bonosSemana = misRegistros.filter((r) => r.tipo === 'bono' && porId.get(r.habito_id)?.clave !== 'ollas' && r.fecha >= addDays(hoy, -6) && r.fecha <= hoy).length;
  const ganadas = s.insignias.filter((i) => i.ganada);
  const mensaje = mensajeSanta(nino, s, habitos, hoy, cfg);
  const finalDia = hoy >= cfg.fin;

  const cuando = (f: string) => (f === hoy ? 'hoy' : f === addDays(hoy, -1) ? 'ayer' : fmtDia(f, { weekday: 'short', day: 'numeric' }));

  return (
    <main className="flex flex-col gap-5">
      <div>{volver}</div>

      <header className="flex items-center gap-4">
        <Avatar emoji={nino.emoji} tono={nino.tono} size={88} />
        <div>
          <h1 className="text-4xl font-semibold leading-tight">{nino.nombre}</h1>
          <NivelPill nivel={s.nivel} tono={nino.tono} />
        </div>
      </header>

      <section className="card relative p-4" style={{ borderColor: t.soft }} aria-label="Mensaje del duende">
        <p className="flex gap-3 text-lg leading-snug">
          <span aria-hidden className="text-3xl">🧝</span>
          <span>{mensaje}</span>
        </p>
        <SantaVoz texto={mensaje} grande={noLee} />
      </section>

      <section className="card p-4" aria-label="El camino de tu trineo">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tu camino a Nochebuena</h2>
        </div>
        <SledTrack progreso={s.progreso} ritmo={s.ritmo} carbon={s.carbon} tono={nino.tono} grande mostrarRitmo={!peque} />
        {s.carbon > 0 && (
          <p className="mt-1 rounded-2xl bg-coal/15 px-3 py-2 text-sm text-coal">
            🪨 Hay carbón en el trineo. Pide perdón o ayuda con algo y se va.
          </p>
        )}
        {!peque && <p className="mt-2 text-xs text-muted">⭐ pálida = el ritmo para ser Lista Buena</p>}
        <div className="mt-3">
          <Countdown hoy={hoy} cfg={cfg} />
        </div>
      </section>

      {/* Números: Anthony ve solo estrellas; Oriana, cifras pequeñas; Chris, el panel completo */}
      <section className={`grid gap-3 ${peque ? 'grid-cols-1' : grande && s.pct !== null ? 'grid-cols-3' : 'grid-cols-2'}`} aria-label="Tus estrellas">
        {peque ? (
          <div className="card p-4 text-center">
            <p className="mb-2 text-sm text-muted">Tus estrellas</p>
            <StarsRow n={Math.floor(s.total / 10)} max={12} size="text-3xl" />
            {s.racha > 0 && <p className="mt-3 text-3xl" aria-label={`Racha de ${s.racha} días`}>{'🔥'.repeat(Math.min(s.racha, 7))}</p>}
          </div>
        ) : (
          <>
            <Tile etiqueta="Puntos" valor={String(s.total)} emoji="⭐" />
            <Tile etiqueta="Racha" valor={`${s.racha}`} emoji="🔥" />
            {grande && s.pct !== null && <Tile etiqueta="Cumplido" valor={`${Math.round(Math.min(s.pct, 100))}%`} emoji="🎯" />}
          </>
        )}
      </section>

      {!peque && s.siguiente && s.faltanParaSiguiente !== null && s.faltanParaSiguiente > 0 && (
        <p className="text-center text-sm text-muted">
          Te faltan <b className="text-gold">{s.faltanParaSiguiente} puntos</b> para ser {s.siguiente.emoji} {s.siguiente.nombre}.
        </p>
      )}

      <section className="card p-4" aria-label="Hoy">
        <h2 className="mb-3 text-lg font-semibold">{lejos ? 'Mientras estás lejos' : 'Hoy'}</h2>
        {lejos ? (
          <p className="text-gold-soft">
            {s.proximaVisita
              ? `🛷 Te espero el ${fmtDia(s.proximaVisita.desde, { weekday: 'long', day: 'numeric', month: 'long' })}.`
              : 'Santa te tiene presente aunque estés lejos.'}
          </p>
        ) : (
          <ul className="grid grid-cols-5 gap-2">
            {diarios.map((h) => {
              const hecho = s.hoyHechos.has(h.id);
              return (
                <li key={h.id} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                    style={hecho ? { background: t.soft, boxShadow: `0 0 0 2px ${t.c}, 0 0 14px ${t.glow}` } : { background: 'rgba(255,255,255,0.06)', opacity: 0.55 }}
                    aria-label={`${nombreHabito(h, nino)}: ${hecho ? 'hecho' : 'pendiente'}`}
                  >
                    {hecho ? '✅' : h.emoji}
                  </span>
                  {!peque && <span className="text-[11px] leading-tight text-muted">{nombreHabito(h, nino)}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {atencion.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {atencion.map((h) => (
              <li key={h.id} className="pill" style={s.hoyHechos.has(h.id) ? { background: t.soft, color: t.c } : { background: 'rgba(255,255,255,0.08)', color: '#a8b3e2' }}>
                {h.emoji} {h.nombre} {s.hoyHechos.has(h.id) ? '✓' : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {semana.length > 0 && (
        <section className="card p-4" aria-label="Tu semana">
          <h2 className="mb-3 text-lg font-semibold">Tu semana</h2>
          <ol className="flex justify-between">
            {semana.map((d) => {
              const dow = new Date(`${d.fecha}T12:00:00Z`).getUTCDay();
              const simbolo = !d.enCasa ? '–' : d.retro > 0 ? '🪨' : d.bueno ? '⭐' : d.diarios > 0 ? '✨' : d.fecha === hoy ? '·' : '○';
              return (
                <li key={d.fecha} className="flex flex-col items-center gap-1">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-xl" style={d.fecha === hoy ? { boxShadow: `0 0 0 2px ${t.c}` } : undefined}>
                    {simbolo}
                  </span>
                  <span className="text-xs text-muted">{INICIAL[dow]}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {grande && (
        <section className="card p-4" aria-label="Misiones de la semana">
          <h2 className="mb-3 text-lg font-semibold">Misiones de la semana</h2>
          <Mision texto="Días buenos (4 o más deberes, sin tropiezos)" actual={buenosSemana} meta={5} color={t.c} />
          <Mision texto="Ayudas extra de elfo" actual={bonosSemana} meta={3} color={t.c} />
        </section>
      )}

      <section className="card p-4" aria-label="Insignias">
        <h2 className="mb-3 text-lg font-semibold">Insignias</h2>
        {peque && ganadas.length === 0 ? (
          <p className="text-muted">Aquí van a brillar tus insignias ✨</p>
        ) : (
          <ul className="grid grid-cols-4 gap-2">
            {(peque ? ganadas : s.insignias).map((i) => (
              <li key={i.id} className="flex flex-col items-center gap-1 text-center" title={i.pista}>
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${i.ganada ? 'bg-gold/20 ring-2 ring-gold' : 'bg-white/5 opacity-40 grayscale'}`}>{i.emoji}</span>
                {!peque && <span className="text-[11px] leading-tight text-muted">{i.ganada ? i.nombre : i.pista}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4" aria-label="Últimas cosas que anotó Santa">
        <h2 className="mb-3 text-lg font-semibold">Lo último que anotó Santa</h2>
        {ultimos.length === 0 ? (
          <p className="text-muted">Todavía no hay nada anotado. ¡Hoy es un buen día para empezar!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ultimos.map((r) => {
              const h = porId.get(r.habito_id);
              if (!h) return null;
              const neg = r.puntos < 0;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
                  <span aria-hidden className="text-2xl">{h.emoji}</span>
                  <span className="flex-1 text-sm">{nombreHabito(h, nino)}{r.nota === 'primero' && <span title="Fue el primero" aria-label="primero del día"> ⚡</span>}</span>
                  {!peque && <span className={`text-sm font-semibold ${neg ? 'text-coal' : 'text-ok'}`}>{neg ? '' : '+'}{r.puntos}</span>}
                  <span className="w-12 text-right text-xs text-muted">{cuando(r.fecha)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-4" aria-label="Los niveles de Santa">
        <h2 className="mb-1 text-lg font-semibold">Los niveles de Santa</h2>
        <p className="mb-3 text-sm text-muted">Cada nivel trae una sorpresa distinta en Nochebuena. ¡Tú decides cuál! El % se calcula sobre el máximo de las tareas diarias; las ayudas extra y los ⚡ suman por encima.</p>
        <ul className="flex flex-col gap-2">
          {NIVELES.map((n) => {
            const actual = n.id === s.nivel.id;
            return (
              <li key={n.id} className="flex items-center gap-3 rounded-2xl px-3 py-2" style={actual ? { background: t.soft, boxShadow: `0 0 0 2px ${t.c}` } : { background: 'rgba(255,255,255,0.05)' }}>
                <span aria-hidden className="text-2xl">{n.emoji}</span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{n.nombre}{actual ? ' · estás aquí' : ''}</span>
                  {!peque && <span className="block text-xs text-muted">{veredicto(n.desde).detalle}</span>}
                </span>
                {!peque && <span className="text-xs text-muted">{n.desde}%</span>}
              </li>
            );
          })}
        </ul>
        {finalDia && (
          <p className="mt-4 rounded-2xl bg-gold/15 p-3 text-center text-gold-soft">
            🎄 {veredicto(s.pctFinal).titulo}: {veredicto(s.pctFinal).detalle}
          </p>
        )}
      </section>
    </main>
  );
}

function Tile({ etiqueta, valor, emoji }: { etiqueta: string; valor: string; emoji: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-2xl" aria-hidden>{emoji}</p>
      <p className="text-2xl font-semibold leading-tight">{valor}</p>
      <p className="text-xs text-muted">{etiqueta}</p>
    </div>
  );
}

function Mision({ texto, actual, meta, color }: { texto: string; actual: number; meta: number; color: string }) {
  const p = Math.min(1, actual / meta) * 100;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-sm">
        <span>{texto}</span>
        <span className="text-muted">{Math.min(actual, meta)}/{meta}{actual >= meta ? ' ✅' : ''}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={Math.min(actual, meta)}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}
