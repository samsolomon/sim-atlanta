import { surfaces } from '../materials';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { classicalOrnament } from './classical-ornament';
import { landmarkShell } from './landmark-shell';

// Broad Street runs along v=0, from Marietta (u=0) to Walton (u=62.5).
export function createEmpireBuilding(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(
    buildings,
    grid,
    '06942e29-e032-4d6b-a30f-7e1f4bc9f2a4',
    'Empire Building — Robinson College',
    [119.6, -118.43],
    [47.5, -40.72],
    [
      [1, 1],
      [61, 1],
      [61, 23],
      [1, 23],
    ],
  );
  if (!s) return null;
  const { body, lights, prism } = s;
  const stone = '#cdc1ab',
    buff = '#b99c77',
    shade = '#998a75',
    glass = '#4b4d50';
  const trim = classicalOrnament(s, { stone, shade, limestone: stone, joint: '#aa9d86' });
  const rect = (u: number, v: number, w: number, d: number): P2[] => [
    [u, v],
    [u + w, v],
    [u + w, v + d],
    [u, v + d],
  ];
  const width = 62.5,
    depth = 24.4;
  const basePlan = rect(0, 0, width, depth);
  prism(s.ring, s.base, 334.7, stone, '#a79e8d', { wall: surfaces.limestone({ course: 0.72 }) });
  trim.band(basePlan, 333.8, 334.7, 0.48);
  // Two light courts on the back of the block reach different low roofs.
  const shaft: P2[] = [
    [0, 0],
    [width, 0],
    [width, depth],
    [48, depth],
    [48, 12],
    [36, 12],
    [36, depth],
    [19, depth],
    [19, 13],
    [13, 13],
    [13, depth],
    [0, depth],
  ];
  prism(shaft, 334.7, 375.1, buff, '#aaa598', {
    wall: surfaces.brick({ colour: 'buff' }),
    roof: surfaces.asphaltRoof(),
  });
  prism(rect(13, 13, 6, 11.4), 334.7, 345, buff, '#aaa598');
  for (const [u, v, w, d, y] of [
    [12, 6, 23, 6, 381],
    [19, 12, 16, 5, 381],
    [20, 6, 6, 11, 384],
    [20, 18, 15, 6, 377.4],
    [51, 14, 5, 5, 379.7],
  ]) {
    prism(rect(u, v, w, d), 375.1, y, '#a59985', '#b2ada4');
  }
  for (const y of [364.6, 371.2, 374.9]) trim.band(shaft, y, y + 0.28, 0.25);
  function elevation(a: P2, t: P2, n: P2, length: number, bays: number, openings: string, door: number) {
    const at = (x: number, y: number, d: number) => [a[0] + t[0] * x + n[0] * d, y, a[1] + t[1] * x + n[1] * d];
    function panel(l: number, r: number, lo: number, hi: number, d: number, c: string, lit = false) {
      (lit ? lights : body).quad(at(l, lo, d), at(r, lo, d), at(r, hi, d), at(l, hi, d), c);
    }
    // Eleven stories of paired sash sit between buff piers. The top three
    // floors share the upper belt courses, recorded in the preservation survey.
    const pitch = length / bays,
      floor = (374.8 - 334.9) / 11;
    for (let j = 0; j < bays; j++) {
      const x = (j + 0.5) * pitch;
      for (let row = 0; row < 11; row++) {
        const lo = 335.55 + row * floor;
        for (const side of [-1, 1]) {
          const c = x + side * pitch * 0.18;
          panel(
            c - pitch * 0.16,
            c + pitch * 0.16,
            lo,
            lo + floor * 0.72,
            0.12,
            glass,
            ((j + 1) * 13 + row * 7 + side * 3) % 23 === 0,
          );
        }
      }
    }
    const spacing = length / openings.length;
    for (let i = 0; i < openings.length; i++) {
      const c = (i + 0.5) * spacing,
        r = spacing * 0.34,
        kind = openings[i];
      const [u, , v] = at(c, 0, 0),
        norm = Math.hypot(47.5, 40.72);
      const grade = grid.sample(119.6 + (47.5 * u + 40.72 * v) / norm, -118.43 + (-40.72 * u + 47.5 * v) / norm);
      if (grade === null) continue;
      const lo = i === door ? grade : grade + 1.35,
        spring = 327.5;
      panel(c - r, c + r, lo, spring, 0.14, kind === 'n' ? shade : glass);
      if (i === door) {
        // Shutze's stone surround frames a pair of bronze doors. Only the
        // small upper lights of each leaf catch the banking hall's warm light.
        panel(c - r, c + r, lo, 326.65, 0.21, stone);
        for (const sign of [-1, 1]) {
          const mid = c + sign * r * 0.32;
          panel(mid - r * 0.3, mid + r * 0.3, lo, lo + 3.05, 0.24, '#493b32');
          panel(mid - r * 0.22, mid + r * 0.22, lo + 1.45, lo + 2.75, 0.26, '#85705c', true);
        }
      } else if (kind !== 'n') {
        panel(c - 0.075, c + 0.075, lo, spring, 0.21, '#8f8575');
        panel(c - r, c + r, spring - 0.38, spring - 0.27, 0.21, '#8f8575');
      }
      if (kind === 'a' || kind === 'n') {
        for (let j = 0; j < 8; j++) {
          const arc = (k: number, rad: number, d: number) =>
            at(c + Math.cos((k * Math.PI) / 8) * rad, spring + Math.sin((k * Math.PI) / 8) * rad, d);
          body.tri(at(c, spring, 0.14), arc(j, r, 0.14), arc(j + 1, r, 0.14), kind === 'n' ? shade : glass);
          body.quad(
            arc(j, r, 0.28),
            arc(j, r + 0.46, 0.28),
            arc(j + 1, r + 0.46, 0.28),
            arc(j + 1, r, 0.28),
            j % 2 ? stone : '#baac95',
          );
        }
        for (const side of [-1, 1]) {
          const x = c + side * (r + 0.22);
          for (let course = 0; course < 5; course++) {
            const y = lo + (course * (spring - lo)) / 5;
            panel(x - 0.34, x + 0.34, y, y + (spring - lo) / 5 - 0.08, 0.29, stone);
          }
        }
        if (kind === 'a') {
          body.tri(at(c - r, 327, 0.38), at(c + r, 327, 0.38), at(c, 328.1, 0.38), '#b4a48b');
          panel(c - r, c + r, 326.7, 327, 0.4, stone);
        }
      }
      if (kind !== 'n') panel(c - r * 0.78, c + r * 0.78, 331.1, 333.2, 0.12, glass);
    }
  }
  elevation([0, 0], [1, 0], [0, -1], width, 15, 'narrraaarrran', 5);
  elevation([0, 0], [0, 1], [-1, 0], depth, 6, 'naaan', 3);
  elevation([width, 0], [0, 1], [1, 0], depth, 6, 'naran', 1);
  return s.finish('#f6ddb6', 0.52);
}
