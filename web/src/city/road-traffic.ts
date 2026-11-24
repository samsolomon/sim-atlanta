import * as THREE from 'three';
import { rng, type Line } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { local } from '../vignette/time';
import type { TrafficData } from '../vignette/traffic';
import { LENGTH, PAINT, vehicleGeometry, vehicleMaterial } from '../vignette/vehicles';
import type { TerrainCity } from '../terrain/transport-data';
import { signalPhase, signalPositions, SIGNAL_MAX_WAIT_S, type CourseSignal } from './traffic-signals';

const LAMP = { red: new THREE.Color('#ff3b30'), amber: new THREE.Color('#ffb020'), green: new THREE.Color('#34d058') };

const models = ['sedan', 'suv', 'box'] as const;
type Kind = typeof models[number];
type RoadHeight = (x: number, z: number, run: VRoad) => number | null;
export interface RoadTrafficOptions {
  city: TerrainCity;
  quality: 'low' | 'high';
  hourly: TrafficData['hourly'];
  roadHeight: RoadHeight;
  /** All distances in City metres. Heading is atan2(dx,dz), zero toward +z. */
  busOccupies?: (x: number, y: number, z: number, lengthM: number, headingRad: number) => boolean;
  clippingPlanes?: THREE.Plane[];
}
/** Offstage metres for one course. A signalised course adds the longest it can be held,
 * so a trip delayed at every light still leaves before its slot's next trip begins. */
function offstage(lane: TrafficCourse) {
  // The full red, plus headway for a 15-car queue, at every light.
  const budget = lane.signals?.length && !lane.closed ? lane.signals.length * (SIGNAL_MAX_WAIT_S + 30) : 0;
  return (lane.offstageM ?? 0) + budget * lane.speedMps;
}
export interface TrafficCourse {
  line: Line;
  /** One original source road per segment. The callback selects ground, deck or a hole. */
  roads: VRoad[];
  speedMps: number;
  dailyFlow: number;
  truckShare: number;
  /** Extra time offstage between trips with separate endpoints. */
  offstageM?: number;
  closed?: boolean;
  /** Stop lines at mapped traffic signals (opt-in; courses without them run unchanged). */
  signals?: CourseSignal[];
  /** Explicit incoming stop line for a turning course. */
  turnSignal?: Omit<CourseSignal, 'axis'> & { dx: number; dz: number };
  /** Dissolve near unresolved interior endpoints; board edges use the City's clipping. */
  fadeStartM?: number;
  fadeEndM?: number;
}
interface Slot {
  lane: TrafficCourse;
  phase: number;
  threshold: number;
  kind: Kind;
  color: THREE.Color;
}

function hourShare(hourly: TrafficData['hourly'], clockMs: number) {
  const { hour, weekend } = local(new Date(clockMs));
  const weights = weekend ? hourly.weekend : hourly.weekday;
  const index = Math.floor(hour);
  const next = local(new Date(clockMs + 3600000));
  const following = next.weekend ? hourly.weekend : hourly.weekday;
  return THREE.MathUtils.lerp(weights[index], following[Math.floor(next.hour)], hour - index);
}

/** Metres a trip typically spends on its course, counting the mean signal delay (about 13 s
 * per light for a 42 s red in an 84 s cycle). The cap applies to these visible cars; the
 * worst-case budget in `offstage` only adds idle slots, never fewer cars on the street. */
function visibleLength(lane: TrafficCourse) {
  const delay = lane.signals?.length && !lane.closed ? lane.signals.length * 13 : 0;
  return lane.line.length + (lane.offstageM ?? 0) + delay * lane.speedMps;
}

