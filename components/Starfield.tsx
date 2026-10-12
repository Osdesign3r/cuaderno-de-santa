function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = rng(2412);
const ESTRELLAS = Array.from({ length: 64 }, () => ({
  x: +(R() * 100).toFixed(2),
  y: +(R() * 100).toFixed(2),
  s: +(1 + R() * 2.2).toFixed(2),
  d: +(R() * 5).toFixed(2),
  t: +(3 + R() * 4).toFixed(2),
}));

/** Cielo decorativo fijo detrás de todo. Determinista: igual en servidor y navegador. */
export function Starfield() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {ESTRELLAS.map((e, i) => (
        <span
          key={i}
          className="star"
          style={{ left: `${e.x}%`, top: `${e.y}%`, width: e.s, height: e.s, animationDelay: `${e.d}s`, animationDuration: `${e.t}s` }}
        />
      ))}
      <span className="absolute right-5 top-4 text-4xl opacity-80">🌙</span>
    </div>
  );
}
