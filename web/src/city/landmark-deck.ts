import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { GroundYield } from '../terrain/surface';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { seedOf } from './skin-kit';

/**
 * The Landmark's parking deck at 215 Piedmont Avenue: one covered level of
 * weathered board-formed concrete under an open-air lot. The lot is level with
 * Piedmont, behind a black picket fence. To the east the ground falls toward
 * the Downtown Connector, which exposes a 3-4 m wall: a solid sill, a row of
 * mesh-screened bays between thin piers, and a plain band that rises as the
 * lot's parapet.
 *
 * Overture maps this outline at 68.2 m, which is The Landmark tower's height.
 * The April 2019 lidar puts the lot at p50 3.0 m, p95 4.6 m above the ring
 * ground (NAVD88 296.9), and the grid shows one flat plate with the east edge
 * at grade. The outline shares The Landmark's south-east walls without
 * overlapping it (0.0 m²), so the tower's own skin owns those walls. They stay
 * plain party walls here.
 *
 * Sources (Google Street View): Mar 2025 from the east frontage road, heading
 * 250, https://www.google.com/maps/@33.7603493,-84.3809265,3a,90y,250h,95t;
 * Dec 2024 from Piedmont, headings 85 and 110,
 * https://www.google.com/maps/@33.7607914,-84.3821909,3a,90y,85h,95t.
 * Estimated: bay and pier spacing (about 6 m), band heights, parked-car count.
 * No usable night photograph was found, so the dim lot and the strip lights under
 * the slab are estimates. The lot has no visible pole lights by day.
 */
export const landmarkDeckId = '22d70224-fe9f-4b26-a240-ff01563c03a2';

const lidarLot = 296.9; // NAVD88

const concrete = '#a7a39a',
  concreteShade = '#96928a',
  interior = '#3a3d3f',
  mesh = '#4a4e51',
  asphalt = '#76736d',
  stripe = '#dcd8cc',
  picket = '#2b2d2f';

/**
 * `neighbours` are the outlines the party walls are read from. City passes the list from before The
 * Landmark's skin claims the tower: `buildings` no longer holds it by the time the deck is built.
 */
