'use client';

/** Música navideña (melodías de dominio público) sintetizada con WebAudio: sin archivos, sin derechos, sin red. */

type Nota = [string, number]; // [nota, tiempos]; '-' = silencio

const JINGLE: Nota[] = [
  ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2],
  ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 4],
  ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5], ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
  ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['D4', 2], ['G4', 2],
  ['-', 2],
];

const DESEAMOS: Nota[] = [
  ['D4', 1], ['G4', 1], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F#4', 0.5],
  ['E4', 1], ['E4', 1], ['E4', 1], ['A4', 1], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5],
  ['F#4', 1], ['D4', 1], ['D4', 1], ['B4', 1], ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5],
  ['G4', 1], ['E4', 1], ['D4', 0.5], ['D4', 0.5], ['E4', 1], ['A4', 1], ['F#4', 1], ['G4', 3],
  ['-', 2],
];

const NOCHE_BUENA: Nota[] = [
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3], ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['B4', 3], ['C5', 2], ['C5', 1], ['G4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1], ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1], ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1], ['C5', 3], ['E5', 3],
  ['C5', 1], ['G4', 1], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1], ['C4', 3],
  ['-', 3],
];

const CANCIONES: { notas: Nota[]; tiempo: number }[] = [
  { notas: JINGLE, tiempo: 0.3 },
  { notas: NOCHE_BUENA, tiempo: 0.4 },
  { notas: DESEAMOS, tiempo: 0.36 },
];

const SEMITONOS: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function frecuencia(n: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + SEMITONOS[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let ctx: AudioContext | null = null;
let maestro: GainNode | null = null;
let sonando = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let indice = 0;

function contexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = 0.16; // suave: es de fondo
    maestro.connect(ctx.destination);
  }
  return ctx;
}

function caja(c: AudioContext, f: number, t: number, dur: number) {
  // Caja de música: seno + armónico agudo con caída rápida
  for (const [mult, vol] of [[1, 1], [2, 0.3]] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(dur, 0.4) + 0.5);
    o.connect(g).connect(maestro!);
    o.start(t);
    o.stop(t + Math.max(dur, 0.4) + 0.6);
  }
}

function programar() {
  const c = contexto();
  if (!c || !sonando) return;
  const { notas, tiempo } = CANCIONES[indice % CANCIONES.length];
  let t = c.currentTime + 0.1;
  for (const [n, b] of notas) {
    const f = frecuencia(n);
    if (f) caja(c, f, t, b * tiempo);
    t += b * tiempo;
  }
  indice++;
  timer = setTimeout(programar, (t - c.currentTime) * 1000);
}

export function musicaActiva() {
  return sonando;
}

export async function iniciarMusica() {
  const c = contexto();
  if (!c) return false;
  if (c.state === 'suspended') await c.resume();
  if (sonando) return true;
  sonando = true;
  programar();
  return true;
}

export function detenerMusica() {
  sonando = false;
  if (timer) clearTimeout(timer);
  void ctx?.suspend(); // corta las notas en cola
  void ctx?.close();
  ctx = null;
  maestro = null;
}

/** Voz de Santa: síntesis de voz del propio celular (español, grave y pausada). */
export function vozDisponible() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function santaHabla(texto: string, alTerminar?: () => void) {
  if (!vozDisponible()) return false;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(`Ho, ho, ho. ${texto}`);
  const voces = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  const v =
    voces.find((x) => /es[-_]co/i.test(x.lang)) ??
    voces.find((x) => /es[-_](mx|us|419)/i.test(x.lang)) ??
    voces.find((x) => /male|jorge|diego|pablo|carlos|juan|miguel/i.test(x.name)) ??
    voces[0];
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'es-CO';
  u.pitch = 0.45; // grave, de abuelo con barba
  u.rate = 0.85;
  u.onend = () => alTerminar?.();
  u.onerror = () => alTerminar?.();
  s.speak(u);
  return true;
}

export function callarSanta() {
  if (vozDisponible()) window.speechSynthesis.cancel();
}
