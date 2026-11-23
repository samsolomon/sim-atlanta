/**
 * Siemens Airo corridor coach in Amtrak's east-coast scheme, for the model lab only: Airo does not
 * run on the Crescent. Envelope from the Siemens Airo data sheet; livery from Amtrak's promotional
 * renders (reference only, not committed) and the May 2026 Seattle delivery photo for proportions.
 * Generic look-alike: no wordmark, emblem or car numbers. See docs/crescent-stock.md.
 *
 * Local frame: +z forward, x across, y up from the railhead.
 */
import * as THREE from 'three';
import { Builder, loft } from './geom';

/** Data sheet: 85 ft long, 10 ft 6 in wide, 14.6 ft tall, floor 51 in, truck centres 59 ft 6 in. */
export const AIRO_LENGTH = 25.91;
export const AIRO_TRUCKS = 18.14;
/** Published overall height; the roof crown sits lower and HVAC housings reach this. */
export const AIRO_ROOF = 4.436;
const CROWN = 4.36;

const W = 1.6;
const C = {
  midnight: '#22325e',
  blue: '#3a6ea6',
  strip: '#121519',
  white: '#e9ecea',
  red: '#cc3a33',
  roof: '#c3c9cc',
  under: '#2a2e33',
  green: '#3fc49b',
  glass: '#2b3a46',
  frame: '#0c0e11',
};

export function airoCoach(b: Builder, windows: Builder, lamps: Builder, trailing: boolean) {
  const end = AIRO_LENGTH / 2 - 0.32;
  const ring = (z: number) => [
    [-1.45, 1.05, z],
    [1.45, 1.05, z],
    [W, 1.15, z],
    [W, 3.9, z],
    [W - 0.25, 4.24, z],
    [W - 0.7, 4.34, z],
    [0.5, CROWN, z],
    [-0.5, CROWN, z],
    [-W + 0.7, 4.34, z],
    [-W + 0.25, 4.24, z],
    [-W, 3.9, z],
    [-W, 1.15, z],
  ];
  const m = C.midnight,
    r = C.roof;
  loft(b, [ring(-end), ring(end)], [C.under, m, m, r, r, r, r, r, r, r, m, m], true, true, m);

  /** A flat polygon on both side sheets from [z, y] points, lifted `eps` off the paint below. */
  const side = (builder: Builder, pts: [number, number][], color: string, eps: number) => {
    for (const s of [-1, 1]) {
      const v = pts.map(([z, y]) => [s * (W + eps), y, z]);
      let area = 0;
      for (let i = 0; i < v.length; i++) area += v[i][2] * v[(i + 1) % v.length][1] - v[(i + 1) % v.length][2] * v[i][1];
      if ((s > 0) === area > 0) v.reverse();
      for (let i = 1; i < v.length - 1; i++) builder.tri(v[0], v[i], v[i + 1], color);
    }
  };
  const rect = (builder: Builder, z0: number, z1: number, y0: number, y1: number, color: string, eps: number) =>
    side(builder, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], color, eps);

  // Floor-level stripe: white over red, full length.
  rect(b, -end, end, 1.17, 1.31, C.red, 0.02);
  rect(b, -end, end, 1.31, 1.37, C.white, 0.02);

  // Two white diagonals frame the lighter blue mid-car panels. Both lean the same way, tops
  // shifted toward the rear, as in the renders (positions and lean estimated).
  const y0 = 1.37,
    y1 = 3.9,
    lean = -0.8,
    width = 0.22;
  const diag = (zBottom: number) => (y: number) => zBottom + (lean * (y - y0)) / (y1 - y0);
  const rear = diag(-8.9),
    front = diag(9.7);
  side(b, [[rear(y0) + width, y0], [front(y0), y0], [front(y1), y1], [rear(y1) + width, y1]], C.blue, 0.015);
  for (const d of [rear, front]) side(b, [[d(y0), y0], [d(y0) + width, y0], [d(y1) + width, y1], [d(y1), y1]], C.white, 0.025);

  // Continuous near-black window strip across the mid-car, with individual panes that light at night.
  const s0 = 2.26,
    s1 = 3.04;
  side(b, [[rear(s0) + width + 0.12, s0], [front(s0) - 0.12, s0], [front(s1) - 0.12, s1], [rear(s1) + width + 0.12, s1]], C.strip, 0.03);
  for (let i = 0; i < 9; i++) {
    const zc = -7.4 + i * 1.85;
    rect(windows, zc - 0.78, zc + 0.78, s0 + 0.06, s1 - 0.06, C.glass, 0.034);
  }

  // Door zones at both ends: plug door with a narrow window, class mark, and one window inboard.
  for (const sign of [-1, 1]) {
    const dz = sign * 11.1;
    rect(b, dz - 0.52, dz + 0.52, 1.37, 3.5, C.frame, 0.025);
    rect(b, dz - 0.48, dz + 0.48, 1.39, 3.46, m, 0.03);
    rect(b, dz - 0.15, dz + 0.15, 2.3, 3.1, C.glass, 0.035);
    for (const g of [-0.66, 0.66]) rect(b, dz + g - 0.06, dz + g + 0.06, 2.35, 3.0, C.green, 0.03); // class colour (coach)
    rect(b, sign * 10.1 - 0.36, sign * 10.1 + 0.36, s0, s1, C.frame, 0.03);
    rect(windows, sign * 10.1 - 0.32, sign * 10.1 + 0.32, s0 + 0.04, s1 - 0.04, C.glass, 0.034);
  }

  // Gangway ends, skirts between the trucks, trucks and roof equipment.
  for (const sign of [-1, 1]) {
    b.box(1.5, 2.3, 0.3, 0, 2.4, sign * (end + 0.12), C.frame);
    b.box(0.4, 0.34, 0.5, 0, 0.92, sign * (end + 0.05), C.frame);
  }
  if (trailing) for (const x of [-1.15, 1.15]) lamps.box(0.18, 0.18, 0.05, x, 3.3, -end - 0.03, '#fa2924');
  b.box(2.9, 0.55, AIRO_TRUCKS - 3.4, 0, 0.78, 0, C.under);
  const wheel = new THREE.CylinderGeometry(0.46, 0.46, 0.16, 10).rotateZ(Math.PI / 2);
  for (const tz of [-AIRO_TRUCKS / 2, AIRO_TRUCKS / 2]) {
    for (const x of [-0.72, 0.72])
      for (const dz of [-1.25, 1.25]) {
        const g = wheel.clone().translate(x, 0.46, tz + dz);
        b.addGeometry(g, '#42484a');
        g.dispose();
      }
    for (const x of [-1, 1]) b.box(0.26, 0.42, 3.2, x, 0.6, tz, '#3a3f43');
    b.box(1.9, 0.3, 2.8, 0, 0.88, tz, '#24282b');
  }
  wheel.dispose();
  for (const z of [-6, 6]) b.box(1.7, 2 * (AIRO_ROOF - CROWN), 3.2, 0, CROWN, z, '#a9b0b4'); // HVAC housing up to the published height
}
