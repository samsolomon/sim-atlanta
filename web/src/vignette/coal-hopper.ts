import * as THREE from 'three';
import type { Builder } from './geom';

/**
 * Open-top aluminum coal hopper with longitudinal bottom discharge, the type in Southeastern coal
 * unit trains. Envelope from a railcar-registry entry for a 4,323 cu ft car (53 ft 1 in × 10 ft 8 in ×
 * 13 ft 4 in exterior), the capacity of Trinity's aluminum RDL; it is a lead, not a builder's sheet.
 * Truck centres (12.4 m), the chute shape and the heaped load are estimated from photographs.
 * No lettering or reporting marks.
 */
export const COAL_LENGTH = 16.18;
export const COAL_TRUCKS = 12.4;
const IN_L = 14.9, W = 3.06, TOP = 4.06, SIDE_BOTTOM = 1.75;

export type CoalLoad = 'coalLoaded' | 'coalEmpty';

export function coalHopperBody(b: Builder, load: CoalLoad, low: boolean) {
  const alu = '#b7babc', post = '#a2a6a8', dark = '#55595b', rim = '#c6c9cb';
  const h = TOP - SIDE_BOTTOM;
  // Side sheets narrow toward the bottom, following the sloped end sheets: a full-length upper band
  // over a lower band shortened at each end.
  const band = 1.05, step = 1.1;
  for (const s of [-1, 1]) {
    b.box(0.06, band, IN_L, s * W / 2, TOP - band / 2, 0, alu);
    b.box(0.06, h - band, IN_L - 2 * step, s * W / 2, SIDE_BOTTOM + (h - band) / 2, 0, alu);
    b.box(0.12, 0.1, IN_L + 0.1, s * W / 2, TOP - 0.05, 0, rim); // top chord
    const posts = low ? 4 : 9;
    for (let i = 0; i <= posts; i++) {
      const z = -IN_L / 2 + (i * IN_L) / posts, inner = Math.abs(z) <= IN_L / 2 - step;
      const y0 = inner ? SIDE_BOTTOM : TOP - band;
      b.box(0.08, TOP - y0, 0.1, s * (W / 2 + 0.04), (TOP + y0) / 2, z, post);
    }
  }
  // Sloped end sheets running down to the two longitudinal chutes along the centre sill.
  for (const e of [-1, 1]) {
    const z0 = e * IN_L / 2, z1 = e * (IN_L / 2 - 1.6);
    const sheet = new THREE.BufferGeometry();
    const p = [[-W / 2, TOP, z0], [W / 2, TOP, z0], [W / 2 - 0.9, SIDE_BOTTOM - 0.6, z1], [-W / 2 + 0.9, SIDE_BOTTOM - 0.6, z1]];
    const [a, b2, c, d] = e > 0 ? p : [p[1], p[0], p[3], p[2]];
    // Two-sided: the slope shows from inside the car and from outside under the end wall.
    sheet.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b2, ...c, ...a, ...c, ...d, ...a, ...c, ...b2, ...a, ...d, ...c], 3));
    sheet.computeVertexNormals();
    b.addGeometry(sheet, alu);
    sheet.dispose();
    b.box(W, 0.5, 0.1, 0, TOP - 0.25, z0, alu); // end wall top
  }
  // Chute bodies and their bottom gates.
  for (const s of [-1, 1]) b.box(1.05, SIDE_BOTTOM - 0.55, IN_L - 3.0, s * 0.7, (SIDE_BOTTOM + 0.55) / 2, 0, alu);
  b.box(W, 0.12, IN_L - 3.0, 0, SIDE_BOTTOM, 0, post); // floor line where the sides meet the chutes
  if (!low) for (const s of [-1, 1]) b.box(0.9, 0.08, IN_L - 3.2, s * 0.7, 0.58, 0, dark); // gates
  if (load === 'coalLoaded') {
    // A heaped coal load: a low ridge above the rim, crowned along the centreline.
    const coal = '#34353a', crest = '#2c2d31';
    const top = new THREE.BufferGeometry();
    const L = IN_L / 2 - 0.15, x = W / 2 - 0.05, y = TOP - 0.05, ridge = TOP + 0.38;
    const q = [
      [-x, y, -L], [0, ridge, L - 0.8], [0, ridge, -L + 0.8], [-x, y, -L], [-x, y, L], [0, ridge, L - 0.8],
      [x, y, -L], [0, ridge, -L + 0.8], [0, ridge, L - 0.8], [x, y, -L], [0, ridge, L - 0.8], [x, y, L],
      [-x, y, L], [x, y, L], [0, ridge, L - 0.8], [x, y, -L], [-x, y, -L], [0, ridge, -L + 0.8],
    ].flat();
    top.setAttribute('position', new THREE.Float32BufferAttribute(q, 3));
    top.computeVertexNormals();
    b.addGeometry(top, coal);
    top.dispose();
    if (!low) for (let z = -L + 1.5; z < L - 1.2; z += 1.6) b.box(0.5, 0.12, 0.6, ((z * 7) % 3 - 1) * 0.35, ridge - 0.12, z, crest);
  } else {
    // Empty: the dark inside of the far side and floor shows over the rim.
    b.box(W - 0.15, 0.04, IN_L - 3.4, 0, SIDE_BOTTOM + 0.05, 0, dark); // the flat between the end slopes
  }
}
