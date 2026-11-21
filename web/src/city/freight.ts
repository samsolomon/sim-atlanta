import * as THREE from 'three';
import type { FreightTreadPoint } from '../terrain/transport';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, freightGeometry, type FreightUnit } from '../vignette/freight-stock';

// A replayable model railway passage. Its phase, speed and consist are illustrative.
const ENTRY_MS = Date.parse('2026-11-20T19:12:02Z');
const SPEED_MPS = 4.5;
const CONSIST: FreightUnit[] = ['locomotive', 'locomotive', 'boxcar', 'boxcar', 'boxcar', 'boxcar', 'boxcar'];
const GAP = .30;

function visibleSections(runs: FreightTreadPoint[][]) {
  const oriented = runs.filter(run => run.length >= 2).map(run =>
    run[0].s < run[run.length - 1].s ? run : [...run].reverse()).sort((a, b) => a[0].s - b[0].s);
  const sections: FreightTreadPoint[][] = [];
  for (const run of oriented) {
    const previous = sections[sections.length - 1];
    const last = previous?.[previous.length - 1];
    if (last && Math.abs(last.s - run[0].s) < .03 && last.position.distanceTo(run[0].position) < .3) {
      for (let i = 1; i < run.length; i++) previous.push(run[i]);
    } else {
      sections.push([...run]);
    }
  }
  // A sliver left by a terrain opening cannot establish even one vehicle’s two truck positions.
  const minSupport = Math.min(...Object.values(FREIGHT_TRUCK_SPACING));
  return sections.filter(section => section[section.length - 1].s - section[0].s >= minSupport);
}

/** Sample the drawn tread between trucks. Just outside an opening, extrapolate so the
 * visible end of a straddling car keeps moving through the mouth's clipping plane. */
function sample(points: FreightTreadPoint[], s: number, target: THREE.Vector3) {
  let left = 0, right = points.length - 1;
  while (right - left > 1) {
    const mid = (left + right) >> 1;
    if (s < points[mid].s) right = mid;
    else left = mid;
  }
  const a = points[left], b = points[right];
  return target.lerpVectors(a.position, b.position, (s - a.s) / (b.s - a.s));
}

function cutPlane(end: FreightTreadPoint, inside: FreightTreadPoint) {
  const normal = inside.position.clone().sub(end.position).setY(0).normalize();
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, end.position);
}

export class CityFreight {
  readonly group = new THREE.Group();
  private sections: ReturnType<typeof this.makeSection>[];
  private shapes = new Map<FreightUnit, THREE.BufferGeometry>();
  private materials: THREE.Material[] = [];
  private nose = new THREE.Vector3();
  private tail = new THREE.Vector3();
  private orientation = new THREE.Matrix4();
  private periodM: number;
  visibleCars = 0;

  constructor(treads: FreightTreadPoint[][], private edges: THREE.Plane[]) {
    this.group.name = 'Illustrative freight';
    this.sections = visibleSections(treads).map(points => this.makeSection(points));
    const end = this.sections[this.sections.length - 1]?.end ?? 0;
    const trainLength = CONSIST.reduce((sum, kind) => sum + FREIGHT_LENGTH[kind] + GAP, 0);
    this.periodM = end + trainLength + SPEED_MPS * 60; // leave the board empty between circuits
  }

  private makeSection(points: FreightTreadPoint[]) {
    const last = points.length - 1;
    // Clipping is local to a mouth: an interior car can round a bend behind that plane.
    const startCut = cutPlane(points[0], points[1]);
    const endCut = cutPlane(points[last], points[last - 1]);
    const materials = [[], [startCut], [endCut], [startCut, endCut]].map(cuts =>
      new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: [...this.edges, ...cuts] }));
    this.materials.push(...materials);
    return { points, start: points[0].s, end: points[last].s, cars: new Map<number, THREE.Mesh>(), materials };
  }

  update(clockMs: number) {
    const travelled = (clockMs - ENTRY_MS) * SPEED_MPS / 1000;
    const head = THREE.MathUtils.euclideanModulo(travelled, this.periodM);
    this.visibleCars = 0;
    for (const section of this.sections) {
      let front = head;
      for (const [i, kind] of CONSIST.entries()) {
        const length = FREIGHT_LENGTH[kind];
        const rear = front - length;
        const center = (front + rear) / 2;
        const reachesStart = front > section.start;
        const beforeEnd = rear < section.end;
        let car = section.cars.get(i);
        if (reachesStart && beforeEnd) {
          const cut = Number(rear < section.start) + 2 * Number(front > section.end);
          if (!car) {
            let shape = this.shapes.get(kind);
            if (!shape) {
              shape = freightGeometry(kind);
              this.shapes.set(kind, shape);
            }
            car = new THREE.Mesh(shape, section.materials[cut]);
            car.receiveShadow = true;
            section.cars.set(i, car);
            this.group.add(car);
          }
          car.visible = true;
          car.material = section.materials[cut];
          const truck = FREIGHT_TRUCK_SPACING[kind] / 2;
          sample(section.points, center + truck, this.nose);
          sample(section.points, center - truck, this.tail);
          car.position.addVectors(this.nose, this.tail).multiplyScalar(.5);
          car.quaternion.setFromRotationMatrix(this.orientation.lookAt(this.nose, this.tail, car.up));
          if (i === 1) car.rotateY(Math.PI);
          this.visibleCars++;
        } else if (car) {
          car.visible = false;
        }
        front = rear - GAP;
      }
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const shape of this.shapes.values()) shape.dispose();
    for (const mat of this.materials) mat.dispose();
    this.group.clear();
  }
}
