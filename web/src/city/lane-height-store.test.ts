import { expect, it } from 'vitest';
import { Line } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { LaneHeightStore, type TrafficCourse } from './road-traffic';

const road = (pts: [number, number][]) => ({ pts, name: 'r', cls: 'primary' }) as unknown as VRoad;
const course = (pts: [number, number][], roads: VRoad[]) => ({ line: new Line(pts), roads }) as unknown as TrafficCourse;

it('gives a rebuilt lane back its heights when its geometry and roads are the same', () => {
  const store = new LaneHeightStore();
  const pts: [number, number][] = [[0, 0], [0, -100]];
  const r = road(pts);
  const first = store.claim(course(pts, [r]), 52, 'layer');
  first.heights[3] = 12.5;
  first.smooth[3] = 1;
  store.generation++;
  // A new course object with an equal line (as a rebuilt layer makes) reuses the arrays.
  const again = store.claim(course(pts.map(p => [...p] as [number, number]), [r]), 52, 'layer');
  expect(again.heights).toBe(first.heights);
  expect(again.heights[3]).toBe(12.5);
  // Another road object (a remounted board), another layer or another line starts empty.
  expect(store.claim(course(pts, [road(pts)]), 52, 'layer').heights[3]).toBeNaN();
  expect(store.claim(course(pts, [r]), 52, 'other').heights[3]).toBeNaN();
  expect(store.claim(course([[0, 0], [0, -101]], [r]), 52, 'layer').heights[3]).toBeNaN();
});

it('clears only lanes near a mounted area, and all lanes without one', () => {
  const store = new LaneHeightStore();
  const nearPts: [number, number][] = [[0, 0], [0, -100]], farPts: [number, number][] = [[2000, 0], [2000, -100]];
  const near = store.claim(course(nearPts, [road(nearPts)]), 52, 'l');
  const far = store.claim(course(farPts, [road(farPts)]), 52, 'l');
  near.heights[0] = far.heights[0] = 1;
  near.smooth[0] = far.smooth[0] = 2;
  near.vertexHeights[0] = far.vertexHeights[0] = 1;
  // An area 120 m away is inside the 150 m margin of the near lane, far from the other.
  store.invalidate([{ minX: 120, maxX: 900, minZ: -500, maxZ: 500 }]);
  expect(near.heights[0]).toBeNaN();
  expect(near.smooth[0]).toBe(0);
  expect(near.vertexHeights[0]).toBeNaN();
  expect(far.heights[0]).toBe(1);
  expect(far.smooth[0]).toBe(2);
  store.invalidate();
  expect(far.heights[0]).toBeNaN();
});

it('drops lanes no layer has claimed for two generations', () => {
  const store = new LaneHeightStore();
  const pts: [number, number][] = [[0, 0], [0, -100]];
  store.claim(course(pts, [road(pts)]), 52, 'l');
  store.generation += 2;
  store.invalidate([]);
  expect(store.size).toBe(0);
});
