import * as THREE from 'three';
import { MovingQueue, MOVING_QUEUE_WAIT_S, type MovingBlocks } from './traffic-queues';
import { rng, type Line } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { local } from '../vignette/time';
import type { TrafficData } from '../vignette/traffic';
import { LENGTH, PAINT, vehicleGeometry, vehicleMaterial } from '../vignette/vehicles';
import type { TerrainCity } from '../terrain/transport-data';
import { perf, perfOverrides } from '../core/perf';
import { legacySignalPositions } from './traffic-signals-legacy';
import { signalPhase, signalPositions, SIGNAL_MAX_WAIT_S, type CourseSignal } from './traffic-signals';

const LAMP = { red: new THREE.Color('#ff3b30'), amber: new THREE.Color('#ffb020'), green: new THREE.Color('#34d058') };
const PHASES = ['red', 'amber', 'green'] as const;
/** Spacing (m) of each lane's cached road-height profile. */
const HEIGHT_STEP = 2;
/** A profile sample whose road surface is missing (a hole, a tunnel or off the board). */
const NO_ROAD = -Infinity;
/** Largest gap (m) allowed between a step's interpolation and the drawn road at its midpoint. */
const PROFILE_TOLERANCE = .005;
/** A sample this far below both rims around it is in a crack in the drawn surface (or it finds
 * no surface at all), not on a fold, slope or kerb step. */
const CRACK_M = .15;
/** Cracks narrower than this (a tyre's width) are bridged; wider gaps, holes and dips are not. */
const CRACK_WIDTH_M = .25;
/** Lanes whose nearest point is beyond this many metres from the camera re-pose at FAR_HZ;
 * nearer lanes every frame. FAR_HYSTERESIS either side stops a lane at the boundary flickering. */
const FAR_M = 600, FAR_HYSTERESIS = 30, FAR_HZ = 15;
/** Fractions of a step checked against the drawn road before it may interpolate. */
const CHECKS = [.5, .25, .75, .125, .375, .625, .875];
/** Metres around a car's footprint that still count as on screen: its long low-sun shadow, and
 * an off-screen car that would block a visible one at the same spot. */
const CULL_MARGIN = 30;
/** Scene heights a car can occupy, for culling before its height is known. */
const CULL_Y = [-80, 150] as const;

/** For each profile step of a line: the single vertex strictly inside it, -1, or -2 for several. */
function corners(line: Line, steps: number) {
  const out = new Int32Array(steps).fill(-1);
  for (let v = 1; v < line.pts.length - 1; v++) {
    const at = line.cum[v], i = Math.floor(at / HEIGHT_STEP);
    if (at === i * HEIGHT_STEP || i >= steps) continue; // on a sample: already exact
    out[i] = out[i] === -1 ? v : -2;
  }
  return out;
}

/** `line.at` without allocating: writes x, z into `out`. */
function pointAt(line: Line, s: number, out: { x: number; z: number }) {
  const vertex = line.vertexAt(s), pts = line.pts;
  const i = Math.min(Math.floor(vertex), pts.length - 2), f = vertex - i;
  const a = pts[i], b = pts[i + 1];
  out.x = a[0] + (b[0] - a[0]) * f;
  out.z = a[1] + (b[1] - a[1]) * f;
  return out;
}

/** A far car's last pose, replayed until its lane's next FAR_HZ tick. */
interface HeldCar {
  kind: Kind; color: THREE.Color; opacity: number;
  e: Float64Array; // rotation columns (9) then position (3), as written to the instance matrix
  x: number; y: number; z: number; half: number; ux: number; uz: number;
}

