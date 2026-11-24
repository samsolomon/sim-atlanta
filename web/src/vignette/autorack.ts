import * as THREE from 'three';
import type { Builder } from './geom';

/**
 * Enclosed bi-level autorack. Envelope from Greenbrier's Multi-Max: 93 ft 10 in over couplers,
 * 89 ft 9.5 in inside, 19 ft extreme height (Plate J), 10 ft 8.4 in extreme width. Truck centres
 * (64 ft) follow Greenbrier's Auto-Max deck-conversion sheet, a different car; screen pattern,
 * roof arch and end doors are estimated from photographs. No lettering or reporting marks.
 */
export const AUTORACK_LENGTH = 28.6;
export const AUTORACK_TRUCKS = 19.51;
const IN_L = 27.36, W = 3.1, DECK = 1.2, EAVE = 5.25, TOP = 5.79;

export function autorackBody(b: Builder, low: boolean) {
  const flat = '#4a3b33', panel = '#b4b8ba', screen = '#8c9194', rib = '#9fa4a7', roof = '#a9adb0', door = '#9a9fa2';
  // The base flatcar and its side sills.
  b.box(W + 0.06, 0.35, IN_L + 0.4, 0, DECK - 0.17, 0, flat);
  const h = EAVE - DECK;
  for (const s of [-1, 1]) {
    // Side panels: solid lower skirt, perforated screen band above, solid top rail.
    b.box(0.06, h, IN_L, s * W / 2, DECK + h / 2, 0, panel);
    if (!low) {
      for (const [y0, y1] of [[DECK + 0.55, DECK + 1.75], [DECK + 2.25, EAVE - 0.35]]) {
        b.box(0.02, y1 - y0, IN_L - 0.6, s * (W / 2 + 0.035), (y0 + y1) / 2, 0, screen);
      }
      const ribs = 22;
      for (let i = 0; i <= ribs; i++) b.box(0.05, h - 0.1, 0.1, s * (W / 2 + 0.045), DECK + h / 2, -IN_L / 2 + 0.2 + (i * (IN_L - 0.4)) / ribs, rib);
    }
  }
  // Arched roof: a shallow prism along the car.
  const arch = new THREE.BufferGeometry();
  const L = IN_L / 2, e = EAVE, t = TOP, x = W / 2 + 0.03;
  const p = [
    [-x, e, -L], [0, t, -L], [0, t, L], [-x, e, -L], [0, t, L], [-x, e, L],
    [x, e, -L], [x, e, L], [0, t, L], [x, e, -L], [0, t, L], [0, t, -L],
  ].flat();
  arch.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  arch.computeVertexNormals();
  b.addGeometry(arch, roof);
  arch.dispose();
  // End doors with their gable.
  for (const end of [-1, 1]) {
    const z = end * (L + 0.03);
    b.box(W, h, 0.06, 0, DECK + h / 2, z, door);
    const gable = new THREE.BufferGeometry();
    gable.setAttribute('position', new THREE.Float32BufferAttribute([-x, e, z, x, e, z, 0, t, z], 3));
    gable.computeVertexNormals();
    b.addGeometry(gable, door);
    gable.dispose();
    if (!low) {
      b.box(0.06, h - 0.2, 0.04, 0, DECK + h / 2, z + end * 0.05, rib); // door seam
      b.box(W - 0.3, 0.06, 0.04, 0, DECK + h * 0.5, z + end * 0.05, rib);
    }
  }
}
