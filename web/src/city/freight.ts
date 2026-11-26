import { FreightBatches, freightMaterial } from './freight-batches';
import { POOL, type PoolSink } from './headlight-pools';
import * as THREE from 'three';
import type { FreightTreadPoint } from '../terrain/transport';
import { FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING } from '../vignette/freight-stock';
import { COUPLER_GAP, MAX_UNITS, maxTrainLength, passageSummary, planPassage, type LineProfile, type Passage } from './freight-consist';

// A replayable model railway passage. Its phase, speed and consist are illustrative.
const ENTRY_MS = Date.parse('2026-11-20T19:12:02Z');
const SPEED_MPS = 4.5;
/** CSX-like power downtown. Autoracks and double-stack wells run since the drawn centreline was
 * smoothed to a 150 m minimum radius (#512): every kind swings at most MAX_CURVE_SWING_M on its
 * curves and clears every deck by MIN_OVERHEAD_CLEARANCE_M (freight-clearance.test.ts). Intermodal
 * stays a minority recipe on this through line (docs/freight-consists.md). */
export const DOWNTOWN_PROFILE: LineProfile = { railroad: 'csx', recipes: { manifest: 0.55, intermodal: 0.15, unit: 0.3 } };
export const DOWNTOWN_LINE = 'Atlanta Terminal Subdivision';
const LINE_ID = 'csx:downtown';
/** One passage per slot, alternating direction. Fixed from the epoch so every tier and reload
 * agrees on the slot; long enough for the longest train to cross the mapped track (asserted). */