/** One course's per-frame state, built once so the frame loop allocates nothing. */
interface LaneState {
  course: TrafficCourse;
  slots: Slot[];
  /** Placed together with signals or a moving queue (positions depend on each other). */
  timed: boolean;
  queue?: MovingQueue;
  period: number;
  active: Slot[];
  trips: { start: number; length: number }[];
  bounds: THREE.Box3;
  /** Road height every HEIGHT_STEP metres (NaN until first sampled), and the source road index there. */
  heights: Float64Array;
  runs: Int32Array;
  /** Per step: the one lane vertex strictly inside it (its index), -1 for none, -2 for several. */
  corner: Int32Array;
  /** Road height at each lane vertex (NaN until first sampled), for corners inside a step. */
  vertexHeights: Float64Array;
  /** Per step: 0 untested, 1 interpolates within PROFILE_TOLERANCE, 2 sample exactly (a deck
   * edge, a step in the drawn surface or a terrain fold inside it). */
  smooth: Uint8Array;
  /** For steps that sample exactly (`smooth` 2): heights at the step's eighths (NaN off the
   * road) and, per eighth, 1 if it interpolates within PROFILE_TOLERANCE at its midpoint. */
  fine: Map<number, Float64Array>;
  /** Distance rate: far (with hysteresis), the 1/FAR_HZ tick last posed, this lane's offset
   * into that tick (so far lanes don't all re-pose on one frame), and the cars it held. */
  far: boolean;
  farTick: number;
  stagger: number;
  held: HeldCar[];
  heldCount: number;
}

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
  /** Optional historical same-lane blockers, bound once per arterial course. */
  movingBlocks?: (course: TrafficCourse) => MovingBlocks | undefined;
}
/** Offstage metres for one course. A signalised course adds the longest it can be held,
 * so a trip delayed at every light still leaves before its slot's next trip begins. */
