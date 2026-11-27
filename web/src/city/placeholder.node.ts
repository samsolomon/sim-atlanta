/**
 * Node side of the white placeholder (city/placeholder.ts): mounts every area of the mosaic at
 * Low as City does, with fetch served from web/public/data (terrain/ground-bake.node.ts
 * stubPage), and reads each area's own far form: the far-board boxes of its generic buildings
 * and houses, plus a mass per landmark part (glass included) taken before batching. The masses
 * are then exactly where the coloured buildings land, seated on the area's drawn ground.
 * Not imported by the site.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { ShapeUtils, Vector2, type Object3D } from 'three';
import { brookwoodGrid } from './brookwood';
import { boxesFromObject, orientedRect, tapLandmarks, type FarBox } from './far-board';
import { addSection, bounds, joins, midtownRows, type Area, type Board } from '../square-board/sections';
import { midtownBaseNavd88M } from './square-mosaic';
import { GroundGrid } from '../terrain/grid';
import { capitolTunnelGround } from '../terrain/capitol-tunnel';
import { createDowntownTerrain } from '../terrain/model';
import { dataRoot } from '../terrain/ground-bake.node';
import { encodePlaceholder, type PlaceholderAreaData } from './placeholder-data';

const bytes = (u: URL) => Uint8Array.from(readFileSync(u)).buffer;
/** Coarse ground step (m). The placeholder ground is a plain paper surface: 40 m keeps it about
 * 1.75k triangles per km² while staying within a metre or two of the drawn ground. */
export const GROUND_STEP = 40;
/** Ring simplification tolerance (m) and the most vertices a ring keeps. */
const SIMPLIFY_M = 0.75, MAX_RING = 40;
/** Footprints in context.json at least this big (m²) must have a mass (coverage check). */
const COVER_M2 = 150;

type Ring = [number, number][];

function boxRing(b: FarBox): Ring {
  if (b.ring) { const r: Ring = []; for (let i = 0; i < b.ring.length; i += 2) r.push([b.ring[i], b.ring[i + 1]]); return r; }
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [b.cx + su * b.hx * b.ux - sv * b.hz * b.uz, b.cz + su * b.hx * b.uz + sv * b.hz * b.ux]);
}

/** Douglas–Peucker on a closed ring. */
function simplify(ring: Ring, tol: number): Ring {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  const seg = (a: number, b: number) => {
    let worst = -1, far = tol;
    const [ax, az] = ring[a], [bx, bz] = ring[b % ring.length];
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((ring[i][0] - ax) * dz - (ring[i][1] - az) * dx) / l;
      if (d > far) { far = d; worst = i; }
    }
    if (worst >= 0) { keep[worst] = 1; seg(a, worst); seg(worst, b); }
  };
  // Split at the vertex farthest from the first, so the ring is two open chains.
  let split = 1, far = 0;
  for (let i = 1; i < ring.length; i++) { const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]); if (d > far) { far = d; split = i; } }
  keep[0] = keep[split] = 1;
  seg(0, split); seg(split, ring.length);
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 3 ? out : ring;
}

/**
 * At most MAX_RING vertices: simplify harder, and where that can't get there (the simplifier keeps
 * its input when a pass would leave fewer than three points), fall back to the convex hull, then
 * to the oriented rectangle. Always terminates.
 */
export function capRing(ring: Ring): Ring {
  for (let tol = SIMPLIFY_M * 2; ring.length > MAX_RING && tol < 64; tol *= 1.5) ring = simplify(ring, tol);
  if (ring.length <= MAX_RING) return ring;
  const r = orientedRect(ring.map(p => p[0]), ring.map(p => p[1]));
  if (r.hull.length / 2 <= MAX_RING && r.hull.length >= 6) {
    const hull: Ring = [];
    for (let i = 0; i < r.hull.length; i += 2) hull.push([r.hull[i], r.hull[i + 1]]);
    return hull;
  }
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [r.cx + su * r.hx * r.ux - sv * r.hz * r.uz, r.cz + su * r.hx * r.uz + sv * r.hz * r.ux]);
}

const area2 = (r: Ring) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length]; a += x0 * z1 - x1 * z0; } return a; };

function inRing(r: Ring, x: number, z: number) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

interface Mass { ring: Ring; y0: number; y1: number }

