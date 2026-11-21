/**
 * Road traffic on the real street network (tier: inferred, "typical for this hour").
 *
 * - **Network:** Overture road runs are joined into a graph at shared vertices. Motorways and
 *   roads HPMS marks one-way run one direction; the rest both. Each directed edge has lanes
 *   offset to the right of travel.
 * - **How many:** vehicles enter at the board edges at the real hourly rate for that road:
 *   AADT (FHWA HPMS) × the hour's share of the day (FHWA TMAS, Downtown Connector) ÷
 *   directions ÷ lanes.
 * - **Where they go:** at each intersection a vehicle picks an outgoing road weighted by that
 *   road's volume (and a mild preference for going straight). No one can know a given car's
 *   turn; the mix matches the real volumes.
 * - **How they move:** the Intelligent Driver Model (gap and speed keeping), curved paths
 *   through intersections, and stops at the mapped traffic signals (timing is a guess).
 * - **What:** sedans, hatchbacks, SUVs, pickups, vans, box trucks and articulated semis, with
 *   trucks in proportion to each road's truck AADT.
 */
import * as THREE from 'three';
import { Line, rng, type P2 } from './geom';
import { FLEET, LENGTH, PAINT, vehicleGeometry, vehicleMaterial, type VehicleType } from './vehicles';
import type { World } from './world';

export interface TrafficData {
  hourly: { weekday: number[]; weekend: number[] };
  roads: { run: number; aadt: number; truckShare: number; lanes: number | null; speedMph: number | null; oneWay: boolean }[];
  sources: Record<string, string>;
}

const DEFAULT_AADT: Record<string, number> = { motorway: 120000, trunk: 40000, primary: 20000, secondary: 12000, tertiary: 6000, residential: 1500, unclassified: 1200 };
const ROADS = new Set(Object.keys(DEFAULT_AADT));
const WIDTH: Record<string, number> = { motorway: 13, trunk: 14, primary: 13, secondary: 11, tertiary: 9, residential: 7.5, unclassified: 7 };
const MAX_VEH = 1400;

interface Node {
  x: number;
  z: number;
  out: Edge[];
  inc: Edge[];
  signal?: Signal;
}
interface Edge {
  from: Node;
  to: Node;
  line: Line;
  lanes: Seg[];
  hwy: boolean;
  aadt: number;
  dirShare: number; // fraction of AADT in this direction
  lanesReal: number; // per direction, for per-lane flow
  truckShare: number;
  vFree: number;
  yOf: (x: number, z: number) => number;
  spawnAcc: number[];
  bearing: number; // heading at the end of the edge (radians)
  bearingStart: number;
  axis?: number; // signal phase group at `to`
}
interface Seg {
  line: Line;
  edge?: Edge;
  lane: number;
  y0?: number;
  y1?: number;
  vehicles: Veh[];
  vmax?: number; // speed cap through a turn
  into?: Seg; // a connector's target lane
  feeds?: Seg[]; // connectors that end in this lane
}
interface Signal {
  offset: number;
}
interface Veh {
  type: VehicleType;
  seg: Seg;
  s: number;
  v: number;
  v0: number;
  len: number;
  inst: number;
  next: Seg | null; // the connector or lane after `seg`
  after: Seg | null; // the lane after a connector
  trailer?: { inst: number; x: number; z: number };
  amax: number;
}

const CYCLE = 84; // s: 38 green + 4 amber per axis
function phase(sig: Signal, axis: number, t: number) {
  const c = (t + sig.offset) % CYCLE;
  const local = axis === 0 ? c : (c + CYCLE / 2) % CYCLE;
  return local < 38 ? 'green' : local < 42 ? 'amber' : 'red';
}

