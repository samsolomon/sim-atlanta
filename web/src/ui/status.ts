/**
 * Words the shells show about data certainty, kept pure so the truth-tier rules are tested:
 * Live only at the real present with the live feed up; anything else reads Timetable, and a
 * sky that wasn't observed says so.
 */
import type { Weather } from '../core/weather';

export type View = 'map' | 'city';

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

/** The words of the confidence line, before an optional date or "Now" action. */
export function confidenceWords(c: Confidence): string[] {
  return [c.tier === 'live' ? 'Live' : 'Timetable', ...(c.skyObserved ? [] : ['illustrative sky'])];
}

/** The first-visit hint, matched to the view and the input. */
export function hintText(view: View, touch: boolean): string {
  if (view === 'map') return touch ? 'Drag to move · pinch to zoom' : 'Drag to move · scroll to zoom';
  return touch ? 'Drag to look around · pinch to zoom' : 'Drag to look around · right-drag to move';
}
