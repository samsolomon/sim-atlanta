import * as THREE from 'three';
import type { Builder } from './geom';

/**
 * General-service tank car in the DOT-117 family (black, jacketed, full-height head shields, a
 * protective housing over the top fittings). Envelope from Greenbrier's 30,600-gallon ethanol car
 * drawing: 59 ft 10 in over pulling faces, 46 ft 7.5 in truck centres. The 3.05 m tank diameter,
 * tank-centre height and fitting sizes are estimated from photographs. The DOT-117 choice is
 * illustrative; no placards, lettering or reporting marks.
 */
export const TANK_LENGTH = 18.24;
export const TANK_TRUCKS = 14.21;
const R = 1.525; // tank radius
const CY = 2.45; // tank centreline above the rail
const SHELL = 15.2; // cylindrical shell between the heads

export function tankCarBody(b: Builder, low: boolean) {
  // Inputs sit well above true black: the City grade crushes near-black into a silhouette.
  const black = '#45484d', shield = '#3b3e42', walk = '#5a5e63', hardware = '#3f4246', rust = '#5a4d44';
  const seg = low ? 10 : 20;
  const shell = new THREE.CylinderGeometry(R, R, SHELL, seg, 1, true).rotateX(Math.PI / 2).translate(0, CY, 0);
  b.addGeometry(shell, black);
  shell.dispose();
  // Elliptical heads, each behind a full-height head shield.
  for (const e of [-1, 1]) {
    const head = new THREE.SphereGeometry(R, seg, low ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2)
      .scale(1, 0.32, 1).rotateX(e * Math.PI / 2).translate(0, CY, e * SHELL / 2);
    b.addGeometry(head, shield);
    head.dispose();
    // Stub sill, end platform, ladder and handrail at each end.
    b.box(0.5, 0.42, 2.0, 0, 1.12, e * (TANK_LENGTH / 2 - 1.15), hardware);
    b.box(2.9, 0.07, 0.75, 0, 1.36, e * (TANK_LENGTH / 2 - 0.55), walk);
    if (!low) {
      for (const x of [-1.25, 1.25]) b.box(0.05, 1.05, 0.05, x, 1.9, e * (TANK_LENGTH / 2 - 0.35), hardware);
      b.box(2.55, 0.05, 0.05, 0, 2.4, e * (TANK_LENGTH / 2 - 0.35), hardware);
      for (let y = 1.6; y < 3.6; y += 0.36) b.box(0.45, 0.04, 0.04, -0.6, y, e * (SHELL / 2 + R * 0.34), hardware);
    }
  }
  // Saddle bolsters carrying the tank over each truck.
  for (const e of [-1, 1]) b.box(2.4, 0.5, 0.6, 0, 1.15, e * TANK_TRUCKS / 2, hardware);
  // Top fittings in a protective housing, with a short walkway either side.
  b.box(1.15, 0.42, 1.15, 0, CY + R + 0.12, 0, black);
  b.box(1.5, 0.05, 2.2, 0, CY + R + 0.02, 0, walk);
  if (!low) {
    b.box(1.25, 0.06, 1.25, 0, CY + R + 0.34, 0, hardware);
    for (const x of [-0.75, 0.75]) b.box(0.04, 0.5, 2.1, x, CY + R + 0.25, 0, hardware); // rails
    // A faint rust streak down each side below the fittings, and the bottom outlet.
    for (const s of [-1, 1]) b.box(0.02, 1.2, 0.22, s * (R - 0.02), CY + 0.5, 0.2, rust);
  }
  b.box(0.35, 0.35, 0.35, 0, CY - R - 0.1, 0, hardware);
}
