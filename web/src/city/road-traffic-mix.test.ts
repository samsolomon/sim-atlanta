import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { LENGTH, vehicleGeometry } from '../vignette/vehicles';
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
  it('builds the semi as one rigid body of its declared length, cab painted and trailer white', () => {
    const g = vehicleGeometry('semi');
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.z - b.min.z).toBeCloseTo(LENGTH.semi, 1);
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.05); // centred on its footprint
    expect(g.getAttribute('position').count / 3).toBeLessThanOrEqual(1000);
    const kinds = g.getAttribute('aKind');
    const positions = g.getAttribute('position');
    const paintedZ = [], rearLampZ = [];
    for (let i = 0; i < kinds.count; i++) {
      if (kinds.getX(i) === 0) paintedZ.push(positions.getZ(i));
      if (kinds.getX(i) === 2) rearLampZ.push(positions.getZ(i));
    }
    expect(Math.min(...paintedZ)).toBeGreaterThan(0);
    expect(Math.min(...rearLampZ)).toBeCloseTo(b.min.z, 1);
    g.dispose();
  });
});
