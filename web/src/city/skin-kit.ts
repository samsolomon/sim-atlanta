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

export interface DetachedPart {
  /** The gap from the part to the nearest surface of the rest of the skin, in metres. */
  gap: number;
  /** How far its farthest vertex reaches outside the footprint outline. */
  reach: number;
  /** Where its farthest vertex is (world x, y, z), and how many triangles it has. */
  at: [number, number, number];
  triangles: number;
}

type V3 = [number, number, number];
/** Squared distance from p to triangle abc (Ericson, Real-Time Collision Detection 5.1.5). */
function triDist2(p: V3, a: V3, b: V3, c: V3) {
  const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const at = (q: V3) => dot(sub(p, q), sub(p, q));
  if (d1 <= 0 && d2 <= 0) return at(a);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return at(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return at([a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]); }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return at(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return at([a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return at([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]);
  }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return at([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

/** Whether segment ab passes through triangle pqr (Möller–Trumbore, both directions). */
function segmentHitsTriangle(a: V3, b: V3, p: V3, q: V3, r: V3) {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e1: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2: V3 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
  const h: V3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
  if (Math.abs(det) < 1e-9) return false;
  const f = 1 / det, sv: V3 = [a[0] - p[0], a[1] - p[1], a[2] - p[2]];
  const u = f * (sv[0] * h[0] + sv[1] * h[1] + sv[2] * h[2]);
  if (u < 0 || u > 1) return false;
  const qv: V3 = [sv[1] * e1[2] - sv[2] * e1[1], sv[2] * e1[0] - sv[0] * e1[2], sv[0] * e1[1] - sv[1] * e1[0]];
  const v = f * (d[0] * qv[0] + d[1] * qv[1] + d[2] * qv[2]);
  if (v < 0 || u + v > 1) return false;
  const t = f * (e2[0] * qv[0] + e2[1] * qv[1] + e2[2] * qv[2]);
  return t >= 0 && t <= 1;
}

/**
 * Parts of a skin that hang outside its footprint without connecting back to it. Triangles that
 * share a vertex (to 1 cm), come within `tolerance` metres of each other's surfaces, or cross
 * (an edge through a face) join one cluster, so a pane on its wall or a rail on its slab is part of the building. A cluster with
 * no vertex inside the outline rings that reaches more than `tolerance` outside them is
 * detached: a stack of balcony plates floating off the wall, say. `gap` is its distance back to
 * the rest of the skin (Infinity when nothing lies within about 4 m).
 */
export function detachedParts(object: { updateMatrixWorld(force?: boolean): void; traverse(f: (o: unknown) => void): void },
  rings: readonly (readonly (readonly [number, number])[])[], tolerance = 0.3): DetachedPart[] {
  object.updateMatrixWorld(true);
  const verts: V3[] = [];
  const tris: number[] = [];
  const index = new Map<string, number>();
  const key = (p: V3) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)},${Math.round(p[2] * 100)}`;
  object.traverse(o => {
    const mesh = o as { isMesh?: boolean; geometry?: { index?: { count: number; getX(i: number): number } | null; getAttribute(n: string): { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number } | undefined }; matrixWorld?: { elements: number[] } };
    const pos = mesh.isMesh ? mesh.geometry?.getAttribute('position') : undefined;
    if (!pos || !mesh.matrixWorld) return;
    const e = mesh.matrixWorld.elements, ids: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
      const p: V3 = [e[0] * lx + e[4] * ly + e[8] * lz + e[12], e[1] * lx + e[5] * ly + e[9] * lz + e[13], e[2] * lx + e[6] * ly + e[10] * lz + e[14]];
      const k = key(p);
      let id = index.get(k);
      if (id === undefined) { id = verts.length; verts.push(p); index.set(k, id); }
      ids.push(id);
    }
    const idx = mesh.geometry!.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) tris.push(...[0, 1, 2].map(j => ids[idx ? idx.getX(i + j) : i + j]));
  });
  const parent = verts.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  for (let t = 0; t < tris.length; t += 3) for (const j of [1, 2]) parent[find(tris[t + j])] = find(tris[t]);
  // A 4 m grid of triangle bounds, to find nearby surfaces.
  const cell = 4, grid = new Map<string, number[]>();
  const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [verts[tris[t]], verts[tris[t + 1]], verts[tris[t + 2]]];
    const lo = [0, 1, 2].map(k => Math.floor((Math.min(a[k], b[k], c[k]) - tolerance) / cell));
    const hi = [0, 1, 2].map(k => Math.floor((Math.max(a[k], b[k], c[k]) + tolerance) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const k = cellKey(x, y, z); (grid.get(k) ?? grid.set(k, []).get(k)!).push(t);
    }
  }
  // Join parts that come within the tolerance of each other (a pane on its wall, a rail on its slab).
  const tol2 = tolerance * tolerance;
  const sample = (t: number): V3[] => {
    const [a, b, c] = [verts[tris[t]], verts[tris[t + 1]], verts[tris[t + 2]]];
    return [a, b, c, [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]];
  };
  for (let t = 0; t < tris.length; t += 3) {
    for (const p of sample(t)) {
      const c = p.map(v => Math.floor(v / cell));
      for (const u of grid.get(cellKey(c[0], c[1], c[2])) ?? []) {
        if (find(tris[u]) === find(tris[t])) continue;
        if (triDist2(p, verts[tris[u]], verts[tris[u + 1]], verts[tris[u + 2]]) <= tol2) parent[find(tris[u])] = find(tris[t]);
      }
    }
    // Triangles that cross without a vertex near each other (a rib through a rib): any edge of
    // this triangle that passes through a nearby triangle joins them.
    for (let e = 0; e < 3; e++) {
      const a = verts[tris[t + e]], b = verts[tris[t + (e + 1) % 3]];
      const cells = new Set([a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as V3].map(p => cellKey(...p.map(v => Math.floor(v / cell)) as [number, number, number])));
      for (const k of cells) for (const u of grid.get(k) ?? []) {
        if (find(tris[u]) === find(tris[t])) continue;
        if (segmentHitsTriangle(a, b, verts[tris[u]], verts[tris[u + 1]], verts[tris[u + 2]])) parent[find(tris[u])] = find(tris[t]);
      }
    }
  }
  // A cluster is anchored when any of its vertices lies inside the footprint; the rest float.
  const outside = verts.map(([x, , z]) => outsideRings(rings, x, z));
  const clusters = new Map<number, { tris: number[]; anchored: boolean; reach: number; at: V3 }>();
  for (let t = 0; t < tris.length; t += 3) {
    const root = find(tris[t]);
    let cl = clusters.get(root);
    if (!cl) clusters.set(root, cl = { tris: [], anchored: false, reach: 0, at: [0, 0, 0] });
    cl.tris.push(t);
    for (let j = 0; j < 3; j++) {
      const v = tris[t + j];
      if (outside[v] === 0) cl.anchored = true;
      if (outside[v] > cl.reach) { cl.reach = outside[v]; cl.at = verts[v]; }
    }
  }
  const out: DetachedPart[] = [];
  for (const [root, cl] of clusters) {
    if (cl.anchored || cl.reach <= tolerance) continue;
    // The gap back to anchored geometry, searched within the neighbouring cells (up to ~4 m).
    let best = Infinity;
    for (const t of cl.tris) for (const p of sample(t)) {
      const c = p.map(v => Math.floor(v / cell));
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
        for (const u of grid.get(cellKey(c[0] + dx, c[1] + dy, c[2] + dz)) ?? []) {
          if (find(tris[u]) === root) continue;
          const d = triDist2(p, verts[tris[u]], verts[tris[u + 1]], verts[tris[u + 2]]);
          if (d < best) best = d;
        }
    }
    out.push({ gap: Math.sqrt(best), reach: cl.reach, at: cl.at, triangles: cl.tris.length });
  }
  return out.sort((a, b) => b.reach - a.reach);
}
