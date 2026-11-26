import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { LENGTH, vehicleGeometry, VAN_PAINT, vanPaintIndex } from '../vignette/vehicles';
import { slotsFor, type TrafficCourse } from './road-traffic';

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
    const plan = (slots: typeof low) => slots.map(({ kind, ...slot }) => ({
      ...slot, truck: kind === 'semi' || kind === 'box',
    }));
    expect(plan(high)).toEqual(plan(low));
  });
  it('adds hatch, pickup, van and semi on high, with semis mostly on the Connector', () => {
    const slots = slotsFor([arterial, connector], 4000, 1, 11, 'high');
    for (const k of ['sedan', 'suv', 'hatch', 'pickup', 'van', 'box', 'semi']) expect(kinds(slots)).toContain(k);
    const semiFrac = (lane: TrafficCourse) => {
      const trucks = slots.filter(s => s.lane === lane && (s.kind === 'semi' || s.kind === 'box'));
      return trucks.filter(s => s.kind === 'semi').length / trucks.length;
    };
    expect(semiFrac(connector)).toBeGreaterThan(0.5);
    expect(semiFrac(arterial)).toBeLessThan(0.35);
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
