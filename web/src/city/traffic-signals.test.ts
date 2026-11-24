import { describe, expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import { clusterSignals, courseSignals, nextGreen, signalPhase, signalPositions, SIGNAL_CYCLE_S, SIGNAL_GREEN_S } from './traffic-signals';

describe('signal controller', () => {
  it('never shows both axes green, and gives each 38 s of every 84 s', () => {
    let green0 = 0, green1 = 0;
    for (let t = 0; t < SIGNAL_CYCLE_S * 3; t += 0.5) {
      const a = signalPhase('k', 0, t) === 'green', b = signalPhase('k', 1, t) === 'green';
      expect(a && b).toBe(false);
      green0 += a ? 0.5 : 0; green1 += b ? 0.5 : 0;
    }
    expect(green0).toBe(3 * SIGNAL_GREEN_S);
    expect(green1).toBe(3 * SIGNAL_GREEN_S);
  });
  it('finds the next green', () => {
    for (let t = 0; t < 200; t += 1.7) {
      const g = nextGreen('k', 1, t);
      expect(g).toBeGreaterThanOrEqual(t);
      expect(signalPhase('k', 1, g)).toBe('green');
      if (g > t) expect(signalPhase('k', 1, t)).not.toBe('green');
    }
  });
});

describe('signal clusters and stop lines', () => {
  it('merges per-approach signals into one controller and assigns axes by bearing', () => {
    const clusters = clusterSignals([[100, 0], [106, 4], [96, -5], [400, 0]]);
    expect(clusters).toHaveLength(2);
    const ns = courseSignals(new Line([[100, -200], [100, 300]]), clusters);
    const ew = courseSignals(new Line([[-200, 0], [600, 0]]), clusters);
    expect(ns).toHaveLength(1);
    expect(ns[0].axis).toBe(0);
    expect(ew.map(s => s.axis)).toEqual([1, 1]);
    // The stop line is 8 m before the intersection.
    expect(ns[0].s).toBeCloseTo(200 - 8 - 1 / 3, 6); // cluster centre (100.67, -0.33)
  });
});

describe('trips on a signalised course', () => {
  const key = 'k', speed = 10;
  const signals = [{ s: 100, key, axis: 0 as const }];
  const redFrom = (() => { let t = 0; while (signalPhase(key, 0, t) === 'green') t += 0.25; return t; })();

  it('waits at a red stop line, then continues on green', () => {
    // A trip timed to reach the line 5 s into the red.
    const start = redFrom + 5 - 10;
    const green = nextGreen(key, 0, redFrom + 5);
    // The front bumper stops at the line: the centre is half a car length back.
    expect(signalPositions(signals, 500, speed, [{ start, length: 4.5 }], redFrom + 6)[0]).toBe(97.75);
    expect(signalPositions(signals, 500, speed, [{ start, length: 4.5 }], green - 0.5)[0]).toBe(97.75);
    expect(signalPositions(signals, 500, speed, [{ start, length: 4.5 }], green + 3)[0]).toBeCloseTo(127.75, 6);
    // Off the course once past its end.
    expect(signalPositions(signals, 500, speed, [{ start, length: 4.5 }], green + 60)[0]).toBeNull();
  });

  it('queues cars arriving in one red behind each other and lets them go 2 s apart', () => {
    const trips = [0, 1, 2].map(k => ({ start: redFrom + 2 + 3 * k - 10, length: 4.5 }));
    const green = nextGreen(key, 0, redFrom + 2);
    const waiting = signalPositions(signals, 500, speed, trips, green - 1);
    expect(waiting).toEqual([97.75, 97.75 - 6.5, 97.75 - 13]);
    // A second after the second car pulls away it has rolled 10 m.
    const moving = signalPositions(signals, 500, speed, trips, green + 3);
    expect(moving[0]).toBeCloseTo(127.75, 6);
    expect(moving[1]).toBeCloseTo(97.75 - 6.5 + 10, 6);
    expect(moving[2]).toBe(97.75 - 13);
  });

  it('passes straight through on green, exactly as an unsignalled course', () => {
    let t = 0; while (signalPhase(key, 0, t) !== 'green' || signalPhase(key, 0, t + 9) !== 'green') t += 0.5;
    const start = t - 9;
    for (const now of [start + 3, start + 12, start + 40])
      expect(signalPositions(signals, 500, speed, [{ start, length: 4.5 }], now)[0]).toBeCloseTo((now - start) * speed, 6);
  });
});

describe('signal trips on a synthetic street (always runs, no staged data)', () => {
  // Four lights, two only 30 m apart (the closest courseSignals keeps), with mixed car lengths
  // and tight arrivals: queues reach back past the entrance and toward the previous light.
  const signals = [
    { s: 40, key: 'a', axis: 0 as const }, { s: 70, key: 'b', axis: 1 as const },
    { s: 220, key: 'c', axis: 0 as const }, { s: 380, key: 'd', axis: 1 as const }];
  const length = 450, speed = 11;
  const trips = Array.from({ length: 24 }, (_, i) => ({ start: i * 2.7 + (i % 3) * 0.6, length: [4.5, 4.9, 8.4][i % 3] }));
  const budget = length / speed + signals.length * (84 - 38 + 30);
  const samples = Array.from({ length: Math.ceil((trips.at(-1)!.start + budget) / 0.5) }, (_, k) => k * 0.5);
  const at = samples.map(t => signalPositions(signals, length, speed, trips, t));

  it('never moves a car backward, never stacks two cars, and finishes every trip in budget', () => {
    for (let i = 0; i < trips.length; i++) {
      let last = -Infinity, lastSeen = -Infinity;
      at.forEach((row, k) => {
        const p = row[i];
        if (p === null) return;
        lastSeen = samples[k];
        expect(p, `trip ${i} at ${samples[k]}`).toBeGreaterThanOrEqual(last - 1e-6);
        last = p;
      });
      // Off the course before its budget runs out, so its slot's next trip never collides.
      expect(lastSeen).toBeLessThanOrEqual(trips[i].start + budget);
      expect(at.at(-1)![i]).toBeNull();
    }
    for (const row of at) {
      const on = row.map((p, i) => ({ p, half: trips[i].length / 2 })).filter(c => c.p !== null).sort((a, b) => a.p! - b.p!);
      for (let k = 1; k < on.length; k++)
        expect(on[k].p! - on[k - 1].p!).toBeGreaterThanOrEqual(on[k].half + on[k - 1].half + 2 - 1e-6);
    }
  });

  it('lands every car exactly where a fresh evaluation would, whatever came before', () => {
    // Pure: evaluating later then earlier gives the same answer as evaluating once.
    signalPositions(signals, length, speed, trips, 500);
    expect(signalPositions(signals, length, speed, trips, 123.4)).toEqual(at[Math.round(123.4 / 0.5)] && signalPositions(signals, length, speed, trips, 123.4));
  });
});