/** The masses of one area: its far boxes and its landmark parts, simplified and seated. */
function massesOf(area: Area, landmarkBoxes: FarBox[]) {
  const out: Mass[] = [];
  let floating = 0;
  for (const b of [...area.farBoxes, ...landmarkBoxes]) {
    let ring = boxRing(b);
    if (ring.length > 4) ring = simplify(ring, SIMPLIFY_M);
    ring = capRing(ring);
    if (Math.abs(area2(ring)) < 2) continue;
    // Seat on the drawn ground, as the far form does (terrain/model.ts grounded): down to the lowest
    // ground under it, and drop parts standing clear of it (skybridges, canopies).
    let lo = Infinity, hi = -Infinity;
    for (const [x, z] of [...ring, [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length]]) {
      const y = area.terrainAt(x, z);
      if (y !== null) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
    if (hi > -Infinity && b.y0 - hi > 3) { floating++; continue; }
    const y0 = Math.min(b.y0, lo);
    if (b.y1 - y0 < 1) continue;
    out.push({ ring, y0, y1: b.y1 });
  }
  return { masses: out, floating };
}

/** Footprints of context.json without a mass over their centroid (names, for the report). */
function uncovered(id: Board, masses: Mass[]) {
  const path = id === 'king' ? 'scene/king-memorial/context.json' : id === 'auburn' ? 'scene/sweet-auburn/context.json' : `scene/square-board/${id}/context.json`;
  const context = JSON.parse(readFileSync(new URL(path, dataRoot), 'utf8')) as { buildings: { id: string; name?: string; rings: Ring[] }[] };
  const b = bounds[id];
  const missing: string[] = [];
  let checked = 0;
  for (const building of context.buildings) {
    const ring = building.rings?.[0];
    if (!ring || Math.abs(area2(ring)) / 2 < COVER_M2) continue;
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    if (cx < b.minX || cx > b.maxX || cz < b.minZ || cz > b.maxZ) continue;
    checked++;
    // Covered if a mass holds the centroid or any footprint vertex (L shapes, courtyards).
    const hit = masses.some(m => inRing(m.ring, cx, cz) || ring.some(([x, z]) => inRing(m.ring, x, z)));
    if (!hit) missing.push(building.name ?? building.id);
  }
  return { checked, missing };
}

/** A stable shuffle (mulberry32), so the dissolve order is the same on every build. */
function shuffle<T>(list: T[], seed: number) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

function encodeArea(id: Board, area: Area, masses: Mass[], bottomY: number): PlaceholderAreaData {
  const b = bounds[id];
  const ox = Math.round((b.minX + b.maxX) / 2), oz = Math.round((b.minZ + b.maxZ) / 2);
  const cols = Math.ceil((b.maxX - b.minX) / GROUND_STEP) + 1, rows = Math.ceil((b.maxZ - b.minZ) / GROUND_STEP) + 1;
  const ground = new Int16Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = Math.min(b.minX + c * GROUND_STEP, b.maxX), z = Math.min(b.minZ + r * GROUND_STEP, b.maxZ);
    // Just inside the edge, where the drawn ground is defined.
    const y = area.terrainAt(Math.min(Math.max(x, b.minX + 0.5), b.maxX - 0.5), Math.min(Math.max(z, b.minZ + 0.5), b.maxZ - 0.5)) ?? area.grid.sample(x, z) ?? 0;
    ground[r * cols + c] = Math.round(y * 10);
  }
  shuffle(masses, id.split('').reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261));
  const ringN = new Uint8Array(masses.length), y = new Int16Array(masses.length * 2);
  const xz: number[] = [], roof: number[] = [];
  const dm = (v: number) => { const q = Math.round(v * 10); if (q < -32768 || q > 32767) throw Error(`${id}: ${v} m is out of Int16 decimetres`); return q; };
  masses.forEach((m, i) => {
    // Counter-clockwise seen from above (+y): area2 over (x, z) negative.
    const ring = area2(m.ring) > 0 ? [...m.ring].reverse() : m.ring;
    ringN[i] = ring.length;
    y[i * 2] = dm(m.y0); y[i * 2 + 1] = dm(m.y1);
    for (const [x, z] of ring) xz.push(dm(x - ox), dm(z - oz));
    const tris = ShapeUtils.triangulateShape(ring.map(([x, z]) => new Vector2(x, z)), []);
    // Pad or trim to ringN − 2 triangles, so the reader can index without a count.
    // Each triangle faces up (+y): three's front face is counter-clockwise seen from its normal,
    // so (b − a) × (c − a) must point up (as far-board.ts styledBoxSteps).
    const up = ([a, b, c]: number[]) => {
      const ex = ring[b][0] - ring[a][0], ez = ring[b][1] - ring[a][1], fx = ring[c][0] - ring[a][0], fz = ring[c][1] - ring[a][1];
      return ez * fx - ex * fz > 0 ? [a, b, c] : [a, c, b];
    };
    // Pad or trim to ringN − 2 triangles, so the reader can index without a count.
    for (let t = 0; t < ring.length - 2; t++) roof.push(...up(tris[t] ?? tris[0] ?? [0, 1, 2]));
  });
  return {
    area: { id, ox, oz, bounds: b, bottomY, ground: { step: GROUND_STEP, cols, rows }, buildings: masses.length, ringVerts: xz.length / 2, roofTris: roof.length / 3 },
    ground, ringN, y, xz: Int16Array.from(xz), roof: Uint8Array.from(roof),
  };
}

