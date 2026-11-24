import * as THREE from 'three';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { TrainState } from '../model/types';
import { CAR_BOGIES, CAR_GAP, CAR_LENGTH, cq400Geometry, cq400Material } from '../vignette/cq400';
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
    // A hidden template so City's boot prewarm compiles the CQ400 program before any train enters
    // after ready. cq400Material pads every clip set to one plane count, so one program serves all;
    // colour and role are uniforms.
    const template = new THREE.Mesh(cq400Geometry({ cab: false, u0: 0, u1: 1 }, '#888888'), cq400Material('#888888', { value: 0 }, this.night, this.clip));
    template.name = 'cq400 prewarm template';
    template.visible = false;
    this.group.add(template);
  }

  /** Replace the drawn track and the area trains may appear in, e.g. when an adjacent board joins. */
  setTracks(alignments: Alignment[], bounds: VData['bounds']) {
    this.tracks = new CityTracks(alignments);
    this.bounds = bounds;
  }

  /**
   * Place a car with its two bogies on the track at b0 and b1 (CAR_BOGIES[0] and [1] in car-local
   * z): it rides the chord between them, as freight and the streetcar do, instead of centring on
   * the track and aiming along it, which swung its ends wide on tight curves.
   */
  private seat(car: THREE.Object3D, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0) || 1;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len, uz = (z1 - z0) / len, back = -CAR_BOGIES[0];
    car.position.set(x0 + ux * back, y0 + uy * back, z0 + uz * back);
    this.direction.set(car.position.x + ux, car.position.y + uy, car.position.z + uz);
    car.quaternion.setFromRotationMatrix(this.orientation.lookAt(this.direction, car.position, car.up));
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
          // Seat both bogies on the cut's track. A rear car faces back along the train.
          const k = i >= units / 2 ? -1 : 1;
          // Past the cut's mapped end, continue straight along the car's own heading.
          const [b0, b1] = CAR_BOGIES.map(bz => mapped!.car(t.s.value, offset + k * bz)
            ?? { x: placement.x + placement.dx * k * bz, z: placement.z + placement.dz * k * bz });
          this.seat(car, b0.x, this.cut!.treadY, b0.z, b1.x, this.cut!.treadY, b1.z);
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
        // Seat both bogies on the offset track (in track-local coordinates, including in
        // terrain-anchored groups). A rear car faces back along the train.
        const k = i >= units / 2 ? -dir : dir;
        const [a0, a1] = CAR_BOGIES.map(bz => sc + k * bz);
        const q0 = al.line.at(a0), q1 = al.line.at(a1);
        this.seat(car, q0.x - q0.nx * off, al.elev(a0) + 0.55, q0.z - q0.nz * off, q1.x - q1.nx * off, al.elev(a1) + 0.55, q1.z - q1.nz * off);
        this.surfaceCars++;
      }
    }
    for (const p of this.pools.values()) {
      for (let i = p.count; i < p.meshes.length; i++) p.meshes[i].visible = false;
    }
  }
}
