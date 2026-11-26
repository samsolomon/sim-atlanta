import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import { ribbons, sectionAt, type Ribbon } from './connector-corridor';
import type { OpenSlot } from './openings';
import type { GroundManifest } from './grid';

/**
 * The covered Connector under the Capitol Gateway lid, as a tunnel with lit mouths.
 *
 * The board is a heightfield, so the lid's top is the board and nothing is drawn under it.
 * At each mouth (a covered way meeting an open one) a concrete headwall stands across the
 * carriageway, and a short tube runs in under the lid: walls, ceiling and floor, fading to a
 * black end cap, with crown lamps. A covered slot cuts the board out of the tube up to its
 * ceiling, so the lid's own streets above stay whole. Cars drive in and stay visible for
 * TUNNEL_VISIBLE_M, then vanish in the dark, as the North Line's trains do at Brookwood.
 *
 * Illustrative: OSM maps the covered ways (covered=yes) and lidar gives the cut floor and
 * the lid top; the headwall form, tube depth and lamps are not surveyed.
 */
const CAPITOL = new Set([39160886, 39160888, 39160889, 39160890, 435734520, 435734523, 580328711, 580328712]);
/** How far the drawn tube runs in from each mouth, and how far cars stay visible. */
export const TUNNEL_DEPTH_M = 30, TUNNEL_VISIBLE_M = 22;
/** Clear height from the road to the ceiling, and the shoulder beside the outer lanes. */
const CLEARANCE_M = 5.2, SHOULDER_M = 1.2;

export interface Mouth {
  ribbon: Ribbon;
  /** Station of the mouth on the covered ribbon, and +1 if the tube runs towards higher s. */
  s: number;
  into: 1 | -1;
  /** Mouth point, unit direction into the tube, and unit right of that direction. */
  at: P2;
  dir: P2;
  right: P2;
  /** Tube half-width and its lateral centre offset (right positive) from the ribbon centre. */
  halfWidth: number;
  offset: number;
}

const key = (p: P2) => p.join(',');

/** Ends of the covered Capitol ways that meet an open way. */
export function capitolMouths(): Mouth[] {
  const open = new Set<string>();
  for (const r of ribbons) if (r.kind !== 'tunnel') for (const p of [r.pts[0], r.pts.at(-1)!]) open.add(key(p));
  const out: Mouth[] = [];
  for (const r of ribbons) {
    if (!CAPITOL.has(r.id) || r.kind !== 'tunnel') continue;
    for (const start of [true, false]) {
      const end = start ? r.pts[0] : r.pts.at(-1)!;
      if (!open.has(key(end))) continue;
      const s = start ? 0 : r.line.length, into = start ? 1 : -1;
      const p = r.line.at(s), dir: P2 = [p.dx * into, p.dz * into], right: P2 = [-dir[1], dir[0]];
      const row = sectionAt(r, s);
      // Lateral positions of the section's edges, right of the direction into the tube.
      const lat = (q: P2) => (q[0] - p.x) * right[0] + (q[1] - p.z) * right[1];
      const a = lat(row.inner), b = lat(row.outer), lo = Math.min(a, b) - SHOULDER_M, hi = Math.max(a, b) + SHOULDER_M;
      out.push({ ribbon: r, s, into, at: [p.x, p.z], dir, right, halfWidth: (hi - lo) / 2, offset: (hi + lo) / 2 });
    }
  }
  return out;
}

/** World point at `along` metres into the tube and `across` metres right of its centre. */
function point(m: Mouth, along: number, across: number): P2 {
  const c = across + m.offset;
  return [m.at[0] + m.dir[0] * along + m.right[0] * c, m.at[1] + m.dir[1] * along + m.right[1] * c];
}

/** The road level at a mouth: the open cut's board just outside it (scene metres). */
export function mouthFloor(m: Mouth, ground: (x: number, z: number) => number | null) {
  return ground(...point(m, -4, 0));
}
/** Each mouth's floor, sampled once from the committed ground grids (capitol-tunnel.test.ts
 * holds them to the grids). The north-east mouths straddle the downtown and south-band seam
 * at z = 700, so both boards must cut and draw one tube from the same level. */
