import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { InstancedMesh, Matrix4 } from 'three';
import { describe, expect, it } from 'vitest';
import type { P2 } from '../vignette/geom';
import { ArterialTraffic } from './arterial-traffic';
import { arterialTrafficRoutes } from './arterial-traffic-routes';
import { loadArterials } from './arterials';
import { signalPhase, signalPositions, withSignals, SIGNAL_MAX_WAIT_S } from './traffic-signals';

const data = resolve(__dirname, '../../public/data/scene/downtown');
const staged = ['vignette.json', 'arterials.json', 'traffic.json'].every(f => existsSync(resolve(data, f)));
const J = (f: string) => JSON.parse(readFileSync(resolve(data, f), 'utf8'));

describe.skipIf(!staged)('signals on the downtown arterials', () => {
  const vd = staged ? J('vignette.json') : null!;
  const corridors = staged ? loadArterials(J('arterials.json'), vd).corridors : [];
  const hourly = staged ? J('traffic.json').hourly : null!;
  const points: P2[] = staged ? vd.points.traffic_signals : [];
  const courses = staged ? withSignals(arterialTrafficRoutes(corridors, vd.bounds), points) : [];
  const traffic = () => new ArterialTraffic({ city: vd, arterials: corridors, hourly, roadHeight: () => 0, quality: 'high' });
  const peak = Date.parse('2026-11-20T17:00:00-05:00');
  const poses = (t: ArterialTraffic) => t.group.children.flatMap(o => {
    const mesh = o as InstancedMesh, m = new Matrix4(), out: number[][] = [];
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); out.push(m.elements.map(v => Math.round(v * 1e4) / 1e4)); }
    return out;
  });

  it('stops most arterial courses at mapped signals', () => {
    const signalled = courses.filter(c => c.signals?.length);
    expect(signalled.length).toBeGreaterThan(courses.length / 2);
    expect(signalled.reduce((n, c) => n + c.signals!.length, 0)).toBeGreaterThan(60);
  });

  it('lands every car exactly where a fresh load would after scrubbing the clock', () => {
    const scrubbed = traffic(), fresh = traffic();
    scrubbed.update(peak + 3_600_000, 0);
    scrubbed.update(peak - 1_800_000, 0);
    scrubbed.update(peak, 0);
    fresh.update(peak, 0);
    expect(poses(scrubbed)).toEqual(poses(fresh));
    expect(scrubbed.visibleCars).toBeGreaterThan(10);
  });

  it('never lets two approaches crossing at more than 60 degrees share a green', () => {
    const approaches = new Map<string, { axis: 0 | 1; dx: number; dz: number }[]>();
    for (const c of courses) for (const s of c.signals ?? []) {
      const p = c.line.at(s.s);
      approaches.set(s.key, [...(approaches.get(s.key) ?? []), { axis: s.axis, dx: p.dx, dz: p.dz }]);
    }
    let crossings = 0;
    for (const list of approaches.values()) for (const a of list) for (const b of list) {
      if (Math.abs(a.dx * b.dx + a.dz * b.dz) > Math.cos(Math.PI / 3)) continue;
      crossings++;
      expect(a.axis).not.toBe(b.axis);
      for (let t = 0; t < 84; t += 3) expect(signalPhase('x', a.axis, t) === 'green' && signalPhase('x', b.axis, t) === 'green').toBe(false);
    }
    expect(crossings).toBeGreaterThan(10);
  });

  it("finishes every trip inside its delay budget, even behind a ten-car queue", () => {
    for (const c of courses) {
      if (!c.signals?.length) continue;
      const budget = (c.line.length + (c.offstageM ?? 0)) / c.speedMps + c.signals.length * (SIGNAL_MAX_WAIT_S + 30);
      for (let k = 0; k < 40; k++) {
        const start = k * 37.3;
        // Five cars arriving together: the last waits longest.
        const trips = Array.from({ length: 10 }, (_, i) => ({ start: start + i * 0.8, length: 4.5 }));
        const at = signalPositions(c.signals, c.line.length, c.speedMps, trips, start + 4 + budget);
        expect(at.every(p => p === null)).toBe(true);
      }
    }
  });

  it('keeps as many cars on the street as the unsignalled layer did', () => {
    const plain = new ArterialTraffic({ city: { ...vd, points: { ...vd.points, traffic_signals: [] } }, arterials: corridors, hourly, roadHeight: () => 0, quality: 'high' });
    const timed = traffic();
    let a = 0, b = 0;
    for (let ms = peak - 1_800_000; ms < peak + 1_800_000; ms += 30_000) {
      plain.update(ms, 0); timed.update(ms, 0);
      a += plain.visibleCars; b += timed.visibleCars;
    }
    expect(b / a).toBeGreaterThan(0.75);
    expect(b / a).toBeLessThan(1.25);
  });

  it('queues without stacking two cars of one course on top of each other through the evening peak', () => {
    const t = traffic();
    let drops = 0, shown = 0;
    for (let ms = peak - 3_600_000; ms < peak + 3_600_000; ms += 20_000) {
      t.update(ms, 0);
      drops += t.signalOverlaps;
      shown += t.visibleCars;
    }
    expect(shown).toBeGreaterThan(1000);
    expect(drops).toBe(0);
  });
});
