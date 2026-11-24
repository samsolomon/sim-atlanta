import { expect, it } from 'vitest';
import { GpsBus } from './gps-bus';
import { TRAFFIC_EPOCH_MS as epoch } from './streetcar-traffic';

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
