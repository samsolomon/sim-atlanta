import { describe, expect, it } from 'vitest';
import { PALETTES, paletteFor, type Sky } from './basestyle';
import { atmosphere, darkness } from '../core/atmosphere';

const clear = (sunElev: number): Sky => ({ sunElev, dark: darkness(sunElev), cloud: 0, rain: 0, snow: 0, fog: 0 });
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
};
const close = (a: string, b: string) => {
  const d = [16, 8, 0].map((s) => Math.abs(((parseInt(a.slice(1), 16) >> s) & 255) - ((parseInt(b.slice(1), 16) >> s) & 255)));
  return Math.max(...d) <= 1;
};

describe('paletteFor', () => {
  it('is the day palette with the sun high and no weather', () => {
    const p = paletteFor(clear(40));
    expect(close(p.ground, PALETTES.light.ground)).toBe(true);
    expect(close(p.street, PALETTES.light.street)).toBe(true);
  });

  it('is the night palette with the sun well below the horizon', () => {
    const p = paletteFor(clear(-30));
    expect(close(p.ground, PALETTES.night.ground)).toBe(true);
  });

  it('gets darker as the sun goes down, without jumps', () => {
    let prev = Infinity;
    for (let e = 20; e >= -14; e -= 1) {
      const l = lum(paletteFor(clear(e)).ground);
      expect(l).toBeLessThanOrEqual(prev + 0.5);
      if (prev !== Infinity) expect(prev - l).toBeLessThan(40);
      prev = l;
    }
  });

  it('caps how grey stacked weather can make the map', () => {
    const day = paletteFor(clear(40));
    const worst = paletteFor({ ...clear(40), cloud: 1, rain: 1, fog: 1 });
    // still clearly a light map, not mud
    expect(lum(worst.ground)).toBeGreaterThan(lum(day.ground) * 0.8);
  });

  it('lightens the ground for snow, and keeps night dark under snow', () => {
    expect(lum(paletteFor({ ...clear(40), snow: 1 }).ground)).toBeGreaterThan(lum(paletteFor(clear(40)).ground) - 1);
    expect(lum(paletteFor({ ...clear(-30), snow: 1 }).ground)).toBeLessThan(90);
  });
});

describe('atmosphere', () => {
  it('takes weather from the feed and lets overrides win', () => {
    const w = { kind: 'rain' as const, cloud: 1, rain: 0.7, fog: 0.3, label: 'rain', live: true };
    const a = atmosphere(new Date('2026-11-21T17:00:00Z'), w, { fog: 0 });
    expect(a.rain).toBe(0.7);
    expect(a.cloud).toBe(1);
    expect(a.fog).toBe(0);
  });

  it('treats snow as snow, not rain', () => {
    const w = { kind: 'overcast' as const, cloud: 1, rain: 0, fog: 0.4, label: 'snow', live: true };
    const a = atmosphere(new Date('2026-11-21T17:00:00Z'), w);
    expect(a.snow).toBeGreaterThan(0);
    expect(a.rain).toBe(0);
  });

  it('is night at 10 PM and day at noon in Atlanta (hour override)', () => {
    const now = new Date('2026-11-21T17:00:00Z'); // noon EST
    expect(atmosphere(now, null).dark).toBe(0);
    expect(atmosphere(now, null, { hour: 22 }).dark).toBe(1);
  });
});
