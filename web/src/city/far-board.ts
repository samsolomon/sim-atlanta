import { BufferAttribute, BufferGeometry, type Material, Mesh, MeshBasicMaterial, type Object3D, ShapeUtils, Vector2, Vector3 } from 'three';
import { StaticLandmarkMaterial } from '../materials/landmark-batch';

/**
 * Far-board buildings (low tier): from far away an area draws every building — generic blocks,
 * houses and landmarks — as one mesh of coloured boxes, one draw instead of dozens. The A16 is
 * CPU-bound per draw at the default view (about 0.04 ms each), and buildings were half its draws.
 */

/** One building's far form: an oriented box (centre, unit axis, half extents) and a colour. */
export interface FarBox {
  cx: number; cz: number; ux: number; uz: number; hx: number; hz: number; y0: number; y1: number; r: number; g: number; b: number;
  /** Share of its walls lit at night (0..1); a stable per-building guess when unknown. */
  lit?: number;
  /** Roof colour, when it differs from the walls' (the default view looks mostly at roofs). */
  roof?: { r: number; g: number; b: number };
  /** The footprint (x, z pairs), extruded instead of the box when the box would overfill it. */
  ring?: number[];
  /** The building's dominant wall style (vignette/world.ts aStyle) and its wall base height, for
   * drawing the box with the generic building material. */
  style?: number; base?: number;
  /** A ground-floor band in its own style, up to `baseTop` (scene y), with its own wall base. */
  baseStyle?: number; baseTop?: number; baseBase?: number;
}

/**
 * Whether a building is big enough at the far form's range to spend triangles on (an extruded
 * outline, two-tone walls): taller than 40 m or a footprint over 1,500 m². The rest are plain
 * 10-triangle boxes; on the A16 every 100k triangles there cost about 1.5 fps of GPU time.
 */
export const shows = (b: FarBox) => b.y1 - b.y0 > 40 || b.hx * b.hz * 4 > 1500;

/** Twice the signed area of a ring of x, z pairs. */
const ringArea2 = (ring: ArrayLike<number>) => { let a = 0; for (let i = 0, n = ring.length / 2; i < n; i++) { const j = (i + 1) % n; a += ring[i * 2] * ring[j * 2 + 1] - ring[j * 2] * ring[i * 2 + 1]; } return a; };
/** Keep `ring` when the oriented box would overfill it by more than 15% (L shapes, steps, curves). */
export function withRing<T extends FarBox>(box: T, ring: number[] | undefined): T {
  if (!ring || ring.length < 6 || !shows(box)) return box;
  const area = Math.abs(ringArea2(ring)) / 2;
  return area > 0 && box.hx * box.hz * 4 > area * 1.15 ? { ...box, ring } : box;
}

/** Beyond this distance (m) from an area's box its buildings draw as boxes; back inside 0.9 of it. */
export const FAR_BUILDINGS_M = (() => {
  // `?perf&farm=6000` moves the switch for threshold strips; `farm=0` forces the far form.
  const q = new URLSearchParams(globalThis.location?.search ?? '');
  const perf = q.get('perf'), m = Number(q.get('farm'));
  return perf !== null && perf !== '0' && perf !== 'off' && q.has('farm') && m >= 0 ? m : 15000;
})();
/**
 * Night factor (City's darkness: 1 − smoothstep(−8°, 2°, sun elevation)) at which the far form
 * swaps to its night variant, and back. The near form's windows glow in proportion to it, so the
 * swap waits until near walls are mostly dark (sun about 6° down), not mid-dusk.
 */
export const FAR_NIGHT_ON = 0.8, FAR_NIGHT_OFF = 0.75;
/**
 * Landmarks that keep their real form at every distance: a box cannot stand in for them (the
 * stadium's see-through roof reads as its bowl and field from afar, a box as a grey slab).
 * Each costs its own few draws.
 */
