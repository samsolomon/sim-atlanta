/**
 * A low-poly MARTA train after the CQ400 cars: stainless body, dark window band, line-colour
 * stripe, and cab ends whose destination sign and light bar glow in the line colour.
 * Six 22.9 m cars, articulated car-by-car along the alignment.
 */
import * as THREE from 'three';
import { Builder } from './geom';
import type { Alignment } from './world';

const CAR = 22.9;
const GAP = 1.0;
const W = 3.2;

const C = {
  steel: '#cfd3d6',
  steelShade: '#b9bec2',
  glass: '#26303b',
  door: '#aeb4b9',
  under: '#3a3d42',
  bogie: '#2c2e33',
  roofBox: '#9da3a8',
  head: '#fff6d8',
};

/** Extrude a cross-section (x across, y up) along z from z0 to z1. */
function section(b: Builder, pts: [number, number][], z0: number, z1: number, color: string) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false });
  g.translate(0, 0, z0);
  b.addGeometry(g, color);
}
/** Extrude a side profile (z along, y up) across the width, centred. */
function profile(b: Builder, pts: [number, number][], w: number, color: string) {
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(-Math.PI / 2);
  b.addGeometry(g, color);
}

/**
 * One car, after MARTA's CQ400: a stainless body with a rounded roof, individual windows
 * between three door pairs a side, bogies with side frames, underfloor equipment and roof
 * HVAC. `cab` gives a raked driving end facing +z with a big windscreen, headlights and a
 * destination sign and light bar that glow in the line colour.
 */
function carGeometry(line: string, cab: boolean): THREE.BufferGeometry {
  const b = new Builder();
  const L = CAR;
  const h = L / 2;
  const nose = cab ? 1.4 : 0; // length taken by the raked cab
  // Body cross-section: vertical sides, chamfered cant rail, low arched roof.
  const xs: [number, number][] = [
    [-W / 2, 1.05], [W / 2, 1.05], [W / 2, 3.2], [W / 2 - 0.25, 3.55], [W / 2 - 0.8, 3.72], [-W / 2 + 0.8, 3.72], [-W / 2 + 0.25, 3.55], [-W / 2, 3.2],
  ];
  section(b, xs, -h, h - nose, C.steel);
  if (cab) {
    // Raked nose: side profile from the body end to a sloped windscreen.
    profile(b, [[h - nose - 0.01, 1.05], [h, 1.05], [h, 1.95], [h - 0.35, 3.1], [h - 0.9, 3.55], [h - nose - 0.01, 3.72]], W - 0.02, C.steel);
    profile(b, [[h - 0.02, 2.05], [h - 0.36, 3.05], [h - 0.86, 3.47], [h - 0.95, 3.4], [h - 0.47, 2.9], [h - 0.15, 2.05]], W - 0.5, C.glass); // windscreen
    b.box(1.5, 0.22, 0.1, 0, 3.22, h - 0.55, line); // destination sign (tilted look via placement)
    b.box(W - 0.4, 0.1, 0.08, 0, 1.92, h + 0.02, line); // CQ400 light bar
    for (const x of [-1.15, 1.15]) b.box(0.4, 0.18, 0.08, x, 1.5, h + 0.02, C.head);
    b.box(W - 0.4, 0.5, 0.35, 0, 0.95, h - 0.05, C.under); // anticlimber / coupler housing
    b.box(0.35, 0.3, 0.5, 0, 0.85, h + 0.2, C.bogie); // coupler
  } else {
    // Gangway bellows at this end (the next car brings its own).
    b.box(2.0, 2.4, 0.5, 0, 2.2, h + 0.25, C.bogie);
  }
  b.box(2.0, 2.4, 0.5, 0, 2.2, -h - 0.25, C.bogie);
  // Sides: doors, windows, stripe.
  const doors = [-7.0, 0, 7.0];
  for (const side of [-1, 1]) {
    const x = side * (W / 2 + 0.02);
    b.box(0.05, 0.14, L - 0.4 - nose, x, 1.62, -nose / 2, line); // line-colour stripe at floor level
    for (const dz of doors) {
      b.box(0.06, 2.1, 2.5, x, 2.12, dz, C.door);
      b.box(0.08, 0.9, 0.85, x, 2.55, dz - 0.62, C.glass);
      b.box(0.08, 0.9, 0.85, x, 2.55, dz + 0.62, C.glass);
      b.box(0.09, 2.1, 0.06, x, 2.12, dz, C.under); // door seam
    }
    // Two windows in each bay between doors, one at each end bay.
    const bays: [number, number][] = [[-h + 0.6, -8.25], [-5.75, -1.25], [1.25, 5.75], [8.25, h - nose - 0.6]];
    for (const [z0, z1] of bays) {
      const n = z1 - z0 > 3.5 ? 2 : 1;
      const wlen = (z1 - z0 - 0.3 * (n + 1)) / n;
      for (let i = 0; i < n; i++) b.box(0.07, 0.95, wlen, x, 2.6, z0 + 0.3 + wlen / 2 + i * (wlen + 0.3), C.glass);
    }
  }
  // Underframe: equipment cases between the bogies.
  b.box(W - 0.7, 0.55, 9.5, 0, 0.78, 0, C.under);
  for (const z of [-3.2, 3.2]) b.box(W - 0.4, 0.45, 2.2, 0, 0.75, z, '#4a4e55');
  // Bogies: frame, side frames, wheels, axle boxes.
  const wheel = new THREE.CylinderGeometry(0.43, 0.43, 0.14, 10).rotateZ(Math.PI / 2);
  for (const bz of [-7.7, 7.7]) {
    b.box(2.2, 0.35, 2.6, 0, 0.82, bz, C.bogie);
    for (const sx of [-1, 1]) {
      b.box(0.18, 0.42, 2.9, sx * 1.02, 0.55, bz, C.bogie);
      for (const wz of [-1.1, 1.1]) {
        const g = wheel.clone();
        g.translate(sx * 0.74, 0.43, bz + wz);
        b.addGeometry(g, '#55585e');
        b.box(0.26, 0.3, 0.36, sx * 1.1, 0.48, bz + wz, '#4a4e55'); // axle box
      }
    }
  }
  // Roof: two HVAC pods and a cable trough.
  for (const z of [-5.6, 5.6]) {
    b.box(2.1, 0.38, 3.4, 0, 3.9, z, C.roofBox);
    b.box(1.6, 0.05, 2.6, 0, 4.1, z, '#7c8288');
  }
  b.box(0.3, 0.12, L - 4 - nose, 0.9, 3.78, -nose / 2, '#a6abb0');
  return b.geometry();
}