export class Traffic {
  readonly group = new THREE.Group();
  readonly night = { value: 0 };
  readonly stats = { connectorFlow: 0, connectorMph: 0, vehicles: 0 };
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private entries: Edge[] = [];
  private vehicles: Veh[] = [];
  private conns = new Map<string, Seg>();
  private meshes = new Map<VehicleType, { mesh: THREE.InstancedMesh; free: number[] }>();
  private rand = rng(9001);
  private time = 0;
  private share = 0.05;
  private obj = new THREE.Object3D();
  private hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(
    private world: World,
    private data: TrafficData,
  ) {
    this.buildNetwork();
    const caps: Partial<Record<VehicleType, number>> = { sedan: 520, hatch: 260, suv: 420, pickup: 180, van: 140, box: 90, tractor: 90, trailer: 90 };
    const col = new THREE.Color();
    for (const [t, n] of Object.entries(caps) as [VehicleType, number][]) {
      const mesh = new THREE.InstancedMesh(vehicleGeometry(t), vehicleMaterial(this.night), n);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      for (let i = 0; i < n; i++) {
        mesh.setMatrixAt(i, this.hidden);
        mesh.setColorAt(i, col.set(paintFor(t, this.rand)));
      }
      this.meshes.set(t, { mesh, free: Array.from({ length: n }, (_, i) => n - 1 - i) });
      this.group.add(mesh);
    }
  }

  // ---- network ------------------------------------------------------------------------

