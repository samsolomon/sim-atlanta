import { Box3, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { LEVELS, labTrack } from './track';

describe('Model Lab track', () => {
  it('has no face in the ground plane (y = 0), which z-fights and flickers', () => {
    const track = labTrack();
    track.updateMatrixWorld(true);
    const ys = new Set<number>();
    track.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const box = new Box3().setFromObject(o);
      ys.add(+box.min.y.toFixed(4)).add(+box.max.y.toFixed(4));
    });
    for (const y of ys) expect(Math.abs(y), `face at y ${y}`).toBeGreaterThanOrEqual(0.02);
  });

  it('stacks ballast under sleepers under rails, with the bed visible above the ground', () => {
    expect(LEVELS.ballast[1]).toBeGreaterThan(0);
    expect(LEVELS.ballast[1]).toBeLessThan(LEVELS.sleeper[1]);
    expect(LEVELS.sleeper[1]).toBeLessThan(LEVELS.rail[1]);
    expect(LEVELS.rail[1]).toBeCloseTo(0.125); // freight models stand at y 0.125
  });
});
