import * as THREE from 'three';
import { Builder, hashStr, pointInRing, rng, type P2 } from '../vignette/geom';

/**
 * Reusable landscape primitives in City's low-poly, ink-lined style.
 *
 * Every primitive appends to one vertex-coloured `Builder`, so a whole garden
 * is a single draw call; call `landscapeMesh` once at the end. Each takes the
 * ground as a sampler (scene metres) and follows it. `quality: 'low'` halves
 * or drops the small detail.
 *
 * Tiers: positions come from the caller (reported or inferred); the planting,
 * materials and seasonal colour drawn here are illustrative.
 *
 *   const b = new Builder();
 *   flowerBed(b, ring, ground, { doy, quality });
 *   hedge(b, line, ground, { height: 1.1 });
 *   stairRun(b, [x0, z0], [x1, z1], 3, ground);
 *   const garden = landscapeMesh(b);   // { mesh, triangles, draws: 1 }
 */
export type Ground = (x: number, z: number) => number | null;
export type Quality = 'high' | 'low';

const STONE = '#a29c90', CAP = '#bdb7ab', CURB = '#b6b0a4', MULCH = '#5b4535';
const LEAF = ['#4d6b3a', '#5b7a44', '#45613a', '#628048'];
const CLIPPED = '#4a6838';

/** Seasonal flower colours for a day of year (Atlanta: tulips and pansies in spring, annuals in summer, mums in fall). */
export function bloom(doy: number): string[] {
  if (doy >= 60 && doy < 140) return ['#f2d24b', '#e4566b', '#f5f0e6', '#9b6ad0', '#f08a3c'];
  if (doy >= 140 && doy < 260) return ['#e8483f', '#f7a33b', '#fbe7f0', '#d4457f', '#ffd84a'];
  if (doy >= 260 && doy < 335) return ['#d9822b', '#b33d2e', '#e8c547', '#8a3d6b'];
  return ['#6c7d5a', '#8f8a6c', '#d9d2bd'];   // winter: pansies and cabbages read as muted
}

function along(line: P2[], step: number) {
  const out: { x: number; z: number; nx: number; nz: number }[] = [];
  for (let i = 1; i < line.length; i++) {
    const [a, c] = [line[i - 1], line[i]], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 1e-6) continue;
    const n = Math.max(1, Math.ceil(len / step)), nx = -(c[1] - a[1]) / len, nz = (c[0] - a[0]) / len;
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push({ x: a[0] + (c[0] - a[0]) * k / n, z: a[1] + (c[1] - a[1]) * k / n, nx, nz });
  }
  return out;
}

/** A wall-like strip along a polyline: bottom from `bottom(x,z)`, top from `top(x,z)`, `width` thick, capped. */
function strip(b: Builder, line: P2[], width: number, bottom: (x: number, z: number) => number, top: (x: number, z: number) => number,
  color: string, cap: string, step: number) {
  const pts = along(line, step);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], q = pts[i], h = width / 2;
    const l0 = [p.x + p.nx * h, p.z + p.nz * h], r0 = [p.x - p.nx * h, p.z - p.nz * h];
    const l1 = [q.x + q.nx * h, q.z + q.nz * h], r1 = [q.x - q.nx * h, q.z - q.nz * h];
    const [b0, b1, t0, t1] = [bottom(p.x, p.z), bottom(q.x, q.z), top(p.x, p.z), top(q.x, q.z)];
    b.quad([l0[0], b0, l0[1]], [l1[0], b1, l1[1]], [l1[0], t1, l1[1]], [l0[0], t0, l0[1]], color);
    b.quad([r1[0], b1, r1[1]], [r0[0], b0, r0[1]], [r0[0], t0, r0[1]], [r1[0], t1, r1[1]], color);
    b.quad([l0[0], t0, l0[1]], [l1[0], t1, l1[1]], [r1[0], t1, r1[1]], [r0[0], t0, r0[1]], cap);
  }
}

/** Low faceted clump (octahedron): shrubs, flower drifts and ornamental tufts. */
function clump(b: Builder, x: number, y: number, z: number, r: number, h: number, color: string, twist = 0) {
  const c = Math.cos(twist), s = Math.sin(twist);
  const ring: number[][] = [[r, 0], [0, r], [-r, 0], [0, -r]].map(([u, v]) => [x + u * c - v * s, y + h * .4, z + u * s + v * c]);
  const top = [x, y + h, z], bot = [x, y, z];
  for (let i = 0; i < 4; i++) {
    const a = ring[i], d = ring[(i + 1) % 4];
    b.tri(a, d, top, color);
    b.tri(d, a, bot, color);
  }
}

