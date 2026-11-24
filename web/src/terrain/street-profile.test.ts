import { describe, expect, it } from 'vitest';
import { Line, type P2 } from '../vignette/geom';
import { junctionMarkings, junctionStop } from './junction-markings';
import { streetProfile, throughLane } from './street-profile';

const road = (name: string, pts: P2[]) => ({ name, pts, cls: 'secondary' });
const spring = road('Spring Street Northwest', [[221.33,-3300],[221.73,-3083.73],[224.37,-3069.7]]);
const tenth = road('10th Street Northwest', [[288.94,-3069.78],[235.57,-3069.71],[224.37,-3069.7]]);

describe('Spring and 10th street profiles', () => {
  it('seats one-way and opposing through traffic within their directional slots', () => {
    const one = streetProfile(spring)!, two = streetProfile(tenth)!;
    expect(one.lanes.length).toBe(4);
    expect(throughLane(one,'forward')?.offset).toBeCloseTo(-1.55);
    expect(throughLane(one,'reverse')).toBeUndefined();
    expect(throughLane(two,'forward')?.offset).toBeCloseTo(1.55);
    expect(throughLane(two,'reverse')?.offset).toBeCloseTo(-1.55);
  });
  it('cuts markings back from the crossing while the bumper stop stays upstream', () => {
    const paint = junctionMarkings([spring]).get(spring)![0];
    const end = paint.at(-1)!;
    expect(Math.hypot(end[0]-221.73,end[1]+3083.73)).toBeCloseTo(1.4);
    const line = new Line(spring.pts);
    expect(junctionStop(line,[spring,spring],line.length,spring.pts[2])).toBeCloseTo(line.cum[1]-2.4);
  });
  it('keeps the junction off an elevated carrier, even at identical plan coordinates', () => {
    const bridge = { ...spring, bridge: true };
    expect(streetProfile(bridge)).toBeUndefined();
    expect(junctionMarkings([bridge]).size).toBe(0);
  });
});
