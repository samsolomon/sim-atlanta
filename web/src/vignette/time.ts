/** Simulated Atlanta clock, sun position and season for the vignette. */

const TZ = 'America/New_York';
export const ATL = { lat: 33.755, lon: -84.38 };

export class SimClock {
  private base: number;
  private real = performance.now();
  speed: number;
  constructor(start?: string | null, speed = 1) {
    this.base = start ? new Date(start).getTime() : Date.now();
    this.speed = speed;
  }
  now() {
    return new Date(this.base + (performance.now() - this.real) * this.speed);
  }
  set(d: Date) {
    this.base = d.getTime();
    this.real = performance.now();
  }
  setSpeed(s: number) {
    this.set(this.now());
    this.speed = s;
  }
}

const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour12: false, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });

/** Local Atlanta parts: fractional hour, weekend flag, day of year. */
export function local(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = (Number(p.hour) % 24) + Number(p.minute) / 60;
  const y = Number(p.year);
  const doy = Math.floor((Date.UTC(y, Number(p.month) - 1, Number(p.day)) - Date.UTC(y, 0, 0)) / 86_400_000);
  return { hour, weekend: p.weekday === 'Sat' || p.weekday === 'Sun', doy, weekday: p.weekday as string, month: Number(p.month), day: Number(p.day) };
}

const RAD = Math.PI / 180;

/** Solar elevation and azimuth (degrees, azimuth clockwise from north). NOAA approximation. */
export function sunPosition(d: Date, lat = ATL.lat, lon = ATL.lon) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = (d.getTime() - start) / 86_400_000;
  const g = (2 * Math.PI * (Math.floor(doy) - 1)) / 365;
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  const tst = utcMin + eot + 4 * lon;
  const ha = (tst / 4 - 180) * RAD;
  const phi = lat * RAD;
  const cosZ = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(Math.min(1, Math.max(-1, cosZ)));
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180;
  az = (az + 360) % 360;
  return { elevation: 90 - zen / RAD, azimuth: az };
}

/**
 * Leaf state for a deciduous tree on day-of-year `doy` in Atlanta, with a per-tree offset
 * in days so the canopy turns gradually. Returns colour stage and how much canopy remains.
 *   spring flush late March–April, summer green, colour late Oct–mid Nov, bare Dec–mid March.
 */
export function leafState(doy: number, offset: number) {
  const d = doy + offset;
  if (d < 75 || d > 345) return { stage: 'bare' as const, t: 0, canopy: 0 };
  if (d < 105) return { stage: 'spring' as const, t: (d - 75) / 30, canopy: 0.35 + 0.65 * ((d - 75) / 30) };
  if (d < 290) return { stage: 'summer' as const, t: 0, canopy: 1 };
  if (d < 322) return { stage: 'turning' as const, t: (d - 290) / 32, canopy: 1 };
  return { stage: 'dropping' as const, t: (d - 322) / 23, canopy: 1 - (d - 322) / 23 };
}
