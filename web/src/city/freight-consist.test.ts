import { describe, expect, it } from 'vitest';
import { FREIGHT_LENGTH } from '../vignette/freight-stock';
import { blockSizes, COUPLER_GAP, EMPTY_WELL, MAX_CAR_KINDS, MAX_POWER_KINDS, MAX_UNITS, maxTrainLength, planPassage, powerCount, SINGLE_STACK, type WellLoad } from './freight-consist';
import { DOWNTOWN_PROFILE } from './freight';
import { NORCROSS_PROFILE } from './brookwood-freight';

const POWER = { csx: ['locomotive', 'es44ah', 'gp382'], ns: ['locomotiveNs', 'es44acNs', 'sd70ace'] } as const;
const lines = [['csx:downtown', DOWNTOWN_PROFILE], ['ns:norcross:main2', NORCROSS_PROFILE]] as const;

describe('seeded freight passages', () => {
  it('is a pure function of line and slot, including negative slots', () => {
    for (const [id, profile] of lines) for (const slot of [-3, -1, 0, 1, 7, 123456]) {
      expect(planPassage(profile, slot, id)).toEqual(planPassage(profile, slot, id));
    }
    expect(planPassage(NORCROSS_PROFILE, 1, 'a')).not.toEqual(planPassage(NORCROSS_PROFILE, 2, 'a'));
  });

  it('keeps every passage within the power, block, kind and length rules', () => {
    const recipes = new Set<string>();
    let foreign = 0, multi = 0;
    for (const [id, profile] of lines) for (let slot = -500; slot < 2500; slot++) {
      const p = planPassage(profile, slot, id);
      recipes.add(`${profile.railroad}:${p.recipe}`);
      const power = p.units.filter(u => u.power), cars = p.units.filter(u => !u.power);
      // Power leads, faces forward, and scales with the trailing length.
      expect(p.units.slice(0, power.length).every(u => u.power)).toBe(true);
      expect(power[0].flip).toBe(false);
      const trailing = cars.reduce((s, u) => s + FREIGHT_LENGTH[u.kind], 0) + COUPLER_GAP * cars.length;
      expect(power.length).toBe(powerCount(trailing));
      // Railroad-consistent power; only a trailing unit may be foreign.
      expect((POWER[profile.railroad] as readonly string[]).includes(power[0].kind)).toBe(true);
      if (power.length > 1) {
        multi++;
        if (!(POWER[profile.railroad] as readonly string[]).includes(power[power.length - 1].kind)) foreign++;
      }
      // A small, fixed number of instanced draws per train on either tier.
      expect(new Set(power.map(u => u.kind)).size).toBeLessThanOrEqual(MAX_POWER_KINDS);
      expect(new Set(cars.map(u => u.kind)).size).toBeLessThanOrEqual(MAX_CAR_KINDS[p.recipe]);
      expect(p.units.length).toBeLessThanOrEqual(MAX_UNITS);
      expect(p.lengthM).toBeLessThanOrEqual(maxTrainLength(profile) + 1e-6);
      // Manifest blocks: runs of like cars, 3–8 long, the last at least 3.
      if (p.recipe === 'manifest') {
        const runs: number[] = [];
        cars.forEach((u, i) => (i && u.kind === cars[i - 1].kind ? runs[runs.length - 1]++ : runs.push(1)));
        expect(Math.min(...runs)).toBeGreaterThanOrEqual(3);
      }
      if (p.recipe === 'unit') {
        expect(new Set(cars.map(u => u.kind)).size).toBe(1);
        expect(['grainHopper', 'tank', 'autorack', 'coalLoaded', 'coalEmpty']).toContain(cars[0].kind);
      }
    }
    expect([...recipes].sort()).toEqual(['csx:intermodal', 'csx:manifest', 'csx:unit', 'ns:intermodal', 'ns:manifest', 'ns:unit']);
    // About one multi-unit passage in twelve borrows a foreign trailing unit.
    expect(foreign / multi).toBeGreaterThan(0.04);
    expect(foreign / multi).toBeLessThan(0.14);
  });

  it('deals each well its own containers: varied, never the same pair twice running, some empty or single', () => {
    const loads: WellLoad[] = [];
    let adjacentRepeats = 0;
    for (const [id, profile] of lines) for (let slot = 0; slot < 3000; slot++) {
      const p = planPassage(profile, slot, id);
      if (p.recipe !== 'intermodal') continue;
      const wells = p.units.filter((u) => !u.power);
      for (const [i, u] of wells.entries()) {
        expect(u.kind, `${id} ${slot}`).toBe('wellA');
        expect(u.load, `${id} ${slot}`).toBeDefined();
        const pair = (l: WellLoad) => `${l.bottom?.color}/${l.top?.color}`;
        if (i && pair(u.load!) === pair(wells[i - 1].load!)) adjacentRepeats++;
        // A top never rides on an empty well.
        if (!u.load!.bottom) expect(u.load!.top).toBeNull();
        if (u.load!.top?.long) expect(u.load!.bottom?.long).toBe(true);
        loads.push(u.load!);
      }
      // Same slot, same containers.
      expect(planPassage(profile, slot, id).units.map((u) => u.load)).toEqual(p.units.map((u) => u.load));
    }
    expect(loads.length).toBeGreaterThan(3000);
    expect(adjacentRepeats).toBe(0);
    const share = (f: (l: WellLoad) => boolean) => loads.filter(f).length / loads.length;
    expect(share((l) => !l.bottom)).toBeCloseTo(EMPTY_WELL, 1);
    expect(share((l) => !!l.bottom && !l.top)).toBeCloseTo(SINGLE_STACK, 1);
    // 40 ft boxes on 53s (the step at the ends) are common, not rare.
    expect(share((l) => !!l.bottom?.long && l.top?.long === false)).toBeGreaterThan(0.10);
    expect(share((l) => !!l.top && l.bottom?.long === l.top.long)).toBeGreaterThan(0.5);
    // Domestic boxes are mostly white (palette index 0), and every palette colour appears.
    const domestic = loads.flatMap((l) => [l.bottom, l.top]).filter((c) => c?.long);
    const counts = [0, 1, 2, 3, 4].map((k) => domestic.filter((c) => c!.color === k).length);
    expect(counts[0]).toBe(Math.max(...counts));
    expect(new Set(loads.flatMap((l) => [l.bottom?.color, l.top?.color]).filter((c) => c !== undefined)).size).toBe(10);
  });

  it('splits blocks of 3–8 with a final block of at least 3', () => {
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 3; n <= 30; n++) for (let k = 0; k < 50; k++) {
      const sizes = blockSizes(n, r);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(sizes.every(s => s >= 3 && s <= 8)).toBe(true);
    }
  });

  it('scales power at the 180 m and 400 m thresholds', () => {
    expect([179.9, 180, 399.9, 400].map(powerCount)).toEqual([1, 2, 2, 3]);
  });
});