export function createLandmarkDeck(buildings: VBuilding[], grid: GroundGrid, neighbours: VBuilding[]) {
  const site = buildings.find(b => b.id === landmarkDeckId);
  if (!site) return null;
  const origin: P2 = [955, -718];
  const s = landmarkShell(buildings, grid, landmarkDeckId, 'The Landmark deck', origin, [1, 0], [[0, 0], [15, 5]]);
  if (!s) return null;
  const seed = seedOf(landmarkDeckId);
  const groundAt = (x: number, z: number) => grid.sample(x + origin[0], z + origin[1]) ?? lidarLot;
  // The rendered terrain at the Piedmont corners runs up to 0.4 m above the lidar lot. Lift the
  // lot just clear of it (at most 0.6 m); inside the outline the terrain yields to the lot (below).
  const lot = Math.min(lidarLot + 0.6, Math.max(lidarLot, ...s.ring.map(([x, z]) => groundAt(x, z) + 0.08))),
    parapet = lot + 0.95,
    fence = lot + 1.1;

  // Wind the plan so faces have the deck on their left.
  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();
  s.prism(plan, s.base, lot, concrete, asphalt);

  // Party walls: edges whose ends are both corners of another building's outline
  // (The Landmark tower). Its skin draws those walls.
  const otherCorners = neighbours.filter(b => b.id !== landmarkDeckId)
    .flatMap(b => b.rings[0] ?? [])
    .filter(([x, z]) => Math.abs(x - origin[0]) < 60 && Math.abs(z - origin[1]) < 60);
  const shared = ([x, z]: P2) => otherCorners.some(([u, v]) => Math.hypot(u - x - origin[0], v - z - origin[1]) < 0.05);

  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.5 || (shared(a) && shared(b))) return;
    // Outward normal: the deck is on the left of a→b.
    const nx = dz / len, nz = -dx / len;
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    const ground = Math.min(groundAt(a[0], a[1]), groundAt(b[0], b[1]), groundAt(a[0] + dx / 2, a[1] + dz / 2));
    const exposed = lot - ground;

    if (exposed < 1.6) {
      // Level with the street: the lot's edge is a black picket fence (rails and posts).
      quad(0, 1, s.base, lot, 0.05, concreteShade);
      for (const [y0, y1] of [[lot + 0.12, lot + 0.2], [fence - 0.1, fence]]) {
        quad(0, 1, y0, y1, 0.05, picket);
        quad(1, 0, y0, y1, 0.03, picket);
      }
      const posts = Math.max(1, Math.round(len / 3));
      for (let k = 0; k <= posts; k++) {
        const u = k / posts, w = 0.05 / len;
        quad(Math.max(0, u - w), Math.min(1, u + w), lot, fence, 0.1, picket);
      }
      return;
    }
    // Parapet: outer band, cap and inner face.
    const openHi = lot - 1.0, openLo = Math.max(ground + 0.9, openHi - 1.6);
    quad(0, 1, openHi, parapet, 0.04, concrete);
    s.body.quad(at(0, parapet, -0.25), at(0, parapet, 0.04), at(1, parapet, 0.04), at(1, parapet, -0.25), concreteShade);
    quad(1, 0, lot, parapet, -0.25, concreteShade);
    if (openHi - openLo < 0.8) {
      quad(0, 1, s.base, openHi, 0.04, concrete);
      return;
    }
    quad(0, 1, s.base, openLo, 0.04, concrete);
    // Bays: dark garage behind a mesh screen, a lit strip under the slab, and piers.
    // Each layer stands 4 cm or more clear of the prism wall (at 0) and its neighbours, or they
    // z-fight from a 400-500 m orbit.
    quad(0, 1, openLo, openHi, 0.04, interior);
    quad(0, 1, openHi - 0.45, openHi, 0.08, interior, true);
    quad(0, 1, openLo, openHi - 0.45, 0.08, mesh);
    const bays = Math.max(1, Math.round(len / 6));
    for (let k = 0; k <= bays; k++) {
      const u = k / bays, w = 0.22 / len;
      quad(Math.max(0, u - w), Math.min(1, u + w), openLo, openHi, 0.12, concreteShade);
    }
  });

  // The lot: rows of stalls parallel to the long east edge, with parked cars.
  const east = plan.reduce((best, p, i) => {
    const q = plan[(i + 1) % plan.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return len > best.len ? { p, q, len } : best;
  }, { p: plan[0], q: plan[1], len: 0 });
  const ux = (east.q[0] - east.p[0]) / east.len, uz = (east.q[1] - east.p[1]) / east.len;
  // Inward (left of the edge) is (-uz, ux) for a positive-area plan.
  const at = (u: number, v: number): P2 => [east.p[0] + u * ux - v * uz, east.p[1] + u * uz + v * ux];
  const inside = (u: number, v: number) => pointInRing(...at(u, v), plan);
  const flat = (u0: number, u1: number, v0: number, v1: number) => {
    const p = (u: number, v: number) => { const [x, z] = at(u, v); return [x, lot + 0.03, z]; };
    s.body.quad(p(u0, v0), p(u0, v1), p(u1, v1), p(u1, v0), stripe);
  };
  // A parked car as a 14-triangle block (sides, roof, a dark cabin panel): at City's
  // 150 m minimum orbit a modelled sedan reads the same and costs four times as much.
  const carBlock = (u: number, v: number, paint: string) => {
    const p = (du: number, dv: number, y: number) => { const [x, z] = at(u + du, v + dv); return [x, lot + y, z]; };
    const hw = 0.9, hl = 2.25, h = 1.25;
    const c = [p(-hw, -hl, 0.05), p(hw, -hl, 0.05), p(hw, hl, 0.05), p(-hw, hl, 0.05)];
    const t = [p(-hw, -hl, h), p(hw, -hl, h), p(hw, hl, h), p(-hw, hl, h)];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; s.body.quad(c[i], t[i], t[j], c[j], paint); }
    s.body.quad(t[0], t[3], t[2], t[1], paint);
    s.body.quad(p(-0.8, -0.9, h + 0.02), p(-0.8, 1.1, h + 0.02), p(0.8, 1.1, h + 0.02), p(0.8, -0.9, h + 0.02), '#2c3236');
  };
  const paints = ['#8e9898', '#cbc5b6', '#2f3438', '#8a5a4e', '#5f7280'];
  let car = 0;
  for (const [row, v] of [3.2, 8.6, 15.2, 20.6, 27.2, 32.6].entries()) {
    for (let spot = 0, u = -30; u < east.len + 30; u += 2.7, spot++) {
      if (![[-1.35, -2.5], [1.35, -2.5], [1.35, 2.5], [-1.35, 2.5]].every(([du, dv]) => inside(u + du, v + dv))) continue;
      // One stripe serves both stalls of a back-to-back pair of rows.
      // It runs on into the second row only where its far end is still on the roof.
      if (row % 2 === 0) flat(u - 1.35, u - 1.21, v - 2.45, inside(u, v + 5.4) && inside(u - 1.35, v + 7.85) && inside(u - 1.21, v + 7.85) ? v + 7.85 : v + 2.45);
      else if (!inside(u, v - 5.4)) flat(u - 1.35, u - 1.21, v - 2.45, v + 2.45);
      // About two in five stalls taken, spread over every row (illustrative occupancy).
      if (((seed >>> ((spot + row) % 24)) + spot * 7 + row * 3) % 5 >= 2 || car >= 16) continue;
      car++;
      carBlock(u, v, paints[(spot + row) % paints.length]);
    }
  }
  // The drawn ground rose through the asphalt, so it is cut below the lot under the whole outline,
  // one convex triangle at a time. City carves these as it builds the ground, before streets are
  // draped: 30 cm down, so a street ribbon running into the outline ends under the asphalt.
  const corners = plan.map(([x, z]) => new Vector2(x, z));
  const yields: GroundYield[] = ShapeUtils.triangulateShape(corners, []).flatMap(face => {
    const ring = face.map(i => [plan[i][0] + origin[0], plan[i][1] + origin[1]] as P2);
    const [[ax, az], [bx, bz], [cx, cz]] = ring;
    if (Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) < 0.02) return [];
    return [{ ring, floor: () => lot - grid.manifest.vertical.sceneZeroNavd88M - 0.3 }];
  });
  // OSM also maps the aisles on the lot, as bridge-tagged service ways. The skin is the lot, so City
  // leaves them out rather than draw road ribbons across it.
  const ring = site.rings[0];
  const onLot = ([x, z]: P2) => pointInRing(x, z, ring) || ring.some(([ax, az], i) => {
    const [bx, bz] = ring[(i + 1) % ring.length], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz) < 2;
  });
  const ownDrive = (road: { cls: string; bridge?: boolean; pts: readonly number[][] }) =>
    road.cls === 'service' && !!road.bridge && road.pts.every(q => onLot(q as P2));
  return { ...s.finish('#f1ead6', 0.6), yields, ownDrive };
}
