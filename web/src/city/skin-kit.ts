import type { Builder, P2 } from '../vignette/geom';

/** Plan and colour helpers for vertex-coloured landmark skins (Metropolis onward). */

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

/** Linear RGB (what Builder stores) for a hex colour. */
export function linear(hex: string): number[] {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
}

/** A colour ramp in linear RGB from `lo` at y0 to `hi` at y1, matching how a shadedQuad blends. */
export function ramp(lo: string, hi: string, y0: number, y1: number) {
  const [a, b] = [linear(lo), linear(hi)];
  return (y: number) => { const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); return a.map((v, i) => v + (b[i] - v) * t); };
}

/** A vertical quad from a to b whose colour runs from `lo` at its foot to `hi` at its head. */
export function shadedQuad(builder: Builder, a: P2, b: P2, y0: number, y1: number, lo: number[], hi: number[]) {
  const n = builder.pos.length;
  builder.quad([a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]], '#000000');
  for (let v = n; v < builder.pos.length; v += 3) builder.col.splice(v, 3, ...(builder.pos[v + 1] === y1 ? hi : lo));
}

/** A stable seed for a building id (FNV-1a), for litHash. */
export function seedOf(id: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * The shared lit-pane hash: a uniform value in [0, 1) for one window (face, floor, bay) of a
 * building, lit at night when it is below the building's occupancy. Every skin uses this rather
 * than a linear modulus such as (floor * 29 + bay * 17) % 83, which lights diagonal staircases.
 * Multiply-xorshift mixing with a murmur3-style finalizer (after skins-7's version).
 */
export function litHash(seed: number, face: number, floor: number, bay: number) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(face + 1, 0xc2b2ae35);
  h = Math.imul(h ^ Math.imul(floor + 1, 0x27d4eb2d), 0x165667b1) ^ Math.imul(bay + 7, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