export const KEEP_NEAR = new Set(['Mercedes-Benz Stadium']);
/**
 * Whether landmarks join the far form too. Off: every landmark keeps its own form (its landmark
 * batch already has a far version), and boxes stand in only for generic buildings and houses.
 * Boxed landmarks read as bulkier grey blocks without their glass, facades or lit signs, which
 * popped visibly downtown at the switch (2026-11-26). `?perf&farlandmarks=1` boxes them again.
 */
export const FAR_LANDMARKS = (() => {
  const q = new URLSearchParams(globalThis.location?.search ?? '');
  const perf = q.get('perf');
  return perf !== null && perf !== '0' && perf !== 'off' && q.get('farlandmarks') === '1';
})();
/** Whether a landmark group is drawn as boxes from afar. */
export const boxedFromAfar = (name: string) => FAR_LANDMARKS && !KEEP_NEAR.has(name);

/** Landmark meshes taller than this keep a three-band silhouette instead of one box. */
export const TOWER_M = 60;
/** Landmark meshes taller than this get two bands (a podium and its block). */
export const BANDED_M = 40;
/** Landmark meshes with a footprint over this (m²) and under TOWER_M split into a grid of sub-boxes. */
export const WIDE_M2 = 4000;
/** Warm lit-window colour (landmarkShell's default lamp colour). */

/** The minimum-area oriented rectangle around points (x, z), via their convex hull. */
export function orientedRect(xs: ArrayLike<number>, zs: ArrayLike<number>) {
  const n = xs.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => xs[a] - xs[b] || zs[a] - zs[b]);
  const cross = (o: number, a: number, b: number) => (xs[a] - xs[o]) * (zs[b] - zs[o]) - (zs[a] - zs[o]) * (xs[b] - xs[o]);
  const lower: number[] = [], upper: number[] = [];
  for (const i of idx) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0) lower.pop(); lower.push(i); }
  for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0) upper.pop(); upper.push(i); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let best = { area: Infinity, cx: 0, cz: 0, ux: 1, uz: 0, hx: 0, hz: 0 };
  for (let e = 0; e < Math.max(1, hull.length); e++) {
    const a = hull[e], b = hull[(e + 1) % hull.length];
    let ux = xs[b] - xs[a], uz = zs[b] - zs[a];
    const len = Math.hypot(ux, uz);
    if (len < 1e-6) { ux = 1; uz = 0; } else { ux /= len; uz /= len; }
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const i of hull.length ? hull : idx) {
      const u = xs[i] * ux + zs[i] * uz, v = -xs[i] * uz + zs[i] * ux;
      if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
    }
    const area = (u1 - u0) * (v1 - v0);
    if (area < best.area) {
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      best = { area, cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, ux, uz, hx: (u1 - u0) / 2, hz: (v1 - v0) / 2 };
    }
  }
  const hullRing: number[] = [];
  for (const i of hull) hullRing.push(xs[i], zs[i]);
  return { ...best, hull: hullRing };
}

/**
 * The wall style covering the most area in a Builder vertex range (whole triangles), and its first
 * vertex. Ground-floor base styles (generic v2 52–55: lobby, arcade, plinth, shopfront) win only
 * when nothing else is there: painted over a whole far box, one lights most of a tower at night.
 */
export function dominantWallStyle(pos: ArrayLike<number>, style: ArrayLike<number>, start: number, end: number) {
  const area = new Map<number, number>(), first = new Map<number, number>(), top = new Map<number, number>();
  for (let t = start; t + 2 < end; t += 3) {
    const st = style[t] ?? -1;
    if (st < 0) continue;
    const o = t * 3;
    const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
    const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
    area.set(st, (area.get(st) ?? 0) + Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2);
    if (!first.has(st)) first.set(st, t);
    top.set(st, Math.max(top.get(st) ?? -Infinity, pos[o + 1], pos[o + 4], pos[o + 7]));
  }
  const isBase = (st: number) => st >= 51.5 && st <= 55.5;
  let best = -1, most = 0;
  for (const [st, a] of area) if (!isBase(st) && a > most) { most = a; best = st; }
  if (best < 0) for (const [st, a] of area) if (a > most) { most = a; best = st; }
  // The ground-floor band, kept apart when the building has one under another style: its lit
  // shopfronts and lobbies light differently from the floors above.
  let baseStyle = -1, baseArea = 0;
  if (!isBase(best)) for (const [st, a] of area) if (isBase(st) && a > baseArea) { baseArea = a; baseStyle = st; }
  return { style: best, first: first.get(best) ?? start, baseStyle, baseTop: baseStyle >= 0 ? top.get(baseStyle)! : -Infinity, baseFirst: first.get(baseStyle) ?? start };
}

