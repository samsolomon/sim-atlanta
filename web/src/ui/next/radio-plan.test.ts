import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FADE_S, PRELOAD_S, Shuffle, equalPowerCurve, gainAt, startStation, stationForHour, trackTimeline, type StationsFile } from './radio-plan';

const PUBLIC = join(__dirname, '../../../public');
const file = JSON.parse(readFileSync(join(PUBLIC, 'music/stations.json'), 'utf8')) as StationsFile;
const { stations } = file;

describe('stations.json', () => {
  it('names a file that exists for every track and cover', () => {
    for (const s of stations)
      for (const t of s.tracks) {
        expect(existsSync(join(PUBLIC, t.src)), t.src).toBe(true);
        expect(existsSync(join(PUBLIC, t.cover.small)), t.cover.small).toBe(true);
        expect(existsSync(join(PUBLIC, t.cover.large)), t.cover.large).toBe(true);
        expect(t.durationS).toBeGreaterThan(FADE_S + PRELOAD_S);
      }
  });
  it('covers every hour of the day exactly once', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const owners = stations.filter((s) => {
        const [a, b] = s.defaultHours;
        return a <= b ? h >= a && h < b : h >= a || h < b;
      });
      expect(owners.length, `hour ${h}`).toBe(1);
    }
  });
});

describe('station from the scene clock', () => {
  const at = (h: number) => stationForHour(stations, h).id;
  it('switches on the hour and wraps past midnight', () => {
    expect(at(4 + 59 / 60)).toBe('afterglow');
    expect(at(5)).toBe('glasshouse');
    expect(at(10.99)).toBe('glasshouse');
    expect(at(11)).toBe('sol-cafe');
    expect(at(17)).toBe('velvet');
    expect(at(21 + 59 / 60)).toBe('velvet');
    expect(at(22)).toBe('afterglow');
    expect(at(0)).toBe('afterglow');
  });
  it('lets a station the visitor picked beat the clock, and ignores a stale id', () => {
    expect(startStation(stations, 14, 'afterglow').id).toBe('afterglow');
    expect(startStation(stations, 14, 'gone').id).toBe('sol-cafe');
    expect(startStation(stations, 14, null).id).toBe('sol-cafe');
  });
});

describe('shuffle', () => {
  it('plays every track once before repeating, and never repeats across a round', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const s = new Shuffle(5, rand);
    let last = -1;
    for (let round = 0; round < 40; round++) {
      const seen = new Set<number>();
      for (let i = 0; i < 5; i++) {
        const n = s.next();
        expect(n).not.toBe(last);
        seen.add(n);
        last = n;
      }
      expect(seen.size).toBe(5);
    }
  });
  it('copes with one track', () => {
    const s = new Shuffle(1);
    expect([s.next(), s.next()]).toEqual([0, 0]);
  });
});

describe('fades', () => {
  it('fetches the next file 20 s ahead and starts the crossfade 5 s before the end', () => {
    expect(trackTimeline(180)).toEqual({ preloadAt: 160, fadeAt: 175 });
    expect(trackTimeline(3)).toEqual({ preloadAt: 0, fadeAt: 0 });
  });
  it('keeps equal power through a crossfade', () => {
    for (let p = 0; p <= 1; p += 0.05) {
      const inc = gainAt(0, 1, p);
      const out = gainAt(1, 0, p);
      expect(inc * inc + out * out).toBeCloseTo(1, 6);
    }
    expect(gainAt(0, 1, 0.5)).toBeCloseTo(Math.SQRT1_2, 6);
  });
  it('turns an interrupted fade round from where it was, without a jump', () => {
    const mid = gainAt(0, 1, 0.3);
    expect(gainAt(mid, 0, 0)).toBeCloseTo(mid, 6);
    expect(gainAt(mid, 0, 1)).toBeCloseTo(0, 6);
    const c = equalPowerCurve(mid, 1, 32);
    expect(c[0]).toBeCloseTo(mid, 6);
    expect(c[31]).toBeCloseTo(1, 6);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]);
  });
});
