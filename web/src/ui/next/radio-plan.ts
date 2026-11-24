/**
 * The radio's plan, kept free of audio and DOM so it can be tested: which station plays, the
 * shuffle order, and the shape and timing of every fade (docs/ui-controls-brief.md, Radio).
 */

export interface StationTrack {
  id: string;
  artist: string;
  title: string;
  /** Relative to the site root, e.g. "music/tracks/x.mp3". */
  src: string;
  cover: { small: string; large: string };
  durationS: number;
  source: string;
}

export interface Station {
  id: string;
  name: string;
  description: string;
  /** [start, end) local hours of the scene clock; end < start wraps past midnight. */
  defaultHours: [number, number];
  tracks: StationTrack[];
}

export interface StationsFile {
  version: number;
  stations: Station[];
}

/** A track rolls into the next over this long, starting this long before it ends. */
export const FADE_S = 5;
/** Fetch the next file this long before the current one ends, so the overlap never stalls. */
export const PRELOAD_S = 20;
/** Next, or a station switch. */
export const SKIP_FADE_S = 1.2;
/** Pause and resume, so nothing clicks. */
export const PAUSE_RAMP_S = 0.3;

export function inHours([start, end]: [number, number], hour: number): boolean {
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** The station for a scene-clock hour (fractional hours allowed). */
export function stationForHour(stations: Station[], hour: number): Station {
  return stations.find((s) => inHours(s.defaultHours, hour)) ?? stations[0];
}

/** A station the visitor chose on this device beats the clock. */
export function startStation(stations: Station[], hour: number, rememberedId: string | null): Station {
  return stations.find((s) => s.id === rememberedId) ?? stationForHour(stations, hour);
}

/** Shuffle within a station: every track plays once before any repeats, and a new round never
 * starts with the track that just ended. */
export class Shuffle {
  private bag: number[] = [];
  private last = -1;
  constructor(private readonly size: number, private readonly random: () => number = Math.random) {}
  next(): number {
    if (this.size <= 1) return (this.last = 0);
    if (!this.bag.length) {
      this.bag = Array.from({ length: this.size }, (_, i) => i);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag[this.bag.length - 1] === this.last) [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
    }
    return (this.last = this.bag.pop()!);
  }
}

/** When, in seconds into a track, to fetch the next file and to start the crossfade. */
export function trackTimeline(durationS: number): { preloadAt: number; fadeAt: number } {
  return {
    preloadAt: Math.max(0, durationS - PRELOAD_S),
    fadeAt: Math.max(0, durationS - FADE_S),
  };
}

/** Equal-power gain from `from` to `to` (each 0..1): level = sin(θ), θ moving linearly, so a track
 * fading in and one fading out keep constant summed power. Starting from the current level lets a
 * fade that is interrupted part-way turn round without a jump. */
export function gainAt(from: number, to: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const a = Math.asin(Math.min(1, Math.max(0, from)));
  const b = Math.asin(Math.min(1, Math.max(0, to)));
  return Math.sin(a + (b - a) * p);
}

/** The same curve sampled for AudioParam.setValueCurveAtTime. */
export function equalPowerCurve(from: number, to: number, steps = 64): Float32Array {
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) curve[i] = gainAt(from, to, i / (steps - 1));
  return curve;
}