/** A far box from a Builder vertex range (positions and colours as flat number arrays). */
export function boxFromVertices(pos: ArrayLike<number>, col: ArrayLike<number>, start: number, end: number, tint = 1, ring?: number[]): FarBox | null {
  const n = end - start;
  if (n < 3) return null;
  const xs = new Float64Array(n), zs = new Float64Array(n);
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const o = (start + i) * 3;
    xs[i] = pos[o]; zs[i] = pos[o + 2];
    const y = pos[o + 1];
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  // Wall and roof colours apart, each the area-weighted mean of its triangles (Builder writes
  // whole triangles), so a white roof over brick walls reads that way from above.
  const wall = [0, 0, 0, 0], roof = [0, 0, 0, 0];
  for (let t = start; t + 2 < end; t += 3) {
    const o = t * 3;
    const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
    const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const area = Math.hypot(cx, cy, cz) / 2;
    if (!area) continue;
    const acc = Math.abs(cy) / (2 * area) > 0.7 ? roof : wall;
    for (let k = 0; k < 3; k++) acc[k] += area * (col[o + k] + col[o + 3 + k] + col[o + 6 + k]) / 3;
    acc[3] += area;
  }
  const mean = (a: number[], k: number) => a[3] ? a[k] / a[3] : 0.6;
  const w = wall[3] ? wall : roof, rf = roof[3] ? roof : wall;
  const { hull, area: _a, ...rect } = orientedRect(xs, zs);
  void _a; void hull;
  return withRing({ ...rect, y0, y1, r: mean(w, 0) * tint, g: mean(w, 1) * tint, b: mean(w, 2) * tint, roof: { r: mean(rf, 0), g: mean(rf, 1), b: mean(rf, 2) } }, ring);
}

/**
 * Far boxes for a landmark: one per mesh (a group often holds several towers, a podium, or
 * landscaping), in `container`'s frame. Meshes under 3 m tall (ground cover, paving, landscape)
 * and see-through ones are left out: from afar they read as ground, not as buildings.
 */
