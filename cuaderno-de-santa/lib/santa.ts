import type { Config, Habito, Nino, Registro, Visita } from './types';

export const TZ = 'America/Bogota';

/* ───────── Fechas (siempre como 'YYYY-MM-DD' en hora de Colombia) ───────── */

export function hoyBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function utc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  return new Date(utc(iso) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Días entre a y b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function eachDay(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let d = desde; d <= hasta; d = addDays(d, 1)) out.push(d);
  return out;
}

export function fmtDia(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...opts }).format(new Date(utc(iso)));
}

/* ───────── Niveles ───────── */

export type Nivel = { id: 'observacion' | 'traviesillo' | 'aprendiz' | 'buena' | 'favorito'; nombre: string; emoji: string; desde: number };

export const NIVELES: Nivel[] = [
  { id: 'traviesillo', nombre: 'Traviesillo', emoji: '🪨', desde: 0 },
  { id: 'aprendiz', nombre: 'Elfo aprendiz', emoji: '🧝', desde: 40 },
  { id: 'buena', nombre: 'Lista Buena', emoji: '⭐', desde: 70 },
  { id: 'favorito', nombre: 'Favorito de Santa', emoji: '🎅', desde: 90 },
];

/** Antes de la primera anotación Santa solo observa: no hay nivel que dar. No forma parte de la escalera. */
export const OBSERVACION: Nivel = { id: 'observacion', nombre: 'En observación', emoji: '🔭', desde: 0 };

/** Umbral (en % del máximo posible) donde termina el camino: el nivel más alto. */
/** Días que miden el nivel, y días que un tropiezo pone techo (Favorito de Santa) al nivel. */
export const VENTANA_DIAS = 14;
export const TOPE_DIAS = 7;

export const META_PCT = 90;
/** Ritmo que marca la estrella fantasma: el umbral de "Lista Buena". */
export const RITMO_PCT = 70;

export function nivelPorPct(pct: number | null): Nivel {
  if (pct === null) return NIVELES[1]; // todos arrancan como Elfo aprendiz
  let n = NIVELES[0];
  for (const v of NIVELES) if (pct >= v.desde) n = v;
  return n;
}

export function siguienteNivel(n: Nivel): Nivel | null {
  if (n.id === 'observacion') return NIVELES[1];
  const i = NIVELES.findIndex((v) => v.id === n.id);
  return NIVELES[i + 1] ?? null;
}

export type Veredicto = { nivel: Nivel; titulo: string; detalle: string };

export function veredicto(pct: number): Veredicto {
  const nivel = nivelPorPct(pct);
  switch (nivel.id) {
    case 'favorito':
      return { nivel, titulo: 'Favorito de Santa', detalle: 'Sorpresa grande de los elfos' };
    case 'buena':
      return { nivel, titulo: 'Lista Buena', detalle: 'Un detalle extra de los elfos' };
    case 'aprendiz':
      return { nivel, titulo: 'Elfo aprendiz', detalle: 'Un trocito de carbón de chocolate' };
    default:
      return { nivel, titulo: 'Traviesillo', detalle: 'Un carbón de chocolate bien grande' };
  }
}

/* ───────── Hábitos ───────── */

export function puntosDe(h: Habito, n: Nino): number {
  return n.modo === 'peque' && h.puntos_peque !== null ? h.puntos_peque : h.puntos;
}

/** Nombre que ve cada niño (Anthony, de 4, no lava: lleva). */
export function nombreHabito(h: Habito, n: Nino): string {
  if (n.modo === 'peque' && h.clave === 'taza') return 'Llevar mi taza';
  return h.nombre;
}

export function habitosPara(habitos: Habito[], n: Nino): Habito[] {
  return habitos
    .filter((h) => !h.solo_nino || h.solo_nino === n.slug)
    .filter((h) => h.tipo !== 'atencion' || !n.siempre_en_casa)
    .sort((a, b) => a.orden - b.orden);
}

/* ───────── Cálculo por niño ───────── */

export type DiaInfo = { fecha: string; enCasa: boolean; diarios: number; retro: number; pts: number; bueno: boolean };

export type Insignia = { id: string; emoji: string; nombre: string; pista: string; ganada: boolean };

