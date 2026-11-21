/** MARTA trains on the diorama, built from the CQ400 model (cq400.ts), placed car by car. */
import * as THREE from 'three';
import { CAR_GAP, CAR_LENGTH, cq400Consist, cq400Geometry, cq400Material } from './cq400';
import type { Alignment } from './world';

export class Train {
  readonly group = new THREE.Group();
  private cars: THREE.Mesh[] = [];
  s = 0;
  readonly night = { value: 0 };
  private n: number;

  /**
   * A MARTA CQ400 train: `sets` 4-car sets (8 cars on the Blue Line, 4 on the Green; the live
   * feed doesn't say, so lengths are typical for the line). The leading cab shows white
   * lights and name bar, the tail cab red; cabs coupled inside an 8-car train stay dark.
   */
  constructor(
    private al: Alignment,
    private track: number, // sideways offset of this track
    lineColor: string,
    clip: THREE.Plane[],
    private bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    sets: 1 | 2 = 2,
  ) {
    const consist = cq400Consist(sets);
    this.n = consist.length;
    const geoms = new Map<string, THREE.BufferGeometry>();
    consist.forEach((c, i) => {
      const key = `${c.spec.cab}:${c.spec.u0}:${c.spec.u1}`;
      if (!geoms.has(key)) geoms.set(key, cq400Geometry(c.spec, lineColor));
      const role = { value: c.litEnd ? (i === 0 ? 1 : -1) : 0 };
      const m = new THREE.Mesh(geoms.get(key)!, cq400Material(lineColor, role, this.night, clip));
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.flip = c.flip;
      this.cars.push(m);
      this.group.add(m);
    });
  }

  /** Place the head of the train at distance s, travelling in direction dir (+1 / −1). */
  place(s: number, dir: 1 | -1) {
    const line = this.al.line;
    const target = new THREE.Vector3();
    this.cars.forEach((m, i) => {
      const sc = s - dir * (CAR_LENGTH / 2 + i * (CAR_LENGTH + CAR_GAP));
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
    return this.n * CAR_LENGTH + (this.n - 1) * CAR_GAP;
  }
}
