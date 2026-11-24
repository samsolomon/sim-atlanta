import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const ellisHotelId = 'd6a94661-795b-41d3-b43b-cf6860a51798';
export const ellisHotelRoof = 376.3; // 3DEP, NAVD88
export const ellisHotelTop = 386.3;
const origin: P2 = [346.45, -486.59];
const east: P2 = [21.43, 0.20];
const seed = seedOf(ellisHotelId);
const shaftBase = 338.6;
const crownBase = 368.1;
const corniceBase = 375.1;
const brick = '#875d48';
const alleyBrick = '#754f40';
const castStone = '#d9cbb7';
const trim = '#e8dac3';
const glass = ['#788387', '#79858b', '#859096'];

/** 176 Peachtree Street. Exterior and lidar evidence in docs/log/ui/ellis-hotel/. */
export function createEllisHotel(buildings: VBuilding[], grid: GroundGrid, quality: 'low' | 'high' = 'high') {
  const shell = landmarkShell(buildings, grid, ellisHotelId, 'Ellis Hotel',
    origin, east, [[0, 0], [-6, -5], [6, 5]]);
  if (!shell) return null;

  const area = shell.ring.reduce((sum, [x, z], i, ring) => {
    const [u, v] = ring[(i + 1) % ring.length];
    return sum + x * v - u * z;
  }, 0);
  const ring = area < 0 ? [...shell.ring].reverse() : shell.ring;
  const high = quality === 'high';

  ring.forEach((a, face) => {
    const b = ring[(face + 1) % ring.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 1) return;
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const peachtree = a[0] + b[0] > 16;
    const street = peachtree || a[1] + b[1] < -14;
    const south = a[1] + b[1] > 14;
    const at = (u: number, y: number, out: number) =>
      [a[0] + ux * u + uz * out, y, a[1] + uz * u - ux * out];
    const along = (u: number): P2 => [a[0] + ux * u, a[1] + uz * u];
    const panel = (lo: number, hi: number, y0: number, y1: number, out: number, color: string) =>
      shell.body.quad(at(lo, y0, out), at(lo, y1, out), at(hi, y1, out), at(hi, y0, out), color);
    const band = (y0: number, y1: number, out: number, color: string) =>
      panel(0, length, y0, y1, out, color);

    band(shell.base, shaftBase, 0, street ? castStone : alleyBrick);
    band(shaftBase, crownBase, 0, street ? brick : alleyBrick);
    band(crownBase, corniceBase, 0, street ? trim : alleyBrick);

    if (street) {
      for (const y of [shaftBase, crownBase]) band(y - 0.24, y + 0.16, 0.1, trim);
      const bays = peachtree ? 5 : 6;
      const pitch = length / bays;
      for (let i = 0; i < bays; i++) {
        const start = i * pitch;
        const left = along(start + pitch * 0.16);
        const right = along(start + pitch * 0.84);
        litFacade(shell, seed, face * 16 + i, left, right, shaftBase + 0.35, crownBase - 0.3,
          10, (pitch * 0.68) / 2, 0.86, 0.66, glass, 0.38);
        litFacade(shell, seed, 80 + face * 16 + i, left, right, crownBase + 0.5, corniceBase - 0.5,
          2, pitch * 0.68, 0.62, 0.64, glass, 0.43);
        if (i === 0) continue;
        panel(start - 0.15, start + 0.15, shaftBase, crownBase, 0.06, '#90634d');
        // The architect's dusk photo shows amber uplight pools along these piers.
        shell.lights.tri(at(start - 0.24, shaftBase + 0.12, 0.11),
          at(start + 0.24, shaftBase + 0.12, 0.11), at(start, shaftBase + 6.4, 0.11), '#8c5d44');
      }
      litFacade(shell, seed, 160 + face, a, b, 328.2, shaftBase - 0.45, 3,
        length / bays, 0.64, 0.7, glass, 0.58);
    } else if (south) {
      // Only the centre bay has paired sash on the party-wall elevation.
      litFacade(shell, seed, 170 + face, along(length * 0.41), along(length * 0.59),
        shaftBase + 0.3, corniceBase - 0.6, 12, length * 0.09, 0.76, 0.65, glass, 0.34);
    } else {
      litFacade(shell, seed, 170 + face, along(length * 0.18), along(length * 0.82),
        shaftBase + 0.3, corniceBase - 0.6, 12, length * 0.32, 0.64, 0.65, glass, 0.34);
    }
    if (!peachtree) return;

    const l = length * 0.12, r = length * 0.88;
    const deck = 332.25, rail = deck + 1.12, depth = 1.66;
    shell.body.quad(at(l, deck, 0), at(l, deck, depth), at(r, deck, depth), at(r, deck, 0), '#594a40');
    shell.body.quad(at(l, deck - 0.28, depth), at(l, deck, depth),
      at(r, deck, depth), at(r, deck - 0.28, depth), '#584940');
    shell.body.quad(at(l, rail - 0.09, depth), at(l, rail, depth), at(r, rail, depth),
      at(r, rail - 0.09, depth), '#544744');
    const postCount = high ? 14 : 7;
    for (let i = 0; i <= postCount; i++) {
      const u = l + (r - l) * i / postCount;
      panel(u - 0.055, u + 0.055, deck, rail, depth, '#5b504a');
    }
  });

  // Heavy bracketed cornice reduced to two profiles, carried by the four exterior walls.
  const ledge = (scale: number): P2[] => ring.map(([x, z]) => [x * scale, z * scale]);
  shell.prism(ledge(1.065), corniceBase - 0.15, 375.65, '#55483e', '#605347');
  shell.prism(ledge(1.1), 375.65, ellisHotelRoof, '#4d4036', '#827971');
  shell.prism([[-10.2,-9.1], [2.4,-9.1], [2.4,-5.2], [-6.4,-5.2], [-6.4,8.6], [-10.2,8.6]],
    ellisHotelRoof, 379.8, alleyBrick, '#877d71');
  shell.prism([[-5.5,-4.1], [2.5,-4.1], [2.5,2.4], [-5.5,2.4]], ellisHotelRoof, 382.4,
    '#89786a', '#877d71');
  shell.prism([[0,-3.8], [2.5,-3.8], [2.5,0.5], [0,0.5]], 382.4, ellisHotelTop,
    '#75655b', '#83786d');
  return shell.finish('#f2b46d', 0.57);
}