const g0 = (ground: Ground, x: number, z: number, fallback = 0) => ground(x, z) ?? fallback;

/**
 * Planting bed: a curbed edge, mulch draped on the ground and a low fill of
 * flower clumps in the season's colours, with shrubs at the back if asked.
 */
export function flowerBed(b: Builder, ring: P2[], ground: Ground,
  o: { doy: number; quality?: Quality; curb?: number; density?: number; seed?: string; mound?: number; flowers?: number }) {
  const quality = o.quality ?? 'high', curb = o.curb ?? .15, density = (o.density ?? 1) * (quality === 'low' ? .35 : 1);
  // A raised mound (m at the centre) domes the mulch; `flowers` is the share of clumps in bloom (default 0.75).
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length, cz = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const reach = Math.max(...ring.map(p => Math.hypot(p[0] - cx, p[1] - cz)));
  const dome = (x: number, z: number) => (o.mound ?? 0) * Math.max(0, 1 - (Math.hypot(x - cx, z - cz) / reach) ** 2);
  const r = rng(hashStr(o.seed ?? ring.map(p => p.join(',')).join(';')));
  strip(b, [...ring, ring[0]], .15, (x, z) => g0(ground, x, z) - .1, (x, z) => g0(ground, x, z) + curb, CURB, CURB, quality === 'low' ? 4 : 2);
  const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]), cell = quality === 'low' ? 2 : 1;
  // Draped cells wholly inside the bed, over the bed's own outline just beneath, so mulch never spills past the curb.
  for (let x = Math.min(...xs); x < Math.max(...xs); x += cell) for (let z = Math.min(...zs); z < Math.max(...zs); z += cell) {
    const corners = [[x, z], [x + cell, z], [x + cell, z + cell], [x, z + cell]] as P2[];
    if (!corners.every(([u, v]) => pointInRing(u, v, ring))) continue;
    const c = corners.map(([u, v]) => [u, g0(ground, u, v) + curb * .6 + dome(u, v), v]);
    b.quad(c[0], c[3], c[2], c[1], MULCH);
  }
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), [])) {
    const v = [ring[i], ring[k], ring[j]].map(([x, z]) => [x, g0(ground, x, z) + curb * .55 + dome(x, z), z]);
    b.tri(v[0], v[1], v[2], MULCH);
  }
  const colours = bloom(o.doy), area = Math.abs(ring.reduce((a, p, i) => { const q = ring[(i + 1) % ring.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const count = Math.round(area * 1.8 * density);
  for (let i = 0, tries = 0; i < count && tries < count * 6; tries++) {
    const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs));
    if (!pointInRing(x, z, ring)) continue;
    i++;
    const y = g0(ground, x, z) + curb * .6 + dome(x, z), rad = .3 + r() * .25;
    clump(b, x, y, z, rad, .35 + r() * .3, r() < (o.flowers ?? .75) ? colours[Math.floor(r() * colours.length)] : LEAF[Math.floor(r() * LEAF.length)], r() * 3);
  }
}

/** Clipped hedge (a squared box run that follows the ground) or a loose shrub row. */
export function hedge(b: Builder, line: P2[], ground: Ground, o: { height?: number; width?: number; clipped?: boolean; quality?: Quality; seed?: string } = {}) {
  const height = o.height ?? 1.1, width = o.width ?? .8;
  if (o.clipped ?? true) {
    strip(b, line, width, (x, z) => g0(ground, x, z) - .05, (x, z) => g0(ground, x, z) + height, CLIPPED, '#577a42', o.quality === 'low' ? 4 : 2);
    return;
  }
  const r = rng(hashStr(o.seed ?? line.map(p => p.join(',')).join(';')));
  for (const p of along(line, o.quality === 'low' ? 1.6 : .9)) {
    // Squat, overlapping mounds read as shrubs rather than cones.
    const rad = width * (.75 + r() * .35), x = p.x + (r() - .5) * .3, z = p.z + (r() - .5) * .3, y = g0(ground, p.x, p.z) - .05;
    const tone = LEAF[Math.floor(r() * LEAF.length)];
    clump(b, x, y, z, rad, height * (.75 + r() * .3), tone, r() * 3);
    clump(b, x, y + height * .25, z, rad * .8, height * (.6 + r() * .25), tone, r() * 3 + .8);
  }
}

/** Retaining edge: holds the higher grade, with its cap `reveal` above the high side. */
export function retainingEdge(b: Builder, line: P2[], ground: Ground, o: { reveal?: number; width?: number; quality?: Quality } = {}) {
  const width = o.width ?? .35, reveal = o.reveal ?? .3;
  // Sample both faces and stand the wall from the low side to the high side plus the reveal.
  const pts = along(line, o.quality === 'low' ? 3 : 1);
  const at = (x: number, z: number) => {
    const p = pts.reduce((best, q) => Math.hypot(q.x - x, q.z - z) < Math.hypot(best.x - x, best.z - z) ? q : best, pts[0]);
    const a = g0(ground, x + p.nx * 1.2, z + p.nz * 1.2), c = g0(ground, x - p.nx * 1.2, z - p.nz * 1.2);
    return [Math.min(a, c, g0(ground, x, z)), Math.max(a, c, g0(ground, x, z))];
  };
  strip(b, line, width, (x, z) => at(x, z)[0] - .25, (x, z) => at(x, z)[1] + reveal, STONE, CAP, o.quality === 'low' ? 3 : 1);
}

/** Seat wall: a level-topped bench wall, about 0.45 m above the ground at its high end. */
export function seatWall(b: Builder, line: P2[], ground: Ground, o: { height?: number; width?: number; quality?: Quality } = {}) {
  const height = o.height ?? .45, width = o.width ?? .45;
  const top = Math.max(...along(line, 1).map(p => g0(ground, p.x, p.z))) + height;
  strip(b, line, width, (x, z) => g0(ground, x, z) - .2, () => top, STONE, CAP, o.quality === 'low' ? 4 : 2);
}

/**
 * Stair run between two points, with treads at `riser` spacing from the
 * ground at the bottom to the ground at the top, and cheek walls.
 */
export function stairRun(b: Builder, from: P2, to: P2, width: number, ground: Ground,
  o: { riser?: number; cheeks?: boolean; fromY?: number; toY?: number } = {}) {
  // Elevations default to the ground at each end; pass fromY/toY (scene metres) for surveyed landings.
  const y0 = o.fromY ?? g0(ground, ...from), y1 = o.toY ?? g0(ground, ...to);
  const [lo, hi, a, c] = y0 <= y1 ? [y0, y1, from, to] : [y1, y0, to, from];
  const steps = Math.max(1, Math.round((hi - lo) / (o.riser ?? .16)));
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]), ux = (c[0] - a[0]) / len, uz = (c[1] - a[1]) / len, nx = -uz, nz = ux;
  const go = len / steps, rise = (hi - lo) / steps, h = width / 2;
  for (let k = 0; k < steps; k++) {
    const s0 = k * go, s1 = (k + 1) * go, top = lo + (k + 1) * rise;
    const p = (s: number, side: number, y: number) => [a[0] + ux * s + nx * side, y, a[1] + uz * s + nz * side];
    b.quad(p(s0, -h, top), p(s1, -h, top), p(s1, h, top), p(s0, h, top), CAP);
    b.quad(p(s0, h, lo - .1), p(s0, -h, lo - .1), p(s0, -h, top), p(s0, h, top), STONE);
    for (const side of [-h, h]) b.quad(p(s0, side, lo - .1), p(s1, side, lo - .1), p(s1, side, top), p(s0, side, top), STONE);
  }
  if (o.cheeks ?? true) for (const side of [-1, 1]) {
    const edge: P2[] = [[a[0] + nx * side * (h + .2), a[1] + nz * side * (h + .2)], [c[0] + nx * side * (h + .2), c[1] + nz * side * (h + .2)]];
    strip(b, edge, .3, (x, z) => Math.min(g0(ground, x, z), lo) - .2,
      (x, z) => { const t = Math.max(0, Math.min(1, ((x - a[0]) * ux + (z - a[1]) * uz) / len)); return lo + (hi - lo) * t + .35; }, STONE, CAP, 1);
  }
}