  private buildNetwork() {
    const w = this.world;
    const info = new Map(this.data.roads.map((r) => [r.run, r]));
    const key = (p: P2) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
    const runs = w.data.roads.map((r, i) => ({ r, i })).filter(({ r }) => ROADS.has(r.cls) && r.pts.length >= 2 && !r.tunnel);
    // Vertices that are run ends, or shared by two runs, become nodes.
    const touch = new Map<string, number>();
    const ends = new Set<string>();
    for (const { r } of runs) {
      const seen = new Set<string>();
      r.pts.forEach((p, j) => {
        const k = key(p);
        if (!seen.has(k)) touch.set(k, (touch.get(k) ?? 0) + 1);
        seen.add(k);
        if (j === 0 || j === r.pts.length - 1) ends.add(k);
      });
    }
    const nodeAt = new Map<string, Node>();
    const node = (p: P2) => {
      const k = key(p);
      let n = nodeAt.get(k);
      if (!n) {
        n = { x: p[0], z: p[1], out: [], inc: [] };
        nodeAt.set(k, n);
        this.nodes.push(n);
      }
      return n;
    };
    // Main-line Connector runs sometimes match a ramp's HPMS record (they run side by side).
    // Below 150k vehicles a day is implausible for the main line, so use its median instead.
    const mainline = runs
      .filter(({ r }) => r.cls === 'motorway' && r.sub !== 'link')
      .map(({ i }) => info.get(i)?.aadt ?? 0)
      .filter((a) => a >= 150_000)
      .sort((a, b) => a - b);
    const mainlineAadt = mainline.length ? mainline[Math.floor(mainline.length / 2)] : 250_000;
    for (const { r, i } of runs) {
      let inf = info.get(i);
      if (r.cls === 'motorway' && r.sub !== 'link' && (inf?.aadt ?? 0) < 150_000) inf = { run: i, aadt: mainlineAadt, truckShare: 0.089, lanes: 12, speedMph: 55, oneWay: false };
      const hwy = r.cls === 'motorway';
      const oneWay = hwy || !!inf?.oneWay;
      // Ramps sit beside the main line and often match its HPMS record; give them ramp volumes.
      const ramp = hwy && r.sub === 'link';
      const aadt = ramp ? Math.min(inf?.aadt ?? 15000, 18000) : inf?.aadt ?? DEFAULT_AADT[r.cls];
      const total = ramp ? 1 : inf?.lanes ?? (hwy ? 8 : 2);
      const lanesReal = Math.max(1, oneWay && !hwy ? total : Math.round(total / 2));
      const mph = inf?.speedMph || (hwy ? 55 : r.cls === 'residential' ? 25 : 35);
      const yOf = (x: number, z: number) => (r.bridge ? Math.max(0, w.ground(x, z)) : w.ground(x, z)) + 0.2;
      const width = ramp ? 6.5 : WIDTH[r.cls] ?? 7;
      const simLanes = ramp ? 1 : hwy ? 4 : Math.min(2, lanesReal);
      // Split the run at node vertices.
      let start = 0;
      for (let j = 1; j < r.pts.length; j++) {
        const k = key(r.pts[j]);
        if (j < r.pts.length - 1 && !(ends.has(k) || (touch.get(k) ?? 0) > 1)) continue;
        const piece = r.pts.slice(start, j + 1);
        start = j;
        if (piece.length < 2) continue;
        const a = node(piece[0]);
        const b = node(piece[piece.length - 1]);
        if (a === b) continue;
        const dirs: P2[][] = oneWay ? [piece] : [piece, [...piece].reverse()];
        dirs.forEach((pts, di) => {
          const line = new Line(pts);
          if (line.length < 1) return;
          const from = di === 0 ? a : b;
          const to = di === 0 ? b : a;
          const e: Edge = {
            from,
            to,
            line,
            lanes: [],
            hwy,
            aadt,
            // HPMS AADT counts both directions, except on roads HPMS marks one-way.
            dirShare: ramp || (oneWay && !hwy) ? 1 : 0.5,
            lanesReal,
            truckShare: inf?.truckShare ?? (hwy ? 0.08 : 0.02),
            vFree: mph * 0.447,
            yOf,
            spawnAcc: [],
            bearing: 0,
            bearingStart: 0,
          };
          // Lanes sit right of travel (Line.offset: positive = right).
          const offs = oneWay ? Array.from({ length: simLanes }, (_, q) => -width / 2 + (width * (q + 0.5)) / simLanes) : Array.from({ length: simLanes }, (_, q) => ((width / 2) * (q + 0.5)) / simLanes);
          for (let q = 0; q < simLanes; q++) {
            e.lanes.push({ line: line.offset(offs[q], 2), edge: e, lane: q, vehicles: [] });
            e.spawnAcc.push(this.rand());
          }
          const L = line.length;
          const p1 = line.at(Math.max(0, L - 3));
          const p2 = line.at(L);
          e.bearing = Math.atan2(p2.x - p1.x, p2.z - p1.z);
          const q1 = line.at(0);
          const q2 = line.at(Math.min(L, 3));
          e.bearingStart = Math.atan2(q2.x - q1.x, q2.z - q1.z);
          from.out.push(e);
          to.inc.push(e);
          this.edges.push(e);
        });
      }
    }
    // Trim lanes back from intersections so turns have room to curve.
    const deg = (n: Node) => new Set([...n.out, ...n.inc].map((x) => (x.from === n ? x.to : x.from))).size;
    for (const e of this.edges) {
      const t0 = deg(e.from) > 2 ? Math.min(7, e.line.length * 0.3) : 0;
      const t1 = deg(e.to) > 2 ? Math.min(7, e.line.length * 0.3) : 0;
      for (const l of e.lanes) l.line = trim(l.line, t0, t1);
    }
    // Entries: edges leaving a node that nothing else drives into (the board's edge).
    this.entries = this.edges.filter((e) => e.from.inc.every((i) => i.from === e.to));
    // Traffic signals: the nearest intersection to each mapped signal; two phase groups.
    for (const [sx, sz] of w.data.points?.traffic_signals ?? []) {
      let best: Node | null = null;
      let bd = 22;
      for (const n of this.nodes) {
        if (n.inc.length < 2) continue;
        const d = Math.hypot(n.x - sx, n.z - sz);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      if (best && !best.signal) {
        best.signal = { offset: this.rand() * CYCLE };
        const ref = best.inc[0].bearing;
        for (const e of best.inc) e.axis = Math.abs(Math.sin(e.bearing - ref)) < 0.7 ? 0 : 1;
      }
    }
  }

  private connector(a: Seg, b: Seg): Seg {
    const k = `${this.edges.indexOf(a.edge!)}:${a.lane}>${this.edges.indexOf(b.edge!)}:${b.lane}`;
    let c = this.conns.get(k);
    if (c) return c;
    const p0 = a.line.at(a.line.length);
    const p3 = b.line.at(0);
    const d = Math.hypot(p3.x - p0.x, p3.z - p0.z);
    const h = Math.max(0.3, d / 2.6);
    const c1x = p0.x + p0.dx * h;
    const c1z = p0.z + p0.dz * h;
    const c2x = p3.x - p3.dx * h;
    const c2z = p3.z - p3.dz * h;
    const pts: P2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const u = 1 - t;
      pts.push([u * u * u * p0.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p3.x, u * u * u * p0.z + 3 * u * u * t * c1z + 3 * u * t * t * c2z + t * t * t * p3.z]);
    }
    // Only real turns slow traffic: straight-through joins keep their speed.
    const turn = Math.abs(Math.atan2(p0.dx * p3.dz - p0.dz * p3.dx, p0.dx * p3.dx + p0.dz * p3.dz));
    const vmax = turn < 0.35 ? undefined : turn < 1.0 ? 13 : 8;
    c = { line: new Line(pts), lane: -1, vehicles: [], y0: a.edge!.yOf(p0.x, p0.z), y1: b.edge!.yOf(p3.x, p3.z), vmax, into: b };
    (b.feeds ??= []).push(c);
    this.conns.set(k, c);
    return c;
  }

