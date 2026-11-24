import { describe, expect, it } from 'vitest';
import { LANDMARKS, search, VIEWS } from './search';
import { parseCityCamera } from './camera';
import { inCityArea } from './carry';
import { lonLatToScene } from './places';
import { PALETTES, paletteIsDark } from '../map/basestyle';

const stations = [
  { name: 'Peachtree Center', lon: -84.3877, lat: 33.7597 },
  { name: 'Five Points', lon: -84.3916, lat: 33.7539 },
  { name: 'Five Points', lon: -84.3916, lat: 33.7539 }, // a second platform's stop
];
const places = (q: string) => [{ name: 'Midtown', lon: -84.385, lat: 33.78 }, { name: 'Peachtree Hills', lon: -84.37, lat: 33.82 }]
  .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
const run = (q: string) => search(q, { stations, places, viewAt: () => ({ lon: 0, lat: 0 }) });

describe('search groups (brief c2008ecd)', () => {
  it('lists the Views first on an empty field, then places', () => {
    const hits = run('');
    expect(hits.slice(0, VIEWS.length).every((h) => h.group === 'Views' && h.view)).toBe(true);
    expect(hits.slice(VIEWS.length).every((h) => h.group === 'Places')).toBe(true);
  });
  it('orders typed results Views, Stations, Landmarks, Places, without duplicates', () => {
    const groups = run('peach').map((h) => h.group);
    expect(groups).toEqual(['Stations', 'Landmarks', 'Places']);
    expect(run('five').map((h) => `${h.group}:${h.name}`)).toEqual(['Views:Five Points from above, trains crossing', 'Stations:Five Points']);
  });
  it('matches word starts, ignoring case and punctuation', () => {
    expect(run('coca').map((h) => h.name)).toContain('World of Coca-Cola');
    expect(run('oints')).toEqual([]);
  });
});

describe('staged Views and landmarks', () => {
  it('every View is a valid City camera inside City’s area', () => {
    for (const v of VIEWS) {
      const c = parseCityCamera(v.cam);
      expect(c, v.id).not.toBeNull();
      expect(inCityArea(c!.x, c!.z), v.id).toBe(true);
      if (v.at) expect(v.at).toMatch(/^\d{2}:\d{2}$/);
    }
  });
  it('every landmark is inside City’s area', () => {
    for (const l of LANDMARKS) expect(inCityArea(...lonLatToScene({ lon: -84.3916, lat: 33.7539 }, l.lon, l.lat)), l.name).toBe(true);
  });
});

describe('map glass follows the painted ground', () => {
  it('is light for day, dawn and dusk palettes, dark for night', () => {
    for (const k of ['light', 'warm', 'golden', 'dusk', 'overcast', 'rain', 'fog']) expect(paletteIsDark(PALETTES[k]), k).toBe(false);
    expect(paletteIsDark(PALETTES.night)).toBe(true);
  });
});

import { timeOfDayOn } from '../ui/status';
describe('a View’s time of day', () => {
  it('lands on the same Atlanta date, in and out of daylight saving', () => {
    expect(timeOfDayOn(Date.parse('2026-11-24T10:00:00-05:00'), '17:20')).toBe(Date.parse('2026-11-24T17:20:00-05:00'));
    expect(timeOfDayOn(Date.parse('2026-11-24T23:30:00-05:00'), '17:20')).toBe(Date.parse('2026-11-24T17:20:00-05:00'));
    expect(timeOfDayOn(Date.parse('2026-07-04T01:00:00-04:00'), '17:20')).toBe(Date.parse('2026-07-04T17:20:00-04:00'));
  });
});
