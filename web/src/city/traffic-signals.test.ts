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