export const DOWNTOWN_SLOT_MS = 15 * 60 * 1000;
export const DOWNTOWN_ENTRY_MS = ENTRY_MS;
const MIN_SECTION_M = 12;

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
  // A sliver left by a terrain opening cannot establish a road car's two truck positions. Fixed at the
  // boxcar's 12 m truck spacing so a shorter switcher in the consist doesn't expose new slivers.
  return sections.filter(section => section[section.length - 1].s - section[0].s >= MIN_SECTION_M);
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
  /** Headlight pools at night on High (city/headlight-pools.ts); unset on Low. Lead unit only. */
  lights: PoolSink | null = null;
  private readonly poolNear = new THREE.Vector3();
  private readonly poolFar = new THREE.Vector3();
  private batches: FreightBatches;
  get group() { return this.batches.group; }
  get poses() { return this.batches.poses; }
  private sections: ReturnType<typeof this.makeSection>[];
  private materials: THREE.Material[] = [];
  private nose = new THREE.Vector3();
  private tail = new THREE.Vector3();
  private orientation = new THREE.Matrix4();
  private passages = new Map<number, Passage>();
  /** Total mapped length (start of the first section to the end of the last). */
  readonly spanM: number;
  private firstS: number;
  visibleCars = 0;
  draws = 0;

  constructor(treads: FreightTreadPoint[][], private edges: THREE.Plane[], low = false) {
    this.batches = new FreightBatches(low);
    this.sections = visibleSections(treads).map(points => this.makeSection(points));
    this.firstS = this.sections[0]?.start ?? 0;
    this.spanM = (this.sections[this.sections.length - 1]?.end ?? 0) - this.firstS;
    const needed = (this.spanM + maxTrainLength(DOWNTOWN_PROFILE)) / SPEED_MPS * 1000;
    if (needed > DOWNTOWN_SLOT_MS) console.warn(`Downtown freight slot is too short: ${Math.round(needed / 1000)} s needed`);
  }

  private makeSection(points: FreightTreadPoint[]) {
    const last = points.length - 1;
    // Clipping is local to a mouth: an interior car can round a bend behind that plane.
    const startCut = cutPlane(points[0], points[1]);
    const endCut = cutPlane(points[last], points[last - 1]);
    const materials = [[], [startCut], [endCut], [startCut, endCut]].map(cuts =>
      freightMaterial([...this.edges, ...cuts]));
    this.materials.push(...materials);
    for (const m of materials) this.batches.prewarm(m);
    const poses = Array.from({ length: MAX_UNITS }, () => {
      const pose = this.batches.createPose(materials[0]);
      pose.userData.trainId = 'illustrative:freight:downtown';
      pose.userData.line = DOWNTOWN_LINE;
      pose.userData.railroad = 'csx';
      return pose;
    });
    return { points, start: points[0].s, end: points[last].s, poses, materials };
  }

  passage(slot: number) {
    let p = this.passages.get(slot);
    if (!p) {
      if (this.passages.size > 64) this.passages.clear();
      this.passages.set(slot, (p = planPassage(DOWNTOWN_PROFILE, slot, LINE_ID)));
    }
    return p;
  }

  update(clockMs: number) {
    const since = clockMs - ENTRY_MS;
    const slot = Math.floor(since / DOWNTOWN_SLOT_MS);
    const passage = this.passage(slot);
    const travelled = (since - slot * DOWNTOWN_SLOT_MS) * SPEED_MPS / 1000;
    // Even slots run up the chainage, odd slots down it. `head` is the lead's front coupler.
    const dir = slot % 2 ? -1 : 1;
    const head = dir === 1 ? this.firstS + travelled : this.firstS + this.spanM - travelled;
    const summary = passageSummary(passage);
    this.visibleCars = 0;
    this.batches.begin();
    for (const [nth, section] of this.sections.entries()) {
      let front = head;
      section.poses.forEach((car, i) => {
        const unit = passage.units[i];
        if (!unit) { car.visible = false; return; }
        const length = FREIGHT_LENGTH[unit.kind];
        const center = front - dir * length / 2;
        front -= dir * (length + COUPLER_GAP);
        const lo = center - length / 2, hi = center + length / 2;
        if (hi <= section.start || lo >= section.end) { car.visible = false; return; }
        const cut = Number(lo < section.start) + 2 * Number(hi > section.end);
        car.visible = true;
        car.material = section.materials[cut];
        car.userData.lengthM = length;
        // A unit astride two sections has two poses: the one further along its travel is in front.
        car.userData.consistIndex = i - dir * nth / (2 * this.sections.length);
        car.userData.kind = unit.kind;
        car.userData.consist = summary;
        car.userData.lead = passage.units[0].kind;
        // The nose truck leads in the direction of travel; flipped units run the other way round.
        const truck = dir * FREIGHT_TRUCK_SPACING[unit.kind] / 2;
        sample(section.points, center + truck, this.nose);
        sample(section.points, center - truck, this.tail);
        car.position.addVectors(this.nose, this.tail).multiplyScalar(.5);
        car.quaternion.setFromRotationMatrix(this.orientation.lookAt(this.nose, this.tail, car.up));
        if (unit.flip) car.rotateY(Math.PI);
        this.batches.append(unit.kind, car, unit.load);
        this.visibleCars++;
        // The lead's headlamps light the track ahead of its front coupler, where that track is drawn
        // (a section's ends are its tunnel and cut mouths, so a pool never reaches under a cover).
        const far = head + dir * POOL.rail.length;
        if (i === 0 && this.lights?.active && Math.min(head, far) >= section.start && Math.max(head, far) <= section.end) {
          sample(section.points, head, this.poolNear);
          if (this.lights.inRange(this.poolNear.x, this.poolNear.y, this.poolNear.z)) {
            sample(section.points, far, this.poolFar);
            this.lights.add(this.poolNear.x, this.poolNear.y + 0.1, this.poolNear.z, this.poolFar.x, this.poolFar.y + 0.1, this.poolFar.z, POOL.rail.width);
          }
        }
      });
    }
    this.draws = this.batches.finish();
  }

  dispose() {
    this.batches.dispose();
    for (const mat of this.materials) mat.dispose();
  }
}
