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

/** One car; `cab` adds a driving end facing +z. */
function carGeometry(line: string, cab: boolean): THREE.BufferGeometry {
  const b = new Builder();
  const L = CAR;
  // Body: slightly narrower at the roof for a rounded read.
  b.box(W, 2.3, L, 0, 2.15, 0, C.steel);
  b.box(W - 0.5, 0.35, L - 0.4, 0, 3.45, 0, C.steelShade);
  b.box(W - 1.3, 0.12, L - 0.8, 0, 3.66, 0, C.steel);
  // Window band and stripe, each a hair proud of the body.
  b.box(W + 0.04, 0.85, L - 1.6, 0, 2.55, 0, C.glass);
  b.box(W + 0.05, 0.16, L - 0.2, 0, 1.75, 0, line);
  // Doors: three pairs a side.
  for (const z of [-7.2, 0, 7.2]) b.box(W + 0.06, 2.05, 2.6, 0, 2.0, z, C.door);
  for (const z of [-7.2, 0, 7.2]) b.box(W + 0.07, 0.75, 2.2, 0, 2.6, z, C.glass);
  // Underframe, bogies and wheels.
  b.box(W - 0.6, 0.5, L - 2, 0, 0.95, 0, C.under);
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.16, 8).rotateZ(Math.PI / 2);
  for (const bz of [-7.6, 7.6]) {
    b.box(2.5, 0.55, 2.9, 0, 0.62, bz, C.bogie);
    for (const wz of [-1.05, 1.05])
      for (const wx of [-0.72, 0.72]) {
        const g = wheel.clone();
        g.translate(wx, 0.45, bz + wz);
        b.addGeometry(g, C.bogie);
      }
  }
  // Roof equipment
  b.box(2.0, 0.35, 3.2, 0, 3.85, -5.5, C.roofBox);
  b.box(2.0, 0.35, 3.2, 0, 3.85, 5.5, C.roofBox);
  if (cab) {
    const z = L / 2;
    b.box(W - 0.1, 1.1, 0.2, 0, 2.65, z + 0.05, C.glass); // windscreen
    b.box(1.6, 0.26, 0.12, 0, 3.32, z + 0.12, line); // lit destination sign
    b.box(W - 0.3, 0.1, 0.12, 0, 1.95, z + 0.13, line); // CQ400 light bar
    for (const x of [-1.1, 1.1]) b.box(0.42, 0.2, 0.12, x, 1.45, z + 0.13, C.head);
    b.box(W - 0.2, 0.45, 0.4, 0, 0.95, z - 0.1, C.under); // anticlimber
  }
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
