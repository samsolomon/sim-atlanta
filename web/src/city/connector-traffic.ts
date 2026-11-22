import * as THREE from 'three';
import { rng } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { local } from '../vignette/time';
import type { TrafficData } from '../vignette/traffic';
import { LENGTH, PAINT, vehicleGeometry, vehicleMaterial } from '../vignette/vehicles';
import type { TerrainCity } from '../terrain/transport-data';
import { connectorTrafficRoutes, type TrafficLane } from './connector-traffic-routes';

export const CONNECTOR_TRAFFIC_CAP = { low: 48, high: 120 } as const;
export const CONNECTOR_AADT = 237_000; // GDOT station 121-5472, 2025 calculated, both directions.
const speed = 18; // Illustrative metres per second; no measured speed at the crossing.
const models = ['sedan', 'suv', 'box'] as const;
type Kind = typeof models[number];
type RoadHeight = (x: number, z: number, run: VRoad) => number | null;
interface TrafficOptions {
  city: TerrainCity;
  quality: keyof typeof CONNECTOR_TRAFFIC_CAP;
  hourly: TrafficData['hourly'];
  roadHeight: RoadHeight;
  busOccupies?: (x: number, y: number, z: number, lengthM: number) => boolean;
  clippingPlanes?: THREE.Plane[];
}
interface Slot {
  lane: TrafficLane;
  phase: number;
  threshold: number;
  kind: Kind;
  color: THREE.Color;
}

function hourShare(hourly: TrafficData['hourly'], clockMs: number) {
  const { hour, weekend } = local(new Date(clockMs));
  const weights = weekend ? hourly.weekend : hourly.weekday;
  const index = Math.floor(hour);
  return THREE.MathUtils.lerp(weights[index], weights[(index + 1) % 24], hour - index);
}

function slotsFor(routes: TrafficLane[], cap: number, peak: number) {
  const random = rng(80375);
  const demand = routes.map(r => CONNECTOR_AADT * .5 * peak / 3600 * r.share * r.line.length / speed);
  const total = demand.reduce((sum, n) => sum + n, 0);
  const factor = Math.min(1, cap / total);
  let cumulative = 0;
  const slots: Slot[] = [];
  for (const [i, lane] of routes.entries()) {
    cumulative += demand[i] * factor;
    const count = Math.round(cumulative) - slots.length;
    const offset = random();
    for (let j = 0; j < count; j++) {
      const u = random();
      slots.push({ lane, phase: (j + offset + .65*(random()-.5)) / count * lane.line.length,
        threshold: random(), kind: u < .07 ? 'box' : u < .42 ? 'suv' : 'sedan',
        color: new THREE.Color(PAINT[Math.floor(random()*PAINT.length)]) });
    }
  }
  return slots;
}

/** A clock-seekable, illustrative layer. Source volumes describe typical demand.
 * A null road-surface sample or an observed bus has priority over a model car.
 */
export class ConnectorTraffic {
  readonly group = new THREE.Group();
  readonly night = { value: 0 };
  visibleCars = 0;
  private readonly material = vehicleMaterial(this.night);
  private readonly meshes = new Map<Kind, THREE.InstancedMesh>();
  private readonly slots: Slot[];
  private readonly peak: number;
  private minute = NaN;
  private share = 0;
  private pose = new THREE.Object3D();
  private readonly visible: { x: number; z: number; y: number; length: number }[] = [];

  constructor(private readonly opts: TrafficOptions) {
    this.group.name = 'Illustrative Connector traffic';
    const profiles = [opts.hourly.weekday, opts.hourly.weekend];
    const usable = profiles.every(p => p.length === 24 && p.every(n => Number.isFinite(n) && n >= 0));
    this.peak = usable ? Math.max(...profiles.flat()) : 0;
    const cap = CONNECTOR_TRAFFIC_CAP[opts.quality];
    this.slots = this.peak > 0 ? slotsFor(connectorTrafficRoutes(opts.city), cap, this.peak) : [];
    this.material.clippingPlanes = opts.clippingPlanes ?? [];
    for (const kind of models) {
      const count = this.slots.filter(s => s.kind === kind).length;
      if (!count) continue;
      const mesh = new THREE.InstancedMesh(vehicleGeometry(kind), this.material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      this.meshes.set(kind, mesh);
    }
  }

  update(clockMs: number, darkness: number) {
    this.night.value = darkness;
    for (const mesh of this.meshes.values()) mesh.count = 0;
    this.visibleCars = 0;
    if (!this.slots.length || !Number.isFinite(clockMs)) return;
    const minute = Math.floor(clockMs / 60000);
    if (minute !== this.minute) {
      this.minute = minute;
      this.share = hourShare(this.opts.hourly, clockMs) / this.peak;
    }
    const seconds = (clockMs - Date.UTC(2026, 0, 1)) / 1000;
    const box = this.opts.city.bounds;
    for (const slot of this.slots) {
      if (slot.threshold >= this.share) continue;
      const { line, roads } = slot.lane;
      const s = THREE.MathUtils.euclideanModulo(seconds * speed + slot.phase, line.length);
      const length = LENGTH[slot.kind], half = length / 2;
      if (s < half || s > line.length - half) continue;
      const axle = (at: number) => {
        const p = line.at(at);
        if (p.x <= box.minX || p.x >= box.maxX || p.z <= box.minZ || p.z >= box.maxZ) return null;
        const run = roads[Math.min(roads.length - 1, Math.floor(line.vertexAt(at)))];
        const y = this.opts.roadHeight(p.x, p.z, run);
        return y === null || !Number.isFinite(y) ? null : { x: p.x, z: p.z, y };
      };
      const front = axle(s + half), rear = axle(s - half), centre = axle(s);
      if (!front || !rear || !centre) continue;
      const { x, y, z } = centre;
      if (this.opts.busOccupies?.(x, y, z, length)) continue;
      const dx = front.x-rear.x, dz = front.z-rear.z, horizontal = Math.hypot(dx,dz);
      if (!horizontal) continue;
      // Several measured lanes feed the same generic lane beyond the study.
      // Reserve a footprint in travel coordinates so adjacent lanes stay usable.
      let occupied = false;
      for (let i = 0; i < this.visibleCars; i++) {
        const prev = this.visible[i], vx = prev.x - x, vz = prev.z - z;
        if (Math.abs(prev.y-y) < 2.5 && Math.abs(vx*dz-vz*dx) < horizontal * 2.2 &&
            Math.abs(vx*dx+vz*dz) < horizontal * (half + prev.length/2 + 1.5)) {
          occupied = true;
          break;
        }
      }
      if (occupied) continue;
      const place = this.visible[this.visibleCars] ??= { x, y, z, length };
      place.x = x; place.y = y; place.z = z; place.length = length;
      this.visibleCars++;
      this.pose.position.set(x, (front.y+rear.y)*.5+.03, z);
      this.pose.rotation.set(-Math.atan2(front.y-rear.y,horizontal), Math.atan2(dx,dz), 0, 'YXZ');
      this.pose.updateMatrix();
      const mesh = this.meshes.get(slot.kind)!;
      mesh.setColorAt(mesh.count, slot.color);
      mesh.setMatrixAt(mesh.count++, this.pose.matrix);
    }
    for (const mesh of this.meshes.values()) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.material.dispose();
    this.group.clear();
  }
}
