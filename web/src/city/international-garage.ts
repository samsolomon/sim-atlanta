import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { seedOf } from './skin-kit';

/**
 * International Garage, Peachtree Center: the buff precast parking deck at the south-west
 * corner of Andrew Young International Boulevard and Peachtree Center Avenue. Continuous
 * horizontal spandrels run round it, with deep open slots between them where the dark steel
 * columns and the ceiling lights show. Shops with dark storefronts fill the ground floor at
 * the corner, and a plain panelled base runs west along International Boulevard.
 *
 * The April 2019 lidar puts the top deck at NAVD88 337-339 (p50 19.0 m, p95 20.1 m above the
 * ring ground, against a mapped 22.5 m), with a lift core near the west wall reaching 341.
 * That is a shop storey and five parking levels. The west wall is shared with two lower
 * neighbours (0.0 m² overlap). Where a neighbour stands taller than the deck, its wall is left
 * plain.
 *
 * Sources (Google Street View, Mar 2025): the corner from International Boulevard at heading
 * 225, https://www.google.com/maps/@33.7596901,-84.3860597,3a,90y,225h,108t; the north face
 * mid-block at heading 180, https://www.google.com/maps/@33.7596884,-84.3864737,3a,90y,180h,108t;
 * and the same deck through a Peachtree Center window, Aug 2018. No usable night photograph
 * was found, so the night look is estimated. Fluorescent ceiling strips show in the slots by
 * day, so the slots glow at night. Estimated: level heights (from the lidar top), column
 * spacing (about 9 m), the extent of the shops, and the roof's parked cars (illustrative).
 * Shop signs are not drawn.
 */
export const internationalGarageId = 'b42101fd-fa53-41f3-aad1-67222e3b84f9';

// NAVD88 metres.
const shopsTop = 323.9,
  level = 2.85,
  levels = 5,
  roof = shopsTop + levels * level, // 338.15
  parapet = roof + 1.0,
  coreTop = 341.4;

const precast = '#cdb995',
  precastShade = '#b9a681',
  column = '#34404c',
  interior = '#383b3d',
  storefront = '#3b4850',
  roofDeck = '#a39e93',
  stripe = '#dcd8cc';