export function boxesFromObject(root: Object3D, container: Object3D, minHeight = 3): FarBox[] {
  const out: FarBox[] = [];
  const v = new Vector3();
  container.updateMatrixWorld(true);
  const inv = container.matrixWorld.clone().invert();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    const m = o as Mesh;
    if (!m.isMesh || !m.visible) return;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (mat.transparent) return;
    const p = m.geometry.getAttribute('position'), c = m.geometry.getAttribute('color');
    if (!p || p.count < 3) return;
    const color = (mat as { color?: { r: number; g: number; b: number } }).color;
    const nrm = m.geometry.getAttribute('normal');
    const xs: number[] = [], zs: number[] = [], ys: number[] = [];
    let y0 = Infinity, y1 = -Infinity;
    const wall = [0, 0, 0, 0], roof = [0, 0, 0, 0];
    const nv = new Vector3();
    const step = Math.max(1, Math.floor(p.count / 600));
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      xs.push(v.x); zs.push(v.z); ys.push(v.y);
      if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
      const up = nrm ? Math.abs(nv.fromBufferAttribute(nrm, i).transformDirection(m.matrixWorld).y) > 0.7 : false;
      const acc = up ? roof : wall;
      if (c) { acc[0] += c.getX(i) * (color?.r ?? 1); acc[1] += c.getY(i) * (color?.g ?? 1); acc[2] += c.getZ(i) * (color?.b ?? 1); acc[3]++; }
      else if (color) { acc[0] += color.r; acc[1] += color.g; acc[2] += color.b; acc[3]++; }
    }
    if (y1 - y0 < minHeight) return;
    const mean = (a: number[], k: number) => a[3] ? a[k] / a[3] : 0.6;
    const w = wall[3] ? wall : roof, rf = roof[3] ? roof : wall;
    const colour = { r: mean(w, 0), g: mean(w, 1), b: mean(w, 2), roof: { r: mean(rf, 0), g: mean(rf, 1), b: mean(rf, 2) } };
    const whole = orientedRect(xs, zs);
    // A wide low landmark (a stadium, an exhibition hall, the Aquarium) keeps its low profile: a
    // grid of sub-boxes over its footprint, each as tall as its own points, not one tall slab.
    if (whole.hx * whole.hz * 4 > WIDE_M2 && y1 - y0 < TOWER_M) {
      const gu = Math.min(4, Math.max(2, Math.round(whole.hx / 25))), gv = Math.min(4, Math.max(2, Math.round(whole.hz / 25)));
      const top = new Float64Array(gu * gv).fill(-Infinity);
      for (let i = 0; i < xs.length; i++) {
        const dx = xs[i] - whole.cx, dz = zs[i] - whole.cz;
        const u = dx * whole.ux + dz * whole.uz, w2 = -dx * whole.uz + dz * whole.ux;
        const iu = Math.min(gu - 1, Math.max(0, Math.floor((u / whole.hx + 1) / 2 * gu)));
        const iv = Math.min(gv - 1, Math.max(0, Math.floor((w2 / whole.hz + 1) / 2 * gv)));
        top[iu * gv + iv] = Math.max(top[iu * gv + iv], ys[i]);
      }
      for (let iu = 0; iu < gu; iu++) for (let iv = 0; iv < gv; iv++) {
        const t = top[iu * gv + iv];
        if (!(t - y0 >= minHeight)) continue;
        const cu = ((iu + 0.5) / gu * 2 - 1) * whole.hx, cv = ((iv + 0.5) / gv * 2 - 1) * whole.hz;
        out.push({ cx: whole.cx + cu * whole.ux - cv * whole.uz, cz: whole.cz + cu * whole.uz + cv * whole.ux, ux: whole.ux, uz: whole.uz,
          hx: whole.hx / gu, hz: whole.hz / gv, y0, y1: t, ...colour });
      }
      return;
    }
    if (y1 - y0 < BANDED_M) { out.push(withRing({ ...rectOf(whole), y0, y1, ...colour }, whole.hull)); return; }
    // A tower keeps its silhouette: three stacked boxes (base, shaft, crown), each the
    // rectangle of the points in its band, so a setback, taper or spire still reads.
    // Mid-rises get two bands (a podium and its block), towers three (base, shaft, crown).
    const cuts = y1 - y0 < TOWER_M ? [y0, y0 + (y1 - y0) * 0.45, y1] : [y0, y0 + (y1 - y0) * 0.55, y0 + (y1 - y0) * 0.82, y1];
    // Every band on the building's own axis, each inside the one below: stacks only step in,
    // never overhang (an overhang would stand a box's edge in mid-air).
    let below = y0;
    let lim = { u0: -whole.hx, u1: whole.hx, v0: -whole.hz, v1: whole.hz };
    for (let k = 0; k < cuts.length - 1; k++) {
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, top = -Infinity, nb = 0;
      for (let i = 0; i < xs.length; i++) {
        if (ys[i] < cuts[k] - 0.5 || ys[i] > cuts[k + 1] + 0.5) continue;
        const dx = xs[i] - whole.cx, dz = zs[i] - whole.cz;
        const u = dx * whole.ux + dz * whole.uz, w2 = -dx * whole.uz + dz * whole.ux;
        u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, w2); v1 = Math.max(v1, w2); top = Math.max(top, ys[i]); nb++;
      }
      if (nb < 3) continue;
      u0 = Math.max(u0, lim.u0); u1 = Math.min(u1, lim.u1); v0 = Math.max(v0, lim.v0); v1 = Math.min(v1, lim.v1);
      if (u1 - u0 < 0.5 || v1 - v0 < 0.5) continue;
      lim = { u0, u1, v0, v1 };
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      const box: FarBox = { cx: whole.cx + cu * whole.ux - cv * whole.uz, cz: whole.cz + cu * whole.uz + cv * whole.ux, ux: whole.ux, uz: whole.uz,
        hx: (u1 - u0) / 2, hz: (v1 - v0) / 2, y0: below, y1: Math.min(cuts[k + 1], top), ...colour };
      // The base band may follow the footprint's hull; the bands above stay rectangles.
      out.push(k === 0 ? withRing(box, whole.hull) : box);
      below = box.y1;
    }
  });
  return out;
}