function offstage(lane: TrafficCourse) {
  // The full red, plus headway for a 15-car queue, at every light.
  const budget = lane.signals?.length && !lane.closed ? lane.signals.length * (SIGNAL_MAX_WAIT_S + 30) : 0;
  return (lane.offstageM ?? 0) + (budget + (lane.queueWaitS ?? 0)) * lane.speedMps;
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
  /** Replay allowance for moving queues; excluded from visible-car demand. */
  queueWaitS?: number;
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
  private readonly movingQueues = new Map<TrafficCourse, MovingQueue>();
  private readonly peak: number;
  private share = 0;
  private pose = new THREE.Object3D();
  private lanes: LaneState[] = [];
  private headPhases: Uint8Array = new Uint8Array(0);
  private readonly frustumBox = new THREE.Box3();
  private readonly axles = [{ x: 0, z: 0, y: 0 }, { x: 0, z: 0, y: 0 }, { x: 0, z: 0, y: 0 }];
  private readonly point = { x: 0, z: 0 };
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
    courses = courses.map(course => {
      const blocks = opts.movingBlocks?.(course);
      if (!blocks) return course;
      // A delayed trip gets three additional minutes before its slot repeats.
      const queued = { ...course, queueWaitS: MOVING_QUEUE_WAIT_S };
      this.movingQueues.set(queued, new MovingQueue(queued.signals ?? [], queued.line.length, queued.speedMps, blocks));
      return queued;
    });
    this.slots = this.peak > 0 ? slotsFor(courses, cap, this.peak, seed) : [];
    this.lanes = this.buildLanes(courses);
    if (this.heads) this.headPhases = new Uint8Array(this.heads.signals.length).fill(255);
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

  private buildLanes(courses: TrafficCourse[]): LaneState[] {
    const byCourse = new Map<TrafficCourse, Slot[]>();
    for (const slot of this.slots) {
      const list = byCourse.get(slot.lane);
      if (list) list.push(slot); else byCourse.set(slot.lane, [slot]);
    }
    // Slots are generated course by course, so this keeps the original placement priority.
    return courses.flatMap((course, index) => {
      const slots = byCourse.get(course);
      if (!slots) return [];
      const queue = this.movingQueues.get(course);
      const bounds = new THREE.Box3();
      for (const [x, z] of course.line.pts) bounds.expandByPoint(new THREE.Vector3(x, 0, z));
      bounds.min.set(bounds.min.x - CULL_MARGIN, CULL_Y[0], bounds.min.z - CULL_MARGIN);
      bounds.max.set(bounds.max.x + CULL_MARGIN, CULL_Y[1], bounds.max.z + CULL_MARGIN);
      const n = Math.ceil(course.line.length / HEIGHT_STEP) + 2;
      return [{
        course, slots, queue, bounds,
        timed: !course.closed && (!!course.signals?.length || !!queue),
        period: course.line.length + offstage(course),
        active: [], trips: slots.map(() => ({ start: 0, length: 0 })),
        heights: new Float64Array(n).fill(NaN), runs: new Int32Array(n), corner: corners(course.line, n),
        vertexHeights: new Float64Array(course.line.pts.length).fill(NaN), smooth: new Uint8Array(n), fine: new Map(),
        far: false, farTick: NaN, stagger: (index * 0.6180339887) % 1, held: [], heldCount: 0,
      }];
    });
  }

  /** The hour's demand share, resolved once per clock second: building the local date costs
   * more than the rest of a frame's signal work, and the share drifts ~0.03% a second. Any seek,
   * drag or speed change lands on another second and recomputes. */
  private shareAt(clockMs: number) {
    const second = Math.floor(clockMs / 1000);
    if (second !== this.shareSecond) {
      this.shareSecond = second;
      this.shareCached = hourShare(this.opts.hourly, clockMs) / this.peak;
    }
    return this.shareCached;
  }
  private shareSecond = NaN;
  private shareCached = 0;

  /** Forget cached road heights, for when the ground under existing courses changes. */
  refreshHeights() {
    for (const lane of this.lanes) { lane.heights.fill(NaN); lane.vertexHeights.fill(NaN); lane.smooth.fill(0); lane.fine.clear(); }
    this.fillLane = this.fillStep = 0;
  }

  /** Road height at `s` on a lane, from its cached profile; null where no road is drawn. */
  private heightAt(lane: LaneState, s: number, x: number, z: number): number | null {
    let i = Math.floor(s / HEIGHT_STEP);
    const length = lane.course.line.length;
    // Within a tyre's width of either end, never interpolate: a bridged crack there could carry
    // a car past the end of a deck.
    if (s < CRACK_WIDTH_M || s > length - CRACK_WIDTH_M) return this.exactHeight(lane, s, x, z);
    // A point on a step boundary belongs to the step before, whose refined end knot may bridge
    // a crack there. The last step is shorter: its upper sample sits at the lane's end.
    if (s <= i * HEIGHT_STEP && i > 0) i--;
    const s0 = i * HEIGHT_STEP, span = Math.min(s0 + HEIGHT_STEP, length) - s0;
    if (!(span > 0)) {
      const a = this.profile(lane, i);
      return a === NO_ROAD ? this.exactHeight(lane, s, x, z) : a;
    }
    const smooth = lane.smooth[i] || this.classify(lane, i, s0, span);
    if (smooth === 1) return this.interpolate(lane, i, s0, span, s);
    // A step with a fold, a deck edge or a hole in it: interpolate within its eighths that pass
    // their own midpoint check, and sample exactly only inside the eighths that don't.
    const fine = lane.fine.get(i) ?? this.refine(lane, i, s0, span);
    const u = (s - s0) / span * 8, k = Math.min(7, Math.floor(u));
    return fine[9 + k] ? fine[k] + (fine[k + 1] - fine[k]) * (u - k) : this.exactHeight(lane, s, x, z);
  }

  /** First use of a step: keep interpolating only if the drawn road agrees at its eighths,
   * which catches deck edges, steps in the surface and terrain folds. */
  private classify(lane: LaneState, i: number, s0: number, span: number) {
    let smooth = 1;
    for (const t of CHECKS) {
      const at = s0 + span * t, p = pointAt(lane.course.line, at, this.point);
      const want = this.exactHeight(lane, at, p.x, p.z), got = this.interpolate(lane, i, s0, span, at);
      if (want === null || got === null || Math.abs(want - got) > PROFILE_TOLERANCE) { smooth = 2; break; }
    }
    return lane.smooth[i] = smooth;
  }

  /** Where `fillIdle` resumes: a lane, and a step within it. */
  private fillLane = 0;
  private fillStep = 0;

  /**
   * Classify (and refine) height-profile steps ahead of the cars until `deadline` (a
   * performance.now() time), so the frame loop rarely meets an unsampled step. Resumes where
   * it stopped; returns true once every step of every lane is ready.
   */
  fillIdle(deadline: number) {
    while (this.fillLane < this.lanes.length) {
      const lane = this.lanes[this.fillLane], length = lane.course.line.length;
      const steps = Math.ceil(length / HEIGHT_STEP);
      while (this.fillStep < steps) {
        if (performance.now() >= deadline) return false;
        const i = this.fillStep++, s0 = i * HEIGHT_STEP, span = Math.min(s0 + HEIGHT_STEP, length) - s0;
        if (!(span > 0)) continue;
        const smooth = lane.smooth[i] || this.classify(lane, i, s0, span);
        if (smooth === 2 && !lane.fine.has(i)) this.refine(lane, i, s0, span);
      }
      this.fillLane++;
      this.fillStep = 0;
    }
    return true;
  }

  /**
   * Exact heights at a step's eighths, and which eighths may interpolate between them.
   *
   * Cracks: the drawn road has seams narrower than a tyre (a deck joint, a board join) where
   * exact sampling drops to the ground far below or finds no surface; legacy cars dropped a
   * wheel into them for a frame. A crack narrower than 25 cm is bridged between its rims;
   * anything 25 cm or wider, and any kerb or deck step (whose rims differ), samples exactly.
   * Two real cracks of this kind on the 12-area board, worth fixing in the drawn surface
   * itself: Midtown arterials at (-169, -4148), a 13 m drop, and (-1, -3076), 0.24 m.
   */
  private refine(lane: LaneState, i: number, s0: number, span: number) {
    const fine = new Float64Array(17), mids = this.mids, line = lane.course.line;
    const exact = (at: number) => {
      const p = pointAt(line, at, this.point);
      const y = this.exactHeight(lane, at, p.x, p.z);
      return y === null ? NaN : y;
    };
    for (let k = 0; k <= 8; k++) fine[k] = exact(s0 + span * k / 8);
    for (let k = 0; k < 8; k++) mids[k] = exact(s0 + span * (k + .5) / 8);
    // A knot inside a crack: its rims an eighth either side are road, and bisecting toward each
    // rim finds the anomaly narrower than 25 cm. Knots on the step's ends take their outer rim
    // from just outside the step, so a crack on a step boundary is bridged too.
    // Never bridge within a tyre's width of either lane end: a crack there could carry a car
    // past the end of a deck.
    const h = span / 8, length = line.length, inside = (t: number) => t >= CRACK_WIDTH_M && t <= length - CRACK_WIDTH_M;
    for (let k = 0; k <= 8; k++) {
      const sk = s0 + h * k, ra = k > 0 ? fine[k - 1] : exact(sk - h), rb = k < 8 ? fine[k + 1] : exact(sk + h);
      if (ra !== ra || rb !== rb || !(h > 0) || !inside(sk - h) || !inside(sk + h)) continue;
      const expect = (t: number) => ra + (rb - ra) * (t - sk + h) / (2 * h);
      // A crack opens downward (to the ground below a deck) or onto no surface at all; a narrow
      // raised strip is a real bump and keeps exact sampling.
      const floor = Math.min(ra, rb) - CRACK_M;
      const odd = (t: number, y = exact(t)) => y !== y || y < floor;
      if (!odd(sk, fine[k])) continue;
      let lo = sk - h, hi = sk;
      for (let n = 0; n < 6; n++) { const m = (lo + hi) / 2; if (odd(m)) hi = m; else lo = m; }
      const left = lo;
      lo = sk; hi = sk + h;
      for (let n = 0; n < 6; n++) { const m = (lo + hi) / 2; if (odd(m)) lo = m; else hi = m; }
      if (hi - left < CRACK_WIDTH_M) fine[k] = expect(sk);
    }
    for (let k = 0; k < 8; k++) {
      const a = fine[k], b = fine[k + 1];
      if (a !== a || b !== b) continue; // the eighth reaches a hole or an edge: exact
      const mid = mids[k], line2 = (a + b) / 2;
      // Smooth, or a crack between valid rims a quarter-metre apart: interpolate.
      fine[9 + k] = mid === mid && Math.abs(mid - line2) <= PROFILE_TOLERANCE ? 1
        : (mid !== mid || mid < Math.min(a, b) - CRACK_M) && inside(s0 + h * k) && inside(s0 + h * (k + 1)) ? 1 : 0;
    }
    lane.fine.set(i, fine);
    return fine;
  }
  private readonly mids = new Float64Array(8);

  /** The profile's height at `s` inside step `i`, or null where it cannot interpolate. */
  private interpolate(lane: LaneState, i: number, s0: number, span: number, s: number): number | null {
    const a = this.profile(lane, i), b = this.profile(lane, i + 1);
    const roads = lane.course.roads, corner = lane.corner[i];
    if (a === NO_ROAD || b === NO_ROAD || corner === -2 || roads[lane.runs[i]] !== roads[lane.runs[i + 1]]) return null;
    if (corner >= 0) {
      // The lane turns inside this step: interpolate to the corner's own height on each side,
      // so a bend never cuts a chord below the road.
      const at = lane.course.line.cum[corner];
      let h = lane.vertexHeights[corner];
      if (h !== h) {
        const [vx, vz] = lane.course.line.pts[corner];
        const y = this.opts.roadHeight(vx, vz, roads[Math.min(roads.length - 1, corner)]);
        h = lane.vertexHeights[corner] = y === null || !Number.isFinite(y) ? NO_ROAD : y;
      }
      if (h === NO_ROAD) return null;
      return s <= at ? a + (h - a) * ((s - s0) / (at - s0)) : h + (b - h) * ((s - at) / (s0 + span - at));
    }
    return a + (b - a) * ((s - s0) / span);
  }

  private exactHeight(lane: LaneState, s: number, x: number, z: number) {
    const { line, roads } = lane.course;
    const y = this.opts.roadHeight(x, z, roads[Math.min(roads.length - 1, Math.floor(line.vertexAt(s)))]);
    return y === null || !Number.isFinite(y) ? null : y;
  }

  private profile(lane: LaneState, i: number) {
    const h = lane.heights;
    if (i >= h.length) return NO_ROAD;
    let y = h[i];
    if (y !== y) { // NaN: not sampled yet
      const { line, roads } = lane.course;
      const s = Math.min(i * HEIGHT_STEP, line.length);
      const run = Math.min(roads.length - 1, Math.floor(line.vertexAt(s)));
      const p = pointAt(line, s, this.point);
      const sampled = this.opts.roadHeight(p.x, p.z, roads[run]);
      y = h[i] = sampled === null || !Number.isFinite(sampled) ? NO_ROAD : sampled;
      lane.runs[i] = run;
    }
    return y;
  }

  /**
   * Pose this frame's cars. `view` (the camera frustum) skips cars that cannot be seen; without
   * it every car is placed. Signalised and queued lanes are placed only while any part of them
   * is in view, except moving queues, which step every frame to keep their replay continuous.
   */
  update(clockMs: number, darkness: number, view?: THREE.Frustum, eye?: THREE.Vector3) {
    const started = performance.now();
    if (perfOverrides.trafficLegacy) this.stepLegacy(clockMs, darkness);
    else if (perfOverrides.trafficNoCull) this.step(clockMs, darkness);
    else this.step(clockMs, darkness, view, perfOverrides.trafficNear ? undefined : eye);
    perf.traffic(performance.now() - started);
  }

  private step(clockMs: number, darkness: number, view?: THREE.Frustum, eye?: THREE.Vector3) {
    this.night.value = darkness;
    const counts = this.meshCounts;
    counts.clear();
    for (const [kind, mesh] of this.meshes) counts.set(kind, mesh.count), mesh.count = 0;
    this.visibleCars = 0;
    this.signalOverlaps = 0;
    if (!this.slots.length || !Number.isFinite(clockMs)) return this.finish(counts, false);
    this.share = this.shareAt(clockMs);
    const seconds = (clockMs - Date.UTC(2026, 0, 1)) / 1000;
    if (this.heads) {
      const { mesh, signals } = this.heads, last = this.headPhases;
      let changed = false;
      for (let i = 0; i < signals.length; i++) {
        const phase = signalPhase(signals[i].key, signals[i].axis, seconds);
        const k = phase === 'red' ? 0 : phase === 'amber' ? 1 : 2;
        if (last[i] === k) continue;
        last[i] = k;
        mesh.setColorAt(i, LAMP[PHASES[k]]);
        changed = true;
      }
      if (changed) mesh.instanceColor!.needsUpdate = true;
    }
    const box = this.opts.city.bounds;
    let dirty = false;
    for (const lane of this.lanes) {
      const { course, slots, active, trips } = lane;
      const inView = !view || view.intersectsBox(lane.bounds);
      if (!inView && !lane.queue) continue;
      // Distance rate: a far lane re-poses on its own FAR_HZ tick and replays its held cars between.
      let hold = false, record = false;
      if (eye && inView) {
        const d = lane.bounds.distanceToPoint(eye);
        lane.far = lane.far ? d > FAR_M - FAR_HYSTERESIS : d > FAR_M + FAR_HYSTERESIS;
        if (lane.far) {
          const tick = Math.floor(seconds * FAR_HZ + lane.stagger);
          if (tick === lane.farTick) hold = true;
          else { lane.farTick = tick; record = true; lane.heldCount = 0; }
        } else lane.farTick = NaN;
      } else lane.farTick = NaN;
      if (hold && !lane.queue) { dirty = this.replay(lane) || dirty; continue; }
      active.length = 0;
      for (const slot of slots) if (slot.threshold < this.share) active.push(slot);
      if (!active.length) continue;
      const v = course.speedMps, period = lane.period;
      let positions: readonly (number | null)[] | null = null;
      if (lane.timed) {
        trips.length = active.length;
        for (let i = 0; i < active.length; i++) {
          const trip = trips[i] ??= { start: 0, length: 0 };
          trip.start = (Math.floor((seconds * v + active[i].phase) / period) * period - active[i].phase) / v;
          trip.length = LENGTH[active[i].kind];
        }
        positions = lane.queue?.at(trips, seconds) ?? signalPositions(course.signals!, course.line.length, v, trips, seconds);
      }
      if (!inView) continue;
      if (hold) { dirty = this.replay(lane) || dirty; continue; }
      const line = course.line;
      for (let i = 0; i < active.length; i++) {
        const slot = active[i];
        const timed = positions ? positions[i] : undefined;
        if (timed === null) continue;
        const s = timed ?? THREE.MathUtils.euclideanModulo(seconds * v + slot.phase, period);
        const length = LENGTH[slot.kind], half = length / 2;
        if (!course.closed && (s < half || s > line.length - half)) continue;
        if (view) {
          const c = pointAt(line, course.closed ? THREE.MathUtils.euclideanModulo(s, line.length) : s, this.point);
          this.frustumBox.min.set(c.x - CULL_MARGIN, CULL_Y[0], c.z - CULL_MARGIN);
          this.frustumBox.max.set(c.x + CULL_MARGIN, CULL_Y[1], c.z + CULL_MARGIN);
          if (!view.intersectsBox(this.frustumBox)) continue;
        }
        const [front, rear, centre] = this.axles;
        if (!this.axle(lane, s + half, box, front) || !this.axle(lane, s - half, box, rear) || !this.axle(lane, s, box, centre)) continue;
        const { x, y, z } = centre;
        const dx = front.x - rear.x, dz = front.z - rear.z, horizontal = Math.hypot(dx, dz);
        if (!horizontal) continue;
        const heading = Math.atan2(dx, dz);
        if (this.opts.busOccupies?.(x, y, z, length, heading)) continue;
        const ux = dx / horizontal, uz = dz / horizontal, end = half + .75;
        const blocked = this.blocked(x, y, z, ux, uz, end);
        if (blocked) {
          if (timed != null && blocked === course) this.signalOverlaps++;
          continue;
        }
        const place = this.visible[this.visibleCars] ??= { x, y, z, half: end, ux, uz };
        place.x = x; place.y = y; place.z = z; place.half = end; place.ux = ux; place.uz = uz; place.lane = course;
        this.visibleCars++;
        // Rotation YXZ: heading about y, then pitch about x, written straight into the matrix.
        const dy = front.y - rear.y, slope = Math.hypot(horizontal, dy);
        const cy = uz, sy = ux, cx = horizontal / slope, sx = -dy / slope;
        const e = this.pose12;
        e[0] = cy; e[1] = 0; e[2] = -sy; e[3] = sy * sx; e[4] = cx; e[5] = cy * sx;
        e[6] = sy * cx; e[7] = -sx; e[8] = cy * cx; e[9] = x; e[10] = (front.y + rear.y) * .5 + .03; e[11] = z;
        const fromStart = course.fadeStartM ? (s - half) / course.fadeStartM : 1;
        const toEnd = course.fadeEndM ? (line.length - s - half) / course.fadeEndM : 1;
        const opacity = Math.min(1, fromStart, toEnd);
        dirty = this.emit(slot.kind, slot.color, e, opacity) || dirty;
        if (record) {
          const h = lane.held[lane.heldCount++] ??= { kind: slot.kind, color: slot.color, opacity, e: new Float64Array(12), x, y, z, half: end, ux, uz };
          h.kind = slot.kind; h.color = slot.color; h.opacity = opacity; h.e.set(e);
          h.x = x; h.y = y; h.z = z; h.half = end; h.ux = ux; h.uz = uz;
        }
      }
    }
    this.finish(counts, dirty);
  }

  private readonly pose12 = new Float64Array(12);

  /** Draw one car at the next instance of its kind's mesh; true if its matrix changed. */
  private emit(kind: Kind, c: THREE.Color, e: Float64Array, a: number) {
    const mesh = this.meshes.get(kind)!;
    const index = mesh.count++;
    const changed = write(mesh.instanceMatrix.array as Float32Array, index * 16, e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10], e[11]);
    const opacity = mesh.geometry.getAttribute('tripOpacity') as THREE.InstancedBufferAttribute | undefined;
    if (opacity) {
      const arr = opacity.array as Float32Array;
      if (arr[index] !== Math.fround(a)) { arr[index] = a; opacity.needsUpdate = true; }
    }
    const colors = mesh.instanceColor?.array as Float32Array | undefined;
    if (!colors || colors[index * 3] !== Math.fround(c.r) || colors[index * 3 + 1] !== Math.fround(c.g) ||
        colors[index * 3 + 2] !== Math.fround(c.b)) {
      mesh.setColorAt(index, c);
      mesh.instanceColor!.needsUpdate = true;
    }
    return changed;
  }

  /** A far lane between its ticks: its cars where they were last posed, still occupying their
   * footprints so nearer cars keep clear of them. A bus, streetcar or car that has moved into a
   * held footprint since the tick hides that car, as it would a freshly posed one. */
  private replay(lane: LaneState) {
    let dirty = false;
    for (let i = 0; i < lane.heldCount; i++) {
      const h = lane.held[i];
      if (this.opts.busOccupies?.(h.x, h.y, h.z, LENGTH[h.kind], Math.atan2(h.ux, h.uz))) continue;
      if (this.blocked(h.x, h.y, h.z, h.ux, h.uz, h.half)) continue;
      const place = this.visible[this.visibleCars] ??= { x: h.x, y: h.y, z: h.z, half: h.half, ux: h.ux, uz: h.uz };
      place.x = h.x; place.y = h.y; place.z = h.z; place.half = h.half; place.ux = h.ux; place.uz = h.uz; place.lane = lane.course;
      this.visibleCars++;
      dirty = this.emit(h.kind, h.color, h.e, h.opacity) || dirty;
    }
    return dirty;
  }

  private readonly meshCounts = new Map<Kind, number>();

  /** Upload instance matrices only when a pose or the drawn count changed. */
  private finish(previous: Map<Kind, number>, dirty: boolean) {
    for (const [kind, mesh] of this.meshes) {
      if (!dirty && mesh.count === previous.get(kind)) continue;
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, mesh.count * 16);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** One axle on the lane's drawn road, or false where the road is missing or off the board. */
  private axle(lane: LaneState, at: number, box: TerrainCity['bounds'], out: { x: number; z: number; y: number }) {
    const line = lane.course.line;
    if (lane.course.closed) at = THREE.MathUtils.euclideanModulo(at, line.length);
    const p = pointAt(line, at, out);
    if (p.x <= box.minX || p.x >= box.maxX || p.z <= box.minZ || p.z >= box.maxZ) return false;
    const y = this.heightAt(lane, Math.min(Math.max(at, 0), line.length), p.x, p.z);
    if (y === null) return false;
    out.y = y;
    return true;
  }

  /** The course of an already placed car whose footprint this car's would overlap, if any.
   * Both oriented footprints are checked: two crossing cars can touch even when neither
   * centre is inside the other's lane, or pass on different levels. */
  private blocked(x: number, y: number, z: number, ux: number, uz: number, end: number) {
    const side = 1.1;
    for (let i = 0; i < this.visibleCars; i++) {
      const prev = this.visible[i], vx = prev.x - x, vz = prev.z - z;
      if (Math.abs(prev.y - y) >= 2.5 || Math.abs(vx) > end + prev.half + 2 * side ||
          Math.abs(vz) > end + prev.half + 2 * side) continue;
      const dot = Math.abs(ux * prev.ux + uz * prev.uz), cross = Math.abs(ux * prev.uz - uz * prev.ux);
      if (Math.abs(vx * ux + vz * uz) < end + prev.half * dot + side * cross &&
          Math.abs(vx * uz - vz * ux) < side + prev.half * cross + side * dot &&
          Math.abs(vx * prev.ux + vz * prev.uz) < prev.half + end * dot + side * cross &&
          Math.abs(vx * prev.uz - vz * prev.ux) < side + end * cross + side * dot) return prev.lane ?? true;
    }
    return null;
  }

  /** The pre-2026-11-24 path, kept for `?perf&traffic=legacy` A/B runs on a device. */
  private stepLegacy(clockMs: number, darkness: number) {
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
      if (slot.threshold >= this.share || (!slot.lane.signals?.length && !this.movingQueues.has(slot.lane)) || slot.lane.closed) continue;
      const list = byLane.get(slot.lane);
      if (list) list.push(slot); else byLane.set(slot.lane, [slot]);
    }
    for (const [lane, slots] of byLane) {
      const period = lane.line.length + offstage(lane), v = lane.speedMps;
      const trips = slots.map(sl => ({
        start: (Math.floor((seconds * v + sl.phase) / period) * period - sl.phase) / v, length: LENGTH[sl.kind] }));
      const pos = this.movingQueues.get(lane)?.at(trips, seconds)
        ?? legacySignalPositions(lane.signals!, lane.line.length, v, trips, seconds);
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

/** Write a pose (rotation columns, then position) at `o` of a column-major matrix array; true
 * if any element changed. */
function write(m: Float32Array, o: number, e0: number, e1: number, e2: number, e4: number, e5: number, e6: number,
  e8: number, e9: number, e10: number, x: number, y: number, z: number) {
  const before = m[o] !== Math.fround(e0) || m[o + 1] !== Math.fround(e1) || m[o + 2] !== Math.fround(e2) ||
    m[o + 4] !== Math.fround(e4) || m[o + 5] !== Math.fround(e5) || m[o + 6] !== Math.fround(e6) ||
    m[o + 8] !== Math.fround(e8) || m[o + 9] !== Math.fround(e9) || m[o + 10] !== Math.fround(e10) ||
    m[o + 12] !== Math.fround(x) || m[o + 13] !== Math.fround(y) || m[o + 14] !== Math.fround(z) || m[o + 15] !== 1;
  if (!before) return false;
  m[o] = e0; m[o + 1] = e1; m[o + 2] = e2; m[o + 3] = 0;
  m[o + 4] = e4; m[o + 5] = e5; m[o + 6] = e6; m[o + 7] = 0;
  m[o + 8] = e8; m[o + 9] = e9; m[o + 10] = e10; m[o + 11] = 0;
  m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1;
  return true;
}
