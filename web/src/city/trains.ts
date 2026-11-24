import * as THREE from 'three';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { TrainState } from '../model/types';
import { CAR_GAP, CAR_LENGTH, cq400Geometry, cq400Material } from '../vignette/cq400';
import { PlacementIndex } from '../vignette/spatial';
import { MARTA_TRACK_OFFSET, trackVisible, type Alignment, type VData } from '../vignette/world';

import type { prepareEastCut, ServiceTrack } from './east-cut';

type Segment = { al: Alignment; i: number };

/**
 * A platform a scheduled stop berths at, in path metres: the GTFS stop distance and the usable
 * platform ends. Built only from sourced platform geometry; paths without one are unaffected.
 */
export interface Berth { stopS: number; p0: number; p1: number }
/** Distance before and after a stop over which a berthing shift eases in and out. */
export const BERTH_REACH = 200;

/**
 * How far (path metres, + = forward in travel) to draw a scheduled consist so it berths inside
 * the platform. The timetable position is unchanged. The shift is 0 beyond BERTH_REACH and full at
 * the stop, so a moving train never jumps or stops early. It moves the consist only far enough to
 * fit; a consist longer than the platform is centred on it.
 */
export function berthShift(s: number, lengthM: number, berths: readonly Berth[] | undefined): number {
  if (!berths?.length) return 0;
  let best: Berth | undefined;
  for (const b of berths) if (Math.abs(s - b.stopS) < BERTH_REACH && (!best || Math.abs(s - b.stopS) < Math.abs(s - best.stopS))) best = b;
  if (!best) return 0;
  const half = lengthM / 2;
  const target = lengthM > best.p1 - best.p0 ? (best.p0 + best.p1) / 2
    : Math.min(Math.max(best.stopS, best.p0 + half), best.p1 - half);
  const t = 1 - Math.abs(s - best.stopS) / BERTH_REACH;
  const w = t * t * (3 - 2 * t); // smoothstep: no kink where the shift begins
  return w * (target - best.stopS);
}
const SNAP = 18;

/** Match a GTFS position to the same smoothed centreline used to build the physical rails.
 * Direction matters at Five Points, where the two corridors cross at different depths. */
export class CityTracks {
  private segments = new PlacementIndex<Segment>(32);
  constructor(alignments: Alignment[]) {
    for (const al of alignments) {
      const pts = al.line.pts;
      for (let i = 0; i + 1 < pts.length; i++) this.segments.add({ al, i }, [pts[i], pts[i + 1]], SNAP);
    }
  }

  locate(x: number, z: number, heading: number) {
    const angle = heading * Math.PI / 180;
    const hx = Math.sin(angle), hz = -Math.cos(angle);
    let closest = SNAP * SNAP;
    let found: { al: Alignment; s: number; dir: 1 | -1 } | undefined;
    for (const { al, i } of this.segments.at(x, z)) {
      const [ax, az] = al.line.pts[i];
      const [bx, bz] = al.line.pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len = al.line.cum[i + 1] - al.line.cum[i];
      const along = hx * dx + hz * dz;
      if (!len || Math.abs(along) < 0.65 * len) continue;
      const f = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (len * len)));
      const d2 = (x - ax - f * dx) ** 2 + (z - az - f * dz) ** 2;
      if (d2 >= closest) continue;
      closest = d2;
      found = { al, s: al.line.cum[i] + f * len, dir: along > 0 ? 1 : -1 };
    }
    return found;
  }
}

/** Keep a straddling car until its last end clears the mouth. The cut walls, roof and
 * board edge occlude/clip the covered part of the car throughout the transition. */
export function carInDaylight(al: Alignment, s: number) {
  return [s, s - CAR_LENGTH / 2, s + CAR_LENGTH / 2].some(t =>
    t >= 0 && t <= al.line.length && trackVisible(al, t));
}