export function createInternationalGarage(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [471, -614];
  const s = landmarkShell(buildings, grid, internationalGarageId, 'International Garage', origin, [1, 0], [[0, 0], [20, 0], [-20, 0]]);
  if (!s) return null;
  const seed = seedOf(internationalGarageId);
  const groundAt = (x: number, z: number) => grid.sample(x + origin[0], z + origin[1]) ?? 319.1;

  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();
  s.prism(plan, s.base, roof, precast, roofDeck);

  // Neighbours sharing a wall: a party wall is plain where the neighbour rises past the deck.
  const near = buildings.filter(b => b.id !== internationalGarageId && b.rings[0]?.some(([x, z]) => Math.abs(x - origin[0]) < 80 && Math.abs(z - origin[1]) < 80));
  const sharer = ([x, z]: P2) => near.filter(b => b.rings[0].some(([u, v]) => Math.hypot(u - x - origin[0], v - z - origin[1]) < 0.05));
  const tallNeighbour = (a: P2, b: P2) => sharer(a).some(n => sharer(b).includes(n) &&
    Math.min(...n.rings[0].map(([x, z]) => grid.sample(x, z) ?? 319)) + (n.h ?? 0) >= roof);

  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 2 || tallNeighbour(a, b)) return;
    const nx = dz / len, nz = -dx / len;
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // Street faces: Peachtree Center Avenue (east, +x) and International Boulevard (north, -z).
    const mid: P2 = [(a[0] + b[0]) / 2 + origin[0], (a[1] + b[1]) / 2 + origin[1]];
    const east = nx > 0.7, north = nz < -0.7;
    const shops = east || (north && mid[0] > 478);

    // Ground storey: shopfronts between precast piers at the corner, a panelled base elsewhere.
    if (shops) {
      quad(0, 1, s.base, shopsTop, 0.04, precast);
      const bays = Math.max(1, Math.round(len / 6));
      for (let k = 0; k < bays; k++) quad((k + 0.12) / bays, (k + 0.88) / bays, groundAt(...([a[0] + (k + 0.5) / bays * dx, a[1] + (k + 0.5) / bays * dz] as P2)) + 0.4, shopsTop - 1.0, 0.09, storefront, true);
    } else {
      quad(0, 1, s.base, shopsTop, 0.04, precastShade);
    }
    // Parking levels: an open slot behind each spandrel, with the ceiling lights and columns.
    for (let k = 0; k < levels; k++) {
      const slab = shopsTop + k * level, next = slab + level;
      // Layers stand clear of the prism wall (at 0) and of each other, or they z-fight from orbit.
      quad(0, 1, slab + 0.9, next - 0.25, 0.04, interior);
      quad(0, 1, next - 0.6, next - 0.25, 0.08, interior, true);
      quad(0, 1, next - 0.25, next + 0.9, 0.2, precast);
    }
    quad(0, 1, shopsTop - 0.25, shopsTop + 0.9, 0.2, precast);
    // The top spandrel is the roof parapet: cap and inner face.
    s.body.quad(at(0, parapet - 0.1, -0.25), at(0, parapet - 0.1, 0.2), at(1, parapet - 0.1, 0.2), at(1, parapet - 0.1, -0.25), precastShade);
    quad(1, 0, roof, parapet - 0.1, -0.25, precastShade);
    const cols = Math.max(1, Math.round(len / 9));
    for (let k = 1; k < cols; k++) {
      const u = k / cols, w = 0.25 / len;
      quad(u - w, u + w, shopsTop + 0.9, roof - 0.25, 0.12, column);
    }
  });

  // Lift core at the west wall (lidar 341).
  const core: P2[] = [[-30.2, -9], [-24.5, -9], [-24.5, -19], [-30.2, -19]];
  if (core.every(([x, z]) => pointInRing(x, z, plan))) s.prism(core, roof, coreTop, precastShade, roofDeck);

  // The roof deck: three back-to-back pairs of stall rows, running east-west, with aisles between.
  const flat = (x0: number, x1: number, z0: number, z1: number, c: string) =>
    s.body.quad([x0, roof + 0.03, z0], [x0, roof + 0.03, z1], [x1, roof + 0.03, z1], [x1, roof + 0.03, z0], c);
  const car = (x: number, z: number, paint: string) => {
    const hw = 0.9, hl = 2.25, h = 1.25;
    const c = [[x - hw, roof + 0.05, z - hl], [x + hw, roof + 0.05, z - hl], [x + hw, roof + 0.05, z + hl], [x - hw, roof + 0.05, z + hl]];
    const t = c.map(([px, , pz]) => [px, roof + h, pz]);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; s.body.quad(c[i], t[i], t[j], c[j], paint); }
    s.body.quad(t[0], t[3], t[2], t[1], paint);
    s.body.quad([x - 0.8, roof + h + 0.02, z - 0.9], [x - 0.8, roof + h + 0.02, z + 1.1], [x + 0.8, roof + h + 0.02, z + 1.1], [x + 0.8, roof + h + 0.02, z - 0.9], '#2c3236');
  };
  const paints = ['#8e9898', '#cbc5b6', '#2f3438', '#8a5a4e', '#5f7280'];
  let cars = 0;
  for (const [row, zc] of [-18, -12.6, -2.7, 2.7, 12.6, 18].entries()) {
    for (let x = -22, spot = 0; x <= 28; x += 2.7, spot++) {
      if (![[x - 1.35, zc - 2.5], [x + 1.35, zc + 2.5]].every(([px, pz]) => pointInRing(px, pz, plan))) continue;
      if (row % 2 === 0) flat(x - 1.35, x - 1.21, zc - 2.45, zc + 7.85, stripe);
      if (((seed >>> ((spot + row) % 24)) + spot * 5 + row * 7) % 4 !== 0 || cars >= 10) continue;
      cars++;
      car(x, zc, paints[(spot + row) % paints.length]);
    }
  }
  return s.finish('#f2ecd8', 0.6);
}