/** Mount the board (Low), read each area's masses and encode the file. */
export async function bakePlaceholder() {
  const tapped = new Map<Object3D, FarBox[]>();
  tapLandmarks((group, container) => {
    const list = tapped.get(container) ?? [];
    list.push(...boxesFromObject(group, container, 3, true));
    tapped.set(container, list);
  });
  const quality = 'low' as const;
  const signal = new AbortController().signal;
  // As City reads downtown in the mosaic (city.ts): the Capitol tunnel's ground is cut into it.
  const manifest = JSON.parse(readFileSync(new URL('scene/downtown/ground.json', dataRoot), 'utf8'));
  const grid = new GroundGrid(manifest, capitolTunnelGround(manifest, bytes(new URL('scene/downtown/ground.i16', dataRoot))));
  const bottomY = midtownBaseNavd88M - grid.manifest.vertical.sceneZeroNavd88M;
  // Downtown is built at boot, before the placeholder could show, so it carries none (yet).
  const downtown = createDowntownTerrain(grid, { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality, join: joins('downtown'), bottomY });
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  const lines: string[] = [];
  try {
    const { loadEast } = await import('./king-memorial-board');
    const { loadNorth } = await import('./sweet-auburn-board');
    const king = await loadEast('/data', grid, quality, bottomY, signal, joins('king').slice(1));
    mounted.set('king', king as unknown as Area);
    const auburn = await loadNorth('/data', grid, king.grid, quality, bottomY, signal, joins('auburn').slice(2));
    mounted.set('auburn', auburn as unknown as Area);
    for (const id of ['north', 'south', ...midtownRows] as const)
      await addSection(id, mounted, quality, signal, { brookwood: async (m, b) => brookwoodGrid(m, b) });
    const areas: PlaceholderAreaData[] = [];
    let total = 0;
    for (const [id, area] of mounted) {
      if (id === 'downtown') continue;
      const { masses, floating } = massesOf(area, tapped.get(area.scenery) ?? []);
      const cover = uncovered(id, masses);
      const data = encodeArea(id, area, masses, bottomY);
      areas.push(data);
      const b = bounds[id], km2 = (b.maxX - b.minX) * (b.maxZ - b.minZ) / 1e6;
      const raw = [data.ground, data.ringN, data.y, data.xz, data.roof].reduce((s, a) => s + a.byteLength, 0);
      const gz = gzipSync(encodePlaceholder([data]), { level: 9 }).length;
      total += km2;
      lines.push(`${id.padEnd(18)} ${km2.toFixed(2)} km²  ${String(masses.length).padStart(5)} masses (${tapped.get(area.scenery)?.length ?? 0} landmark parts, ${floating} floating dropped)  ` +
        `${data.area.ringVerts} ring verts  ${(raw / 1024).toFixed(0)} KiB raw  ${(gz / 1024).toFixed(0)} KiB gz (${(gz / 1024 / km2).toFixed(0)} KiB/km²)  ` +
        `cover ${cover.checked - cover.missing.length}/${cover.checked}${cover.missing.length ? ' missing: ' + cover.missing.slice(0, 8).join('; ') : ''}`);
    }
    const file = gzipSync(encodePlaceholder(areas), { level: 9 });
    lines.push(`board: ${areas.length} areas, ${total.toFixed(1)} km², ${(file.length / 1024).toFixed(0)} KiB gz (${(file.length / 1024 / total).toFixed(0)} KiB/km²)`);
    return { file, areas, report: lines.join('\n') };
  } finally {
    tapLandmarks(null);
    for (const a of mounted.values()) a.dispose();
  }
}
