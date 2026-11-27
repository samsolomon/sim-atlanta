/**
 * Words the shells show about data certainty, kept pure so the truth-tier rules are tested:
 * Live only at the real present with the live feed up; Timetable while a published timetable
 * covers the moment; Inferred once an expired one is repeated; and a sky that wasn't observed
 * says so.
 */
import type { Projection } from '../model/types';
import { shortYmd } from '../sched/time';

export type View = 'map' | 'city' | 'models';

export interface LiveState {
  realTime: boolean; // the clock shows the real present (live data may apply)
  rail: 'live' | 'connecting' | 'down';
  trains: number;
  cityFreight: boolean;
  cityTraffic: boolean;
  buses: number | null; // null: bus feed unavailable or not shown
  /** An expired timetable repeated for this moment (MARTA past its last published date), or null
   * while every published timetable covers it. */
  projected: Projection | null;
}

export interface Confidence {
  /** `live`: real present and the MARTA feed is up. Otherwise trains come from the timetable,
   * or `inferred` from a repeat of an expired one. */
  tier: 'live' | 'timetable' | 'inferred' | 'loading';
  /** The sky on screen was observed (live weather, no preview override). */
  skyObserved: boolean;
  /** The clock is shifted, paused or sped up: offer a way back to now. */
  shifted: boolean;
}

export function confidence(s: Pick<LiveState, 'realTime' | 'rail'> & Partial<Pick<LiveState, 'projected'>>, observedWeather: boolean, preview = false, loading = false): Confidence {
  return {
    // While City builds the scene isn't on screen yet: no word, a grey dot, never Live.
    tier: loading ? 'loading' : s.realTime && s.rail === 'live' ? 'live' : s.projected ? 'inferred' : 'timetable',
    skyObserved: s.realTime && observedWeather && !preview,
    shifted: !s.realTime,
  };
}

/** Rail feed state for the shells: live only while live trains are active (real present, a fresh feed). */
export function railStatus(liveActive: boolean, error: string | null): LiveState['rail'] {
  return liveActive ? 'live' : error ? 'down' : 'connecting';
}

/** The Final subject card names rail and weather confidence separately. */
export function confidenceWords(c: Confidence): string[] {
  if (c.tier === 'loading') return [];
  const rail = c.tier === 'live' ? 'Live trains' : c.tier === 'inferred' ? 'Inferred' : 'Timetable';
  return [rail, c.skyObserved ? 'weather reported' : 'illustrative sky'];
}

/** A projected trip's source, as its card reads it. */
export const projectionText = (p: Projection) => `Inferred from ${p.agency}’s last published timetable (ended ${shortYmd(p.ended)})`;

/** The notice when live rail is down at the present: it names what is actually shown. */
export function feedNotice(s: Pick<LiveState, 'realTime' | 'rail' | 'projected'>): string | null {
  if (!s.realTime || s.rail !== 'down') return null;
  return s.projected ? `Live feed unavailable · showing trains inferred from ${s.projected.agency}’s last timetable` : 'Live feed unavailable · showing the timetable';
}

/** What a paused share link shows of the trains. */
export const frozenTrains = (projected: Projection | null) =>
  projected ? `Trains inferred from ${projected.agency}’s last published timetable.` : 'Trains from the timetable.';

/** The first-visit hint, matched to the view and the input. */
export function hintText(view: View, touch: boolean): string {
  if (view === 'models') return touch ? 'Drag to turn the model · pinch to zoom' : 'Drag to turn the model · scroll to zoom';
  if (view === 'map') return touch ? 'Tap anything to inspect. Pinch to zoom.' : 'Click anything to inspect · drag to move · scroll to zoom';
  return touch ? 'Tap anything to inspect. Pinch to zoom, two fingers to tilt.' : 'Click anything to inspect · drag to move · two-finger scroll to tilt';
}

export interface Sky { cloud: number; rain: number; fog: number; snow: number }

/** A plain condition for the sky on screen, observed or illustrative. */
export function skyLabel(s: Sky): { label: string; kind: 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog'; snow: boolean } {
  if (s.snow > 0.3) return { label: 'Snow', kind: 'overcast', snow: true };
  if (s.rain >= 0.95) return { label: 'Storm', kind: 'storm', snow: false };
  if (s.rain > 0.6) return { label: 'Rain', kind: 'rain', snow: false };
  if (s.rain > 0.05) return { label: 'Light rain', kind: 'rain', snow: false };
  if (s.fog > 0.6) return { label: 'Fog', kind: 'fog', snow: false };
  if (s.cloud > 0.75) return { label: 'Overcast', kind: 'overcast', snow: false };
  if (s.cloud > 0.3) return { label: 'Partly cloudy', kind: 'cloudy', snow: false };
  return { label: 'Clear', kind: 'clear', snow: false };
}

/** Past neighbourhood scale (the view spans more than this many metres) the card reads "Metro Atlanta". */
export const NEIGHBOURHOOD_SPAN_M = 6000;

export function placeLabel(name: string | null, spanM: number | null): string | null {
  if (!name) return null;
  if (spanM != null && spanM > NEIGHBOURHOOD_SPAN_M && name !== 'Georgia') return 'Metro Atlanta';
  return name;
}

/** The time slider covers 12 hours either side of its anchor, in minutes. */
export const SLIDER_MIN = 720;
export const sliderValue = (simMs: number, anchorMs: number) =>
  Math.max(-SLIDER_MIN, Math.min(SLIDER_MIN, Math.round((simMs - anchorMs) / 60_000)));

/** Whole days between two Atlanta calendar dates (yyyy-mm-dd). */
export function dayDiff(fromIso: string, toIso: string): number {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((d(toIso) - d(fromIso)) / 86_400_000);
}

const isoFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
/** The Atlanta calendar date of an instant, as yyyy-mm-dd. */
export const atlantaDate = (ms: number) => isoFmt.format(ms);

const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const zoneOffset = (ms: number) => {
  const p = Object.fromEntries(partsFmt.formatToParts(ms).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};

/** The instant on Atlanta date `iso` that keeps the wall-clock time of `ms` (DST-safe). */
/** `hhmm` ("17:45", Atlanta wall clock) on the Atlanta date that `ms` falls on. */
export function timeOfDayOn(ms: number, hhmm: string): number {
  const wall = ms + zoneOffset(ms);
  const [h, m] = hhmm.split(':').map(Number);
  const guess = wall - (((wall % 86_400_000) + 86_400_000) % 86_400_000) + (h * 60 + m) * 60_000;
  const first = guess - zoneOffset(guess);
  return guess - zoneOffset(first);
}

export function sameTimeOnDate(ms: number, iso: string): number {
  const wall = ms + zoneOffset(ms); // Atlanta wall clock, as if it were UTC
  const tod = ((wall % 86_400_000) + 86_400_000) % 86_400_000;
  const guess = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + tod;
  const first = guess - zoneOffset(guess);
  return guess - zoneOffset(first);
}