  /** Where a vehicle goes after lane `seg`: weighted by volume, mildly preferring straight. */
  private route(seg: Seg): { conn: Seg; lane: Seg } | null {
    const e = seg.edge!;
    const outs = e.to.out.filter((o) => !(o.to === e.from && e.to.out.length > 1));
    if (!outs.length) return null;
    const ws = outs.map((o) => {
      const turn = Math.abs(Math.atan2(Math.sin(o.bearingStart - e.bearing), Math.cos(o.bearingStart - e.bearing)));
      const straight = turn < 0.5 ? 1.6 : turn < 2.2 ? 0.8 : 0.15;
      const stay = e.hwy && !o.hwy ? 0.5 : 1;
      return o.aadt * o.dirShare * straight * stay;
    });
    const sum = ws.reduce((a, b) => a + b, 0);
    let r = this.rand() * sum;
    let pick = outs[outs.length - 1];
    for (let i = 0; i < outs.length; i++) {
      r -= ws[i];
      if (r <= 0) {
        pick = outs[i];
        break;
      }
    }
    // Continue into the nearest lane. Where lanes don't line up (a ramp joining the main
    // line), take the emptier of the two nearest: a stand-in for drivers changing lanes.
    const end = seg.line.at(seg.line.length);
    const near = pick.lanes
      .map((l) => {
        const p = l.line.at(0);
        return { l, d: Math.hypot(p.x - end.x, p.z - end.z), busy: l.vehicles.filter((o) => o.s < 60).length };
      })
      .sort((a, b) => a.d - b.d);
    let lane = near[0].l;
    if (near.length > 1 && near[0].d > 1.5 && near[1].busy < near[0].busy) lane = near[1].l;
    return { conn: this.connector(seg, lane), lane };
  }

  // ---- simulation ---------------------------------------------------------------------

  private mix(e: Edge): VehicleType {
    if (this.rand() < e.truckShare) return this.rand() < (e.hwy ? 0.65 : 0.25) ? 'tractor' : 'box';
    const c = this.rand();
    return c < 0.34 ? 'sedan' : c < 0.52 ? 'hatch' : c < 0.82 ? 'suv' : c < 0.93 ? 'pickup' : 'van';
  }

  private alloc(t: VehicleType) {
    const m = this.meshes.get(t);
    return m && m.free.length ? m.free.pop()! : -1;
  }
  private release(t: VehicleType, i: number) {
    const m = this.meshes.get(t)!;
    m.mesh.setMatrixAt(i, this.hidden);
    m.free.push(i);
  }

  private spawn(e: Edge, laneIdx: number) {
    const seg = e.lanes[laneIdx];
    const first = seg.vehicles.reduce((m, v) => Math.min(m, v.s - v.len), Infinity);
    let type = this.mix(e);
    if (type === 'tractor' && this.meshes.get('trailer')!.free.length === 0) type = 'box';
    const len = type === 'tractor' ? LENGTH.tractor + LENGTH.trailer - 2 : LENGTH[type];
    if (first < len + 4 || this.vehicles.length >= MAX_VEH) return false;
    let inst = this.alloc(type);
    if (inst < 0) {
      type = 'sedan';
      inst = this.alloc(type);
      if (inst < 0) return false;
    }
    const heavy = type === 'tractor' || type === 'box';
    const v: Veh = {
      type,
      seg,
      s: 0,
      v: e.vFree * 0.85,
      v0: e.vFree * (0.88 + this.rand() * 0.22) * (heavy ? 0.92 : 1),
      len: type === 'tractor' ? len : LENGTH[type],
      inst,
      next: null,
      after: null,
      amax: heavy ? 0.9 : 1.6,
    };
    if (type === 'tractor') {
      const p = seg.line.at(0);
      v.trailer = { inst: this.alloc('trailer'), x: p.x - p.dx * 14, z: p.z - p.dz * 14 };
    }
    this.plan(v);
    seg.vehicles.push(v);
    this.vehicles.push(v);
    return true;
  }

