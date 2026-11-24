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

/** The parts of a landmarkShell that litFacade draws into. */
interface FacadeShell { body: Builder; lights: Builder }

/**
 * landmarkShell.facade with the shared lit-pane hash: the same pane grid (rows between lo and hi,
 * panes `bay` metres apart, `fill` and `verticalFill` of each cell), but each pane goes to the lamp
 * mesh when litHash(seed, face, row, column) < occupancy, and its colour comes from the same hash
 * (slot column + 4096). Faces run with the building on the left in the shell's (u, v) plan.
 * It deliberately takes no library-surface glass parameter: panes are vertex colours only, so the
 * landmark batcher can merge them.
 */
export function litFacade(
  shell: FacadeShell, seed: number, face: number, a: P2, b: P2, lo: number, hi: number,
  rows: number, bay: number, fill: number, verticalFill: number, colors: readonly string[], occupancy: number,
) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 1e-6 || rows < 1) return;
  const count = Math.max(1, Math.round(len / bay)), pitch = (hi - lo) / rows;
  const point = (t: number, y: number) => [a[0] + t * dx + (0.07 * dz) / len, y, a[1] + t * dz - (0.07 * dx) / len];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < count; i++) {
      const l = (i + (1 - fill) / 2) / count, r = (i + (1 + fill) / 2) / count;
      const y = lo + (j + (1 - verticalFill) / 2) * pitch, top = y + verticalFill * pitch;
      const target = litHash(seed, face, j, i) < occupancy ? shell.lights : shell.body;
      const color = colors[Math.min(colors.length - 1, Math.floor(litHash(seed, face, j, i + 4096) * colors.length))];
      target.quad(point(l, y), point(l, top), point(r, top), point(r, y), color);
    }
}

/** How far a skin may reach past its footprint, and how high, for the footprint audit. */
export interface FootprintLimits {
  /** Metres a part may project past the mapped outline (balconies, fins, canopies). Default 2.5. */
  maxProjection?: number;
  /** Highest allowed y (scene metres), roof plus plant, when the skin declares one. */
  top?: number;
  /** Lowest allowed y (scene metres): walls are sunk below grade on purpose. */
  bottom?: number;
}

/** Distance in plan from (x, z) to the nearest of the rings, 0 inside any of them. */
export function outsideRings(rings: readonly (readonly (readonly [number, number])[])[], x: number, z: number) {
  let best = Infinity;
  for (const ring of rings) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
      const dx = xj - xi, dz = zj - zi, l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - xi) * dx + (z - zi) * dz) / l2)) : 0;
      best = Math.min(best, Math.hypot(x - (xi + t * dx), z - (zi + t * dz)));
    }
    if (inside) return 0;
  }
  return best;
}

export interface FootprintReport {
  /** The worst plan offset past the allowance, in metres (0 when everything is within it). */
  worst: number;
  /** Where the worst vertex is (world x, y, z), and how far outside the mapped outline it lies. */
  at: [number, number, number];
  outside: number;
  /** Vertices outside the allowance, or above `top` / below `bottom`. */
  count: number;
  /** The worst vertical excess past `top` or `bottom`, in metres. */
  vertical: number;
}

/**
 * Every vertex of every mesh under `object` (world space) checked against the footprint rings
 * (world x, z) expanded by `maxProjection`, and between `bottom` and `top` where given.
 */
export function footprintReport(object: { updateMatrixWorld(force?: boolean): void; traverse(f: (o: unknown) => void): void },
  rings: readonly (readonly (readonly [number, number])[])[], limits: FootprintLimits = {}): FootprintReport {
  const max = limits.maxProjection ?? 2.5;
  const report: FootprintReport = { worst: 0, at: [0, 0, 0], outside: 0, count: 0, vertical: 0 };
  object.updateMatrixWorld(true);
  object.traverse(o => {
    const mesh = o as { isMesh?: boolean; geometry?: { getAttribute(n: string): { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number } | undefined }; matrixWorld?: { elements: number[] } };
    const pos = mesh.isMesh ? mesh.geometry?.getAttribute('position') : undefined;
    if (!pos || !mesh.matrixWorld) return;
    const e = mesh.matrixWorld.elements;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
      const x = e[0] * lx + e[4] * ly + e[8] * lz + e[12], y = e[1] * lx + e[5] * ly + e[9] * lz + e[13], z = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
      const d = outsideRings(rings, x, z), over = d - max;
      const vert = Math.max(limits.top !== undefined ? y - limits.top : 0, limits.bottom !== undefined ? limits.bottom - y : 0);
      if (over > 1e-3 || vert > 1e-3) report.count++;
      if (vert > report.vertical) report.vertical = vert;
      if (over > report.worst) { report.worst = over; report.at = [x, y, z]; report.outside = d; }
    }
  });
  return report;
}
