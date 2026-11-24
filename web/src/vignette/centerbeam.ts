import * as THREE from 'three';
import type { Builder } from './geom';

/**
 * Centerbeam lumber flat. Envelope from Greenbrier's 73 ft riserless-deck centerbeam: 80 ft 7 in over
 * couplers, 73 ft × 9 ft 10 in inside, 11 ft 7.4 in inside height, 15 ft 5.75 in extreme height.
 * Truck centres follow CN's 73 ft centerbeam sheet (60 ft), a different builder's car; the truss
 * spacing and lumber bundles are estimated from photographs. No lettering or wrap printing.
 */
export const CENTERBEAM_LENGTH = 24.56;
export const CENTERBEAM_TRUCKS = 18.29;
const IN_L = 22.25, IN_W = 3.0, DECK = 1.18, TOP = 4.72;

export type CenterbeamLoad = 'centerbeamEmpty' | 'centerbeamLumber';

export function centerbeamBody(b: Builder, load: CenterbeamLoad, low: boolean) {
  const steel = '#5b5f5c', dark = '#3f4341', deck = '#4b4f4d';
  const h = TOP - DECK;
  // Deck and the full-height end bulkheads.
  b.box(IN_W, 0.16, IN_L, 0, DECK - 0.08, 0, deck);
  for (const e of [-1, 1]) {
    b.box(IN_W, h, 0.14, 0, DECK + h / 2, e * (IN_L / 2 + 0.07), steel);
    if (!low) for (const x of [-1, 0, 1]) b.box(0.12, h, 0.08, x * 1.2, DECK + h / 2, e * (IN_L / 2 + 0.18), dark);
  }
  // The centre beam: a top chord, a web of posts, and diagonal braces.
  b.box(0.75, 0.22, IN_L, 0, TOP - 0.11, 0, steel);
  b.box(0.18, 0.4, IN_L, 0, DECK + 0.2, 0, steel);
  const bays = low ? 6 : 12, bay = IN_L / bays;
  for (let i = 0; i <= bays; i++) b.box(0.16, h - 0.4, 0.16, 0, DECK + 0.2 + (h - 0.4) / 2, -IN_L / 2 + i * bay, steel);
  if (!low) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const diag = Math.hypot(bay, h - 0.6), angle = Math.atan2(bay, h - 0.6);
    for (let i = 0; i < bays; i++) {
      const s = i % 2 ? 1 : -1;
      m.compose(v.set(0, DECK + 0.2 + (h - 0.4) / 2, -IN_L / 2 + (i + 0.5) * bay), q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), s * angle), one);
      b.box(0.1, diag, 0.1, 0, 0, 0, dark, m);
    }
  }
  if (load === 'centerbeamLumber') {
    // Wrapped bundles stacked against both faces of the beam, stepping in toward the top.
    const wrap = ['#d9d2bf', '#cfc6b1', '#c2b79f'], wood = '#b89a6c';
    const rows = low ? 1 : 5, bundleL = (IN_L - 0.3) / 4;
    for (const s of [-1, 1]) {
      if (low) {
        b.box(1.2, h - 0.35, IN_L - 0.3, s * 0.78, DECK + (h - 0.35) / 2, 0, wrap[0]);
        continue;
      }
      for (let r = 0; r < rows; r++) {
        const rh = (h - 0.35) / rows, w = 1.25 - r * 0.06;
        for (let k = 0; k < 4; k++) {
          const z = -IN_L / 2 + 0.15 + (k + 0.5) * bundleL;
          b.box(w, rh - 0.04, bundleL - 0.12, s * (0.12 + w / 2), DECK + r * rh + rh / 2, z, wrap[(r + k) % wrap.length]);
          // Exposed board ends at each bundle face.
          b.box(w - 0.08, rh - 0.12, 0.02, s * (0.12 + w / 2), DECK + r * rh + rh / 2, z + bundleL / 2 - 0.05, wood);
        }
      }
    }
  }
}
