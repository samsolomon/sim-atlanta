import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

export const atlanticHouseId = 'osm:way:505414294';
const SLAB = 'osm:way:505414295', CORE = 'osm:way:885777452', DECK = 'osm:way:885777449';
const DECK_WALLS = ['osm:way:1464967890', 'osm:way:1464967891', 'osm:way:1464967901', 'osm:way:1464967902', 'osm:way:1464967903'];
const origin: P2 = [392, -3560.5];

/**
 * Absolute heights (NAVD88 m) from the USGS GA Statewide B2 2018 lidar. Shell y is NAVD88.
 * The 8 m end bays stop at 388.1, the centre at 392.2, and the crown's piers reach 398.0.
 * The parking deck's tennis-court roof is 316.3, with its perimeter walls at 321.8.
 */
export const ATLANTIC_HOUSE = { ends: 388.1, roof: 392.2, crown: 398.0, deck: 316.3, deckWall: 321.8 } as const;

// Teal-grey glass backed by the architect's photographs, under the base-value table (S 26, V 62).
const glassTeal = '#75979e', spandrel = '#9aa9a8', stone = '#d8ccb6', balcony = '#9a9c98', concrete = '#c9c1b2', slot = '#3c4147',
  roofGrey = '#a19c92';

export function createAtlanticHouse(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts;
  const slab = parts?.find(p => p.id === SLAB), core = parts?.find(p => p.id === CORE);
  const deck = parts?.find(p => p.id === DECK), walls = parts?.filter(p => DECK_WALLS.includes(p.id)) ?? [];
  if (!parts || !slab || !core || !deck || walls.length !== DECK_WALLS.length) return null;
  const s = landmarkShell(buildings, grid, site.id, 'Atlantic House', origin, [1, 0], [[0, 0], [-20, -8], [-9, -40]]);
  if (!s) return null;
  const local = (ring: P2[]): P2[] => {
    const pts: P2[] = ring.map(([x, z]) => [x - origin[0], z - origin[1]]);
    const area = pts.reduce((sum, [x, z], i) => sum + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * z, 0);
    return area < 0 ? pts.reverse() : pts;
  };
  const H = ATLANTIC_HOUSE, base = s.base, seed = seedOf(atlanticHouseId), FLOOR = 3.2;

  // Slab tower on its mapped outline; the 19 m centre rises 4.1 m above the end bays.
  const tower = local(slab.rings[0]);
  const xs = tower.map(p => p[0]), zs = tower.map(p => p[1]);
  const [west, east, north, south] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  s.prism(tower, base, H.ends, glassTeal, roofGrey);
  s.prism(local(core.rings[0]), base, H.ends, stone, roofGrey);
  const centre: P2[] = [[-19, north], [19, north], [19, south], [-19, south]];
  s.prism(centre, H.ends, H.roof, glassTeal, roofGrey);

  const quad = (a: number[], b: number[], c: number[], d: number[], colour: string) => s.body.quad(a, b, c, d, colour);
  const box = (u0: number, u1: number, v0: number, v1: number, lo: number, hi: number, colour: string) => {
    quad([u0, lo, v0], [u0, hi, v0], [u1, hi, v0], [u1, lo, v0], colour);
    quad([u1, lo, v1], [u1, hi, v1], [u0, hi, v1], [u0, lo, v1], colour);
    quad([u0, lo, v1], [u0, hi, v1], [u0, hi, v0], [u0, lo, v0], colour);
    quad([u1, lo, v0], [u1, hi, v0], [u1, hi, v1], [u1, lo, v1], colour);
  };

  // Broad faces: five stone pilasters with four balcony stacks between them.
  const stacks = 4, bay = (east - west) / stacks, lo = base + 4;
  for (const [face, out] of [[north, -1], [south, 1]] as const) {
    const v = face + out * 0.2;
    for (let k = 0; k <= stacks; k++) {
      const u = west + k * bay, w = k === 0 || k === stacks ? 0.9 : 0.6;
      const top = Math.abs(u) < 19.5 ? H.roof : H.ends;
      quad([u - w, base, v], [u - w, top + 0.6, v], [u + w, top + 0.6, v], [u + w, base, v], stone);
    }
    {
      for (let k = 0; k < stacks; k++) {
        const u = west + (k + 0.5) * bay, top = Math.abs(u) < 19 ? H.roof - 3 : H.ends - 3;
        box(u - 2, u + 2, Math.min(face, face + out * 1.7), Math.max(face, face + out * 1.7), lo + 6, top, balcony);
      }
    }
    // A slab edge at every floor line across the glass.
    for (let y = H.deck + FLOOR; y < H.ends - 1; y += FLOOR) {
      quad([west, y - 0.22, face + out * 0.1], [west, y + 0.22, face + out * 0.1], [east, y + 0.22, face + out * 0.1], [east, y - 0.22, face + out * 0.1], spandrel);
    }
  }
  // Narrow ends: stone corners and one central balcony stack.
  for (const [u, out] of [[west, -1], [east, 1]] as const) {
    for (const v of [north + 1, south - 1]) {
      quad([u + out * 0.2, base, v - 1], [u + out * 0.2, H.ends + 0.6, v - 1], [u + out * 0.2, H.ends + 0.6, v + 1], [u + out * 0.2, base, v + 1], stone);
    }
    box(Math.min(u, u + out * 1.7), Math.max(u, u + out * 1.7), -2.5, 2.5, lo + 6, H.ends - 3, balcony);
  }

  // Crown: stone piers along both broad faces of the centre, and a stone band round the ends.
  for (const [face, out] of [[north, -1], [south, 1]] as const) {
    const v = face + out * 0.25;
    for (let k = 0; k <= 6; k++) {
      const u = -19 + k * (38 / 6);
      quad([u - 0.9, H.roof, v], [u - 0.9, H.crown, v], [u + 0.9, H.crown, v], [u + 0.9, H.roof, v], stone);
    }
    quad([-19, H.roof, v], [-19, H.roof + 1.4, v], [19, H.roof + 1.4, v], [19, H.roof, v], stone);
    for (const [u0, u1] of [[west, -19], [19, east]]) {
      quad([u0, H.ends, v], [u0, H.ends + 1.6, v], [u1, H.ends + 1.6, v], [u1, H.ends, v], stone);
    }
  }

  // Parking deck: precast to the tennis-court roof, its perimeter walls above, an open band per level.
  const outer = local(deck.rings[0]);
  s.prism(outer, base, H.deck, concrete, '#7d8f6e');
  for (const part of walls) s.prism(local(part.rings[0]), H.deck, H.deckWall, concrete, roofGrey);
  const dx = outer.map(p => p[0]), dz = outer.map(p => p[1]);
  const [d0, d1, dn] = [Math.min(...dx) - 0.06, Math.max(...dx) + 0.06, Math.min(...dz) - 0.06];
  for (let y = H.deck - 2.2; y > base + 3; y -= 3.4) {
    quad([d0, y, dn], [d0, y + 1.4, dn], [d1, y + 1.4, dn], [d1, y, dn], slot);
    quad([d0, y, south - 0.5], [d0, y + 1.4, south - 0.5], [d0, y + 1.4, dn], [d0, y, dn], slot);
    quad([d1, y, dn], [d1, y + 1.4, dn], [d1, y + 1.4, south - 0.5], [d1, y, south - 0.5], slot);
  }

  // Residential windows: about two in five units either side of each pilaster are lit.
  const lit = (a: number[], b: number[], y: number) =>
    s.lights.quad([a[0], y, a[1]], [a[0], y + 2.4, a[1]], [b[0], y + 2.4, b[1]], [b[0], y, b[1]], glassTeal);
  ([[north, -1], [south, 1]] as const).forEach(([face, out], side) => {
    const v = face + out * 0.06;
    for (let floor = 0, y = H.deck + 1; y + 3 < H.ends; floor++, y += FLOOR) {
      for (let k = 0; k <= stacks; k++) {
        if (litHash(seed, side, floor, k) >= 0.4) continue;
        const u = west + k * bay;
        const a = k === 0 ? u + 0.3 : u - bay / 2 + 2.2, b = k === stacks ? u - 0.3 : u + bay / 2 - 2.2;
        if (out < 0) lit([b, v], [a, v], y); else lit([a, v], [b, v], y);
      }
    }
  });
  // The rooftop club floor glows warm behind the crown piers (dusk photograph).
  for (const [face, out] of [[north, -1], [south, 1]] as const) {
    const v = face + out * 0.1;
    lit(out < 0 ? [19, v] : [-19, v], out < 0 ? [-19, v] : [19, v], H.roof - 3.2);
  }
  return s.finish('#f6dcae', 0.7);
}
