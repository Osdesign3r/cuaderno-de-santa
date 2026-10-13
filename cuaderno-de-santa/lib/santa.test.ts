import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, calcular, diffDays, eachDay, hoyBogota, nivelPorPct, veredicto } from './santa.ts';
import type { Config, Habito, Nino, Registro, Visita } from './types.ts';

const cfg: Config = { inicio: '2026-10-12', fin: '2026-12-24', maxBonosDia: 2 };

const H = (clave: string, tipo: Habito['tipo'], puntos: number, puntos_peque: number | null = puntos, solo: string | null = null, orden = 0): Habito => ({
  id: `h-${clave}`, clave, nombre: clave, emoji: '·', tipo, puntos, puntos_peque, solo_nino: solo, orden,
});
const habitos: Habito[] = [
  H('cama', 'diario', 2), H('taza', 'diario', 2), H('paz', 'diario', 2), H('cuarto', 'diario', 2), H('comer', 'diario', 2),
  H('loza', 'bono', 3), H('berrinche', 'retroceso', -3, -1), H('reparar', 'reparacion', 2, 1),
  H('llamada', 'atencion', 2, 2, 'oriana'),
];
const hid = (c: string) => habitos.find((h) => h.clave === c)!.id;

const anthony: Nino = { id: 'a', slug: 'anthony', nombre: 'Anthony', edad: 4, emoji: '🐻', tono: 'ambar', modo: 'peque', siempre_en_casa: true, orden: 1 };
const chris: Nino = { id: 'c', slug: 'chris', nombre: 'Chris', edad: 9, emoji: '🦊', tono: 'turquesa', modo: 'normal', siempre_en_casa: true, orden: 2 };
const oriana: Nino = { id: 'o', slug: 'oriana', nombre: 'Oriana', edad: 6, emoji: '🐰', tono: 'rosa', modo: 'normal', siempre_en_casa: false, orden: 3 };

let n = 0;
const R = (nino: Nino, clave: string, fecha: string): Registro => {
  const h = habitos.find((x) => x.clave === clave)!;
  const pts = nino.modo === 'peque' && h.puntos_peque !== null ? h.puntos_peque : h.puntos;
  return { id: `r${n}`, nino_id: nino.id, habito_id: h.id, tipo: h.tipo, puntos: pts, fecha, nota: null, created_at: `2026-10-12T00:00:${String(n++ % 60).padStart(2, '0')}Z` };
};
const diaCompleto = (nino: Nino, fecha: string) => ['cama', 'taza', 'paz', 'cuarto', 'comer'].map((c) => R(nino, c, fecha));

const visitasOri: Visita[] = [
  { id: 'v1', nino_id: 'o', desde: '2026-10-23', hasta: '2026-10-25', nota: null },
  { id: 'v2', nino_id: 'o', desde: '2026-11-06', hasta: '2026-11-08', nota: null },
  { id: 'v3', nino_id: 'o', desde: '2026-11-20', hasta: '2026-11-22', nota: null },
  { id: 'v4', nino_id: 'o', desde: '2026-12-04', hasta: '2026-12-06', nota: null },
  { id: 'v5', nino_id: 'o', desde: '2026-12-18', hasta: '2026-12-20', nota: null },
  { id: 'v6', nino_id: 'o', desde: '2026-12-24', hasta: '2026-12-24', nota: null },
];

