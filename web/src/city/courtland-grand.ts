import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

// The Courtland Grand hotel, 165 Courtland Street: the 1965 motor hotel, refaced
// in 1998 and renovated in 2025, with 763 rooms in two towers over a podium.
// - South slab (Ellis Street): cream, with continuous scalloped balconies on
//   every floor over blue-grey window frames.
// - North tower: pale panels with bands of reflective blue glass between white
//   floor bands, and a taller section near the arrival court.
// - Podium: smooth grey stucco between the towers, holding the glass-roofed
//   courtyard pool.
// - Arrival court: the north-west curve in the footprint, with a flat box canopy
//   (2025) that replaced the 2000s tent.
// Heights are NAVD88, from the 2019 lidar over the 309.1 m ring ground: podium
// about 11 m, south slab 31 m, north tower 29 m rising to 34 m. The mapped
// 40.9 m is a single generic height for the whole block. Bay widths, wave
// pitch and the canopy are estimated from photographs (see docs/courtland-grand.md).

export const courtlandGrandId = 'c3d66433-c80f-417c-9093-c623624b208b';
const CREAM = '#e6dcc6', STUCCO = '#c4c3bd', PANEL = '#dcdcd6', GLASS = '#7f9aae', FRAME = '#8296a8';
const BAND = '#f1f1ec', ROOF = '#8f8d87', SKY = '#9fb3b8';

export function createCourtlandGrand(buildings: VBuilding[], grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, courtlandGrandId, 'Courtland Grand hotel', [767, -565], [1, 0],
    [[0, 0], [-60, 40], [60, -40], [-30, 30]]);
  if (!s) return null;
  const { body, lights } = s;
  const g = s.base + .35, seed = seedOf(courtlandGrandId);
  const PODIUM = g + 11, SLAB = g + 31, NORTH = g + 29, NORTH_HIGH = g + 34;
  // Local frame: u = x − 767, v = z + 565 (v grows south).
  s.prism(s.ring, s.base, PODIUM, STUCCO, ROOF);

  /** Glass between floor bands on a straight wall from a to b of the block centred at c, lamps by litHash. */
  function bands(a: P2, b: P2, c: P2, lo: number, hi: number, floors: number, face: number, glass: string, band: string, occ: number) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    // The wall's normal, turned to face away from the block's centre.
    const m = [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1]], sign = Math.sign(-dz * m[0] + dx * m[1]) || 1;
    const p = (t: number, y: number, o: number) => [a[0] + dx * t - dz * o * sign, y, a[1] + dz * t + dx * o * sign];
    const pitch = (hi - lo) / floors, bays = Math.max(1, Math.round(len / 3.6));
    body.quad(p(0, lo, .06), p(0, hi, .06), p(len, hi, .06), p(len, lo, .06), glass);
    for (let j = 0; j <= floors; j++) {
      const y = lo + j * pitch;
      body.quad(p(0, y - .55, .1), p(0, y + .35, .1), p(len, y + .35, .1), p(len, y - .55, .1), band);
      if (j < floors) for (let i = 0; i < bays; i++)
        if (litHash(seed, face, j, i) < occ)
          lights.quad(p((i + .1) * len / bays, y + .5, .12), p((i + .1) * len / bays, y + pitch - .7, .12),
            p((i + .9) * len / bays, y + pitch - .7, .12), p((i + .9) * len / bays, y + .5, .12), glass);
    }
  }

  // South slab along Ellis: u −68.5…20, v 25…50.4 (the mapped Ellis edge runs v 50.5–51.8).
  const slab: P2[] = [[-68.5, 25], [20, 25], [20, 50.4], [-68.5, 50.4]];
  s.prism(slab, PODIUM, SLAB, CREAM, ROOF); // grey membrane like the podium; no photo shows a dark roof
  // Its north (courtyard) face and the two ends: windows in cream bands.
  bands([20, 25], [-68.5, 25], [-24, 37.7], PODIUM, SLAB - 1, 7, 0, FRAME, CREAM, .3);
  bands([-68.5, 25], [-68.5, 50.4], [-24, 37.7], PODIUM, SLAB - 1, 7, 1, FRAME, CREAM, .3);
  bands([20, 50.4], [20, 25], [-24, 37.7], PODIUM, SLAB - 1, 7, 2, FRAME, CREAM, .3);
  // The Ellis face: blue-grey frames behind continuous scalloped balconies on every floor.
  bands([-68.5, 50.4], [20, 50.4], [-24, 37.7], PODIUM, SLAB - 1, 7, 3, FRAME, CREAM, .3);
  const pitch = (SLAB - 1 - PODIUM) / 7, wave = 3.6;
  for (let j = 1; j <= 7; j++) {
    const y = PODIUM + j * pitch - .1;
    for (let u = -68.5; u < 20 - .01; u += wave / 2) {
      // A two-segment wave per bay: out to 1.6 m at mid-bay, back to 0.4 m at the piers.
      const out = (k: number) => 50.4 + ((Math.round((u + k * wave / 2 + 68.5) / (wave / 2)) % 2) ? 1.6 : .4);
      const [u0, u1] = [u, Math.min(20, u + wave / 2)], [o0, o1] = [out(0), out(1)];
      body.quad([u0, y - .35, o0], [u0, y, o0], [u1, y, o1], [u1, y - .35, o1], CREAM);
      body.quad([u0, y, 50.46], [u0, y, o0], [u1, y, o1], [u1, y, 50.46], CREAM);
    }
  }

  // North tower on the mapped stepped north edge: v −51.5 west of u −6.9, v −44.4 east of it.
  const north: P2[] = [[-23.6, -51.5], [-6.9, -51.5], [-6.9, -44.4], [68.8, -44.4], [68.8, -25], [-23.6, -25]];
  s.prism(north, PODIUM, NORTH, PANEL, ROOF);
  north.forEach((a, i) => {
    const b = north[(i + 1) % north.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 3) bands(a, b, [22.6, -36], PODIUM, NORTH - 1, 6, 4 + i, GLASS, BAND, .3);
  });
  // Its taller section, behind the arrival court (lidar 34 m).
  const high: P2[] = [[-19, -44], [11, -44], [11, -32], [-19, -32]];
  s.prism(high, NORTH, NORTH_HIGH, PANEL, ROOF);
  bands([-19, -44], [11, -44], [-4, -38], NORTH, NORTH_HIGH - .5, 1, 12, GLASS, BAND, .3);
  bands([-19, -32], [-19, -44], [-4, -38], NORTH, NORTH_HIGH - .5, 1, 13, GLASS, BAND, .3);

  // The glass-roofed courtyard pool in the podium.
  s.prism([[3, -12], [43, -12], [43, 18], [3, 18]], PODIUM, PODIUM + 1.6, SKY, SKY);
  lights.quad([4, PODIUM + 1.66, -11], [42, PODIUM + 1.66, -11], [42, PODIUM + 1.66, 17], [4, PODIUM + 1.66, 17], '#cfe0dc');

  // The 2025 box canopy at the arrival court, on its column, with downlit soffit.
  s.prism([[-29, -23], [-24, -23], [-24, -17], [-29, -17]], g + 5, g + 6.4, '#2f3134', '#3a3c3f'); // inner end inside the curved wall
  s.prism([[-28.4, -21.3], [-27.8, -21.3], [-27.8, -20.7], [-28.4, -20.7]], g, g + 5, '#d9d9d4', '#d9d9d4');
  lights.quad([-29, g + 4.94, -23], [-24, g + 4.94, -23], [-24, g + 4.94, -17], [-29, g + 4.94, -17], '#fff1d6');
  return s.finish('#ffe0b0', .7);
}
