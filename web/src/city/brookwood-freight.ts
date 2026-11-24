import { FreightBatches, freightClipPlanes } from './freight-batches';
import * as THREE from 'three';
import { Line, type P2 } from '../vignette/geom';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING } from '../vignette/freight-stock';
import { COUPLER_GAP, MAX_UNITS, passageSummary, planPassage, type LineProfile, type Passage } from './freight-consist';

/** An illustrative Norfolk Southern passage on Main 2 of the Norcross District.
 * Timing, direction, speed and consist are all invented. The Crescent keeps Main 1. */
export const NORCROSS_LINE = 'NS Norcross District';
export const NORCROSS_PROFILE: LineProfile = { railroad: 'ns', recipes: { manifest: 0.45, intermodal: 0.35, unit: 0.2 } };
const LINE_ID = 'ns:norcross:main2';
export const FREIGHT_SPEED_MPS = 6.7;
/** One passage may begin every 20 minutes, alternating direction. */
export const FREIGHT_SLOT_MS = 20 * 60 * 1000;

export interface FreightPass { slot: number; dir: 1 | -1; head: number; passage: Passage }

const passages = new Map<number, Passage>();
/** The seeded train for a slot (cached; the plan is a pure function of the slot). */
export function norcrossPassage(slot: number) {
  let p = passages.get(slot);
  if (!p) {
    if (passages.size > 64) passages.clear();
    passages.set(slot, (p = planPassage(NORCROSS_PROFILE, slot, LINE_ID)));
  }
  return p;
}

/** The head position (metres along Main 2 from the west edge) for a passage in this
 * slot, or null once its tail has left the board. */
export function freightPass(clockMs: number, lineLength: number): FreightPass | null {
  const slot = Math.floor(clockMs / FREIGHT_SLOT_MS);
  const passage = norcrossPassage(slot);
  const travelled = ((clockMs - slot * FREIGHT_SLOT_MS) / 1000) * FREIGHT_SPEED_MPS;
  if (travelled > lineLength + passage.lengthM) return null;
  const dir = slot % 2 ? -1 : 1;
  return { slot, dir, head: dir === 1 ? travelled : lineLength - travelled, passage };
}

export function createNorcrossFreight(pts: P2[], railhead: (x: number) => number, planes: THREE.Plane[], highTier = true) {
  const line = new Line(pts);
  const batches = new FreightBatches(!highTier);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: freightClipPlanes(planes), clipShadows: true });
  const cars = Array.from({ length: MAX_UNITS }, () => {
    const car = batches.createPose(material);
    car.userData.trainId = 'illustrative:freight:norcross';
    car.userData.line = NORCROSS_LINE;
    car.userData.railroad = 'ns';
    return car;
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
  let visibleCars = 0, draws = 0;
  function update(clockMs: number, crescentOnCorridor: boolean) {
    const pass = crescentOnCorridor ? null : freightPass(clockMs, line.length);
    visibleCars = 0;
    let front = pass?.head ?? 0;
    batches.begin();
    const units = pass?.passage.units ?? [];
    const summary = pass ? passageSummary(pass.passage) : '';
    cars.forEach((car, i) => {
      const unit = units[i];
      if (!pass || !unit) { car.visible = false; return; }
      const length = FREIGHT_LENGTH[unit.kind];
      const center = front - (pass.dir * length) / 2;
      front -= pass.dir * (length + COUPLER_GAP);
      const show = center > -length && center < line.length + length;
      car.visible = show;
      if (!show) return;
      car.userData.lengthM = length;
      car.userData.kind = unit.kind;
      car.userData.consist = summary;
      car.userData.lead = units[0].kind;
      // The leading truck is the nose in the direction of travel; flipped units run the other way round.
      const half = (pass.dir * FREIGHT_TRUCK_SPACING[unit.kind]) / 2;
      at(center + half, nose);
      at(center - half, tail);
      car.position.addVectors(nose, tail).multiplyScalar(0.5);
      car.quaternion.setFromRotationMatrix(m.lookAt(nose, tail, car.up));
      if (unit.flip) car.rotateY(Math.PI);
      batches.append(unit.kind, car);
      visibleCars++;
    });
    draws = batches.finish();
    return visibleCars;
  }
  return {
    group: batches.group, poses: batches.poses,
    update,
    get visibleCars() { return visibleCars; },
    /** Instanced draws this frame (one per car kind present). */
    get draws() { return draws; },
    dispose() {
      batches.dispose();
      material.dispose();
    },
  };
}