/** Module-level on purpose: a closure made inside farBoxMesh would keep its build arrays alive. */
const noRaycast = () => {};
const byte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
const rectOf = (r: { cx: number; cz: number; ux: number; uz: number; hx: number; hz: number }) => ({ cx: r.cx, cz: r.cz, ux: r.ux, uz: r.uz, hx: r.hx, hz: r.hz });

/** A stable 0..1 hash of a box's position, for per-building variety. */
const hash = (x: number, z: number) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };

/** Near-form roofs carry HVAC clutter and parapet shade: their mean is darker and greyer than the membrane. */
const CLUTTER = { r: 0.36, g: 0.38, b: 0.41 };
/** Night walls under City's night sky: deep blue, not grey. */
const NIGHT_WALL = { r: 0.018, g: 0.03, b: 0.095 };
/** Share of windows the near form lights at night (vignette/world.ts: about a third of rooms). */
const NEAR_LIT = 1 / 3;
/** Share of a wall the near form's lit windows cover at full night (window fraction about 0.5 ×
 * a third lit × mean lit level 0.75, against this amber at full strength): ~0.12–0.14. */
const WINDOW_GLOW = 0.13;
/** Lit windows read amber from afar (sodium-warm interiors), in many small points. */
const AMBER = { r: 1, g: 0.62, b: 0.26 };

/**
 * The far form of an area: one mesh, each building a box or, where a box would overfill it, its
 * extruded footprint. Walls are two bands (a darker base) with a per-face tone shift, so they keep
 * some grain; roofs take the near form's mean including clutter. By day it draws with the
 * landmark bodies' program (StaticLandmarkMaterial). By night a second mesh shares its positions
 * and index with its own colours (deep blue walls) plus amber window points on taller buildings,
 * drawn unlit (MeshBasicMaterial with vertex colours), so the city keeps its glow.
 */
