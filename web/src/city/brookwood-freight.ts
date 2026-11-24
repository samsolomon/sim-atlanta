import { FreightBatches } from './freight-batches';
import * as THREE from 'three';
import { Line, type P2 } from '../vignette/geom';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, type FreightUnit } from '../vignette/freight-stock';

/** An illustrative Norfolk Southern passage on Main 2 of the Norcross District.
 * Timing, direction, speed and consist are all invented. The Crescent keeps Main 1. */
export const NORCROSS_LINE = 'NS Norcross District';
const CONSIST: FreightUnit[] = ['locomotiveNs', 'locomotiveNs', 'grainHopper', 'grainHopper', 'grainHopper', ...Array<FreightUnit>(5).fill('boxcar')];
const GAP = 0.3;
export const FREIGHT_SPEED_MPS = 6.7;
/** One passage may begin every 20 minutes, alternating direction. */
export const FREIGHT_SLOT_MS = 20 * 60 * 1000;
export const freightTrainLength = CONSIST.reduce((sum, kind) => sum + FREIGHT_LENGTH[kind] + GAP, 0);

export interface FreightPass { slot: number; dir: 1 | -1; head: number }

/** The head position (metres along Main 2 from the west edge) for a passage in this
 * slot, or null once its tail has left the board. */
export function freightPass(clockMs: number, lineLength: number): FreightPass | null {
  const slot = Math.floor(clockMs / FREIGHT_SLOT_MS);
  const travelled = ((clockMs - slot * FREIGHT_SLOT_MS) / 1000) * FREIGHT_SPEED_MPS;
  if (travelled > lineLength + freightTrainLength) return null;
  const dir = slot % 2 ? -1 : 1;
  return { slot, dir, head: dir === 1 ? travelled : lineLength - travelled };
}

export function createNorcrossFreight(pts: P2[], railhead: (x: number) => number, planes: THREE.Plane[], highDetail = true) {
  const line = new Line(pts);
  const batches = new FreightBatches(CONSIST, true, !highDetail);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: planes, clipShadows: true });
  const cars = CONSIST.map((kind, i) => {
    const car = batches.createCar(kind, material);
    car.userData.trainId = 'illustrative:freight:norcross';
    car.userData.lengthM = FREIGHT_LENGTH[kind];
    car.userData.line = NORCROSS_LINE;
    car.visible = false;
    return { car, kind, flip: i === 1 };
  });
  const nose = new THREE.Vector3(), tail = new THREE.Vector3(), m = new THREE.Matrix4();
  // Straddling cars extend along the end tangent so they slide out through the clip planes.
  function at(s: number, target: THREE.Vector3) {
    const clamped = THREE.MathUtils.clamp(s, 0, line.length), p = line.at(clamped), beyond = s - clamped;
    const x = p.x + beyond * p.dx, z = p.z + beyond * p.dz;
    return target.set(x, railhead(x), z);
  }
  // The freight yields the whole corridor to any scheduled Crescent on it. This depends
  // only on the scene clock and the current train states, so scrubbing, reloads and a
  // slow timetable cannot put a freight beside the Crescent's approach or berth.
  let visibleCars = 0;
  function update(clockMs: number, crescentOnCorridor: boolean) {
    const pass = crescentOnCorridor ? null : freightPass(clockMs, line.length);
    visibleCars = 0;
    let front = pass?.head ?? 0;
    batches.begin();
    for (const { car, kind, flip } of cars) {
      const length = FREIGHT_LENGTH[kind];
      const center = front - (pass?.dir ?? 1) * length / 2;
      front -= (pass?.dir ?? 1) * (length + GAP);
      const show = !!pass && center > -length && center < line.length + length;
      car.visible = show;
      if (!show) continue;
      // The leading truck is the nose in the direction of travel; the second unit runs long hood forward.
      const half = (pass!.dir * FREIGHT_TRUCK_SPACING[kind]) / 2;
      at(center + half, nose);
      at(center - half, tail);
      car.position.addVectors(nose, tail).multiplyScalar(0.5);
      car.quaternion.setFromRotationMatrix(m.lookAt(nose, tail, car.up));
      if (flip) car.rotateY(Math.PI);
      batches.append(kind, car);
      visibleCars++;
    }
    batches.finish();
    return visibleCars;
  }
  return {
    group: batches.group, poses: batches.poses,
    update,
    get visibleCars() { return visibleCars; },
    dispose() {
      batches.dispose();
      material.dispose();
    },
  };
}
