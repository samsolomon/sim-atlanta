/**
 * Which trains are on the map right now: timetable trains, with live MARTA rail
 * replacing its timetable counterparts when the clock shows the real present.
 * Shared by the 2D map and the 3D diorama so both always agree.
 */
import type { LiveMarta } from '../live/marta';
import type { TrainState } from '../model/types';
import type { Schedule } from '../sched/engine';
import { clock } from './clock';

export class TrainSource {
  current: TrainState[] = [];

  constructor(
    readonly schedule: Schedule,
    readonly live: LiveMarta,
  ) {}

  get liveActive() {
    return clock.isRealTime() && this.live.available;
  }

  private isMartaRail(routeId: string) {
    return this.schedule.routes.get(routeId)?.mode === 'heavy_rail' && routeId.startsWith('marta:');
  }

  /** Recompute `current` for the clock's present moment. */
  update(now = clock.now()): TrainState[] {
    const scheduled = this.schedule.trainsAt(now);
    this.current = this.liveActive
      ? scheduled.filter((t) => !this.isMartaRail(t.routeId)).concat(this.live.trains())
      : scheduled;
    return this.current;
  }

  find(id: string) {
    return this.current.find((t) => t.id === id);
  }
}