export const MOUTH_FLOORS: Record<string, number> = {
  '39160886/0 start': -17.70, '39160888/0 start': -24.26, '39160888/0 end': -21.37, '39160889/0 end': -22.78,
  '39160890/0 start': -20.27, '39160890/0 end': -20.94, '435734520/0 end': -20.22, '435734523/0 end': -19.87,
  '580328711/0 start': -21.76, '580328712/0 start': -22.85,
};
/** The lowest lid top over each tube from 4 m in (metres above its floor), from the same grids.
 * Each tube's ceiling stays 0.75 m under it and its cut 0.3 m under it, so the lid's surface,
 * with the streets drawn on it, is never cut through. */
export const MOUTH_LIDS: Record<string, number> = {
  '39160886/0 start': 5.53, '39160888/0 start': 9.80, '39160888/0 end': 5.86, '39160889/0 end': 6.29,
  '39160890/0 start': 6.25, '39160890/0 end': 7.10, '435734520/0 end': 7.14, '435734523/0 end': 7.24,
  '580328711/0 start': 7.11, '580328712/0 start': 5.31,
};
const clearance = (key: string) => Math.min(CLEARANCE_M, MOUTH_LIDS[key] - 0.75);
export const mouthKey = (m: Pick<Mouth, 'ribbon' | 's'>) => `${m.ribbon.key} ${m.s === 0 ? 'start' : 'end'}`;

/** The lidar cliff at a mouth starts a 5 m grid cell outside the mapped mouth, so each tube's
 * board cut and floor begin this far out; otherwise the cliff's foot stands in the opening. */
const APRON_M = 6, FACE_M = 2, BOX_M = 5;
/** Board openings: each tube's box, from the apron to its depth, up to the ceiling. */
export function capitolTunnelSlots(): OpenSlot[] {
  const slots: OpenSlot[] = [];
  for (const m of capitolMouths()) {
    const k = mouthKey(m), floor = MOUTH_FLOORS[k];
    if (floor === undefined) continue;
    const bed = floor - 0.4, at = (a: number) => point(m, a, 0);
    // In front of the face the bank is cut away to open air, between the wing walls.
    const [ax, az] = at(-APRON_M), [fx, fz] = at(-FACE_M);
    slots.push({ start: [ax, bed, az], end: [fx, bed, fz], halfWidthM: m.halfWidth + 0.6, crossAxis: m.right });
    // From the face, the tube's box only up to just under the lid (raised around the portal by
    // capitolTunnelGround), so the bank and the lid's streets above stay whole.
    const [x1, z1] = at(TUNNEL_DEPTH_M);
    slots.push({ start: [fx, bed, fz], end: [x1, bed, z1], halfWidthM: m.halfWidth + 0.5,
      crossAxis: m.right, cutHeightM: MOUTH_LIDS[k] - 0.3 + 0.4 });
  }
  return slots;
}

/**
 * Cut the portals into the bank: around each mouth, raise the board's grid nodes to the top of
 * its headwall, over the tube from the face to a cell past the portal, and one cell to each side.
 * The lid's own ground then meets the headwall, the apron's cut leaves a clean face there, and
 * the bank slopes away beyond, with no box standing proud of the cut. Run on both boards the
 * north-east mouths straddle (downtown and the south band), before either builds its surface.
 */
export function capitolTunnelGround(manifest: GroundManifest, bytes: ArrayBuffer) {
  const data = new DataView(bytes), { bounds, stepM, rows, cols, scaleM, offsetM, noData } = manifest;
  const zero = manifest.vertical.sceneZeroNavd88M;
  for (const m of capitolMouths()) {
    const k = mouthKey(m), floor = MOUTH_FLOORS[k];
    if (floor === undefined) continue;
    const top = floor + MOUTH_LIDS[k] + 0.2 + zero;
    const reach = m.halfWidth + 0.6 + stepM, front = -FACE_M, back = BOX_M + stepM;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = bounds.minX + col * stepM, z = bounds.minZ + row * stepM;
      const dx = x - m.at[0], dz = z - m.at[1];
      const along = dx * m.dir[0] + dz * m.dir[1], across = dx * m.right[0] + dz * m.right[1] - m.offset;
      if (along < front || along > back || Math.abs(across) > reach) continue;
      const i = 2 * (row * cols + col), raw = data.getInt16(i, true);
      if (raw === noData || raw * scaleM + offsetM >= top) continue;
      data.setInt16(i, Math.round((top - offsetM) / scaleM), true);
    }
  }
  return bytes;
}

