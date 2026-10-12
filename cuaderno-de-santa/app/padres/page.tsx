'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PinPad } from '@/components/PinPad';
import { TONOS } from '@/components/tono';
import { Avatar, Cargando, ErrorCaja } from '@/components/ui';
import { ERRORES, api, useSanta, useStats } from '@/lib/data';
import { TZ, addDays, enCasaEl, fmtDia, habitosPara, nombreHabito, puntosDe } from '@/lib/santa';
import type { Habito, Nino, Registro } from '@/lib/types';

type Fase = 'cargando' | 'crear' | 'entrar' | 'panel';
const KEY = 'santa_sesion';
const INACTIVIDAD_MS = 10 * 60_000;

function leerSesion(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { token: string; t: number };
    if (Date.now() - o.t > INACTIVIDAD_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return o.token;
  } catch {
    return null;
  }
}
function guardarSesion(token: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ token, t: Date.now() }));
  } catch {}
}
function borrarSesion() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export default function Padres() {
  const [fase, setFase] = useState<Fase>('cargando');
  const [token, setToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [primero, setPrimero] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const conf = await api.pinConfigurado();
      if (conf === null) {
        setMsg(ERRORES.red);
        setFase('entrar');
        return;
      }
      if (!conf) return setFase('crear');
      const t = leerSesion();
      if (t) {
        setToken(t);
        setFase('panel');
      } else setFase('entrar');
    })();
  }, []);

  const entrar = useCallback(async (pin: string) => {
    const r = await api.login(pin);
    if (r.ok && r.token) {
      setMsg(null);
      guardarSesion(r.token);
      setToken(r.token);
      setFase('panel');
      return;
    }
    if (r.error === 'pin') setMsg(`PIN incorrecto. Te quedan ${r.restantes ?? 0} intentos.`);
    else if (r.error === 'bloqueado' && r.hasta) {
      const min = Math.max(1, Math.ceil((new Date(r.hasta).getTime() - Date.now()) / 60_000));
      setMsg(`Demasiados intentos. Espera ${min} min.`);
    } else setMsg(ERRORES[r.error ?? 'red'] ?? ERRORES.red);
  }, []);

  const crear = useCallback(
    async (pin: string) => {
      if (!primero) {
        setPrimero(pin);
        setMsg(null);
        return;
      }
      if (pin !== primero) {
        setPrimero(null);
        setMsg('Los PIN no coinciden. Empecemos de nuevo.');
        return;
      }
      const r = await api.setPin(pin);
      if (r.ok) await entrar(pin);
      else if (r.error === 'ya_configurado') {
        setMsg(ERRORES.ya_configurado);
        setFase('entrar');
      } else setMsg(ERRORES[r.error ?? 'red'] ?? ERRORES.red);
    },
    [primero, entrar],
  );

  const bloquear = useCallback((m?: string) => {
    borrarSesion();
    setToken(null);
    setMsg(m ?? null);
    setFase('entrar');
  }, []);

  return (
    <main>
      {fase === 'cargando' && <Cargando texto="Abriendo la puerta del taller…" />}

      {fase === 'crear' && (
        <div className="pt-6">
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-white/10 px-4 text-sm text-muted">← Tablero</Link>
          <div className="mt-8">
            <PinPad
              titulo={primero ? 'Repite el PIN' : 'Crea el PIN de papás'}
              subtitulo={primero ? 'Para estar seguros de que lo recuerdas.' : '6 números que solo ustedes dos sepan. Chris tiene 9 años y es muy listo.'}
              mensaje={msg}
              onCompleto={crear}
            />
          </div>
        </div>
      )}

      {fase === 'entrar' && (
        <div className="pt-6">
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-white/10 px-4 text-sm text-muted">← Tablero</Link>
          <div className="mt-8">
            <PinPad titulo="Panel de padres" subtitulo="Escribe el PIN" mensaje={msg} onCompleto={entrar} />
          </div>
        </div>
      )}

      {fase === 'panel' && token && <Panel token={token} onBloquear={bloquear} />}
    </main>
  );
}

