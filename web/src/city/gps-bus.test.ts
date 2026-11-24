import { expect, it } from 'vitest';
import { GpsBus } from './gps-bus';
import { TRAFFIC_EPOCH_MS as epoch } from './streetcar-traffic';
import { nextGreen } from './traffic-signals';

it('drives toward the age-adjusted fix, stopping at the projection cap', () => {
  const bus = new GpsBus(0,epoch,5,epoch,[],[],12);
  let s = 0;
  for (let sec=1; sec<=100; sec++) {
    const at = epoch+1000*sec;
    const pose = bus.update(0,epoch,5,at,at,()=>undefined);
    expect(pose.s).toBeGreaterThanOrEqual(s);
    expect(pose.s-s).toBeLessThanOrEqual(20);
    s=pose.s;
  }
  expect(s).toBeCloseTo(150,0);
});

it('waits at a stop and fades a distant replacement fix', () => {
  const bus = new GpsBus(0,epoch,10,epoch,[8],[],12);
  const at = (seconds:number) => epoch+1000*seconds;
  const drive = (sec:number,s=0,report=0) => bus.update(s,at(report),10,at(sec),at(sec),()=>undefined);
  for(let sec=1;sec<=14;sec++) expect(drive(sec).s).toBe(8);
  expect(drive(20).s).toBeGreaterThan(8);
  const before = drive(21,700,21);
  expect(drive(21.2,700,21).s).toBe(before.s);
  expect(drive(21.2,700,21).fade).toBeGreaterThan(0.5);
  expect(drive(21.4,700,21).s).toBeGreaterThanOrEqual(700);
});

const sec = (s: number) => epoch + 1000 * s;
const none = () => undefined;

it('follows a bus past stops within about 150 m of its fix, without a relocation fade', () => {
  // The bus drives 250 m stop to stop at 10 m/s, then dwells (or doesn't), reporting
  // every 15 or 30 s with its instantaneous speed.
  for (const dwell of [0, 15, 30]) for (const period of [15, 30]) {
    const truth = (t: number) => {
      const cycle = 25 + dwell, n = Math.floor(t / cycle), r = t - n * cycle;
      return {s: 250 * n + Math.min(250, 10 * r), v: r < 25 ? 10 : 0};
    };
    const bus = new GpsBus(0, sec(0), 10, sec(0), Array.from({length: 40}, (_, i) => 250 * (i + 1)), [], 12);
    let report = 0, s = 0, fromFix = 0, fromTruth = 0;
    for (let t = 0.1; t <= 900; t += 0.1) {
      if (t - report >= period) report = Math.floor(t / period) * period;
      const fix = truth(report);
      const pose = bus.update(fix.s, sec(report), fix.v, sec(t), sec(t), none);
      if (t > 0.5) expect(pose.fade).toBe(0);
      expect(pose.s).toBeGreaterThanOrEqual(s - 1e-9);
      s = pose.s;
      fromFix = Math.max(fromFix, Math.abs(s - fix.s));
      fromTruth = Math.max(fromTruth, Math.abs(s - truth(t).s));
    }
    // Over 150 m only while a 30 s old report hides a dwell the projection drove through.
    expect(fromFix).toBeLessThanOrEqual(period > 15 ? 210 : 151);
    expect(fromTruth).toBeLessThan(period > 15 ? 210 : 160);
  }
});

it('holds, without reversing, when a bus halts after the projection ran ahead', () => {
  const bus = new GpsBus(0, sec(0), 9, sec(0), [], [], 12);
  let s = 0;
  for (let t = 0.1; t < 40; t += 0.1) s = bus.update(t < 20 ? 0 : 180, sec(t < 20 ? 0 : 20), 9, sec(t), sec(t), none).s;
  expect(s).toBeGreaterThan(180);
  // The bus stopped at 180 m and reports speed 0 from now on.
  for (let t = 40; t < 120; t += 0.1) {
    const pose = bus.update(180, sec(40), 0, sec(t), sec(t), none);
    expect(pose.fade).toBe(0);
    expect(pose.s).toBeCloseTo(s, 6);
  }
  expect(s - 180).toBeLessThanOrEqual(150);
});

