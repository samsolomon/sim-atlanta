/** What the host page (main.ts) gives the A2c shell, and what the shell gives back. */
import type { AtmosphereOverride } from '../core/atmosphere';
import type { Weather } from '../core/weather';
import type { LiveState, View } from './status';

export type { LiveState, View } from './status';

export interface ShellOptions {
  view: View;
  onView(v: View): void;
  /** lon/lat at the centre of the current view. */
  center(): [number, number] | null;
  /** Move by a screen offset in CSS px (content moves opposite to the camera). */
  pan(dxPx: number, dyPx: number): void;
  zoom(dir: 1 | -1): void;
  rotate?(degrees: number): void;
  live(): LiveState;
  /** Called when fresh weather arrives (or is lost). */
  onWeather?(w: Weather | null): void;
  onSceneConditions(settings: AtmosphereOverride): void;
  /** Camera bearing in degrees clockwise from north (A2c compass). */
  bearing?(): number;
  /** Turn the camera to face north (A2c compass and N). */
  north?(): void;
  searchModels?(): void;
  goToPlace?(lon: number, lat: number): void;
  /** Search's other groups (Views, Stations, Landmarks) and its pick (brief c2008ecd: search keeps
   * the view). */
  search?: {
    stations(): readonly { name: string; lon: number; lat: number }[];
    /** A View's map position, from its camera target. */
    viewAt(cam: string): { lon: number; lat: number };
    /** True when City can show this point; in City, a place outside it reads "Map only". */
    inCity(lon: number, lat: number): boolean;
    /** Move the view on screen to the hit (City to City, Map to Map), or open City on a View. */
    pick(hit: import('../core/search').Hit): void;
  };
  outsideCity?(): boolean;
  centerCity?(): void;
  getTilt?(): number;
  setTilt?(degrees: number): void;
  /** Back to the real present at 1× (A2c "Now"). */
  onNow?(): void;
  /** The shell moved the shared clock (A2c Time & weather): refresh what depends on it. */
  onClock?(): void;
  /** Horizontal scale at the view centre, for "Metro Atlanta" past neighbourhood zoom. */
  metresPerPixel?(): number | null;
  /** Turn the Models camera back to its first view (A2c camera column in Models). */
  resetModelView?(): void;
  /** Escape for a view's own surfaces (the Models browser and Details): true when consumed. */
  viewEscape?(): boolean;
  /** Graphics quality for City (A2c menu): Auto picks by device, as `pickQuality` does. */
  graphics?: {
    get(): 'auto' | 'high' | 'low';
    set(q: 'auto' | 'high' | 'low'): void;
    /** What Auto settled on this session when it stepped down for a slow frame rate. */
    autoResolved?(): 'low' | null;
  };
  /** What a share link should reopen: City's camera, or the Map's hash (A2c share). */
  shareTarget?(): import('./share').ShareView | null;
  /** The selected train's stops ahead, as HTML (A2c "All stops"). */
  allStops?(): string | null;
  /** While City builds (A2c step 9): the notice text; the scene word waits for the reveal. */
  loading?(): string | null;
  /** The sky on screen (observed, typical or previewed), to name an illustrative condition. */
  sky?(): { cloud: number; rain: number; fog: number; snow: number } | null;
}

/** What the host page drives; both shells return it. */
export interface ShellApi {
  tick(now: Date): void;
  advanceMovement(t: number): void;
  weather(): Weather | null;
  /** Light or dark glass, following the sky (dark from about dusk). */
  setTheme(theme: 'light' | 'dark'): void;
  setView(v: View): void;
  /** One short status note (the area note); truth-tier words are never clipped. */
  setNote(text: string | null): void;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const longDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}
