import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAR_FLOOR, CAR_WIDTH, CQ400_DOORS } from '../vignette/cq400';
import { LIMITS, createPlatformScene, doorCentres } from './platform-scene';

describe.each(['island', 'side'] as const)('%s platform inspection', (kind) => {
  const scene = createPlatformScene(kind);
  scene.group.updateMatrixWorld(true);
  const slabs = scene.group.children.filter((o): o is Mesh => o instanceof Mesh && o.geometry.parameters?.height > 1);

  it('keeps every platform clear of the stopped car, with the boarding edge within the level-boarding gap', () => {
    const carL = scene.trainX - CAR_WIDTH / 2, carR = scene.trainX + CAR_WIDTH / 2;
    let nearest = Infinity;
    for (const s of slabs) {
      const b = new Box3().setFromObject(s);
      expect(b.max.x <= carL || b.min.x >= carR, `slab overlaps the car`).toBe(true);
      nearest = Math.min(nearest, Math.abs(b.max.x - carL), Math.abs(b.min.x - carR));
    }
    expect(nearest).toBeCloseTo(scene.report.gapM, 6);
    expect(scene.report.gapM).toBeLessThanOrEqual(LIMITS.gapM);
    expect(scene.report.gapM).toBeGreaterThan(0);
  });

  it('meets the car floor level and opens the doors toward the platform', () => {
    for (const s of slabs) expect(new Box3().setFromObject(s).max.y).toBeCloseTo(CAR_FLOOR, 6);
    expect(scene.report.withinStep).toBe(true);
    // Door side from the primitive: right means the platform is at −x of the train (lab frame).
    const platformX = new Box3().setFromObject(slabs.find((s) => {
      const b = new Box3().setFromObject(s);
      return Math.min(Math.abs(b.max.x - (scene.trainX - CAR_WIDTH / 2)), Math.abs(b.min.x - (scene.trainX + CAR_WIDTH / 2))) < 0.1;
    })!).getCenter(new Vector3());
    expect(Math.sign(platformX.x - scene.trainX)).toBe(scene.doorSide === 'right' ? -1 : 1);
  });

  it('marks a door zone at every door pair of the two cars, on the train\'s edge only', () => {
    const zones = scene.group.children.filter((o): o is Mesh => o instanceof Mesh && o.geometry.parameters?.depth === CQ400_DOORS.width);
    expect(zones.map((z) => +z.position.z.toFixed(3)).sort((a, b) => a - b)).toEqual(doorCentres().map((z) => +z.toFixed(3)));
    for (const z of zones) expect(Math.sign(z.position.x - scene.trainX)).toBe(scene.doorSide === 'right' ? -1 : 1);
  });
});

it('describes the two layouts with the shared primitive', () => {
  expect(createPlatformScene('island').layout.platforms).toHaveLength(1);
  expect(createPlatformScene('side').layout.platforms).toHaveLength(2);
  expect(createPlatformScene('island').doorSide).toBe('right');
  expect(createPlatformScene('side').doorSide).toBe('left');
});