let pinned: (Mouth & { floor: number })[] | undefined;
/** Road level at a mouth: on the cut-away apron and a few lengths into the tube, else null. */
export function capitolTunnelFloorAt(x: number, z: number) {
  pinned ??= capitolMouths().flatMap(m => MOUTH_FLOORS[mouthKey(m)] === undefined ? [] : [{ ...m, floor: MOUTH_FLOORS[mouthKey(m)] }]);
  return capitolTunnelFloor(pinned, x, z);
}
/** Road level for a car on a covered Capitol way: the mouth's floor while it is still in view. */
export function capitolTunnelFloor(mouths: readonly (Mouth & { floor: number })[], x: number, z: number) {
  for (const m of mouths) {
    const dx = x - m.at[0], dz = z - m.at[1];
    const along = dx * m.dir[0] + dz * m.dir[1], across = dx * m.right[0] + dz * m.right[1] - m.offset;
    // From the start of the open apron, whose board is cut away, to as far in as cars show.
    if (along >= -APRON_M - 0.5 && along <= TUNNEL_VISIBLE_M && Math.abs(across) <= m.halfWidth) return m.floor;
  }
  return null;
}

/**
 * The headwalls, tubes and lamps. `ground` is the bare board in scene metres (the lid top and
 * the cut floor); `night` sets the lamps' glow.
 */