export function farBoxMesh(boxes: readonly FarBox[], noSparkle?: (x: number, z: number) => boolean, buildingMaterial?: Material): { day: Mesh; night: Mesh | null } {
  if (buildingMaterial) return styledBoxMesh(boxes, buildingMaterial);
  const P: number[] = [], N: number[] = [], C: number[] = [], D: number[] = [], I: number[] = [], NI: number[] = [];
  let v = 0;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, r: number, g: number, b: number, nr: number, ng: number, nb: number) => {
    P.push(x, y, z); N.push(nx, ny, nz); C.push(r, g, b); D.push(nr, ng, nb); return v++;
  };
  const quad = (a: number, b: number, c: number, d: number, night = false) => { const t = night ? NI : I; t.push(a, c, b, a, d, c); };
  for (const bx of boxes) {
    const { cx, cz, ux, uz, hx, hz, y0, y1 } = bx;
    // Footprint corners: the ring when given, else the box, counter-clockwise from above.
    let ring: number[] = bx.ring ?? [];
    if (!bx.ring) for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ring.push(cx + su * hx * ux - sv * hz * uz, cz + su * hx * uz + sv * hz * ux);
    if (ringArea2(ring) < 0) { const r2: number[] = []; for (let i = ring.length - 2; i >= 0; i -= 2) r2.push(ring[i], ring[i + 1]); ring = r2; }
    const n = ring.length / 2;
    const tall = Math.min(1, Math.max(0, (y1 - y0 - 10) / 80));
    // The near form lights about a third of its windows at night (vignette/world.ts); vary it per building.
    const lit = bx.lit ?? NEAR_LIT * (0.7 + 0.6 * hash(cx, cz)) * (0.9 + 0.2 * tall);
    const ny = NIGHT_WALL, split = y0 + (y1 - y0) * 0.35, big = shows(bx);
    for (let i = 0; i < n; i++) {
      const ax = ring[i * 2], az = ring[i * 2 + 1], bx2 = ring[((i + 1) % n) * 2], bz = ring[((i + 1) % n) * 2 + 1];
      let nx = bz - az, nz = -(bx2 - ax);
      const l = Math.hypot(nx, nz);
      if (l < 1e-3) continue;
      nx /= l; nz /= l;
      // Per-face tone shift and a darker base band: a little of the near form's grain.
      const k = 0.94 + 0.12 * hash(ax + bx2, az + bz), base = 0.88;
      const nl = 1 + 0.25 * lit;
      if (!big) {
        // A small building: one band, its tone between the two.
        const m = k * 0.94;
        const p0 = put(ax, y0, az, nx, 0, nz, bx.r * m, bx.g * m, bx.b * m, ny.r, ny.g, ny.b);
        const p1 = put(bx2, y0, bz, nx, 0, nz, bx.r * m, bx.g * m, bx.b * m, ny.r, ny.g, ny.b);
        const p2 = put(bx2, y1, bz, nx, 0, nz, bx.r * m, bx.g * m, bx.b * m, ny.r * nl, ny.g * nl, ny.b * nl);
        const p3 = put(ax, y1, az, nx, 0, nz, bx.r * m, bx.g * m, bx.b * m, ny.r * nl, ny.g * nl, ny.b * nl);
        quad(p0, p1, p2, p3);
        continue;
      }
      const a0 = put(ax, y0, az, nx, 0, nz, bx.r * k * base, bx.g * k * base, bx.b * k * base, ny.r, ny.g, ny.b);
      const b0 = put(bx2, y0, bz, nx, 0, nz, bx.r * k * base, bx.g * k * base, bx.b * k * base, ny.r, ny.g, ny.b);
      const b1 = put(bx2, split, bz, nx, 0, nz, bx.r * k * base, bx.g * k * base, bx.b * k * base, ny.r, ny.g, ny.b);
      const a1 = put(ax, split, az, nx, 0, nz, bx.r * k * base, bx.g * k * base, bx.b * k * base, ny.r, ny.g, ny.b);
      quad(a0, b0, b1, a1);
      const c0 = put(ax, split, az, nx, 0, nz, bx.r * k, bx.g * k, bx.b * k, ny.r * nl, ny.g * nl, ny.b * nl);
      const d0 = put(bx2, split, bz, nx, 0, nz, bx.r * k, bx.g * k, bx.b * k, ny.r * nl, ny.g * nl, ny.b * nl);
      const d1 = put(bx2, y1, bz, nx, 0, nz, bx.r * k, bx.g * k, bx.b * k, ny.r * nl, ny.g * nl, ny.b * nl);
      const c1 = put(ax, y1, az, nx, 0, nz, bx.r * k, bx.g * k, bx.b * k, ny.r * nl, ny.g * nl, ny.b * nl);
      quad(c0, d0, d1, c1);
    }
    // Roof: the near form's mean including clutter and parapet shade.
    const rf = bx.roof ?? { r: bx.r, g: bx.g, b: bx.b };
    const roof = { r: (rf.r * 0.7 + CLUTTER.r * 0.3) * 0.86, g: (rf.g * 0.7 + CLUTTER.g * 0.3) * 0.86, b: (rf.b * 0.7 + CLUTTER.b * 0.3) * 0.86 };
    const first = v;
    for (let i = 0; i < n; i++) put(ring[i * 2], y1, ring[i * 2 + 1], 0, 1, 0, roof.r, roof.g, roof.b, ny.r * 0.7, ny.g * 0.7, ny.b * 0.7);
    const pts = Array.from({ length: n }, (_, i) => new Vector2(ring[i * 2], ring[i * 2 + 1]));
    for (const [a, b, c] of ShapeUtils.triangulateShape(pts, [])) I.push(first + a, first + c, first + b);
    // Night: amber window points, covering the share of wall the near form's lit windows cover
    // (WINDOW_GLOW of the wall per unit lit share). Houses get smaller points, about one each.
    const h = y1 - y0;
    // Window points only on walls standing on their ground: none in graded cuts, where a
    // building's base was re-cut after it was placed.
    if (h < 3 || noSparkle?.(cx, cz)) continue;
    let perimeter = 0;
    for (let i = 0; i < n; i++) perimeter += Math.hypot(ring[((i + 1) % n) * 2] - ring[i * 2], ring[((i + 1) % n) * 2 + 1] - ring[i * 2 + 1]);
    const w = h < 12 ? 1.5 : 2.5;
    const want = WINDOW_GLOW * (lit / NEAR_LIT) * perimeter * h / (4 * w * w);
    // A fractional point becomes one with that probability (stable per building).
    const count = Math.min(160, Math.floor(want) + (hash(cz, cx) < want % 1 ? 1 : 0));
    for (let k2 = 0; k2 < count; k2++) {
      const e = Math.floor(hash(cx + k2 * 7.1, cz - k2 * 3.7) * n), t = 0.1 + 0.8 * hash(cz + k2, cx - k2);
      const ax = ring[e * 2], az = ring[e * 2 + 1], bx2 = ring[((e + 1) % n) * 2], bz = ring[((e + 1) % n) * 2 + 1];
      let nx = bz - az, nz = -(bx2 - ax);
      const l = Math.hypot(nx, nz);
      if (l < 2 * w) continue;
      nx /= l; nz /= l;
      const ex = (bx2 - ax) / l, ez = (bz - az) / l;
      const px = ax + (bx2 - ax) * t + nx * 0.5, pz = az + (bz - az) * t + nz * 0.5;
      const y = h < 12 ? y0 + h * 0.45 : y0 + 4 + (h - 8) * hash(cx * 0.3 + k2, cz * 0.7 - k2);
      const g = 0.75 + 0.25 * hash(px, pz);
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => put(px + ex * dx * w, y + dy * w, pz + ez * dx * w, nx, 0, nz, 0, 0, 0, AMBER.r * g, AMBER.g * g, AMBER.b * g));
      quad(q[0], q[1], q[2], q[3], true);
    }
  }
  const total = v;
  const big = total > 65535;
  const g = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(P), 3);
  const normal = new BufferAttribute(Int8Array.from(N, x => Math.round(x * 127)), 3, true);
  const dayIndex = big ? Uint32Array.from(I) : Uint16Array.from(I);
  const nightIndex = big ? Uint32Array.from([...I, ...NI]) : Uint16Array.from([...I, ...NI]);
  g.setAttribute('position', position);
  g.setAttribute('normal', normal);
  g.setAttribute('color', new BufferAttribute(Uint8Array.from(C, byte), 3, true));
  g.setIndex(new BufferAttribute(dayIndex, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  const day = new Mesh(g, new StaticLandmarkMaterial());
  day.name = 'far-board buildings';
  day.castShadow = day.receiveShadow = true;
  const gn = new BufferGeometry();
  gn.setAttribute('position', position);
  gn.setAttribute('color', new BufferAttribute(Uint8Array.from(D, byte), 3, true));
  gn.setIndex(new BufferAttribute(nightIndex, 1));
  gn.boundingBox = g.boundingBox;
  gn.boundingSphere = g.boundingSphere;
  const night = new Mesh(gn, new MeshBasicMaterial({ vertexColors: true }));
  night.name = 'far-board buildings (night)';
  for (const m of [day, night]) {
    m.userData.perf = 'buildings'; m.userData.building = true; m.visible = false;
    // Never picked or measured: three raycasts hidden meshes too, and a box is not the building.
    m.raycast = noRaycast;
  }
  return { day, night };
}

/**
 * The far form drawn with the generic buildings' own material (vignette/world.ts): each wall keeps
 * its building's style and base, so the shader's distance-faded facade (each archetype's mean of
 * wall and glass) and its lit windows at night colour the box as they colour the building, and no
 * night variant or extra program is needed. Roofs carry style −1 (plain), as the near roofs do.
 */
function styledBoxMesh(boxes: readonly FarBox[], material: Material): { day: Mesh; night: null } {
  const P: number[] = [], N: number[] = [], C: number[] = [], S: number[] = [], B: number[] = [], I: number[] = [];
  let v = 0;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, r: number, g: number, b: number, st: number, base: number) => {
    P.push(x, y, z); N.push(nx, ny, nz); C.push(r, g, b); S.push(st); B.push(base); return v++;
  };
  for (const bx of boxes) {
    const { cx, cz, ux, uz, hx, hz, y0, y1 } = bx;
    let ring: number[] = bx.ring ?? [];
    if (!bx.ring) for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ring.push(cx + su * hx * ux - sv * hz * uz, cz + su * hx * uz + sv * hz * ux);
    if (ringArea2(ring) < 0) { const r2: number[] = []; for (let i = ring.length - 2; i >= 0; i -= 2) r2.push(ring[i], ring[i + 1]); ring = r2; }
    const n = ring.length / 2, st = bx.style ?? -1, base = bx.base ?? y0;
    for (let i = 0; i < n; i++) {
      const ax = ring[i * 2], az = ring[i * 2 + 1], bx2 = ring[((i + 1) % n) * 2], bz = ring[((i + 1) % n) * 2 + 1];
      let nx = bz - az, nz = -(bx2 - ax);
      const l = Math.hypot(nx, nz);
      if (l < 1e-3) continue;
      nx /= l; nz /= l;
      const band = (lo: number, hi: number, s: number, sb: number) => {
        const p0 = put(ax, lo, az, nx, 0, nz, bx.r, bx.g, bx.b, s, sb), p1 = put(bx2, lo, bz, nx, 0, nz, bx.r, bx.g, bx.b, s, sb);
        const p2 = put(bx2, hi, bz, nx, 0, nz, bx.r, bx.g, bx.b, s, sb), p3 = put(ax, hi, az, nx, 0, nz, bx.r, bx.g, bx.b, s, sb);
        I.push(p0, p2, p1, p0, p3, p2);
      };
      const split = bx.baseStyle !== undefined && bx.baseStyle >= 0 && bx.baseTop! > y0 + 0.5 && bx.baseTop! < y1 - 0.5;
      if (split) { band(y0, bx.baseTop!, bx.baseStyle!, bx.baseBase ?? base); band(bx.baseTop!, y1, st, base); }
      else band(y0, y1, st, base);
    }
    // The roof's own colour: the near form's roof clutter is under a pixel at the switch, and a
    // clutter-weighted mean read visibly greyer than the near roofs (2026-11-26 stills).
    const roof = bx.roof ?? { r: bx.r, g: bx.g, b: bx.b };
    const first = v;
    for (let i = 0; i < n; i++) put(ring[i * 2], y1, ring[i * 2 + 1], 0, 1, 0, roof.r, roof.g, roof.b, -1, 0);
    const pts = Array.from({ length: n }, (_, i) => new Vector2(ring[i * 2], ring[i * 2 + 1]));
    for (const [a, b, c] of ShapeUtils.triangulateShape(pts, [])) I.push(first + a, first + c, first + b);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('normal', new BufferAttribute(Int8Array.from(N, x => Math.round(x * 127)), 3, true));
  g.setAttribute('color', new BufferAttribute(Uint8Array.from(C, byte), 3, true));
  g.setAttribute('aStyle', new BufferAttribute(Int8Array.from(S), 1));
  g.setAttribute('aBase', new BufferAttribute(new Float32Array(B), 1));
  g.setIndex(new BufferAttribute(v > 65535 ? Uint32Array.from(I) : Uint16Array.from(I), 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  const day = new Mesh(g, material);
  day.name = 'far-board buildings';
  day.castShadow = day.receiveShadow = true;
  day.userData.perf = 'buildings'; day.userData.building = true; day.visible = false;
  day.raycast = noRaycast;
  return { day, night: null };
}
