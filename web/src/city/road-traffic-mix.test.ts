import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { LENGTH, vehicleGeometry, VAN_PAINT, vanPaintIndex } from '../vignette/vehicles';
import { PICKUP_LENGTH, PICKUP_PAINTS } from '../vignette/road-pickup';
import { passengerKind, slotsFor, WORK_PICKUP_SHARE, type TrafficCourse } from './road-traffic';

const course = (speedMps: number, truckShare: number, semiShare?: number): TrafficCourse => ({
  line: new Line([[0, 0], [2000, 0]]), roads: [], speedMps, dailyFlow: 60000, truckShare, semiShare,
});
const kinds = (slots: { kind: string }[]) => new Set(slots.map(s => s.kind));

describe('road vehicle mix', () => {
  const arterial = course(13, 0.06), connector = course(18, 0.07, 0.7);
  it('keeps low on sedan, SUV and box truck, with the same slots as before', () => {
    const low = slotsFor([arterial, connector], 400, 1, 7, 'low');
    expect([...kinds(low)].sort()).toEqual(['box', 'sedan', 'suv']);
    const high = slotsFor([arterial, connector], 400, 1, 7, 'high');
    // Same phase, threshold and paint per slot; only pickups take the pickup palette instead.
    const plan = (slots: typeof low, pickups = new Set<number>()) => slots.map(({ kind, color, ...slot }, i) => ({
      ...slot, color: pickups.has(i) ? null : color, truck: kind === 'semi' || kind === 'box',
    }));
    const pickups = new Set(high.flatMap((s, i) => (s.kind === 'pickup' || s.kind === 'work' ? [i] : [])));
    expect(pickups.size).toBeGreaterThan(0);
    expect(plan(high, pickups)).toEqual(plan(low, pickups));
  });
  it('adds hatch, pickup, van and semi on high, with semis mostly on the Connector', () => {
    const slots = slotsFor([arterial, connector], 4000, 1, 11, 'high');
    for (const k of ['sedan', 'suv', 'hatch', 'pickup', 'work', 'van', 'box', 'semi']) expect(kinds(slots)).toContain(k);
    const semiFrac = (lane: TrafficCourse) => {
      const trucks = slots.filter(s => s.lane === lane && (s.kind === 'semi' || s.kind === 'box'));
      return trucks.filter(s => s.kind === 'semi').length / trucks.length;
    };
    expect(semiFrac(connector)).toBeGreaterThan(0.5);
    expect(semiFrac(arterial)).toBeLessThan(0.35);
  });
  it('draws about 1 in 4 pickups as the work trim, in pickup paints, at the F-150 length', () => {
    const picks = Array.from({ length: 20000 }, (_, i) => passengerKind((i + .5) / 20000));
    const pickups = picks.filter(p => p.kind === 'pickup' || p.kind === 'work');
    const work = pickups.filter(p => p.kind === 'work');
    expect(work.length / pickups.length).toBeCloseTo(WORK_PICKUP_SHARE, 2);
    const palette = Object.values(PICKUP_PAINTS).map(p => p.hex);
    // Every XLT paint appears; work trucks stay white, silver or grey, mostly white.
    expect(new Set(pickups.filter(p => p.kind === 'pickup').map(p => p.paint))).toEqual(new Set(palette));
    expect(new Set(work.map(p => p.paint))).toEqual(new Set([PICKUP_PAINTS.white.hex, PICKUP_PAINTS.silver.hex, PICKUP_PAINTS.grey.hex]));
    expect(work.filter(p => p.paint === PICKUP_PAINTS.white.hex).length / work.length).toBeGreaterThan(.5);
    // Other kinds keep the shared traffic palette (no paint override).
    expect(picks.filter(p => p.kind !== 'pickup' && p.kind !== 'work').every(p => p.paint === undefined)).toBe(true);
    // The pickup band itself is unchanged (0.79 to 0.92 of passengers).
    expect(pickups.length / picks.length).toBeCloseTo(.13, 2);
    expect(PICKUP_LENGTH).toBeCloseTo(5.893, 3);
  });
  it('builds the semi as one rigid body of its declared length, cab painted and van on its own paint kind', () => {
    const g = vehicleGeometry('semi');
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.z - b.min.z).toBeCloseTo(LENGTH.semi, 1);
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.05); // centred on its footprint
    expect((g.index ? g.index.count : g.getAttribute('position').count) / 3).toBeLessThanOrEqual(1700);
    const kinds = g.getAttribute('aKind');
    const positions = g.getAttribute('position');
    const paintedZ = [], rearLampZ = [];
    for (let i = 0; i < kinds.count; i++) {
      if (kinds.getX(i) === 0) paintedZ.push(positions.getZ(i));
      if (kinds.getX(i) === 2) rearLampZ.push(positions.getZ(i));
    }
    expect(Math.min(...paintedZ)).toBeGreaterThan(0);
    expect(Math.min(...rearLampZ)).toBeCloseTo(b.min.z, 1);
    const kindSet = new Set(Array.from(kinds.array));
    expect(kindSet.has(5)).toBe(true); // amber markers, lit at night
    expect(kindSet.has(6)).toBe(true); // van box, white unless a slot picks a plain colour
    g.dispose();
  });
  it('keeps most semi vans white, with an occasional plain colour', () => {
    const picks = Array.from({ length: 20000 }, (_, i) => vanPaintIndex((i + .5) / 20000));
    const coloured = picks.filter(p => p > 0).length / picks.length;
    expect(coloured).toBeGreaterThan(.08);
    expect(coloured).toBeLessThan(.2);
    for (let k = 1; k <= VAN_PAINT.length; k++) expect(picks).toContain(k);
    // Lamp plus 2 × index must round-trip through the shader's mod/floor split.
    for (const lamp of [0, 1]) for (let k = 0; k <= VAN_PAINT.length; k++) {
      const v = lamp + 2 * k;
      expect(v % 2).toBe(lamp);
      expect(Math.floor(v * .5 + .25)).toBe(k);
    }
  });
});