function slotsFor(routes: TrafficCourse[], cap: number, peak: number, seed: number) {
  const random = rng(seed);
  const demand = routes.map(r => r.dailyFlow * peak / 3600 * (r.line.length + offstage(r)) / r.speedMps);
  const visible = routes.map(r => r.dailyFlow * peak / 3600 * visibleLength(r) / r.speedMps);
  const total = visible.reduce((sum, n) => sum + n, 0);
  const factor = Math.min(1, cap / total);
  let cumulative = 0;
  const slots: Slot[] = [];
  for (const [i, lane] of routes.entries()) {
    cumulative += demand[i] * factor;
    const count = Math.round(cumulative) - slots.length;
    const offset = random();
    for (let j = 0; j < count; j++) {
      const u = random();
      slots.push({ lane, phase: (j + offset + .65*(random()-.5)) / count * (lane.line.length + offstage(lane)),
        threshold: random(), kind: u < lane.truckShare ? 'box' : u < lane.truckShare + .35 ? 'suv' : 'sedan',
        color: new THREE.Color(PAINT[Math.floor(random()*PAINT.length)]) });
    }
  }
  return slots;
}

/** A clock-seekable, illustrative layer. Source volumes describe typical demand.
 * A null road-surface sample or an observed bus has priority over a model car.
 */
export class RoadTraffic {
  readonly group = new THREE.Group();
  readonly night = { value: 0 };
  visibleCars = 0;
  /** Signalised cars the footprint check dropped behind another car on their own course this
   * frame. A queue should never need it; opposing lanes pinching at a node are not counted. */
  signalOverlaps = 0;
  private readonly material = vehicleMaterial(this.night);
  private readonly meshes = new Map<Kind, THREE.InstancedMesh>();
  private readonly slots: Slot[];
  private readonly peak: number;
  private share = 0;
  private pose = new THREE.Object3D();
  private readonly visible: { x: number; z: number; y: number; half: number; ux: number; uz: number; lane?: TrafficCourse }[] = [];
  /** One mast and head per stop line, coloured from the shared controller every frame. */
  private heads?: { mesh: THREE.InstancedMesh; masts: THREE.InstancedMesh; signals: CourseSignal[] };

  constructor(private readonly opts: RoadTrafficOptions, courses: TrafficCourse[], cap: number, seed: number, name: string) {
    this.group.name = name;
    this.group.userData.positionTier = 'illustrative';
    const profiles = [opts.hourly.weekday, opts.hourly.weekend];
    const usable = profiles.every(p => p.length === 24 && p.every(n => Number.isFinite(n) && n >= 0));
    this.peak = usable ? Math.max(...profiles.flat()) : 0;
    // Heads first: a stop line whose head cannot be placed is dropped, so no car waits at a
    // light it cannot see.
    courses = this.buildHeads(courses);
    this.slots = this.peak > 0 ? slotsFor(courses, cap, this.peak, seed) : [];
    this.material.clippingPlanes = opts.clippingPlanes ?? [];
    const fade = courses.some(course => course.fadeStartM || course.fadeEndM);
    if (fade) {
      // Alpha hashing retains depth writing and avoids transparent instance sorting.
      this.material.alphaHash = true;
      const kit = this.material.onBeforeCompile.bind(this.material);
      this.material.onBeforeCompile = (shader, renderer) => {
        kit(shader, renderer);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float tripOpacity; varying float vTripOpacity;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTripOpacity = tripOpacity;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vTripOpacity;')
          .replace('#include <alphahash_fragment>', 'diffuseColor.a *= vTripOpacity;\n#include <alphahash_fragment>');
      };
    }
    for (const kind of models) {
      const count = this.slots.filter(s => s.kind === kind).length;
      if (!count) continue;
      const mesh = new THREE.InstancedMesh(vehicleGeometry(kind), this.material, count);
      if (fade) mesh.geometry.setAttribute('tripOpacity', new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
        .setUsage(THREE.DynamicDrawUsage));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      this.meshes.set(kind, mesh);
    }
  }