test('fechas: hora de Colombia y temporada de 74 días', () => {
  assert.equal(hoyBogota(new Date('2026-10-12T03:00:00Z')), '2026-10-11'); // 22:00 en Bogotá
  assert.equal(hoyBogota(new Date('2026-10-12T05:30:00Z')), '2026-10-12');
  assert.equal(eachDay(cfg.inicio, cfg.fin).length, 74);
  assert.equal(diffDays('2026-10-12', '2026-12-24'), 73);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('un día completo suma 10 y el trineo avanza', () => {
  const s = calcular(chris, habitos, diaCompleto(chris, '2026-10-12'), [], cfg, '2026-10-13');
  assert.equal(s.total, 10);
  assert.equal(s.maxDia, 10);
  assert.ok(s.progreso > 0);
  assert.equal(s.pct, 100);
  assert.equal(s.nivel.id, 'favorito');
});

test('el retroceso resta -3 (Chris) y -1 (Anthony), nunca bajo 0', () => {
  const rc = [...diaCompleto(chris, '2026-10-12'), R(chris, 'berrinche', '2026-10-12')];
  assert.equal(calcular(chris, habitos, rc, [], cfg, '2026-10-13').total, 7);
  const ra = [...diaCompleto(anthony, '2026-10-12'), R(anthony, 'berrinche', '2026-10-12')];
  assert.equal(calcular(anthony, habitos, ra, [], cfg, '2026-10-13').total, 9);
  const piso = [R(chris, 'berrinche', '2026-10-12'), R(chris, 'berrinche', '2026-10-12')];
  assert.equal(calcular(chris, habitos, piso, [], cfg, '2026-10-13').total, 0);
});

test('un día malo no borra días buenos acumulados', () => {
  const regs = [...diaCompleto(chris, '2026-10-12'), ...diaCompleto(chris, '2026-10-13'), ...diaCompleto(chris, '2026-10-14'), R(chris, 'berrinche', '2026-10-15')];
  assert.equal(calcular(chris, habitos, regs, [], cfg, '2026-10-16').total, 27);
});

test('Oriana: solo cuentan los días de visita (16 en total)', () => {
  const s = calcular(oriana, habitos, [], visitasOri, cfg, '2026-10-13');
  assert.equal(s.diasDisponibles, 16);
  assert.equal(s.enCasaHoy, false);
  assert.equal(s.proximaVisita?.desde, '2026-10-23');
  assert.equal(s.pct, null); // aún no ha tenido ni un día en casa
});

test('Oriana: cada visita es un capítulo y el piso es el total con el que llegó', () => {
  const regs = [
    ...diaCompleto(oriana, '2026-10-23'), // +10
    R(oriana, 'berrinche', '2026-11-06'), // llega con 10: no puede bajar de 10
  ];
  assert.equal(calcular(oriana, habitos, regs, visitasOri, cfg, '2026-11-07').total, 10);
  const regs2 = [...regs, ...diaCompleto(oriana, '2026-11-06'), R(oriana, 'berrinche', '2026-11-07')];
  // 10 (visita 1) + 10 (ya existía berrinche antes: igual 10) + 10 - 3 = 17
  assert.equal(calcular(oriana, habitos, regs2, visitasOri, cfg, '2026-11-08').total, 17);
});

test('Oriana: llamada suma aunque no esté en casa, y no entra al máximo posible', () => {
  const s = calcular(oriana, habitos, [R(oriana, 'llamada', '2026-10-14')], visitasOri, cfg, '2026-10-15');
  assert.equal(s.total, 2);
});

test('carbón visible: retrocesos de los últimos 3 días menos reparaciones', () => {
  const regs = [R(chris, 'berrinche', '2026-10-14'), R(chris, 'berrinche', '2026-10-15'), R(chris, 'reparar', '2026-10-15')];
  assert.equal(calcular(chris, habitos, regs, [], cfg, '2026-10-15').carbon, 1);
  assert.equal(calcular(chris, habitos, regs, [], cfg, '2026-10-20').carbon, 0); // ya pasó la ventana
});

test('racha: días buenos seguidos; hoy sin terminar no la rompe', () => {
  const regs = [...diaCompleto(chris, '2026-10-12'), ...diaCompleto(chris, '2026-10-13'), ...diaCompleto(chris, '2026-10-14')];
  assert.equal(calcular(chris, habitos, regs, [], cfg, '2026-10-15').racha, 3);
  const conMalo = [...regs, R(chris, 'berrinche', '2026-10-15')];
  assert.equal(calcular(chris, habitos, conMalo, [], cfg, '2026-10-16').racha, 0);
});

test('niveles y veredicto', () => {
  assert.equal(nivelPorPct(null).id, 'aprendiz');
  assert.equal(calcular(chris, habitos, [], [], cfg, '2026-10-13').nivel.id, 'observacion');
  assert.equal(nivelPorPct(39).id, 'traviesillo');
  assert.equal(nivelPorPct(40).id, 'aprendiz');
  assert.equal(nivelPorPct(70).id, 'buena');
  assert.equal(nivelPorPct(90).id, 'favorito');
  assert.match(veredicto(20).detalle, /carbón de chocolate/);
});

test('antes de la temporada: sin puntos, sin porcentaje', () => {
  const s = calcular(chris, habitos, [], [], cfg, '2026-10-11');
  assert.equal(s.total, 0);
  assert.equal(s.pct, null);
  assert.equal(s.diasCompletos, 0);
});

test('un tropiezo hoy se refleja al instante: 2 pts y berrinche = 0 pts = Traviesillo', () => {
  const comer = habitos.find((h) => h.clave === 'comer')!;
  const bern = habitos.find((h) => h.tipo === 'retroceso')!;
  const mk = (h: typeof comer, tipo: string, puntos: number, t: string) =>
    ({ id: t, nino_id: chris.id, habito_id: h.id, tipo, puntos, fecha: '2026-10-12', nota: null, created_at: `2026-10-12T${t}:00Z` }) as never;
  const sinTropiezo = calcular(chris, habitos, [mk(comer, 'diario', 2, '10')], [], cfg, '2026-10-12');
  assert.equal(sinTropiezo.nivel.id, 'aprendiz'); // sin tropiezo, hoy espera a cerrar
  const con = calcular(chris, habitos, [mk(comer, 'diario', 2, '10'), mk(bern, 'retroceso', -3, '11')], [], cfg, '2026-10-12');
  assert.equal(con.total, 0);
  assert.equal(con.nivel.id, 'traviesillo');
});