/**
 * Stepped terraces down a slope: level platforms between `from` and `to`, each
 * held by a retaining edge, with an optional planted strip along each riser.
 */
export function terraces(b: Builder, from: P2, to: P2, width: number, levels: number, ground: Ground,
  o: { doy?: number; quality?: Quality; surface?: string; fromY?: number; toY?: number } = {}) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]), ux = (to[0] - from[0]) / len, uz = (to[1] - from[1]) / len, nx = -uz, nz = ux, h = width / 2;
  const pt = (s: number, side: number): P2 => [from[0] + ux * s + nx * side, from[1] + uz * s + nz * side];
  const cut = (k: number) => len * k / levels;
  // Each level sits on the highest ground under it, so nothing pokes through.
  // With fromY/toY the levels step evenly between the two surveyed elevations;
  // otherwise each level sits on the highest ground under it, so nothing pokes through.
  const ys = o.fromY !== undefined && o.toY !== undefined
    ? Array.from({ length: levels }, (_, k) => o.fromY! + (o.toY! - o.fromY!) * (levels === 1 ? 1 : k / (levels - 1)))
    : Array.from({ length: levels }, (_, k) => Math.max(...[cut(k), (cut(k) + cut(k + 1)) / 2, cut(k + 1)]
      .flatMap(s => [-h, 0, h].map(side => g0(ground, ...pt(s, side))))) + .05);
  for (let k = 0; k < levels; k++) {
    const y = ys[k], q = [pt(cut(k), -h), pt(cut(k + 1), -h), pt(cut(k + 1), h), pt(cut(k), h)].map(([x, z]) => [x, y, z]);
    b.quad(q[0], q[3], q[2], q[1], o.surface ?? '#8aa266');
    for (const side of [-h, h]) strip(b, [pt(cut(k), side), pt(cut(k + 1), side)], .3, (x, z) => Math.min(g0(ground, x, z), y) - .25, () => y + .2, STONE, CAP, 2);
    if (o.doy !== undefined) flowerBed(b, [pt(cut(k) + .5, -h + .5), pt(cut(k) + 1.5, -h + .5), pt(cut(k) + 1.5, h - .5), pt(cut(k) + .5, h - .5)],
      () => y, { doy: o.doy, quality: o.quality, curb: .12, seed: `terrace${k}` });
  }
  // Risers at every boundary stand from the lower neighbour to the higher, capped.
  for (let k = 0; k <= levels; k++) {
    const line = [pt(cut(k), -h - .15), pt(cut(k), h + .15)];
    const near = [ys[k - 1], ys[k]].filter((v): v is number => v !== undefined);
    const top = Math.max(...near) + .2;
    strip(b, line, .35, (x, z) => Math.min(g0(ground, x, z), ...near) - .25, () => top, STONE, CAP, 2);
  }
}