export class Train {
  readonly group = new THREE.Group();
  private cars: THREE.Mesh[] = [];
  s = 0;
  readonly night = { value: 0 };

  constructor(
    private al: Alignment,
    private track: number, // sideways offset of this track
    lineColor: string,
    clip: THREE.Plane[],
    private bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) {
    const body = new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: clip });
    // The line-colour sign and light bar glow: give them emissive via a tiny shader tweak.
    const night = this.night;
    body.onBeforeCompile = (sh) => {
      sh.uniforms.uNight = night;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uNight;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float sat = max(vColor.r, max(vColor.g, vColor.b)) - min(vColor.r, min(vColor.g, vColor.b));
          totalEmissiveRadiance += vColor * smoothstep(0.35, 0.6, sat) * 0.9;
          // Window glass (#26303b) glows warm white at night.
          float isGlass = step(length(vColor - vec3(0.0194, 0.0290, 0.0437)), 0.02);
          totalEmissiveRadiance += vec3(1.0, 0.92, 0.75) * isGlass * uNight * 0.9;`,
        );
    };
    const mid = carGeometry(lineColor, false);
    const cab = carGeometry(lineColor, true);
    for (let i = 0; i < 6; i++) {
      const g = i === 0 ? cab : i === 5 ? cab : mid;
      const m = new THREE.Mesh(g, body);
      m.castShadow = true;
      m.receiveShadow = true;
      if (i === 5) m.userData.flip = true;
      this.cars.push(m);
      this.group.add(m);
    }
  }

  /** Place the head of the train at distance s, travelling in direction dir (+1 / −1). */
  place(s: number, dir: 1 | -1) {
    const line = this.al.line;
    const target = new THREE.Vector3();
    this.cars.forEach((m, i) => {
      const sc = s - dir * (CAR / 2 + i * (CAR + GAP));
      const p = line.at(sc);
      const q = line.at(sc + dir * 4);
      const off = this.track;
      const x = p.x - p.nx * off;
      const z = p.z - p.nz * off;
      const y = this.al.elev(sc) + 0.55;
      m.position.set(x, y, z);
      // Hide cars off the board or deep in the tunnel (post-processing ignores clip planes).
      m.visible = x > this.bounds.minX - 8 && x < this.bounds.maxX + 8 && z > this.bounds.minZ - 8 && z < this.bounds.maxZ + 8 && y > -7.5;
      target.set(q.x - q.nx * off, this.al.elev(sc + dir * 4) + 0.55, q.z - q.nz * off);
      m.lookAt(target);
      if (m.userData.flip) m.rotateY(Math.PI);
    });
  }

  get length() {
    return 6 * CAR + 5 * GAP;
  }
}
