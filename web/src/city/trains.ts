import * as THREE from 'three';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { TrainState } from '../model/types';
import { CAR_GAP, CAR_LENGTH, cq400Geometry, cq400Material } from '../vignette/cq400';
import { PlacementIndex } from '../vignette/spatial';
import { MARTA_TRACK_OFFSET, trackVisible, type Alignment, type VData } from '../vignette/world';

import type { prepareEastCut, ServiceTrack } from './east-cut';
import { GHOST, pushCarEnds, trackLevel, tunnelLevel, type CityGhosts } from './ghosts';
import { POOL, type PoolSink } from './headlight-pools';

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

/** The share of a car's length open to the sky. Follow reads it to give way to the next car
 * gradually: the mesh itself stays whole until carInDaylight drops it. */
export function daylightShare(al: Alignment, s: number) {
  const open = (t: number) => t >= 0 && t <= al.line.length && trackVisible(al, t);
  if (open(s - CAR_LENGTH / 2) && open(s) && open(s + CAR_LENGTH / 2)) return 1;
  const steps = 24;
  let n = 0;
  for (let k = 0; k <= steps; k++) if (open(s + (k / steps - .5) * CAR_LENGTH)) n++;
  return n / (steps + 1);
}

/**
 * Where a ghost may show along an alignment: inside its line and hidden from the sky (tunnel,
 * or track under a deck or roof that City doesn't draw it through).
 */
export function ghostHidden(al: Alignment, s: number) {
  return s >= 0 && s <= al.line.length && !trackVisible(al, s);
}

/** How a car centred at `s` sits against the cover: all open, all hidden, or straddling a mouth.
 * A straddling car's mouth is where the track goes from open to hidden, and `ahead` says the
 * hidden part lies toward +s. Cars whose ends are both open (a gap under a short roof) or both
 * hidden with an open middle count as open: City draws them whole and they get no ghost. */
export type CarCover = { kind: 'open' } | { kind: 'hidden' } | { kind: 'straddle'; mouth: number; ahead: boolean };
export function carCover(al: Alignment, s: number, hidden: (t: number) => boolean = t => ghostHidden(al, t)): CarCover {
  const h = CAR_LENGTH / 2;
  const a = hidden(s - h), m = hidden(s), b = hidden(s + h);
  if (a && m && b) return { kind: 'hidden' };
  if (a === b) return { kind: 'open' };
  // Bisect between the open end and the hidden end.
  let open = a ? s + h : s - h, shut = a ? s - h : s + h;
  for (let k = 0; k < 20; k++) {
    const mid = (open + shut) / 2;
    if (hidden(mid)) shut = mid; else open = mid;
  }
  return { kind: 'straddle', mouth: (open + shut) / 2, ahead: b };
}

/** The schematic depth of the track at s (negative below its surroundings). */
function profileAt(al: Alignment, s: number) {
  return al.elev(s) - (al.referenceY?.(s) ?? 0);
}

/** Ghost track window each side of a ghost train, as a share of its length, and its limits (m). */
export const TRACK_WINDOW = { share: 1.5, min: 120, max: 320, pitch: 7, dash: 4.6 } as const;