  private plan(v: Veh) {
    if (v.seg.edge) {
      const r = this.route(v.seg);
      v.next = r?.conn ?? null;
      v.after = r?.lane ?? null;
    } else {
      v.next = v.after;
      v.after = null;
    }
  }

  /** Gap (m) to the nearest obstacle ahead and the closing speed. */
  private leader(v: Veh): { gap: number; dv: number } {
    let gap = Infinity;
    let lv = v.v;
    for (const o of v.seg.vehicles) {
      if (o === v || o.s <= v.s) continue;
      const g = o.s - o.len - v.s;
      if (g < gap) {
        gap = g;
        lv = o.v;
      }
    }
    // Merging: yield to vehicles on other connectors into the same lane that are closer to it.
    const into = v.seg.into ?? v.next?.into;
    if (into?.feeds && into.feeds.length > 1) {
      const mine = (v.seg.into ? 0 : v.seg.line.length - v.s) + (v.seg.into ? v.seg.line.length - v.s : v.next!.line.length);
      for (const c of into.feeds) {
        if (c === v.seg || c === v.next) continue;
        for (const o of c.vehicles) {
          const theirs = c.line.length - o.s;
          if (theirs < mine - 0.5) {
            const g = mine - theirs - o.len;
            if (g < gap) {
              gap = g;
              lv = o.v;
            }
          }
        }
      }
    }
    if (gap < Infinity) return { gap, dv: v.v - lv };
    let dist = v.seg.line.length - v.s;
    // Red, or amber with room to stop, at the end of this lane.
    const e = v.seg.edge;
    if (e?.to.signal && e.axis != null) {
      const ph = phase(e.to.signal, e.axis, this.time);
      if (ph === 'red' || (ph === 'amber' && dist > (v.v * v.v) / 6)) return { gap: Math.max(0.1, dist - 0.5), dv: v.v };
    }
    for (const seg of [v.next, v.after]) {
      if (!seg) break;
      let best = Infinity;
      let bv = 0;
      for (const o of seg.vehicles) {
        const g = dist + o.s - o.len;
        if (g < best) {
          best = g;
          bv = o.v;
        }
      }
      if (best < Infinity) return { gap: best, dv: v.v - bv };
      dist += seg.line.length;
      if (dist > 150) break;
    }
    return { gap: Infinity, dv: 0 };
  }

