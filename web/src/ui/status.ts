/**
 * Words the shells show about data certainty, kept pure so the truth-tier rules are tested:
 * Live only at the real present with the live feed up; anything else reads Timetable, and a
 * sky that wasn't observed says so.
 */
import type { Weather } from '../core/weather';

export type View = 'map' | 'city' | 'models';

export interface LiveState {
  realTime: boolean; // the clock shows the real present (live data may apply)
  rail: 'live' | 'connecting' | 'down';
  trains: number;
  cityFreight: boolean;
  cityTraffic: boolean;
  buses: number | null; // null: bus feed unavailable or not shown
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** The per-feed list behind the status card: each feed with its tier and source. */
export function liveDetails(s: LiveState, view: View, weather: Weather | null, weatherAt: number, nowMs = Date.now()): string {
  const rail = !s.realTime
    ? '<b>MARTA rail</b> timetable (the clock isn’t set to now)'
    : s.rail === 'live'
      ? `<b>MARTA rail</b> ${s.trains} MARTA trains, live positions`
      : s.rail === 'connecting'
        ? '<b>MARTA rail</b> connecting to MARTA…'
        : '<b>MARTA rail</b> MARTA live feed unavailable, showing the timetable';
  const bus = !s.realTime ? '<b>Buses</b> shown only at the present time' : s.buses == null ? '<b>Buses</b> live feed unavailable' : `<b>Buses</b> ${s.buses} MARTA buses, live positions`;
  const freight = view === 'city'
    ? s.cityFreight ? 'Train positions, timing and consists are illustrative.' : 'No freight simulation available in this scene.'
    : 'Track traffic comes from reported or inferred daily counts.';
  const traffic = view === 'city' && s.cityTraffic
    ? '<li><b>Road traffic</b> Illustrative vehicles follow a typical hourly pattern.</li>' : '';
  const wx = !s.realTime
    ? '<b>Atlanta weather</b> observations are available at the present time'
    : weather
    ? `<b>Atlanta weather</b> ${cap(weather.label)}${weather.tempF != null ? `, ${Math.round(weather.tempF)}°F` : ''} · Open-Meteo, ${Math.max(0, Math.round((nowMs - weatherAt) / 60000))} min ago`
    : '<b>Atlanta weather</b> unavailable right now';
  return `<ul><li>${rail}${view === 'city' ? '. MARTA visibility depends on track cover. Car counts and bodies are illustrative.' : ''}</li><li>${bus}</li><li><b>Freight</b> ${freight}</li>${traffic}<li>${wx}</li></ul>`;
}

export interface Confidence {
  /** `live`: real present and the MARTA feed is up. Otherwise trains come from the timetable. */
  tier: 'live' | 'timetable';
  /** The sky on screen was observed (live weather, no preview override). */
  skyObserved: boolean;
  /** The clock is shifted, paused or sped up: offer a way back to now. */
  shifted: boolean;
}

export function confidence(s: Pick<LiveState, 'realTime' | 'rail'>, observedWeather: boolean, preview = false): Confidence {
  return {
    tier: s.realTime && s.rail === 'live' ? 'live' : 'timetable',
    skyObserved: s.realTime && observedWeather && !preview,
    shifted: !s.realTime,
  };
}

/** The one scene-wide word (Sam, 2026-11-23, #231): Live or Timetable. Ambient scenery, the
 * sky included, carries no on-screen tier; the Key and About explain it. */
export function confidenceWords(c: Confidence): string[] {
  return [c.tier === 'live' ? 'Live' : 'Timetable'];
}

/** The first-visit hint, matched to the view and the input. */
export function hintText(view: View, touch: boolean): string {
  if (view === 'models') return touch ? 'Drag to turn the model · pinch to zoom' : 'Drag to turn the model · scroll to zoom';
  if (view === 'map') return touch ? 'Drag to move · pinch to zoom' : 'Drag to move · scroll to zoom';
  // City under ?ui=next moves like a map (city/map-gestures.ts).
  return touch ? 'Drag to move · twist to turn · pinch to zoom' : 'Drag to move · right-drag to turn';
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