export function capitolTunnel(ground: (x: number, z: number) => number | null) {
  const body = new Builder(), lamps = new Builder();
  const mouths: (Mouth & { floor: number })[] = [];
  const concrete = '#aaa293', face = '#9d9587', bank = '#9fab78';
  const shade = (along: number) =>
    '#' + new THREE.Color('#5a574f').lerp(new THREE.Color('#070706'), Math.pow(Math.min(1, along / 18), 0.7)).getHexString();
  for (const m of capitolMouths()) {
    const floor = MOUTH_FLOORS[mouthKey(m)];
    if (floor === undefined) continue;
    mouths.push({ ...m, floor });
    const w = m.halfWidth, ceiling = floor + clearance(mouthKey(m));
    const top = Math.max(ceiling + 0.8, ground(...point(m, 6, 0)) ?? ceiling + 0.8);
    const v = (along: number, across: number, y: number) => { const [x, z] = point(m, along, across); return [x, y, z]; };
    // Headwall: a vertical face from the opening up to the lid's level (the bank around it is
    // raised to meet it, capitolTunnelGround), FACE_M out from the mapped mouth, with a cap and
    // a pier each side; wing walls slope down with the bank along the open apron.
    const f = -FACE_M, wallTop = floor + MOUTH_LIDS[mouthKey(m)] + 0.2;
    body.quad(v(f, -w - 0.6, ceiling), v(f, w + 0.6, ceiling), v(f, w + 0.6, wallTop), v(f, -w - 0.6, wallTop), face);
    body.quad(v(f - 0.4, -w - 0.6, wallTop), v(f - 0.4, w + 0.6, wallTop), v(f + 0.4, w + 0.6, wallTop), v(f + 0.4, -w - 0.6, wallTop), concrete);
    body.quad(v(f - 0.4, -w - 0.6, ceiling - 0.05), v(f - 0.4, w + 0.6, ceiling - 0.05), v(f - 0.4, w + 0.6, wallTop), v(f - 0.4, -w - 0.6, wallTop), concrete);
    // Where the bank still slopes down to the face within one grid cell, a ground-coloured
    // slab just under the raised bank closes it; elsewhere the bank hides it.
    body.quad(v(f + 0.4, -w - 0.6, wallTop - 0.05), v(f + 0.4, w + 0.6, wallTop - 0.05), v(BOX_M, w + 0.6, wallTop - 0.05), v(BOX_M, -w - 0.6, wallTop - 0.05), bank);
    for (const side of [-1, 1]) {
      const x0 = side * w, x1 = side * (w + 0.6);
      body.quad(v(f - 0.4, x0, floor - 0.1), v(f - 0.4, x1, floor - 0.1), v(f - 0.4, x1, wallTop), v(f - 0.4, x0, wallTop), concrete);
      // Wing wall along the apron's cut, sloping down from the headwall's top with the bank.
      body.quad(v(-APRON_M - 0.2, x1, floor - 0.1), v(f - 0.4, x1, floor - 0.1), v(f - 0.4, x1, wallTop), v(-APRON_M - 0.2, x1, floor + 1), face);
    }
    // The tube: walls, ceiling and floor in 1.5 m steps, darkening inward, closed by a black cap.
    for (let a = -FACE_M - 0.4; a < TUNNEL_DEPTH_M; a += 1.5) {
      const b = Math.min(TUNNEL_DEPTH_M, a + 1.5), col = shade((a + b) / 2);
      for (const side of [-w, w]) body.quad(v(a, side, floor - 0.1), v(a, side, ceiling), v(b, side, ceiling), v(b, side, floor - 0.1), col);
      body.quad(v(a, -w, ceiling), v(a, w, ceiling), v(b, w, ceiling), v(b, -w, ceiling), col);
      body.quad(v(a, -w, floor + 0.02), v(b, -w, floor + 0.02), v(b, w, floor + 0.02), v(a, w, floor + 0.02), a < 4 ? '#4d4f55' : col);
    }
    // The floor carries on over the apron, where the slot cuts the cliff's foot away.
    body.quad(v(-APRON_M - 0.2, -w - 0.6, floor + 0.02), v(-FACE_M - 0.4, -w - 0.6, floor + 0.02), v(-FACE_M - 0.4, w + 0.6, floor + 0.02), v(-APRON_M - 0.2, w + 0.6, floor + 0.02), '#4d4f55');
    body.quad(v(TUNNEL_DEPTH_M, -w, floor - 0.1), v(TUNNEL_DEPTH_M, w, floor - 0.1), v(TUNNEL_DEPTH_M, w, ceiling), v(TUNNEL_DEPTH_M, -w, ceiling), '#050505');
    // Lit mouths: a light strip along each wall for the first 10 m, and lamps under the
    // headwall, so the entrances read at night as well as by day (illustrative).
    for (const side of [-1, 1]) {
      const x = side * (w - 0.05);
      // Both windings: the glow material is single-sided, like the North Line portal's lamps,
      // so it shares that program.
      const a = v(f + 0.2, x, floor + 2.2), b = v(10, x, floor + 2.2), c = v(10, x, floor + 2.6), d = v(f + 0.2, x, floor + 2.6);
      lamps.quad(a, b, c, d, '#ffe2b0');
      lamps.quad(d, c, b, a, '#ffe2b0');
    }
    // The pavement under the lamps, lit warm for 12 m and fading into the tube.
    for (let a = f + 0.2; a < 12; a += 3) {
      const t = Math.min(1, (a - f) / (14 - f)), col = '#' + new THREE.Color('#55565c').lerp(new THREE.Color('#2a2a2e'), t).getHexString();
      lamps.quad(v(a, -w + 0.1, floor + 0.04), v(Math.min(12, a + 3), -w + 0.1, floor + 0.04), v(Math.min(12, a + 3), w - 0.1, floor + 0.04), v(a, w - 0.1, floor + 0.04), col);
      lamps.quad(v(a, w - 0.1, floor + 0.04), v(Math.min(12, a + 3), w - 0.1, floor + 0.04), v(Math.min(12, a + 3), -w + 0.1, floor + 0.04), v(a, -w + 0.1, floor + 0.04), col);
    }
    for (let across = -w + 1.5; across < w - 1; across += 3) {
      const [x, z] = point(m, f + 0.6, across);
      lamps.box(0.7, 0.12, 0.7, x, ceiling - 0.08, z, '#ffe7bd');
    }
    // Crown lamps in two rows, every 6 m (illustrative).
    for (let a = 2; a < TUNNEL_DEPTH_M - 4; a += 6)
      for (const across of [-w / 2, w / 2]) {
        const [x, z] = point(m, a, across);
        lamps.box(0.7, 0.12, 0.7, x, ceiling - 0.08, z, '#ffe7bd');
      }
  }
  const group = new THREE.Group();
  group.name = 'Capitol Gateway tunnel';
  const mesh = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  // Under the lid: it receives shadow at the mouths but casts none (no extra shadow draw).
  mesh.receiveShadow = true;
  mesh.name = 'Capitol Gateway tunnel portals';
  const glow = new THREE.Mesh(lamps.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffdfb0', emissiveIntensity: 0 }));
  glow.name = 'Capitol Gateway tunnel lamps';
  group.add(mesh, glow);
  return {
    group, mouths,
    floorAt: (x: number, z: number) => capitolTunnelFloor(mouths, x, z),
    /** The lamps and the pavement they light glow as night falls; by day the mouth's own shade reads. */
    setNight(factor: number) { (glow.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.45 * factor; },
    dispose() {
      mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
      glow.geometry.dispose(); (glow.material as THREE.Material).dispose();
    },
  };
}