export class CityTrains {
  readonly group = new THREE.Group();
  private tracks: CityTracks;
  private project: ReturnType<typeof makeProjector>;
  private night = { value: 0 };
  private geometries = new Map<string, THREE.BufferGeometry>();
  private pools = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[]; count: number }>();
  private direction = new THREE.Vector3();
  private orientation = new THREE.Matrix4();
  surfaceCars = 0;

  private berths = new Map<string, Berth[]>();
  /** Platform berths per path; scheduled consists are drawn inside them (see berthShift). */
  setBerths(berths: Map<string, Berth[]>) { this.berths = berths; }

  constructor(alignments: Alignment[], private manifest: SceneManifest, private bounds: VData['bounds'],
    private colors: Map<string, string>, private clip: THREE.Plane[],
    private cut?: ReturnType<typeof prepareEastCut>) {
    this.tracks = new CityTracks(alignments);
    this.project = makeProjector(manifest.origin);
    // Hidden templates so City's boot prewarm compiles the CQ400 program for both clip-plane counts
    // (board edges, and edges plus one tunnel-mouth plane) before any train enters after ready.
    // The colour and role are uniforms; they don't change the program.
    const template = cq400Geometry({ cab: false, u0: 0, u1: 1 }, '#888888');
    const mouth = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6); // never clips
    for (const clip of [this.clip, [...this.clip, mouth]]) {
      const mesh = new THREE.Mesh(template, cq400Material('#888888', { value: 0 }, this.night, clip));
      mesh.name = 'cq400 prewarm template';
      mesh.visible = false;
      this.group.add(mesh);
    }
  }

  /** Replace the drawn track and the area trains may appear in, e.g. when an adjacent board joins. */
  setTracks(alignments: Alignment[], bounds: VData['bounds']) {
    this.tracks = new CityTracks(alignments);
    this.bounds = bounds;
  }

  private car(trainId: string, color: string, role: number, placement?: NonNullable<ReturnType<ServiceTrack['car']>>) {
    const key = color + role + (placement?.clipped ? placement.name + placement.clipped : '');
    let pool = this.pools.get(key);
    if (!pool) {
      pool = { material: cq400Material(color, { value: role }, this.night, placement?.plane ? [...this.clip, placement.plane] : this.clip), meshes: [], count: 0 };
      this.pools.set(key, pool);
    }
    const slot = pool.count++;
    let mesh = pool.meshes[slot];
    if (!mesh) {
      const cab = role !== 0;
      const geometryKey = color + cab;
      let geometry = this.geometries.get(geometryKey);
      if (!geometry) {
        geometry = cq400Geometry({ cab, u0: 0, u1: 1 }, color);
        this.geometries.set(geometryKey, geometry);
      }
      mesh = new THREE.Mesh(geometry, pool.material);
      mesh.receiveShadow = true; // moving stock receives the City's cached static shadows
      pool.meshes.push(mesh);
      this.group.add(mesh);
    }
    mesh.userData.trainId = trainId;
    mesh.visible = true;
    return mesh;
  }

  update(states: TrainState[], darkness: number) {
    this.night.value = darkness;
    this.surfaceCars = 0;
    for (const p of this.pools.values()) p.count = 0;
    const b = this.bounds;
    for (const t of states) {
      const color = this.colors.get(t.routeId);
      if (!color || !this.manifest.profiles[t.pathId]) continue;
      const [x, z] = this.project(t.lon, t.lat);
      const units = Math.max(1, Math.round(t.lengthM.value / CAR_LENGTH));
      const pitch = CAR_LENGTH + CAR_GAP;
      const pad = units * pitch / 2;
      if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
      const track = this.tracks.locate(x, z, t.heading);
      // Live positions are drawn as reported; only timetable positions berth at a platform.
      const berth = t.s.tier === 'scheduled'
        ? berthShift(t.s.value, units * pitch - CAR_GAP, this.berths.get(t.pathId)) : 0;
      const mapped = this.cut?.paths.get(t.pathId);
      for (let i = 0; i < units; i++) {
        // The Map symbol is centred on the source position. Both ends can straddle a portal.
        const offset = ((units - 1) / 2 - i) * pitch;
        const role = i === 0 ? 1 : i === units - 1 ? -1 : 0;
        const placement = mapped?.routeId === t.routeId ? mapped.car(t.s.value, offset) : undefined;
        if (placement) {
          const car = this.car(t.id, color, role, placement);
          car.position.set(placement.x, this.cut!.treadY, placement.z);
          this.direction.set(placement.x + placement.dx, this.cut!.treadY, placement.z + placement.dz);
          car.quaternion.setFromRotationMatrix(this.orientation.lookAt(this.direction, car.position, car.up));
          if (i >= units / 2) car.rotateY(Math.PI);
          this.surfaceCars++;
          continue;
        }
        if (!track) continue;
        const { al, s, dir } = track;
        const sc = s + dir * (offset + berth);
        if (!carInDaylight(al, sc)) continue;
        const p = al.line.at(sc);
        const off = dir * MARTA_TRACK_OFFSET;
        const cx = p.x - p.nx * off, cz = p.z - p.nz * off;
        if (cx < b.minX - CAR_LENGTH / 2 || cx > b.maxX + CAR_LENGTH / 2 ||
            cz < b.minZ - CAR_LENGTH / 2 || cz > b.maxZ + CAR_LENGTH / 2) continue;
        const car = this.car(t.id, color, role);
        car.position.set(cx, al.elev(sc) + 0.55, cz);
        const q = al.line.at(sc + dir * 4);
        this.direction.set(q.x - q.nx * off, al.elev(sc + dir * 4) + 0.55, q.z - q.nz * off);
        // Both points are in track-local coordinates, including in terrain-anchored groups.
        car.quaternion.setFromRotationMatrix(this.orientation.lookAt(this.direction, car.position, car.up));
        if (i >= units / 2) car.rotateY(Math.PI);
        this.surfaceCars++;
      }
    }
    for (const p of this.pools.values()) {
      for (let i = p.count; i < p.meshes.length; i++) p.meshes[i].visible = false;
    }
  }
}
