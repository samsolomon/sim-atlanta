import { makeProjector, railSpanAt, type SceneManifest } from '../core/scene-data';
import type { TrainState } from '../model/types';

export const BLUE = 'marta:route:BLUE';
export const FOLLOW_CAMERA = { bearing: -148, tilt: 26, distance: 300 };
type Point = { x: number; z: number };
type Car = { visible: boolean; position: Point; userData: { trainId?: string } };
type Bounds = SceneManifest['bounds'];
type Phase = 'idle' | 'drawn' | 'covered' | 'unseen' | 'outside' | 'lost';

/** The followed identity belongs to the data source. City reuses a mesh for different trips. */
export class TrainFollow {
  private trip?: Pick<TrainState,'id'|'pathId'> & { tier: TrainState['s']['tier'] };
  private focus?: Point;
  private lastTime?: number;
  private requested = false;
  phase: Phase = 'idle';
  get active() { return !!this.trip; }

  start(train: TrainState) {
    this.stop();
    if (train.routeId !== BLUE) return;
    this.trip = { id:train.id, pathId:train.pathId, tier:train.s.tier };
    this.requested = true;
  }

  stop(phase: Phase = 'idle') {
    this.trip = undefined;
    this.focus = undefined;
    this.lastTime = undefined;
    this.requested = false;
    this.phase = phase;
  }

  recenter() { this.requested = this.active; }

  frame(states: TrainState[], cars: readonly Car[], project: ReturnType<typeof makeProjector>,
    bounds: Bounds, rail: SceneManifest['rail'], now: number, reducedMotion: boolean): Point | undefined {
    const trip = this.trip;
    if (!trip) return;
    const t = states.find(s => s.id === trip.id && s.routeId === BLUE && s.pathId === trip.pathId && s.s.tier === trip.tier);
    if (!t || !Number.isFinite(t.lon) || !Number.isFinite(t.lat)) {
      this.stop('lost');
      return;
    }
    const [x,z] = project(t.lon,t.lat);
    // Retain a consist crossing a board edge while at least one car remains on the board.
    let sx = 0, sz = 0, count = 0;
    for (const car of cars) {
      const p = car.position;
      if (!car.visible || car.userData.trainId !== t.id || p.x < bounds.minX || p.x > bounds.maxX ||
          p.z < bounds.minZ || p.z > bounds.maxZ) continue;
      sx += p.x; sz += p.z; count++;
    }
    if (!count && (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ)) {
      this.stop('outside');
      return;
    }
    const cover = railSpanAt(rail,t.pathId,t.s.value)?.cover;
    this.phase = count ? 'drawn' : cover === 'covered' || cover === 'roofed' ? 'covered' : 'unseen';
    const goal = count ? {x:sx/count,z:sz/count} : {x,z};
    const dt = Math.min(100, Math.max(0, now - (this.lastTime ?? now)));
    this.lastTime = now;
    if (!this.requested && reducedMotion) return;
    const previous = this.focus;
    if (!this.requested && previous) {
      const gap = Math.hypot(previous.x-goal.x, previous.z-goal.z);
      if (gap < .02) return;
      // A fast clock or scrub can cross a whole block in one frame. Keep the
      // selected consist in shot without flying through all the intervening streets.
      const k = Math.max(-Math.expm1(-dt/160), 1 - 8/gap);
      goal.x = previous.x + (goal.x-previous.x)*k;
      goal.z = previous.z + (goal.z-previous.z)*k;
    }
    this.requested = false;
    return this.focus = goal;
  }
}