it('fades back to a fix more than 200 m behind the drawn bus', () => {
  const bus = new GpsBus(0, sec(0), 0, sec(0), [], [], 12, 250);
  expect(bus.update(0, sec(0), 0, sec(0), sec(0), none).fade).toBe(0);
  expect(bus.update(0, sec(0), 0, sec(0.2), sec(0.2), none).s).toBe(250);
  const after = bus.update(0, sec(0), 0, sec(0.4), sec(0.4), none);
  expect(after.s).toBe(0);
  expect(after.fade).toBeGreaterThan(0.5);
  // 160 m ahead stays put rather than jumping back.
  const near = new GpsBus(0, sec(0), 0, sec(0), [], [], 12, 160);
  for (let t = 0; t < 5; t += 0.1) expect(near.update(0, sec(0), 0, sec(t), sec(t), none)).toEqual({s: 160, fade: 0});
});

it('passes stops it is far behind, but still dwells close to its fix', () => {
  const far = new GpsBus(0, sec(0), 0, sec(0), [20], [], 12);
  // A report 250 m ahead: catching up, the stop at 20 m is passed without a dwell.
  let s = 0;
  for (let t = 0.1; t < 3; t += 0.1) s = far.update(250, sec(0.1), 0, sec(t), sec(t), none).s;
  expect(s).toBeGreaterThan(30);
});

it('stops at a red line and at a queue tail, then releases on green', () => {
  const light = {s: 60, key: 'test-light', axis: 0 as const, dx: 0, dz: 1};
  // Start each run just as the light turns red.
  let red = 0;
  while (nextGreen(light.key, 0, red) === red) red += 0.5;
  const green = nextGreen(light.key, 0, red);
  for (const queue of [undefined, {tail: 20, count: 3}]) {
    const bus = new GpsBus(0, epoch + red * 1000, 10, epoch + red * 1000, [], [light], 12);
    const hold = queue ? 54 - 20 : 54;
    let s = 0;
    for (let t = red; t < green - 0.2; t += 0.1) {
      s = bus.update(0, epoch + red * 1000, 10, epoch + t * 1000, epoch + t * 1000, () => queue).s;
      expect(s).toBeLessThanOrEqual(hold + 1e-9);
    }
    expect(s).toBeCloseTo(hold, 0);
    const release = green + (queue ? 2 * queue.count : 0) + 3;
    for (let t = green - 0.2; t < release; t += 0.1) s = bus.update(0, epoch + red * 1000, 10, epoch + t * 1000, epoch + t * 1000, () => queue).s;
    expect(s).toBeGreaterThan(54);
  }
});

it('re-predicts the queue at a light after a stop dwell makes the bus late', () => {
  const light = {s: 60, key: 'dwell-light', axis: 0 as const, dx: 0, dz: 1};
  const queue = {tail: 10, count: 3};
  // Find a start where the light is green on the first approach but red after a 15 s dwell.
  let t0 = 0;
  while (!(nextGreen(light.key, 0, t0 + 6) === t0 + 6 && nextGreen(light.key, 0, t0 + 17) > t0 + 30)) t0 += 0.5;
  const bus = new GpsBus(0, epoch + t0 * 1000, 10, epoch + t0 * 1000, [40], [light], 12);
  let s = 0, held = false;
  for (let t = t0; t < t0 + 30; t += 0.1) {
    s = bus.update(10 * (t - t0), epoch + t0 * 1000, 10, epoch + t * 1000, epoch + t * 1000, () => queue).s;
    if (t > t0 + 16) held ||= Math.abs(s - (54 - queue.tail)) < 0.5;
    if (t > t0 + 16 && nextGreen(light.key, 0, t) > t) expect(s).toBeLessThanOrEqual(54 - queue.tail + 1e-9);
  }
  expect(held).toBe(true);
});
