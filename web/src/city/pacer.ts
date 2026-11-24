/**
 * Frame pacing. A device that can't hold its display's refresh rate draws uneven frames: the
 * Galaxy A16's 90 Hz panel shows a mix of 22.2 and 33.3 ms frames with 90–180 ms ones recurring,
 * and a rate that alternates like that judders more than a steady, slower one. So when the drawn
 * frames' median runs more than a quarter of a refresh late, City draws on every 2nd refresh
 * (45 fps at 90 Hz, 30 at 60), then every 3rd, never below 30 fps, and from time to time tries one
 * step faster again, backing off when the try fails.
 *
 * Pure: give it every requestAnimationFrame timestamp; it says whether to draw this one.
 */

export interface PacerOptions {
  /** Drawn frames per decision window. */
  window?: number;
  /** How long a step-down holds before it tries one step faster (ms); doubles after each failed try. */
  probeMs?: number;
  maxProbeMs?: number;
  /** The slowest paced rate (fps); pacing never steps below it. */
  minFps?: number;
}

export class FramePacer {
  /** Draw on every `divisor`th display refresh. */
  divisor = 1;
  /** Estimated display refresh interval (ms). */
  refreshMs = 1000 / 60;
  private readonly window: number;
  private readonly baseProbeMs: number;
  private readonly maxProbeMs: number;
  private readonly minFps: number;
  private probeMs: number;
  private lastTick = -Infinity;
  private lastDrawn = -Infinity;
  private readonly ticks: number[] = [];
  private readonly drawn: number[] = [];
  private steppedAt = 0;
  /** While trying one step faster: the divisor to return to if the try fails. */
  private probingFrom = 0;

  constructor(o: PacerOptions = {}) {
    this.window = o.window ?? 45;
    this.baseProbeMs = this.probeMs = o.probeMs ?? 8000;
    this.maxProbeMs = o.maxProbeMs ?? 64000;
    this.minFps = o.minFps ?? 30;
  }

  /** Whether to draw the frame at rAF timestamp `ts`. */
  tick(ts: number): boolean {
    const dt = ts - this.lastTick;
    this.lastTick = ts;
    // A hidden tab or a stall says nothing about the display: start the windows over.
    if (dt > 250) {
      this.drawn.length = 0;
      this.lastDrawn = -Infinity;
    } else if (dt > 2) {
      this.ticks.push(dt);
      if (this.ticks.length > 240) this.ticks.shift();
      if (this.ticks.length >= 30 && this.ticks.length % 30 === 0) this.refreshMs = refreshOf(this.ticks);
    }
    // Draw once at least divisor − ½ refreshes have passed, so jitter can't skip a slot.
    if (ts - this.lastDrawn < (this.divisor - 0.5) * this.refreshMs) return false;
    if (Number.isFinite(this.lastDrawn) && ts - this.lastDrawn <= 250) {
      this.drawn.push(ts - this.lastDrawn);
      if (this.drawn.length > this.window) this.drawn.shift();
    }
    this.lastDrawn = ts;
    this.decide(ts);
    return true;
  }

  private decide(ts: number) {
    if (this.drawn.length < this.window) return;
    const sorted = [...this.drawn].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    const late = median > (this.divisor + 0.25) * this.refreshMs;
    const maxDivisor = Math.max(1, Math.floor(1000 / this.minFps / this.refreshMs + 0.01));
    if (late && this.divisor < maxDivisor) {
      // A failed try at the faster rate: back off for longer before the next.
      if (this.probingFrom) this.probeMs = Math.min(this.maxProbeMs, this.probeMs * 2);
      // Straight to the rate the frames actually reach (a 90 Hz panel at 33 ms goes to every 3rd).
      const reach = Math.round(median / this.refreshMs);
      this.set(this.probingFrom || Math.min(maxDivisor, Math.max(this.divisor + 1, reach)), ts);
    } else if (this.probingFrom && !late) {
      // The try held for a whole window: keep it.
      this.probingFrom = 0;
      this.probeMs = this.baseProbeMs;
      this.steppedAt = ts;
    } else if (!late && this.divisor > 1 && ts - this.steppedAt > this.probeMs) {
      this.probingFrom = this.divisor;
      this.divisor -= 1;
      this.drawn.length = 0;
    }
  }

  private set(divisor: number, ts: number) {
    this.divisor = divisor;
    this.probingFrom = 0;
    this.steppedAt = ts;
    this.drawn.length = 0;
  }
}

/** Display refresh rates a browser commonly runs at. */
const RATES = [60, 75, 90, 100, 120, 144, 165];

/**
 * The display's refresh interval from rAF tick intervals: the slowest common rate whose whole
 * multiples explain nearly every tick. A device that never draws at its full rate still shows it,
 * because every frame lands on a refresh (the A16's 22.2 and 33.3 ms frames are 90 Hz's 2 and 3).
 */
export function refreshOf(ticks: readonly number[]): number {
  for (const hz of RATES) {
    const r = 1000 / hz;
    const fits = ticks.filter(t => { const k = Math.round(t / r); return k >= 1 && Math.abs(t - k * r) < Math.min(1.5, r * 0.15); }).length;
    if (fits >= ticks.length * 0.9) return r;
  }
  return 1000 / 60;
}
