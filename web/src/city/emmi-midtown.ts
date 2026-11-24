import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const emmiMidtownId = 'osm:way:269542143';
const origin: P2 = [259.7, -4355];

// Local plans (x east, z south). The L-shaped tower holds Spring Street (west)
// and 18th Street (north); the southeast corner is the parking podium.
const tower: P2[] = [
  [-22.3, -19.5], [20.3, -19.5], [20.3, -15.4], [22.4, -15.4], [22.4, 2.0],
  [20.3, 2.0], [20.3, 4.8], [-2.3, 4.8], [-2.3, 19.6], [-22.3, 19.6],
];
const podium: P2[] = [[-2.3, 4.8], [20.3, 4.8], [20.3, 19.4], [-2.3, 19.6]];

const frame = '#3e454c',
  glassSpring = '#8eafc4',
  glassNorth = '#7899b0',
  letter = '#3d454c',
  slab = '#d9d9d4',
  deck = '#bdb7aa',
  roof = '#8e8c87',
  screen = '#4a5055',
  fin = '#cfcfc9';

/**
 * Emmi Midtown (2024, 31 floors, RJTR): a blue curtain-wall L whose dark
 * spandrel panels stagger across the glass, with a balcony stack on the
 * Spring Street wing's south end and a pool deck on the garage podium.
 */
export function createEmmiMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Emmi Midtown', origin, [1, 0],
    [[-12, 0], [0, -12], [10, 12]]);
  if (!s) return null;
  const grade = s.base + 0.35;
  const lobby = grade + 5.6,
    floors = 30,
    pitch = 3.17,
    top = lobby + floors * pitch, // ≈ 100.7 m
    parapet = grade + 102.3,
    podiumTop = grade + 36;
  const random = rng(1405);

  s.prism(tower, s.base, lobby, '#5d7385', roof);
  s.prism(tower, lobby, top, glassSpring, roof);
  s.prism(tower, top, parapet, frame, roof);
  s.body.box(14, 3.2, 9, -12, parapet + 1.6, -8, '#77787a');
  // Garage podium: dark louvre screen between pale fins, pool deck on top.
  s.prism(podium, s.base, podiumTop, screen, deck);
  s.body.quad([2, podiumTop + 0.06, 8], [2, podiumTop + 0.06, 13], [15, podiumTop + 0.06, 13], [15, podiumTop + 0.06, 8], '#4d98ad');

  const ring = (plan: P2[], draw: (a: P2, b: P2, len: number, i: number) => void) =>
    plan.forEach((a, i) => {
      const b = plan[(i + 1) % plan.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 1) draw(a, b, len, i);
    });

  // Podium: pale fins over the louvres, a frame band at the deck edge.
  ring(podium, (a, b, len, i) => {
    if (i === 0 || i === 3) return; // shared with the tower
    const dx = b[0] - a[0], dz = b[1] - a[1], nx = dz / len, nz = -dx / len;
    const at = (t: number, y: number, out = 0.06) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
    const quad = (l: number, r: number, lo: number, hi: number, c: string) =>
      s.body.quad(at(l, lo), at(l, hi), at(r, hi), at(r, lo), c);
    const n = Math.round(len / 3.4);
    for (let k = 0; k <= n; k++) quad(k / n - 0.3 / len, k / n + 0.3 / len, grade, podiumTop, fin);
    quad(0, 1, podiumTop - 1.2, podiumTop, fin);
    quad(0, 1, grade + 4.2, grade + 4.8, fin);
  });

  // Tower: the Spring Street wing uses a 3.0 m mullion module, the 18th Street
  // wing a tighter 2.4 m one in darker glass. Each face carries frame lines
  // every two floors and staggered runs of dark panels (the "letters").
  ring(tower, (a, b, len, i) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], nx = dz / len, nz = -dx / len;
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + nx * out, y, a[1] + t * dz + nz * out];
    const quad = (l: number, r: number, lo: number, hi: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, lo, out), at(l, hi, out), at(r, hi, out), at(r, lo, out), c);
    const north = i <= 6; // the 18th Street wing
    // Faces over the podium start at its deck.
    const low = i === 6 || i === 7 ? Math.ceil((podiumTop - lobby) / pitch) : 0;
    const glass = north ? glassNorth : glassSpring;
    const module = north ? 2.4 : 3.0;
    const n = Math.max(1, Math.round(len / module));
    if (north) quad(0, 1, lobby, top, 0.04, glass);
    // South end of the Spring wing: a recessed balcony stack with pale slabs.
    const balconies = i === 8;
    if (balconies) quad(0.3, 0.7, lobby, top, 0.02, letter);
    for (let k = 0; k <= n; k++) {
      const w = (k === 0 || k === n ? 0.35 : 0.14) / len;
      quad(Math.max(0, k / n - w), Math.min(1, k / n + w), low ? lobby + low * pitch : grade, top, 0.08, frame);
    }
    for (let f = low + (low % 2); f <= floors; f += 2) {
      const y = lobby + f * pitch;
      quad(0, 1, y - 0.18, y + 0.18, 0.07, frame);
    }
    if (balconies) {
      for (let f = 1; f < floors; f++) {
        const y = lobby + f * pitch;
        quad(0.3, 0.7, y - 0.1, y + 0.12, 0.6, slab);
      }
    }
    // Dark panel runs: two or three floors tall, one module wide, staggered.
    if (len > 8 && !balconies) {
      for (let k = (i % 2); k < n; k += 2) {
        for (let f = low + 2 + ((k * 7 + i * 3) % 5); f < floors - 2; f += 9 + ((k + i) % 5)) {
          const h = 2 + ((k + f) % 2);
          quad(k / n + 0.14 / len, (k + 1) / n - 0.14 / len, lobby + f * pitch, lobby + (f + h) * pitch, 0.06, letter);
        }
      }
    }
    // Residential at night: lit units two modules wide, stable per building.
    for (let f = low; f < floors; f++) {
      for (let k = 0; k + 1 < n; k += 2) {
        if (random() > 0.24) continue;
        const y = lobby + f * pitch;
        quad(k / n + 0.14 / len, (k + 2) / n - 0.14 / len, y + 0.2, y + pitch - 0.2, 0.05, glass, true);
      }
    }
    // Lobby glazing glows along 18th Street and Spring Street.
    if (i === 0 || i === 9) quad(0.08, 0.92, grade + 0.3, lobby - 0.6, 0.05, '#5d7385', true);
  });

  // Spring Street entrance canopy (west face).
  s.body.box(5, 0.7, 8, -24.8, grade + 5.2, 0, frame);
  return s.finish('#f4d3a0', 0.62);
}