/* ─────────────────────────── Panel ─────────────────────────── */

function Panel({ token, onBloquear }: { token: string; onBloquear: (m?: string) => void }) {
  const { datos, hoy, error, recargar } = useSanta();
  const stats = useStats(datos, hoy);
  const [slug, setSlug] = useState<string | null>(null);
  const [atras, setAtras] = useState(0);
  const [pend, setPend] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<{ t: string; mal: boolean } | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const ultima = useRef(Date.now());

  // Bloqueo automático por inactividad.
  useEffect(() => {
    const toque = () => {
      const ahora = Date.now();
      if (ahora - ultima.current > 10_000) guardarSesion(token);
      ultima.current = ahora;
    };
    window.addEventListener('pointerdown', toque);
    const t = setInterval(() => {
      if (Date.now() - ultima.current > INACTIVIDAD_MS) onBloquear('Panel bloqueado por inactividad.');
    }, 15_000);
    return () => {
      window.removeEventListener('pointerdown', toque);
      clearInterval(t);
    };
  }, [token, onBloquear]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3800);
    return () => clearTimeout(t);
  }, [aviso]);

  if (error && !datos) return <ErrorCaja texto={error} onReintentar={() => void recargar()} />;
  if (!datos || !hoy) return <Cargando />;

  const { ninos, habitos, registros, visitas, cfg } = datos;
  const nino = ninos.find((n) => n.slug === slug) ?? ninos[0];
  const s = stats[nino.slug];
  const t = TONOS[nino.tono];
  const fecha = addDays(hoy, -atras);
  const visitasNino = visitas.filter((v) => v.nino_id === nino.id);
  const enCasa = enCasaEl(nino, visitasNino, fecha);
  const fuera = fecha < cfg.inicio || fecha > cfg.fin;
  const antes = hoy < cfg.inicio;
  const lista = habitosPara(habitos, nino);
  const diarios = lista.filter((h) => h.tipo === 'diario');
  const bonos = lista.filter((h) => h.tipo === 'bono');
  const atencion = lista.filter((h) => h.tipo === 'atencion');
  const retro = lista.find((h) => h.tipo === 'retroceso');
  const repara = lista.find((h) => h.tipo === 'reparacion');
  const porId = new Map(habitos.map((h) => [h.id, h]));

  const delDia = registros
    .filter((r) => r.nino_id === nino.id && r.fecha === fecha)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hechos = new Set(delDia.filter((r) => ['diario', 'bono', 'atencion'].includes(r.tipo)).map((r) => r.habito_id));
  const nBonos = delDia.filter((r) => r.tipo === 'bono').length;
  const nRetro = delDia.filter((r) => r.tipo === 'retroceso').length;
  const nRep = delDia.filter((r) => r.tipo === 'reparacion').length;
  const ptsDia = delDia.reduce((a, r) => a + r.puntos, 0);

  const fallo = (e?: string) => {
    if (e === 'sesion') return onBloquear(ERRORES.sesion);
    setAviso({ t: ERRORES[e ?? 'red'] ?? 'No se pudo guardar.', mal: true });
  };

  async function marcar(h: Habito) {
    const k = `${nino.slug}:${h.clave}`;
    if (pend.has(k)) return;
    setPend((p) => new Set(p).add(k));
    const r = await api.registrar(token, nino.slug, h.clave, fecha);
    if (!r.ok) fallo(r.error);
    else {
      navigator.vibrate?.(12);
      if (r.accion === 'quitado') setAviso({ t: `${h.emoji} Quitado`, mal: false });
    }
    await recargar();
    setPend((p) => {
      const n = new Set(p);
      n.delete(k);
      return n;
    });
  }

  async function quitar(r: Registro) {
    const k = `q:${r.id}`;
    if (pend.has(k)) return;
    setPend((p) => new Set(p).add(k));
    const x = await api.quitar(token, r.id);
    if (!x.ok) fallo(x.error);
    await recargar();
    setPend((p) => {
      const n = new Set(p);
      n.delete(k);
      return n;
    });
  }

  async function visitaHoy() {
    const x = await api.guardarVisita(token, nino.slug, fecha, fecha, 'Visita extra');
    if (!x.ok) fallo(x.error);
    else setAviso({ t: `${nino.nombre} está de visita ese día 🛷`, mal: false });
    await recargar();
  }

  const bloqueado = fuera || !enCasa;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-white/10 px-4 text-sm text-muted">← Tablero</Link>
        <div className="flex gap-2">
          <button onClick={() => setAjustes((a) => !a)} aria-label="Ajustes" aria-expanded={ajustes} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg">⚙️</button>
          <button onClick={() => onBloquear()} aria-label="Bloquear panel" className="flex h-12 items-center gap-1 rounded-full bg-white/10 px-4 text-sm">🔒 Salir</button>
        </div>
      </div>

      <h1 className="text-3xl font-semibold">Panel de padres</h1>

      {ajustes && <Ajustes token={token} onBloquear={onBloquear} ninos={datos?.ninos ?? []} recargar={recargar} />}

      {antes && (
        <p className="card p-4 text-center text-gold-soft" role="status">
          ✏️ La temporada de Santa empieza el {fmtDia(cfg.inicio, { weekday: 'long', day: 'numeric', month: 'long' })}. Desde ese día podrás registrar.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Niño">
        {ninos.map((n) => {
          const act = n.id === nino.id;
          return (
            <button
              key={n.id}
              role="tab"
              aria-selected={act}
              onClick={() => setSlug(n.slug)}
              className="card flex min-h-20 flex-col items-center justify-center gap-1 p-2 active:scale-95"
              style={act ? { boxShadow: `0 0 0 2px ${TONOS[n.tono].c}, 0 0 18px ${TONOS[n.tono].glow}` } : { opacity: 0.7 }}
            >
              <span className="text-3xl" aria-hidden>{n.emoji}</span>
              <span className="text-sm font-medium">{n.nombre}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Día a registrar">
        {[0, 1, 2, 3].map((i) => {
          const f = addDays(hoy, -i);
          const act = i === atras;
          return (
            <button
              key={i}
              onClick={() => setAtras(i)}
              aria-pressed={act}
              className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-medium ${act ? 'bg-gold text-night-900' : 'bg-white/10 text-ink'}`}
            >
              {i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : fmtDia(f, { weekday: 'short', day: 'numeric' })}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Avatar emoji={nino.emoji} tono={nino.tono} size={52} />
        <p className="flex-1 text-sm text-muted">
          {s?.nivel.emoji} {s?.nivel.nombre} · {s?.total} pts{s && s.carbon > 0 ? ' · 🪨 carbón en el trineo' : ''}
        </p>
        <span className={`pill ${ptsDia < 0 ? 'bg-coal/20 text-coal' : 'bg-ok/15 text-ok'}`} aria-label="Puntos del día">
          {ptsDia > 0 ? '+' : ''}{ptsDia} ese día
        </span>
      </div>

      {!fuera && !enCasa && (
        <div className="card p-4 text-center">
          <p className="text-gold-soft">{nino.nombre} no está en casa ese día.</p>
          <button onClick={() => void visitaHoy()} className="mt-3 min-h-12 rounded-2xl bg-gold px-5 font-semibold text-night-900 active:scale-95">
            Marcar que sí está 🛷
          </button>
          {atencion.length > 0 && <p className="mt-3 text-xs text-muted">Las llamadas y la lectura sí se pueden anotar.</p>}
        </div>
      )}

      <Grupo titulo="Deberes del día">
        <div className="grid grid-cols-2 gap-2">
          {diarios.map((h) => (
            <ChipH key={h.id} h={h} nino={nino} hecho={hechos.has(h.id)} deshabilitado={bloqueado} cargando={pend.has(`${nino.slug}:${h.clave}`)} onClick={() => void marcar(h)} color={t.c} soft={t.soft} />
          ))}
        </div>
      </Grupo>

      <Grupo titulo={`Ayudante de Santa · ${nBonos}/${cfg.maxBonosDia}`}>
        <div className="grid grid-cols-2 gap-2">
          {bonos.map((h) => (
            <ChipH key={h.id} h={h} nino={nino} hecho={hechos.has(h.id)} deshabilitado={bloqueado || (nBonos >= cfg.maxBonosDia && !hechos.has(h.id))} cargando={pend.has(`${nino.slug}:${h.clave}`)} onClick={() => void marcar(h)} color={t.c} soft={t.soft} />
          ))}
        </div>
      </Grupo>

      {atencion.length > 0 && (
        <Grupo titulo="Atención (a distancia)">
          <div className="grid grid-cols-2 gap-2">
            {atencion.map((h) => (
              <ChipH key={h.id} h={h} nino={nino} hecho={hechos.has(h.id)} deshabilitado={fuera} cargando={pend.has(`${nino.slug}:${h.clave}`)} onClick={() => void marcar(h)} color={t.c} soft={t.soft} />
            ))}
          </div>
        </Grupo>
      )}

      {(retro || repara) && (
        <Grupo titulo="Tropiezos">
          <div className="grid grid-cols-2 gap-2">
            {retro && (
              <button
                onClick={() => void marcar(retro)}
                disabled={bloqueado || pend.has(`${nino.slug}:${retro.clave}`)}
                className="relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-coal/15 p-3 text-center ring-2 ring-coal/40 active:scale-95 disabled:opacity-40"
              >
                <span className="text-3xl" aria-hidden>{retro.emoji}</span>
                <span className="text-sm font-medium">{retro.nombre}</span>
                <span className="text-xs text-coal">{puntosDe(retro, nino)} pts</span>
                {nRetro > 0 && <span className="absolute right-2 top-2 rounded-full bg-coal px-2 text-xs font-bold text-night-900">×{nRetro}</span>}
              </button>
            )}
            {repara && (
              <button
                onClick={() => void marcar(repara)}
                disabled={bloqueado || pend.has(`${nino.slug}:${repara.clave}`)}
                className="relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-ok/10 p-3 text-center ring-2 ring-ok/40 active:scale-95 disabled:opacity-40"
              >
                <span className="text-3xl" aria-hidden>{repara.emoji}</span>
                <span className="text-sm font-medium">{repara.nombre}</span>
                <span className="text-xs text-ok">+{puntosDe(repara, nino)} pts</span>
                {nRep > 0 && <span className="absolute right-2 top-2 rounded-full bg-ok px-2 text-xs font-bold text-night-900">×{nRep}</span>}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Un tropiezo quita el “Día en paz”. Repararlo devuelve la mitad y el carbón se va.</p>
        </Grupo>
      )}

      <Grupo titulo="Anotado ese día">
        {delDia.length === 0 ? (
          <p className="text-sm text-muted">Nada todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {delDia.map((r) => {
              const h = porId.get(r.habito_id);
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2">
                  <span aria-hidden className="text-xl">{h?.emoji}</span>
                  <span className="flex-1 text-sm">{h ? nombreHabito(h, nino) : '—'}</span>
                  <span className={`text-sm font-semibold ${r.puntos < 0 ? 'text-coal' : 'text-ok'}`}>{r.puntos > 0 ? '+' : ''}{r.puntos}</span>
                  <span className="text-xs text-muted">{hora(r.created_at)}</span>
                  <button onClick={() => void quitar(r)} aria-label={`Quitar ${h?.nombre ?? 'registro'}`} disabled={pend.has(`q:${r.id}`)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-lg active:scale-90">×</button>
                </li>
              );
            })}
          </ul>
        )}
      </Grupo>

      {!nino.siempre_en_casa && <Visitas nino={nino} token={token} visitas={visitasNino} cfg={cfg} recargar={recargar} fallo={fallo} />}

      {aviso && (
        <div role="status" className={`fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-2xl px-4 py-3 text-center font-medium shadow-xl ${aviso.mal ? 'bg-coal text-night-900' : 'bg-ok text-night-900'}`}>
          {aviso.t}
        </div>
      )}
    </div>
  );
}

function hora(iso: string) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{titulo}</h2>
      {children}
    </section>
  );
}

function ChipH({ h, nino, hecho, deshabilitado, cargando, onClick, color, soft }: { h: Habito; nino: Nino; hecho: boolean; deshabilitado: boolean; cargando: boolean; onClick: () => void; color: string; soft: string }) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitado || cargando}
      aria-pressed={hecho}
      className={`relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center transition-transform active:scale-95 disabled:opacity-40 ${hecho ? 'chip-hecho' : ''}`}
      style={hecho ? { background: soft, boxShadow: `0 0 0 2px ${color}` } : { background: 'rgba(255,255,255,0.07)' }}
    >
      <span className="text-3xl" aria-hidden>{cargando ? '⏳' : h.emoji}</span>
      <span className="text-sm font-medium leading-tight">{nombreHabito(h, nino)}</span>
      <span className="text-xs text-muted">+{puntosDe(h, nino)}</span>
      {hecho && <span aria-hidden className="absolute right-2 top-2 text-lg">✅</span>}
    </button>
  );
}

function Visitas({ nino, token, visitas, cfg, recargar, fallo }: { nino: Nino; token: string; visitas: { id: string; desde: string; hasta: string; nota: string | null }[]; cfg: { inicio: string; fin: string }; recargar: () => Promise<void>; fallo: (e?: string) => void }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const ordenadas = [...visitas].sort((a, b) => a.desde.localeCompare(b.desde));

  async function agregar() {
    const x = await api.guardarVisita(token, nino.slug, desde, hasta || desde);
    if (!x.ok) return fallo(x.error);
    setDesde('');
    setHasta('');
    await recargar();
  }
  async function borrar(id: string) {
    if (!window.confirm('¿Borrar esta visita? Los registros ya hechos se conservan.')) return;
    const x = await api.borrarVisita(token, id);
    if (!x.ok) return fallo(x.error);
    await recargar();
  }

  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider text-muted">Visitas de {nino.nombre} ({ordenadas.length})</summary>
      <ul className="mt-3 flex flex-col gap-2">
        {ordenadas.map((v) => (
          <li key={v.id} className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2 text-sm">
            <span className="flex-1">
              {fmtDia(v.desde, { weekday: 'short', day: 'numeric', month: 'short' })}
              {v.hasta !== v.desde && ` → ${fmtDia(v.hasta, { weekday: 'short', day: 'numeric', month: 'short' })}`}
              {v.nota && <span className="block text-xs text-muted">{v.nota}</span>}
            </span>
            <button onClick={() => void borrar(v.id)} aria-label="Borrar visita" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">🗑️</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Desde
          <input type="date" value={desde} min={cfg.inicio} max={cfg.fin} onChange={(e) => setDesde(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl bg-white/10 px-3 text-ink" />
        </label>
        <label className="text-xs text-muted">
          Hasta
          <input type="date" value={hasta} min={desde || cfg.inicio} max={cfg.fin} onChange={(e) => setHasta(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl bg-white/10 px-3 text-ink" />
        </label>
      </div>
      <button onClick={() => void agregar()} disabled={!desde} className="mt-3 min-h-12 w-full rounded-2xl bg-gold font-semibold text-night-900 disabled:opacity-40">
        Agregar visita
      </button>
    </details>
  );
}

const EMOJIS = ['🐻', '🦊', '🐰', '🦁', '🐯', '🐼', '🐨', '🐸', '🦄', '🐶', '🐱', '🐵', '🐧', '🦉', '🐲', '🦖', '🚀', '⚽', '👑', '🧚', '🦸', '🧙', '🤖', '🌟'];
const TONOS_OP: { id: 'ambar' | 'turquesa' | 'rosa'; c: string }[] = [
  { id: 'ambar', c: '#FFB84D' },
  { id: 'turquesa', c: '#4CC9F0' },
  { id: 'rosa', c: '#FF8FB8' },
];

function EditorAvatar({ nino, token, onBloquear, recargar }: { nino: Nino; token: string; onBloquear: (m?: string) => void; recargar: () => Promise<void> }) {
  const [emoji, setEmoji] = useState(nino.emoji);
  const [tono, setTono] = useState<Nino['tono']>(nino.tono);
  const [msg, setMsg] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambio = emoji !== nino.emoji || tono !== nino.tono;

  async function guardar() {
    setGuardando(true);
    const r = await api.setAvatar(token, nino.id, emoji, tono);
    setGuardando(false);
    if (r.ok) {
      await recargar();
      return setMsg('¡Listo!');
    }
    if (r.error === 'sesion') return onBloquear(ERRORES.sesion);
    setMsg(ERRORES[r.error ?? 'red'] ?? ERRORES.red);
  }

  return (
    <div className="mb-4 border-b border-white/10 pb-4 last:mb-0 last:border-0 last:pb-0">
      <div className="mb-2 flex items-center gap-3">
        <Avatar emoji={emoji} tono={tono} size={56} />
        <span className="text-lg font-semibold">{nino.nombre}</span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Ícono de ${nino.nombre}`}>
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => { setEmoji(e); setMsg(null); }} aria-pressed={e === emoji} className={`h-12 w-12 rounded-xl text-2xl ${e === emoji ? 'bg-gold/30 ring-2 ring-gold' : 'bg-white/10'}`}>
            {e}
          </button>
        ))}
        <input
          value={EMOJIS.includes(emoji) ? '' : emoji}
          onChange={(e) => { const v = Array.from(e.target.value).slice(-2).join(''); if (v) { setEmoji(v); setMsg(null); } }}
          placeholder="✏️"
          aria-label="Otro emoji"
          className="h-12 w-16 rounded-xl bg-white/10 text-center text-2xl placeholder:text-muted"
        />
      </div>
      <div className="mt-2 flex gap-2" role="group" aria-label="Color">
        {TONOS_OP.map((t) => (
          <button key={t.id} onClick={() => { setTono(t.id); setMsg(null); }} aria-pressed={t.id === tono} aria-label={t.id} className={`h-10 w-10 rounded-full ${t.id === tono ? 'ring-2 ring-white' : ''}`} style={{ background: t.c }} />
        ))}
      </div>
      {msg && <p className="mt-2 text-sm text-gold" role="status">{msg}</p>}
      <button onClick={() => void guardar()} disabled={!cambio || guardando} className="mt-3 min-h-12 w-full rounded-2xl bg-gold font-semibold text-night-900 disabled:opacity-40">
        Guardar a {nino.nombre}
      </button>
    </div>
  );
}

function Ajustes({ token, onBloquear, ninos, recargar }: { token: string; onBloquear: (m?: string) => void; ninos: Nino[]; recargar: () => Promise<void> }) {
  const [nuevo, setNuevo] = useState('');
  const [m, setM] = useState<string | null>(null);

  async function cambiar() {
    const r = await api.cambiarPin(token, nuevo);
    if (r.ok) return onBloquear('PIN cambiado. Entra con el nuevo.');
    if (r.error === 'sesion') return onBloquear(ERRORES.sesion);
    setM(ERRORES[r.error ?? 'red'] ?? ERRORES.red);
  }

  return (
    <>
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Íconos de los niños</h2>
      {ninos.map((n) => (
        <EditorAvatar key={n.id + n.emoji + n.tono} nino={n} token={token} onBloquear={onBloquear} recargar={recargar} />
      ))}
    </section>
    <section className="card p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Cambiar PIN</h2>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={nuevo}
        onChange={(e) => setNuevo(e.target.value.replace(/\D/g, ''))}
        placeholder="Nuevo PIN de 6 números"
        aria-label="Nuevo PIN"
        className="min-h-12 w-full rounded-xl bg-white/10 px-4 text-ink placeholder:text-muted"
      />
      {m && <p className="mt-2 text-sm text-coal" role="alert">{m}</p>}
      <button onClick={() => void cambiar()} disabled={nuevo.length !== 6} className="mt-3 min-h-12 w-full rounded-2xl bg-gold font-semibold text-night-900 disabled:opacity-40">
        Guardar PIN nuevo
      </button>
      <p className="mt-2 text-xs text-muted">Al cambiarlo se cierran todas las sesiones abiertas.</p>
    </section>
    </>
  );
}
