/**
 * Words the shells show about data certainty, kept pure so the truth-tier rules are tested:
 * Live only at the real present with the live feed up; anything else reads Timetable, and a
 * sky that wasn't observed says so.
 */

export type View = 'map' | 'city' | 'models';

export interface LiveState {
  realTime: boolean; // the clock shows the real present (live data may apply)
  rail: 'live' | 'connecting' | 'down';
  trains: number;
  cityFreight: boolean;
  cityTraffic: boolean;
  buses: number | null; // null: bus feed unavailable or not shown
}

export interface Confidence {
  /** `live`: real present and the MARTA feed is up. Otherwise trains come from the timetable. */
  tier: 'live' | 'timetable' | 'loading';
  /** The sky on screen was observed (live weather, no preview override). */
  skyObserved: boolean;
  /** The clock is shifted, paused or sped up: offer a way back to now. */
  shifted: boolean;
}

export function confidence(s: Pick<LiveState, 'realTime' | 'rail'>, observedWeather: boolean, preview = false, loading = false): Confidence {
  return {
    // While City builds the scene isn't on screen yet: no word, a grey dot, never Live.
    tier: loading ? 'loading' : s.realTime && s.rail === 'live' ? 'live' : 'timetable',
    skyObserved: s.realTime && observedWeather && !preview,
    shifted: !s.realTime,
  };
}

/** The one scene-wide word (Sam, 2026-11-23, #231): Live or Timetable. Ambient scenery, the
 * sky included, carries no on-screen tier; the Key and About explain it. */
export function confidenceWords(c: Confidence): string[] {
  if (c.tier === 'loading') return [];
  const rail = c.tier === 'live' ? 'Live trains' : 'Timetable';
  return [rail, c.skyObserved ? 'weather reported' : 'illustrative sky'];
}

/** The first-visit hint, matched to the view and the input. */
export function hintText(view: View, touch: boolean): string {
  if (view === 'models') return touch ? 'Drag to turn the model · pinch to zoom' : 'Drag to turn the model · scroll to zoom';
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
export function sameTimeOnDate(ms: number, iso: string): number {
  const wall = ms + zoneOffset(ms); // Atlanta wall clock, as if it were UTC
  const tod = ((wall % 86_400_000) + 86_400_000) % 86_400_000;
  const guess = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + tod;
  const first = guess - zoneOffset(guess);
  return guess - zoneOffset(first);
}
