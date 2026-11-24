import type { Builder, P2 } from '../vignette/geom';

/** Small plan helpers shared by the vertex-coloured Midtown skins (no materials, no programs). */

/** Calls `draw` for each edge longer than `min` metres. */
export function faces(ring: P2[], draw: (a: P2, b: P2, length: number, i: number) => void, min = 0.8) {
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > min) draw(a, b, length, i);
  });
}

export function signedArea(ring: P2[]) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area / 2;
}

/** The ring in the given winding (sign of its signed area). */
export function wound(ring: P2[], sign: number): P2[] {
  return Math.sign(signedArea(ring)) === sign ? ring : [...ring].reverse();
}

/** A point `u` metres along a→b, pushed `out` metres to the right of the direction of travel. */
export function along(a: P2, b: P2, length: number, u: number, out = 0): P2 {
  const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
  return [a[0] + dx * u + dz * out, a[1] + dz * u - dx * out];
}

/** +1 or -1: the `out` sign that moves away from the inside of rings with this winding. */
export function outwardSign(ring: P2[]) {
  return signedArea(ring) > 0 ? 1 : -1;
}

/** Linear RGB (what Builder stores) for a hex colour blended toward another. */
export function mix(a: string, b: string, t: number): number[] {
  const p = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
  const [x, y] = [p(a), p(b)];
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const k = Math.min(1, Math.max(0, t));
  return x.map((v, i) => lin(v + (y[i] - v) * k));
}

/** A colour ramp in linear RGB from `lo` at y0 to `hi` at y1, matching how a shadedQuad blends. */
export function ramp(lo: string, hi: string, y0: number, y1: number) {
  const [a, b] = [mix(lo, hi, 0), mix(lo, hi, 1)];
  return (y: number) => { const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); return a.map((v, i) => v + (b[i] - v) * t); };
}

/** A vertical quad from a to b whose colour runs from `lo` at its foot to `hi` at its head. */
export function shadedQuad(builder: Builder, a: P2, b: P2, y0: number, y1: number, lo: number[], hi: number[]) {
  const n = builder.pos.length;
  builder.quad([a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]], '#000000');
  for (let v = n; v < builder.pos.length; v += 3) builder.col.splice(v, 3, ...(builder.pos[v + 1] === y1 ? hi : lo));
}

/** Drops vertices that close an edge shorter than `min` metres. */
export function simplify(ring: P2[], min: number): P2[] {
  const out: P2[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= min) out.push(p);
  }
  while (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < min) out.pop();
  return out;
}