/** A small cluster of specimen ornamentals (multi-stem shrubs and grasses, not trees): seasonal tint, seeded layout. */
export function ornamentals(b: Builder, centre: P2, radius: number, ground: Ground, o: { doy: number; count?: number; quality?: Quality; seed?: string }) {
  const r = rng(hashStr(o.seed ?? centre.join(','))), n = Math.max(2, Math.round((o.count ?? 7) * (o.quality === 'low' ? .5 : 1)));
  const fall = o.doy >= 280 && o.doy < 340, winter = o.doy >= 340 || o.doy < 60;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = radius * Math.sqrt(r()), x = centre[0] + Math.cos(a) * d, z = centre[1] + Math.sin(a) * d, y = g0(ground, x, z);
    const grass = r() < .4, size = grass ? .5 + r() * .3 : .7 + r() * .6;
    const tone = grass ? (winter ? '#b9a57a' : fall ? '#c9a95a' : '#8fa36a') : winter ? '#6d6450' : fall ? ['#b8452f', '#d0782f', '#9c3b3b'][Math.floor(r() * 3)] : LEAF[Math.floor(r() * 4)];
    if (grass) for (let k = 0; k < 3; k++) clump(b, x + (r() - .5) * .3, y, z + (r() - .5) * .3, size * .35, size * 1.6, tone, r() * 3);
    else { clump(b, x, y + size * .3, z, size, size * 1.3, tone, r() * 3); clump(b, x + size * .5, y + size * .2, z - size * .3, size * .7, size * .9, tone, r() * 3); }
  }
}

/** One vertex-coloured mesh for everything appended: one draw call. */
export function landscapeMesh(b: Builder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = 'landscape';
  return { mesh, triangles: b.pos.length / 9, draws: 1, dispose() { geometry.dispose(); (mesh.material as THREE.Material).dispose(); } };
}