  private step(dt: number) {
    this.time += dt;
    for (const e of this.entries) {
      const qLane = (e.aadt * this.share * e.dirShare) / e.lanesReal; // veh/h per lane
      for (let k = 0; k < e.lanes.length; k++) {
        e.spawnAcc[k] = Math.min(e.spawnAcc[k] + (qLane / 3600) * dt, 2);
        if (e.spawnAcc[k] >= 1 && this.spawn(e, k)) e.spawnAcc[k] -= 1 + (this.rand() - 0.5) * 0.6;
      }
    }
    // Intelligent Driver Model.
    const S0 = 2.2;
    const T = 1.3;
    const B = 2.4;
    for (const v of this.vehicles) {
      const { gap, dv } = this.leader(v);
      const sStar = S0 + Math.max(0, v.v * T + (v.v * dv) / (2 * Math.sqrt(v.amax * B)));
      const v0 = v.seg.vmax ? Math.min(v.v0, v.seg.vmax) : v.v0; // slower through turns
      const a = Math.max(-8, v.amax * (1 - (v.v / v0) ** 4 - (gap === Infinity ? 0 : (sStar / Math.max(0.1, gap)) ** 2)));
      v.v = Math.max(0, v.v + a * dt);
      v.s += v.v * dt;
    }
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      while (v.s >= v.seg.line.length) {
        const over = v.s - v.seg.line.length;
        v.seg.vehicles.splice(v.seg.vehicles.indexOf(v), 1);
        const nxt = v.next;
        if (!nxt) {
          this.retire(v, i);
          break;
        }
        v.seg = nxt;
        v.s = over;
        nxt.vehicles.push(v);
        this.plan(v);
      }
    }
  }

  private retire(v: Veh, i: number) {
    this.release(v.type, v.inst);
    if (v.trailer && v.trailer.inst >= 0) this.release('trailer', v.trailer.inst);
    this.vehicles.splice(i, 1);
  }

  private yAt(seg: Seg, s: number, x: number, z: number) {
    if (seg.edge) return seg.edge.yOf(x, z);
    const t = Math.min(1, Math.max(0, s / Math.max(0.01, seg.line.length)));
    return (seg.y0 ?? 0) * (1 - t) + (seg.y1 ?? 0) * t;
  }

  private draw() {
    const w = this.world;
    let hwyV = 0;
    let hwyN = 0;
    for (const v of this.vehicles) {
      const centre = v.s - LENGTH[v.type] / 2;
      const p = v.seg.line.at(Math.max(0, centre));
      const y = this.yAt(v.seg, v.s, p.x, p.z);
      const m = this.meshes.get(v.type)!.mesh;
      if (!w.inBounds(p.x, p.z, 1)) m.setMatrixAt(v.inst, this.hidden);
      else {
        this.obj.position.set(p.x, y, p.z);
        this.obj.rotation.set(0, Math.atan2(p.dx, p.dz), 0);
        this.obj.updateMatrix();
        m.setMatrixAt(v.inst, this.obj.matrix);
      }
      if (v.seg.edge?.hwy) {
        hwyV += v.v;
        hwyN++;
      }
      const tr = v.trailer;
      if (tr && tr.inst >= 0) {
        // Fifth wheel 2 m behind the tractor's centre; the trailer is dragged toward it.
        const kx = p.x - p.dx * 2.0;
        const kz = p.z - p.dz * 2.0;
        let dx = kx - tr.x;
        let dz = kz - tr.z;
        const d = Math.hypot(dx, dz) || 1;
        dx /= d;
        dz /= d;
        tr.x = kx - dx * 12.2;
        tr.z = kz - dz * 12.2;
        const cx = kx - dx * 6.3;
        const cz = kz - dz * 6.3;
        const tm = this.meshes.get('trailer')!.mesh;
        if (!w.inBounds(cx, cz, 1)) tm.setMatrixAt(tr.inst, this.hidden);
        else {
          this.obj.position.set(cx, y, cz);
          this.obj.rotation.set(0, Math.atan2(dx, dz), 0);
          this.obj.updateMatrix();
          tm.setMatrixAt(tr.inst, this.obj.matrix);
        }
      }
    }
    for (const { mesh } of this.meshes.values()) mesh.instanceMatrix.needsUpdate = true;
    this.stats.vehicles = this.vehicles.length;
    this.stats.connectorMph = hwyN ? hwyV / hwyN / 0.447 : 0;
  }

  /** Share of the day's traffic in this (fractional) local hour. */
  shareAt(hour: number, weekend: boolean) {
    const p = weekend ? this.data.hourly.weekend : this.data.hourly.weekday;
    const h = hour - 0.5;
    const i = Math.floor((h + 24) % 24);
    const f = h - Math.floor(h);
    return p[i] * (1 - f) + p[(i + 1) % 24] * f;
  }

  /** Advance `dt` real seconds at local `hour`. `snap` re-fills the roads for a new time. */
  update(dt: number, hour: number, weekend: boolean, snap = false) {
    this.share = this.shareAt(hour, weekend);
    const maxHwy = Math.max(1, ...this.edges.filter((e) => e.hwy).map((e) => e.aadt));
    this.stats.connectorFlow = (maxHwy * this.share * 0.5) / 6.5;
    if (snap) {
      for (let i = this.vehicles.length - 1; i >= 0; i--) {
        const v = this.vehicles[i];
        v.seg.vehicles.splice(v.seg.vehicles.indexOf(v), 1);
        this.retire(v, i);
      }
      for (let t = 0; t < 90; t += 0.25) this.step(0.25); // warm up so roads are populated
    }
    let left = Math.min(dt, 0.2);
    while (left > 1e-6) {
      const h = Math.min(0.05, left);
      this.step(h);
      left -= h;
    }
    this.draw();
  }

  /** Debug counts for checks. */
  debug() {
    return { nodes: this.nodes.length, edges: this.edges.length, entries: this.entries.length, signals: this.nodes.filter((n) => n.signal).length, vehicles: this.vehicles.length };
  }
}

