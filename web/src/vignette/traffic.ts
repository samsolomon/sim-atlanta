/**
 * Road traffic driven by real volumes (tier: inferred, "typical for this hour").
 *
 * For each lane: flow q (veh/h/lane) = AADT × share of the day in this hour ÷ 2 directions
 * ÷ lanes per direction, from FHWA HPMS (per road) and FHWA TMAS hourly counts on the
 * Downtown Connector (shape of the day). Speed falls as flow nears capacity (a BPR-style
 * curve), and density = flow ÷ speed sets how many vehicles are on the lane.
 * Trucks appear in proportion to each road's truck AADT.
 *
 * Vehicles keep fixed, evenly spread slots on each lane and only switch on or off as they
 * wrap past the lane's end, so traffic thickens and thins without cars popping mid-road.
 */
import * as THREE from 'three';
import { Builder, Line, rng } from './geom';
import type { World } from './world';

export interface TrafficData {
  hourly: { weekday: number[]; weekend: number[] };
  roads: { run: number; aadt: number; truckShare: number; lanes: number | null; speedMph: number | null; oneWay: boolean }[];
  sources: Record<string, string>;
}

interface Lane {
  line: Line;
  aadt: number;
  lanesPerDir: number;
  dirSplit: number; // 2 when AADT counts both directions
  vFree: number; // m/s
  cap: number; // veh/h/lane
  truckShare: number;
  yOf: (x: number, z: number) => number;
  slots: Slot[];
  v: number;
  phase: number;
}
interface Slot {
  prio: number; // 0..1, spread so that active slots are evenly spaced
  on: boolean;
  truck: boolean;
  carIdx: number; // instance index in the car or truck mesh
}

const DEFAULT_AADT: Record<string, number> = { motorway: 120000, trunk: 40000, primary: 20000, secondary: 12000, tertiary: 6000, residential: 1500, unclassified: 1200, service: 400 };
const CAR_COLORS = ['#f4f2ee', '#f4f2ee', '#2b2d31', '#8a9097', '#c2c6ca', '#a3322b', '#2d4f7c', '#d9c9a3', '#3f6b4a', '#1c1d20'];
const TRUCK_COLORS = ['#f4f2ee', '#d8dde2', '#b03a2e', '#2f5b8c', '#e2b23c'];

function vehicle(kind: 'car' | 'truck') {
  const b = new Builder();
  const glow: number[] = [];
  const mark = (g: number) => {
    while (glow.length < b.pos.length / 3) glow.push(g);
  };
  if (kind === 'car') {
    b.box(1.85, 0.75, 4.5, 0, 0.62, 0, '#ffffff');
    b.box(1.6, 0.6, 2.4, 0, 1.25, -0.2, '#ffffff');
    b.box(1.64, 0.42, 2.2, 0, 1.25, -0.2, '#2a3138');
    for (const [x, z] of [[-0.8, 1.45], [0.8, 1.45], [-0.8, -1.45], [0.8, -1.45]]) b.box(0.3, 0.55, 0.62, x, 0.3, z, '#1e1f22');
    mark(0);
    for (const x of [-0.6, 0.6]) b.box(0.4, 0.18, 0.06, x, 0.75, 2.26, '#fff4d0');
    mark(1);
    for (const x of [-0.65, 0.65]) b.box(0.35, 0.16, 0.06, x, 0.8, -2.26, '#ff2a1a');
    mark(2);
  } else {
    // Tractor-trailer, 20 m: trailer behind, cab in front (+z).
    b.box(2.5, 3.0, 14.5, 0, 2.6, -3.0, '#ffffff');
    b.box(2.4, 2.4, 3.2, 0, 1.9, 6.0, '#ffffff');
    b.box(2.42, 0.8, 0.12, 0, 2.5, 7.62, '#2a3138');
    b.box(2.0, 0.5, 4.5, 0, 0.75, 5.5, '#3a3d42');
    for (const z of [-8.5, -7.2, 4.0, 6.9]) for (const x of [-1.05, 1.05]) b.box(0.35, 0.9, 0.9, x, 0.45, z, '#1e1f22');
    mark(0);
    for (const x of [-0.9, 0.9]) b.box(0.4, 0.2, 0.06, x, 1.0, 7.62, '#fff4d0');
    mark(1);
    for (const x of [-1.0, 1.0]) b.box(0.3, 0.2, 0.06, x, 1.3, -10.26, '#ff2a1a');
    mark(2);
  }
  const g = b.geometry();
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(glow, 1));
  return g;
}