export type Stats = {
  total: number;
  progreso: number; // 0..1 sobre el camino
  ritmo: number; // 0..1 posición de la estrella fantasma
  pct: number | null; // % del máximo posible en las últimas 2 semanas, incluyendo lo de hoy hasta ahora
  nivel: Nivel;
  siguiente: Nivel | null;
  faltanParaSiguiente: number | null;
  diasDisponibles: number;
  diasCompletos: number;
  maxDia: number;
  racha: number;
  carbon: number; // retrocesos de los últimos 3 días aún sin reparar
  retrocesoHoy: boolean;
  reparadoHoy: boolean;
  dias: DiaInfo[];
  insignias: Insignia[];
  diasVentana: number; // días que miden el nivel (hasta 14)
  tope: { motivo: 'reciente' | 'varios'; diasRestantes: number } | null; // techo por tropiezos recientes
  pctNochebuena: number; // veredicto si hoy fuera Nochebuena: mitad temporada completa, mitad últimas 2 semanas
  pctFinal: number; // % si la temporada terminara hoy (usa todos los días disponibles)
  hoyHechos: Set<string>; // ids de hábitos registrados hoy
  bonosHoy: number;
  proximaVisita: Visita | null;
  enCasaHoy: boolean;
};

export function enCasaEl(n: Nino, visitas: Visita[], fecha: string): boolean {
  return n.siempre_en_casa || visitas.some((v) => fecha >= v.desde && fecha <= v.hasta);
}