function trim(l: Line, a: number, b: number): Line {
  if (a <= 0 && b <= 0) return l;
  const L = l.length;
  const s0 = Math.min(a, L * 0.45);
  const s1 = Math.max(L - b, L * 0.55);
  const pts: P2[] = [];
  const p0 = l.at(s0);
  pts.push([p0.x, p0.z]);
  for (let i = 0; i < l.cum.length; i++) if (l.cum[i] > s0 && l.cum[i] < s1) pts.push(l.pts[i]);
  const p1 = l.at(s1);
  pts.push([p1.x, p1.z]);
  return new Line(pts);
}

/** Paint: fleet colours for trucks, the usual mix for cars. */
export function paintFor(t: VehicleType, r: () => number) {
  const list = t === 'box' || t === 'tractor' || t === 'trailer' ? FLEET : PAINT;
  return list[Math.floor(r() * list.length)];
}

// ---- parked cars ----------------------------------------------------------------------

/**
 * Cars in surface lots. Occupancy is a rule of thumb for downtown commuter lots (illustrative):
 * full on weekday working hours, a third in the evening, a few overnight; half on weekend days.
 */
export function lotOccupancy(hour: number, weekend: boolean) {
  const bump = (c: number, w: number) => Math.exp(-(((hour - c) / w) ** 2));
  if (weekend) return 0.12 + 0.4 * bump(14, 4.5) + 0.15 * bump(20, 2.5);
  return 0.1 + 0.78 * Math.min(1, bump(12.5, 4.2) * 1.25) + 0.12 * bump(19.5, 2);
}

export class ParkedCars {
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[] = [];
  private slot: { mesh: number; idx: number; prio: number }[];
  private last = -1;
  constructor(private stalls: { x: number; y: number; z: number; ang: number }[]) {
    const r = rng(404);
    const types: VehicleType[] = ['sedan', 'hatch', 'suv', 'pickup'];
    const counts = [0, 0, 0, 0];
    this.slot = stalls.map(() => {
      const c = r();
      const mesh = c < 0.38 ? 0 : c < 0.58 ? 1 : c < 0.9 ? 2 : 3;
      return { mesh, idx: counts[mesh]++, prio: r() };
    });
    const mat = vehicleMaterial({ value: 0 });
    const col = new THREE.Color();
    types.forEach((t, i) => {
      const m = new THREE.InstancedMesh(vehicleGeometry(t), mat, Math.max(1, counts[i]));
      for (let k = 0; k < counts[i]; k++) m.setColorAt(k, col.set(PAINT[Math.floor(r() * PAINT.length)]));
      m.castShadow = m.receiveShadow = true;
      this.meshes.push(m);
      this.group.add(m);
    });
    this.update(12, false);
  }
  update(hour: number, weekend: boolean) {
    const occ = lotOccupancy(hour, weekend);
    if (Math.abs(occ - this.last) < 0.005) return;
    this.last = occ;
    const m = new THREE.Matrix4();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.stalls.forEach((st, i) => {
      const s = this.slot[i];
      const mesh = this.meshes[s.mesh];
      if (s.prio > occ) return mesh.setMatrixAt(s.idx, zero);
      const j = (s.prio * 1000) % 1;
      m.makeRotationY(st.ang + (j - 0.5) * 0.08).setPosition(st.x + (j - 0.5) * 0.3, st.y, st.z);
      mesh.setMatrixAt(s.idx, m);
    });
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
}