export class CityTrains {
  readonly group = new THREE.Group();
  /** Headlight pools at night on High (city/headlight-pools.ts); unset on Low. Lead cab only. */
  lights: PoolSink | null = null;
  private readonly poolNear = new THREE.Vector3();
  private readonly poolFar = new THREE.Vector3();
  private tracks: CityTracks;
  private project: ReturnType<typeof makeProjector>;
  private night = { value: 0 };
  private geometries = new Map<string, THREE.BufferGeometry>();
  private pools = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[]; count: number }>();
  private direction = new THREE.Vector3();
  private orientation = new THREE.Matrix4();
  surfaceCars = 0;
  /** Ghosts for cars in tunnel and the x-rayed train (city/ghosts.ts); unset: none. */
  ghosts: CityGhosts | null = null;
  /** The selected or followed train: all its cars are x-rayed wherever they are hidden. */
  xrayId: string | null = null;
  /** The x-rayed train's centreline in world space, lead first (cars this source places). */
  readonly xrayPoints: THREE.Vector3[] = [];
  /** Cars ghosted this frame, for tests and readouts. */
  ghostCars = 0;
  private ghostMatrix = new THREE.Matrix4();
  private ghostQuat = new THREE.Quaternion();
  private ghostPos = new THREE.Vector3();
  private ghostClip = new THREE.Vector4();
  private static readonly ONE = new THREE.Vector3(1, 1, 1);
  private static readonly TURN = new THREE.Quaternion(0, 1, 0, 0);

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
      mesh = new THREE.Mesh(this.geometry(color, cab), pool.material);
      mesh.receiveShadow = true; // moving stock receives the City's cached static shadows
      mesh.userData.cityTrains = true; // ghosts: this source x-rays its own cars
      pool.meshes.push(mesh);
      this.group.add(mesh);
    }
    mesh.userData.trainId = trainId;
    mesh.visible = true;
    return mesh;
  }

  private geometry(color: string, cab: boolean) {
    const geometryKey = color + cab;
    let geometry = this.geometries.get(geometryKey);
    if (!geometry) {
      geometry = cq400Geometry({ cab, u0: 0, u1: 1 }, color);
      this.geometries.set(geometryKey, geometry);
    }
    return geometry;
  }

  /** Any built car of this kind (positions match across line colours), else this train's own. */
  private anyGeometry(color: string, cab: boolean) {
    for (const [k, g] of this.geometries) if (k.endsWith(String(cab))) return g;
    return this.geometry(color, cab);
  }

  /** One ghost car: `local` is the car's pose in this group's space; `clip` a world plane or null. */
  private ghostCar(color: string, cab: boolean, local: THREE.Matrix4, level: number, clip: THREE.Vector4 | null) {
    const g = this.ghosts;
    if (!g) return;
    const batch = g.batch(cab ? 'cq400 cab' : 'cq400 middle', () => this.anyGeometry(color, cab), this.clip, cab ? 64 : 192);
    if (batch.add(this.ghostMatrix.multiplyMatrices(this.group.matrixWorld, local), level, clip)) this.ghostCars++;
  }

  /** The x-rayed train's centreline: each car's ends at mid-height, in world space. */
  private xrayPoint(local: THREE.Matrix4) {
    pushCarEnds(this.xrayPoints, this.ghostMatrix.multiplyMatrices(this.group.matrixWorld, local), CAR_LENGTH / 2, 1.9);
  }

  /** The ghost track window around a train in tunnel (its hidden cars span s0–s1; the whole
   * consist is `consist` metres), on its own track, only where hidden. */
  private ghostTrack(al: Alignment, s0: number, s1: number, off: number, consist: number) {
    const g = this.ghosts;
    if (!g) return;
    const batch = g.track(this.clip);
    // Sized on the whole consist, so it doesn't shrink as cars come out into the open.
    const w = Math.min(TRACK_WINDOW.max, Math.max(TRACK_WINDOW.min, TRACK_WINDOW.share * consist));
    const b = this.bounds;
    const { pitch, dash } = TRACK_WINDOW;
    // Dashes on a fixed grid along the line, so they stay put as the train moves through them.
    for (let t = Math.ceil((s0 - w) / pitch) * pitch; t <= s1 + w; t += pitch) {
      if (!ghostHidden(al, t)) continue;
      const p = al.line.at(t);
      const x = p.x - p.nx * off, z = p.z - p.nz * off;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      this.ghostPos.set(x, al.elev(t), z);
      this.ghostQuat.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(p.dx, p.dz));
      this.orientation.compose(this.ghostPos, this.ghostQuat, this.direction.set(1, 1, dash));
      const level = trackLevel(Math.max(s0 - t, t - s1, 0), w);
      if (!batch.add(this.ghostMatrix.multiplyMatrices(this.group.matrixWorld, this.orientation), level)) return;
    }
  }

  /** A pool ahead of the lead cab on its own track, only where that track shows (not in tunnels). */
  private light(al: Alignment, sc: number, dir: number, off: number) {
    const lights = this.lights;
    if (!lights?.active) return;
    const s0 = sc + dir * CAR_LENGTH / 2, s1 = s0 + dir * POOL.rail.length;
    // Exact track cover at both ends (carInDaylight judges a whole car, which is too lenient here).
    if (!trackVisible(al, s0) || !trackVisible(al, s1)) return;
    const a = al.line.at(s0), b = al.line.at(s1), box = this.bounds;
    const ax = a.x - a.nx * off, az = a.z - a.nz * off, bx = b.x - b.nx * off, bz = b.z - b.nz * off;
    if (bx < box.minX || bx > box.maxX || bz < box.minZ || bz > box.maxZ) return;
    // The car stands 0.55 m above the alignment, on the rail heads; the pool lies just over them.
    // Track coordinates are the group's; the pool batch is in world space.
    this.group.updateWorldMatrix(true, false);
    const near = this.poolNear.set(ax, al.elev(s0) + 0.57, az).applyMatrix4(this.group.matrixWorld);
    if (!lights.inRange(near.x, near.y, near.z)) return;
    const far = this.poolFar.set(bx, al.elev(s1) + 0.57, bz).applyMatrix4(this.group.matrixWorld);
    lights.add(near.x, near.y, near.z, far.x, far.y, far.z, POOL.rail.width, POOL.rail.power);
  }

  update(states: TrainState[], darkness: number) {
    this.night.value = darkness;
    this.surfaceCars = 0;
    this.ghostCars = 0;
    this.xrayPoints.length = 0;
    for (const p of this.pools.values()) p.count = 0;
    const b = this.bounds;
    if (this.ghosts) this.group.updateWorldMatrix(true, false);
    for (const t of states) {
      const color = this.colors.get(t.routeId);
      if (!color || !this.manifest.profiles[t.pathId]) continue;
      const [x, z] = this.project(t.lon, t.lat);
      const units = Math.max(1, Math.round(t.lengthM.value / CAR_LENGTH));
      const pitch = CAR_LENGTH + CAR_GAP;
      const pad = units * pitch / 2;
      if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
      const track = this.tracks.locate(x, z, t.heading);
      // Live positions are drawn as reported; only timetable positions (scheduled, or inferred
      // from an expired timetable) berth at a platform.
      const berth = t.s.tier !== 'live'
        ? berthShift(t.s.value, units * pitch - CAR_GAP, this.berths.get(t.pathId)) : 0;
      const mapped = this.cut?.paths.get(t.pathId);
      const xray = this.ghosts !== null && t.id === this.xrayId;
      // The consist's extent along its track while any car is in tunnel, for its track window.
      let ghostFrom = Infinity, ghostTo = -Infinity;
      for (let i = 0; i < units; i++) {
        // The Map symbol is centred on the source position. Both ends can straddle a portal.
        const offset = ((units - 1) / 2 - i) * pitch;
        const role = i === 0 ? 1 : i === units - 1 ? -1 : 0;
        const placement = mapped?.routeId === t.routeId ? mapped.car(t.s.value, offset) : undefined;
        if (placement) {
          const car = this.car(t.id, color, role, placement);
          car.userData.consistIndex = i;
          car.userData.daylight = 1; // its mouth's clipping plane says how much shows
          car.position.set(placement.x, this.cut!.treadY, placement.z);
          this.direction.set(placement.x + placement.dx, this.cut!.treadY, placement.z + placement.dz);
          car.quaternion.setFromRotationMatrix(this.orientation.lookAt(this.direction, car.position, car.up));
          if (i >= units / 2) car.rotateY(Math.PI);
          this.surfaceCars++;
          if (this.ghosts && (xray || placement.plane)) {
            car.updateMatrix();
            // Past its mouth's clipping plane a car is in tunnel: ghost that part (the plane, flipped).
            const pl = placement.plane;
            const clip = !xray && pl ? this.ghostClip.set(-pl.normal.x, -pl.normal.y, -pl.normal.z, -pl.constant) : null;
            this.ghostCar(color, role !== 0, car.matrix, xray ? GHOST.xrayTrain : GHOST.tunnel, clip);
            if (xray) this.xrayPoint(car.matrix);
            if (pl && track) {
              // Its track window runs on the located track, like the cars still in tunnel.
              const sc = track.s + track.dir * (offset + berth);
              ghostFrom = Math.min(ghostFrom, sc - CAR_LENGTH / 2);
              ghostTo = Math.max(ghostTo, sc + CAR_LENGTH / 2);
            }
          }
          if (i === 0 && this.lights?.active && this.lights.inRange(placement.x, this.cut!.treadY, placement.z)) {
            // The cut's tread is level; aim along the car's own heading, which leads in the travel direction.
            const n = Math.hypot(placement.dx, placement.dz) || 1, fx = placement.dx / n, fz = placement.dz / n;
            const y = this.cut!.treadY + 0.1, nx = placement.x + fx * CAR_LENGTH / 2, nz = placement.z + fz * CAR_LENGTH / 2;
            this.group.updateWorldMatrix(true, false);
            const near = this.poolNear.set(nx, y, nz).applyMatrix4(this.group.matrixWorld);
            const far = this.poolFar.set(nx + fx * POOL.rail.length, y, nz + fz * POOL.rail.length).applyMatrix4(this.group.matrixWorld);
            this.lights.add(near.x, near.y, near.z, far.x, far.y, far.z, POOL.rail.width, POOL.rail.power);
          }
          continue;
        }
        if (!track) continue;
        const { al, s, dir } = track;
        const sc = s + dir * (offset + berth);
        const drawn = carInDaylight(al, sc);
        const cover = this.ghosts ? carCover(al, sc) : null;
        if (!drawn && !(cover && cover.kind !== 'open')) continue;
        const p = al.line.at(sc);
        const off = dir * MARTA_TRACK_OFFSET;
        const cx = p.x - p.nx * off, cz = p.z - p.nz * off;
        if (cx < b.minX - CAR_LENGTH / 2 || cx > b.maxX + CAR_LENGTH / 2 ||
            cz < b.minZ - CAR_LENGTH / 2 || cz > b.maxZ + CAR_LENGTH / 2) continue;
        const q = al.line.at(sc + dir * 4);
        this.ghostPos.set(cx, al.elev(sc) + 0.55, cz);
        this.direction.set(q.x - q.nx * off, al.elev(sc + dir * 4) + 0.55, q.z - q.nz * off);
        // Both points are in track-local coordinates, including in terrain-anchored groups.
        this.ghostQuat.setFromRotationMatrix(this.orientation.lookAt(this.direction, this.ghostPos, THREE.Object3D.DEFAULT_UP));
        if (i >= units / 2) this.ghostQuat.multiply(CityTrains.TURN); // the rear half faces back, as rotateY(π)
        if (cover && (cover.kind !== 'open' || xray)) {
          const local = this.orientation.compose(this.ghostPos, this.ghostQuat, CityTrains.ONE);
          let clip: THREE.Vector4 | null = null;
          if (cover.kind === 'straddle' && !xray) {
            // Keep the hidden side of the mouth: the open part is the drawn car.
            const m = al.line.at(cover.mouth);
            const nx = cover.ahead ? m.dx : -m.dx, nz = cover.ahead ? m.dz : -m.dz;
            const w = this.direction.set(m.x - m.nx * off, 0, m.z - m.nz * off).applyMatrix4(this.group.matrixWorld);
            const n = this.ghostPos.set(nx, 0, nz).transformDirection(this.group.matrixWorld);
            clip = this.ghostClip.set(n.x, n.y, n.z, -n.dot(w));
            this.ghostPos.set(cx, al.elev(sc) + 0.55, cz);
          }
          this.ghostCar(color, role !== 0, local, xray ? GHOST.xrayTrain : tunnelLevel(profileAt(al, sc)), clip);
          if (xray) this.xrayPoint(local);
          if (cover.kind !== 'open') {
            ghostFrom = Math.min(ghostFrom, sc - CAR_LENGTH / 2);
            ghostTo = Math.max(ghostTo, sc + CAR_LENGTH / 2);
          }
        }
        if (!drawn) continue;
        const car = this.car(t.id, color, role);
        car.userData.consistIndex = i;
        car.userData.daylight = daylightShare(al, sc);
        car.position.copy(this.ghostPos);
        car.quaternion.copy(this.ghostQuat);
        this.surfaceCars++;
        if (i === 0) this.light(al, sc, dir, off);
      }
      if (ghostFrom < ghostTo && track) this.ghostTrack(track.al, ghostFrom, ghostTo, track.dir * MARTA_TRACK_OFFSET, units * pitch - CAR_GAP);
    }
    for (const p of this.pools.values()) {
      for (let i = p.count; i < p.meshes.length; i++) p.meshes[i].visible = false;
    }
  }
}