/** Car material with head/tail lights that glow by `uNight`. */
function vehicleMaterial(night: { value: number }) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vGlow;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Light lenses ignore the body paint (instance colour multiplies vColor).
        if (vGlow > 0.5) diffuseColor.rgb = vGlow > 1.5 ? vec3(1.0, 0.16, 0.1) : vec3(1.0, 0.96, 0.82);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (vGlow > 0.5) totalEmissiveRadiance += diffuseColor.rgb * (0.15 + 1.6 * uNight);`,
      );
  };
  return m;
}

export class Traffic {
  readonly group = new THREE.Group();
  readonly night = { value: 0 };
  private lanes: Lane[] = [];
  private cars: THREE.InstancedMesh;
  private trucks: THREE.InstancedMesh;
  private obj = new THREE.Object3D();
  private tgt = new THREE.Vector3();
  private hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  /** Last computed numbers, for the on-screen readout. */
  readonly stats = { connectorFlow: 0, connectorMph: 0, vehicles: 0 };
  private maxHwyAadt = 0;

  constructor(
    private world: World,
    private data: TrafficData,
  ) {
    const r = rng(77);
    const byRun = new Map(data.roads.map((x) => [x.run, x]));
    let nCars = 0;
    let nTrucks = 0;
    const peakShare = Math.max(...data.hourly.weekday, ...data.hourly.weekend);
    world.data.roads.forEach((rd, i) => {
      const hwy = rd.cls === 'motorway';
      if (!(rd.cls in DEFAULT_AADT) || rd.cls === 'service' || rd.pts.length < 2) return;
      const info = byRun.get(i);
      const aadt = info?.aadt ?? DEFAULT_AADT[rd.cls];
      const totalLanes = info?.lanes ?? (hwy ? 8 : 2);
      const oneWay = hwy || !!info?.oneWay;
      const lanesPerDir = Math.max(1, oneWay && !hwy ? totalLanes : Math.round(totalLanes / 2));
      const mph = info?.speedMph || (hwy ? 55 : rd.cls === 'residential' ? 25 : 35);
      const yOf = (x: number, z: number) => (rd.bridge ? Math.max(0, world.ground(x, z)) : world.ground(x, z)) + 0.2;
      const line = new Line(rd.pts);
      const geoms: Line[] = hwy ? [-4.8, -1.6, 1.6, 4.8].map((o) => line.offset(o, 3)) : oneWay ? [line.offset(-1.8, 3), line.offset(1.8, 3)] : [line.offset(-2.6, 3), new Line([...line.offset(2.6, 3).pts].reverse())];
      for (const g of geoms) {
        const lane: Lane = {
          line: g,
          aadt,
          lanesPerDir,
          dirSplit: oneWay && !hwy ? 1 : 2,
          vFree: mph * 0.447,
          cap: hwy ? 2000 : 800,
          truckShare: info?.truckShare ?? (hwy ? 0.08 : 0.02),
          yOf,
          slots: [],
          v: mph * 0.447,
          phase: r() * g.length,
        };
        // Enough slots for the busiest hour, with headroom for jams.
        const qPeak = (aadt * peakShare) / (oneWay && !hwy ? 1 : 2) / lanesPerDir;
        const kPeak = qPeak / 3600 / (lane.vFree * 0.45);
        const n = Math.max(1, Math.min(60, Math.ceil(kPeak * g.length * 1.15)));
        for (let k = 0; k < n; k++) {
          const truck = r() < lane.truckShare;
          lane.slots.push({ prio: bitrev(k, n), on: false, truck, carIdx: truck ? nTrucks++ : nCars++ });
        }
        this.lanes.push(lane);
        if (hwy) this.maxHwyAadt = Math.max(this.maxHwyAadt, aadt);
      }
    });
    const night = this.night;
    this.cars = new THREE.InstancedMesh(vehicle('car'), vehicleMaterial(night), Math.max(1, nCars));
    this.trucks = new THREE.InstancedMesh(vehicle('truck'), vehicleMaterial(night), Math.max(1, nTrucks));
    const c = new THREE.Color();
    for (let i = 0; i < nCars; i++) this.cars.setColorAt(i, c.set(CAR_COLORS[Math.floor(r() * CAR_COLORS.length)]));
    for (let i = 0; i < nTrucks; i++) this.trucks.setColorAt(i, c.set(TRUCK_COLORS[Math.floor(r() * TRUCK_COLORS.length)]));
    for (const m of [this.cars, this.trucks]) {
      m.castShadow = m.receiveShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  /** Share of the day's traffic in this (fractional) local hour. */
  share(hour: number, weekend: boolean) {
    const p = weekend ? this.data.hourly.weekend : this.data.hourly.weekday;
    const h = hour - 0.5;
    const i = Math.floor((h + 24) % 24);
    const f = h - Math.floor(h);
    return p[i] * (1 - f) + p[(i + 1) % 24] * f;
  }

  /**
   * Advance by `dt` real seconds at local `hour`. `snap` re-evaluates every slot at once
   * (after a time jump); otherwise slots only change state as they wrap past the lane end.
   */
  update(dt: number, hour: number, weekend: boolean, snap = false) {
    const sh = this.share(hour, weekend);
    let hwyQ = 0;
    let hwyV = 0;
    let hwyN = 0;
    let vehicles = 0;
    for (const lane of this.lanes) {
      const q = (lane.aadt * sh) / lane.dirSplit / lane.lanesPerDir; // veh/h per lane in this hour
      const x = q / lane.cap;
      const v = Math.max(lane.vFree * 0.25, lane.vFree / (1 + 0.9 * x ** 4));
      lane.v = snap ? v : lane.v + (v - lane.v) * Math.min(1, dt * 0.5);
      const k = q / 3600 / lane.v; // veh per metre
      const wantFrac = Math.min(1, (k * lane.line.length) / lane.slots.length);
      if (lane.cap > 1000 && lane.aadt >= this.maxHwyAadt * 0.9) {
        hwyQ += q;
        hwyV += lane.v;
        hwyN++;
      }
      const L = lane.line.length;
      const prev = lane.phase;
      lane.phase = (lane.phase + lane.v * dt) % L;
      const n = lane.slots.length;
      lane.slots.forEach((slot, i) => {
        const base = (i / n) * L;
        const s0 = (base + prev) % L;
        const s = (base + lane.phase) % L;
        if (snap || s < s0) slot.on = slot.prio < wantFrac; // wrapped past the end: re-decide
        const mesh = slot.truck ? this.trucks : this.cars;
        if (!slot.on) return mesh.setMatrixAt(slot.carIdx, this.hidden);
        const p = lane.line.at(s);
        if (!this.world.inBounds(p.x, p.z, 2)) return mesh.setMatrixAt(slot.carIdx, this.hidden);
        const q2 = lane.line.at(s + 3);
        this.obj.position.set(p.x, lane.yOf(p.x, p.z), p.z);
        this.tgt.set(q2.x, lane.yOf(q2.x, q2.z), q2.z);
        this.obj.lookAt(this.tgt);
        this.obj.updateMatrix();
        mesh.setMatrixAt(slot.carIdx, this.obj.matrix);
        vehicles++;
      });
    }
    this.cars.instanceMatrix.needsUpdate = true;
    this.trucks.instanceMatrix.needsUpdate = true;
    this.stats.connectorFlow = hwyN ? hwyQ / hwyN : 0;
    this.stats.connectorMph = hwyN ? hwyV / hwyN / 0.447 : 0;
    this.stats.vehicles = vehicles;
  }
}

/** Bit-reversed rank of k among n, in [0, 1): spreads "first m slots" evenly along a lane. */
function bitrev(k: number, n: number) {
  const bits = Math.max(1, Math.ceil(Math.log2(n)));
  let r = 0;
  for (let i = 0; i < bits; i++) if (k & (1 << i)) r |= 1 << (bits - 1 - i);
  return r / (1 << bits);
}