  private buildHeads(courses: TrafficCourse[]): TrafficCourse[] {
    const placed: { m: THREE.Matrix4; sig: CourseSignal; x: number; z: number }[] = [];
    const kept = courses.map(course => {
      if (!course.signals?.length) return course;
      const signals = course.signals.filter(sig => {
        const p = course.line.at(sig.s);
        const run = course.roads[Math.min(course.roads.length - 1, Math.floor(course.line.vertexAt(sig.s)))];
        const y = this.opts.roadHeight(p.x, p.z, run);
        if (y === null || !Number.isFinite(y)) return false;
        // On the approach's right, just beyond the lane, facing the oncoming driver.
        const x = p.x - p.dz * 5, z = p.z + p.dx * 5;
        // Turn courses reuse the existing approach head rather than adding a
        // second mast a few metres before the same controller.
        if (!course.turnSignal || !placed.some(h => h.sig.key === sig.key && h.sig.axis === sig.axis && Math.hypot(h.x-x,h.z-z)<12))
          placed.push({ m: new THREE.Matrix4().makeRotationY(Math.atan2(-p.dx, -p.dz)).setPosition(x, y, z), sig, x, z });
        return true;
      });
      return { ...course, signals };
    });
    if (!placed.length) return kept;
    const masts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 5.2, 0.22).translate(0, 2.6, 0),
      new THREE.MeshLambertMaterial({ color: '#3d4247', clippingPlanes: this.opts.clippingPlanes ?? [] }), placed.length);
    // Unlit, so the lamp reads at night; illustrative timing at a mapped signal.
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.2, 0.45).translate(0, 5.6, 0),
      new THREE.MeshBasicMaterial({ clippingPlanes: this.opts.clippingPlanes ?? [] }), placed.length);
    placed.forEach(({ m }, i) => { masts.setMatrixAt(i, m); mesh.setMatrixAt(i, m); mesh.setColorAt(i, LAMP.red); });
    masts.name = 'Signal masts'; mesh.name = 'Signal heads';
    this.group.add(masts, mesh);
    this.heads = { mesh, masts, signals: placed.map(p => p.sig) };
    return kept;
  }

  update(clockMs: number, darkness: number) {
    this.night.value = darkness;
    for (const mesh of this.meshes.values()) mesh.count = 0;
    this.visibleCars = 0;
    this.signalOverlaps = 0;
    if (!this.slots.length || !Number.isFinite(clockMs)) return;
    this.share = hourShare(this.opts.hourly, clockMs) / this.peak;
    const seconds = (clockMs - Date.UTC(2026, 0, 1)) / 1000;
    if (this.heads) {
      const { mesh, signals } = this.heads;
      signals.forEach((sig, i) => mesh.setColorAt(i, LAMP[signalPhase(sig.key, sig.axis, seconds)]));
      mesh.instanceColor!.needsUpdate = true;
    }
    const box = this.opts.city.bounds;
    // Signalised courses: place every shown car on the course together, so they queue.
    const signalled = new Map<Slot, number | null>();
    const byLane = new Map<TrafficCourse, Slot[]>();
    for (const slot of this.slots) {
      if (slot.threshold >= this.share || !slot.lane.signals?.length || slot.lane.closed) continue;
      const list = byLane.get(slot.lane);
      if (list) list.push(slot); else byLane.set(slot.lane, [slot]);
    }
    for (const [lane, slots] of byLane) {
      const period = lane.line.length + offstage(lane), v = lane.speedMps;
      const trips = slots.map(sl => ({
        start: seconds - THREE.MathUtils.euclideanModulo(seconds * v + sl.phase, period) / v, length: LENGTH[sl.kind] }));
      const pos = signalPositions(lane.signals!, lane.line.length, v, trips, seconds);
      slots.forEach((sl, i) => signalled.set(sl, pos[i]));
    }
    for (const slot of this.slots) {
      if (slot.threshold >= this.share) continue;
      const { line, roads } = slot.lane;
      const timed = signalled.get(slot);
      if (timed === null) continue;
      const s = timed ?? THREE.MathUtils.euclideanModulo(seconds * slot.lane.speedMps + slot.phase, line.length + offstage(slot.lane));
      const length = LENGTH[slot.kind], half = length / 2;
      if (!slot.lane.closed && (s < half || s > line.length - half)) continue;
      const axle = (at: number) => {
        if (slot.lane.closed) at = THREE.MathUtils.euclideanModulo(at,line.length);
        const p = line.at(at);
        if (p.x <= box.minX || p.x >= box.maxX || p.z <= box.minZ || p.z >= box.maxZ) return null;
        const run = roads[Math.min(roads.length - 1, Math.floor(line.vertexAt(at)))];
        const y = this.opts.roadHeight(p.x, p.z, run);
        return y === null || !Number.isFinite(y) ? null : { x: p.x, z: p.z, y };
      };
      const front = axle(s + half), rear = axle(s - half), centre = axle(s);
      if (!front || !rear || !centre) continue;
      const { x, y, z } = centre;
      const dx = front.x-rear.x, dz = front.z-rear.z, horizontal = Math.hypot(dx,dz);
      if (!horizontal) continue;
      const heading = Math.atan2(dx,dz);
      if (this.opts.busOccupies?.(x, y, z, length, heading)) continue;
      // Check both oriented footprints. Two crossing cars can touch even when
      // neither centre is inside the other's lane, or pass on different levels.
      const ux = dx/horizontal, uz = dz/horizontal, end = half + .75, side = 1.1;
      let occupied = false, sameCourse = false;
      for (let i = 0; i < this.visibleCars; i++) {
        const prev = this.visible[i], vx = prev.x-x, vz = prev.z-z;
        if (Math.abs(prev.y-y) >= 2.5 || Math.abs(vx) > end+prev.half+2*side ||
            Math.abs(vz) > end+prev.half+2*side) continue;
        const dot = Math.abs(ux*prev.ux + uz*prev.uz), cross = Math.abs(ux*prev.uz - uz*prev.ux);
        if (Math.abs(vx*ux + vz*uz) < end + prev.half*dot + side*cross &&
            Math.abs(vx*uz - vz*ux) < side + prev.half*cross + side*dot &&
            Math.abs(vx*prev.ux + vz*prev.uz) < prev.half + end*dot + side*cross &&
            Math.abs(vx*prev.uz - vz*prev.ux) < side + end*cross + side*dot) {
          occupied = true;
          sameCourse = prev.lane === slot.lane;
          break;
        }
      }
      if (occupied) {
        if (timed != null && sameCourse) this.signalOverlaps++;
        continue;
      }
      const place = this.visible[this.visibleCars] ??= { x, y, z, half:end, ux, uz };
      place.x = x; place.y = y; place.z = z; place.half = end; place.ux = ux; place.uz = uz; place.lane = slot.lane;
      this.visibleCars++;
      this.pose.position.set(x, (front.y+rear.y)*.5+.03, z);
      this.pose.rotation.set(-Math.atan2(front.y-rear.y,horizontal), heading, 0, 'YXZ');
      this.pose.updateMatrix();
      const mesh = this.meshes.get(slot.kind)!;
      const opacity = mesh.geometry.getAttribute('tripOpacity');
      if (opacity) {
        const fromStart = slot.lane.fadeStartM ? (s-half) / slot.lane.fadeStartM : 1;
        const toEnd = slot.lane.fadeEndM ? (line.length-s-half) / slot.lane.fadeEndM : 1;
        opacity.setX(mesh.count, Math.min(1, fromStart, toEnd));
      }
      mesh.setColorAt(mesh.count, slot.color);
      mesh.setMatrixAt(mesh.count++, this.pose.matrix);
    }
    for (const mesh of this.meshes.values()) {
      const opacity = mesh.geometry.getAttribute('tripOpacity');
      if (opacity) opacity.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const m of this.heads ? [this.heads.mesh, this.heads.masts] : []) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
    this.group.clear();
  }
}