export function calcular(
  nino: Nino,
  habitos: Habito[],
  registros: Registro[],
  visitas: Visita[],
  cfg: Config,
  hoy: string,
): Stats {
  const porId = new Map(habitos.map((h) => [h.id, h]));
  const maxDia = habitos.filter((h) => h.tipo === 'diario').reduce((s, h) => s + puntosDe(h, nino), 0);
  const temporada = eachDay(cfg.inicio, cfg.fin);
  const disponibles = temporada.filter((d) => enCasaEl(nino, visitas, d));
  const completos = disponibles.filter((d) => d < hoy);

  const porFecha = new Map<string, Registro[]>();
  for (const r of registros) {
    if (r.nino_id !== nino.id) continue;
    const l = porFecha.get(r.fecha) ?? [];
    l.push(r);
    porFecha.set(r.fecha, l);
  }

  // Puntos acumulados día a día. Un retroceso nunca baja del piso.
  // Piso: 0 para todos; para quien visita (Oriana), el total con el que arrancó la visita actual.
  let total = 0;
  let piso = 0;
  const acum = new Map<string, number>();
  const dias: DiaInfo[] = [];
  for (const d of temporada) {
    if (!nino.siempre_en_casa && visitas.some((v) => v.desde === d)) piso = total;
    const evs = (porFecha.get(d) ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const antes = total;
    let diarios = 0;
    let retro = 0;
    for (const e of evs) {
      if (e.tipo === 'retroceso') {
        total = Math.max(piso, total + e.puntos);
        retro++;
      } else {
        total += e.puntos;
        if (e.tipo === 'diario') diarios++;
      }
    }
    acum.set(d, total);
    dias.push({
      fecha: d,
      enCasa: enCasaEl(nino, visitas, d),
      diarios,
      retro,
      pts: total - antes,
      bueno: diarios >= 4 && retro === 0,
    });
  }

  const ayer = addDays(hoy, -1);
  const hastaAyer = ayer < cfg.inicio ? 0 : (acum.get(ayer > cfg.fin ? cfg.fin : ayer) ?? 0);
  // El nivel mide las últimas 2 semanas (no toda la temporada): así cada día pesa igual en octubre que en diciembre
  // y un mal día se nota (y se puede remontar). El trineo, en cambio, sí es el viaje completo.
  // Hoy cuenta desde la primera anotación, para que el niño vea si avanza: se mide contra lo ya hecho
  // (marcar algo nunca baja el %). Con un tropiezo, hoy se mide contra el día completo. Al cerrar el día se confirma.
  const hoyRegs = porFecha.get(hoy) ?? [];
  const hoyConRetro = dias.some((d) => d.fecha === hoy && d.retro > 0);
  const hoyCuenta = hoyRegs.length > 0;
  const cerrados = completos.slice(-(hoyCuenta ? VENTANA_DIAS - 1 : VENTANA_DIAS));
  const sumaDia = (d: string) => (porFecha.get(d) ?? []).reduce((a, r) => a + r.puntos, 0);
  const hechoHoyMax = hoyRegs.reduce((a, r) => {
    const h = porId.get(r.habito_id);
    return h && h.tipo === 'diario' ? a + puntosDe(h, nino) : a;
  }, 0);
  const ptsCuenta = cerrados.reduce((a, d) => a + sumaDia(d), 0) + (hoyCuenta ? sumaDia(hoy) : 0);
  const denCuenta = cerrados.length * maxDia + (hoyConRetro ? maxDia : hoyCuenta ? hechoHoyMax : 0);
  const diasCuenta = cerrados.length + (hoyCuenta ? 1 : 0);
  // Con menos de un día completo de evidencia todavía no hay nivel que medir.
  const pct = maxDia > 0 && denCuenta >= maxDia ? Math.max(0, (ptsCuenta / denCuenta) * 100) : null;
  const pctFinal = disponibles.length > 0 && maxDia > 0 ? (total / (disponibles.length * maxDia)) * 100 : 0;

  const meta = disponibles.length * maxDia * (META_PCT / 100);
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const progreso = meta > 0 ? clamp(total / meta) : 0;
  const ritmo = meta > 0 ? clamp((completos.length * maxDia * (RITMO_PCT / 100)) / meta) : 0;

  const sinAnotar = !registros.some((r) => r.nino_id === nino.id);
  const nivelBase = sinAnotar ? OBSERVACION : nivelPorPct(pct === null ? null : Math.min(pct, 100));

  // Consecuencias que no se diluyen: un tropiezo reciente pone techo al nivel, aunque el % sea alto.
  const retrosFechas = registros.filter((r) => r.nino_id === nino.id && r.tipo === 'retroceso').map((r) => r.fecha);
  const ultimoRetro = retrosFechas.filter((f) => f <= hoy).sort().pop() ?? null;
  const retrosEn14 = retrosFechas.filter((f) => f <= hoy && diffDays(f, hoy) < 14).length;
  let nivel = nivelBase;
  let tope: Stats['tope'] = null;
  const idx = (n: Nivel) => NIVELES.findIndex((v) => v.id === n.id);
  if (nivelBase.id !== 'observacion') {
    if (retrosEn14 >= 3 && idx(nivelBase) > 1) {
      nivel = NIVELES[1];
      tope = { motivo: 'varios', diasRestantes: Math.max(1, 14 - diffDays(retrosFechas.filter((f) => f <= hoy && diffDays(f, hoy) < 14).sort()[0], hoy)) };
    } else if (ultimoRetro && diffDays(ultimoRetro, hoy) < TOPE_DIAS && idx(nivelBase) > 2) {
      nivel = NIVELES[2];
      tope = { motivo: 'reciente', diasRestantes: TOPE_DIAS - diffDays(ultimoRetro, hoy) };
    }
  }
  const siguiente = siguienteNivel(nivel);
  let faltan: number | null = null;
  if (siguiente && pct !== null && !tope) {
    faltan = Math.max(0, Math.ceil((denCuenta * siguiente.desde) / 100 - ptsCuenta));
  }

  // Racha: días buenos consecutivos (solo días en casa). Hoy no rompe la racha si aún no termina.
  let racha = 0;
  const conteo = dias.filter((d) => d.enCasa && d.fecha <= hoy);
  for (let i = conteo.length - 1; i >= 0; i--) {
    const d = conteo[i];
    if (d.bueno) racha++;
    else if (d.fecha === hoy) continue;
    else break;
  }

  // Carbón visible: retrocesos de los últimos 3 días menos reparaciones.
  const ultimos = registros.filter((r) => r.nino_id === nino.id && r.fecha >= addDays(hoy, -2) && r.fecha <= hoy);
  const retros = ultimos.filter((r) => r.tipo === 'retroceso').length;
  const reps = ultimos.filter((r) => r.tipo === 'reparacion').length;
  const carbon = Math.max(0, retros - reps);

  const deHoy = porFecha.get(hoy) ?? [];
  const hoyHechos = new Set(deHoy.filter((r) => r.tipo !== 'retroceso' && r.tipo !== 'reparacion').map((r) => r.habito_id));
  const bonosHoy = deHoy.filter((r) => r.tipo === 'bono').length;
  const retrocesoHoy = deHoy.some((r) => r.tipo === 'retroceso');
  const reparadoHoy = deHoy.some((r) => r.tipo === 'reparacion');

  const proximaVisita =
    nino.siempre_en_casa
      ? null
      : visitas
          .filter((v) => v.hasta >= hoy)
          .sort((a, b) => a.desde.localeCompare(b.desde))[0] ?? null;

  // Insignias
  const diasPasados = dias.filter((d) => d.enCasa && d.fecha <= hoy);
  let corridaPaz = 0;
  let maxPaz = 0;
  for (const d of diasPasados) {
    if (d.fecha === hoy && d.diarios === 0 && d.retro === 0) continue; // hoy sin registrar no cuenta
    corridaPaz = d.retro === 0 ? corridaPaz + 1 : 0;
    maxPaz = Math.max(maxPaz, corridaPaz);
  }
  const maxRacha = (() => {
    let c = 0;
    let m = 0;
    for (const d of diasPasados) {
      c = d.bueno ? c + 1 : 0;
      m = Math.max(m, c);
    }
    return m;
  })();
  const bonosTotal = registros.filter((r) => r.nino_id === nino.id && r.tipo === 'bono').length;
  const nDiarios = habitos.filter((h) => h.tipo === 'diario').length;
  const hayPerfecto = dias.some((d) => d.diarios >= nDiarios && d.retro === 0);

  const insignias: Insignia[] = [
    { id: 'perfecto', emoji: '🌟', nombre: 'Día perfecto', pista: `Cumple los ${nDiarios} deberes en un día`, ganada: hayPerfecto },
    { id: 'racha', emoji: '🔥', nombre: 'Racha de 3', pista: '3 días buenos seguidos', ganada: maxRacha >= 3 },
    { id: 'ayudante', emoji: '🧑‍🍳', nombre: 'Ayudante de Santa', pista: '5 ayudas extra', ganada: bonosTotal >= 5 },
    { id: 'paz', emoji: '🕊️', nombre: 'Paz en casa', pista: '5 días seguidos sin peleas', ganada: maxPaz >= 5 },
  ];

  return {
    total,
    progreso,
    ritmo,
    pct,
    nivel,
    siguiente,
    faltanParaSiguiente: faltan,
    diasDisponibles: disponibles.length,
    diasCompletos: completos.length,
    maxDia,
    racha,
    carbon,
    retrocesoHoy,
    reparadoHoy,
    dias,
    insignias,
    diasVentana: diasCuenta,
    tope,
    pctNochebuena: pct === null ? pctFinal : (pctFinal + Math.min(pct, 100)) / 2,
    pctFinal,
    hoyHechos,
    bonosHoy,
    proximaVisita,
    enCasaHoy: enCasaEl(nino, visitas, hoy),
  };
}

/* ───────── Mensajes de Santa ───────── */

const FRASES: Record<string, string> = {
  cama: 'tendiste tu cama',
  taza: 'cuidaste tu taza',
  paz: 'hoy hubo paz',
  cuarto: 'ordenaste tu cuarto',
  comer: 'comiste juicioso',
  arena: 'limpiaste la arena de los gatos',
};

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

/** Mensajes del duende de Santa (habla en 3.ª persona de Santa; no hace falta que "sea" Santa). */
export function mensajeSanta(nino: Nino, s: Stats, habitos: Habito[], hoy: string, cfg: Config): string {
  const seed = `${nino.slug}${hoy}`;
  const nombre = nino.nombre;
  if (hoy < cfg.inicio) return `¡Hola, ${nombre}! Soy un duende de Santa. Mañana empezamos a anotar: ya afilamos los lápices.`;
  if (hoy > cfg.fin) return `¡Feliz Navidad, ${nombre}! Los duendes te agradecen este viaje al Polo.`;
  if (!s.enCasaHoy && !nino.siempre_en_casa) {
    const v = s.proximaVisita;
    return v
      ? `${nombre}, te esperamos el ${fmtDia(v.desde, { weekday: 'long', day: 'numeric', month: 'long' })}. Mientras tanto, ¡cuéntale a papá por teléfono qué estás leyendo!`
      : `${nombre}, los duendes te tienen presente aunque estés lejos.`;
  }
  if (s.retrocesoHoy && !s.reparadoHoy) {
    return pick(
      [
        `${nombre}, hoy vimos un tropiezo y el trineo dio marcha atrás. Una disculpa o ayudar con algo lo arregla.`,
        `Los duendes lo vieron, ${nombre}. Pasa, pero tiene consecuencias. Arregla las cosas y el carbón se va.`,
        `Psst, ${nombre}: hoy el cuaderno anotó algo que no le gustó a Santa. Todavía puedes remediarlo.`,
      ],
      seed,
    );
  }
  if (s.reparadoHoy) {
    return `${nombre}, vimos cómo arreglaste las cosas. Eso lo hacen solo los grandes.`;
  }
  const hechos = habitos.filter((h) => s.hoyHechos.has(h.id));
  const diarios = hechos.filter((h) => h.tipo === 'diario' && FRASES[h.clave]);
  const bonos = hechos.filter((h) => h.tipo === 'bono');
  if (bonos.length > 0) return `¡Un ayudante de Santa! Anotamos tu ayuda de hoy, ${nombre}.`;
  if (diarios.length >= 4) return `¡Casi perfecto, ${nombre}! Vimos que ${FRASES[diarios[0].clave]} y mucho más.`;
  if (diarios.length > 0) return `Vimos que ${FRASES[diarios[diarios.length - 1].clave]}, ${nombre}. ¡Sigue así!`;
  if (s.racha >= 3) return `${s.racha} días buenos seguidos, ${nombre}. El trineo va volando.`;
  return pick(
    [
      `Los duendes están atentos, ${nombre}. Hoy hay estrellas esperando a que las ganes.`,
      `Buenos días desde el Polo, ${nombre}. Hoy queremos verte brillar.`,
      `Estamos mirando, ${nombre}… y nos encanta cuando ayudas sin que te lo pidan.`,
    ],
    seed,
  );
}
