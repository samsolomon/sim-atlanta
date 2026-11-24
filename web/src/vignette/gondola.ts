import * as THREE from 'three';
import type { Builder } from './geom';

/**
 * Open mill gondola. Envelope from Greenbrier's 52 ft 2,791 cu ft mill gondola: 57 ft 9.5 in over
 * couplers, 52 ft 6 in × 9 ft 8 in × 5 ft 6 in inside, 9 ft 1.8 in extreme height (Plate C). Truck
 * centres (12.9 m), side-post spacing and the scrap heap are estimated from photographs.
 * Weathered oxide; no lettering or reporting marks.
 */
export const GONDOLA_LENGTH = 17.61;
export const GONDOLA_TRUCKS = 12.9;
const IN_L = 16.0, IN_W = 2.946, FLOOR = 1.11, TOP = 2.79;

export type GondolaLoad = 'gondolaEmpty' | 'gondolaScrap';

export function gondolaBody(b: Builder, load: GondolaLoad, low: boolean) {
  const oxide = '#6b4434', post = '#5a382b', rim = '#7a5240', floor = '#4a3329', inside = '#563629';
  const wall = 0.1, xo = IN_W / 2 + wall / 2, h = TOP - FLOOR;
  b.box(IN_W + 2 * wall, 0.22, IN_L + 2 * wall, 0, FLOOR - 0.11, 0, floor);
  for (const s of [-1, 1]) {
    b.box(wall, h, IN_L + 2 * wall, s * xo, FLOOR + h / 2, 0, oxide); // side sheet
    b.box(wall + 0.08, 0.08, IN_L + 2 * wall, s * xo, TOP - 0.04, 0, rim); // top chord
    b.box(0.02, h - 0.1, IN_L, s * (IN_W / 2 - 0.005), FLOOR + h / 2, 0, inside); // darker inner face
    // Exterior side posts.
    const posts = low ? 6 : 12;
    for (let i = 0; i <= posts; i++) {
      const z = -IN_L / 2 + (i * IN_L) / posts;
      b.box(0.1, h - 0.05, 0.12, s * (xo + 0.08), FLOOR + h / 2, z, post);
    }
  }
  for (const e of [-1, 1]) {
    b.box(IN_W + 2 * wall, h, wall, 0, FLOOR + h / 2, e * (IN_L / 2 + wall / 2), oxide);
    if (!low) for (let y = FLOOR + 0.35; y < TOP; y += 0.45) b.box(IN_W, 0.08, 0.08, 0, y, e * (IN_L / 2 + wall + 0.04), post);
  }
  if (load === 'gondolaScrap') {
    // A heaped scrap load below the top chord: overlapping slabs at seeded yaws and tilts in rust and grey.
    const tones = ['#5b4a40', '#6e5a4c', '#4b4038', '#7a6656', '#585450', '#695040'];
    const n = low ? 10 : 30;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const f = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1; // seeded
      const z = -IN_L / 2 + 0.8 + f(1) * (IN_L - 1.6);
      // Heap peaks along the centreline and between the ends.
      const crest = 1 - Math.abs(z) / (IN_L / 2);
      // Slabs are at most 1.2 × 1.4 m, so a 0.5 m offset keeps every rotation inside the side sheets.
      const x = (f(2) - 0.5) * 1.0;
      const y = FLOOR + 0.25 + crest * 0.7 * (1 - Math.abs(x) / IN_W) + f(3) * 0.25;
      e.set((f(4) - 0.5) * 0.7, f(5) * Math.PI, (f(6) - 0.5) * 0.7);
      m.compose(v.set(x, Math.min(y, TOP - 0.45), z), q.setFromEuler(e), one);
      b.box(0.6 + f(7) * 0.6, 0.25 + f(8) * 0.3, 0.7 + f(9) * 0.7, 0, 0, 0, tones[i % tones.length], m);
    }
  }
}
