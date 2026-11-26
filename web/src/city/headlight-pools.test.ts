import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import type { P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { ArterialTraffic } from './arterial-traffic';
import type { ArterialCorridor } from './arterial-traffic-routes';
import { FADE_END, HeadlightPools, POOL, type PoolSink } from './headlight-pools';

/** A sink that records every pool it is given. */
function recorder(active = true) {
  const pools: { near: Vector3; far: Vector3; width: number; power: number }[] = [];
  const sink: PoolSink = {
    active,
    inRange: () => true,
    add(nx, ny, nz, fx, fy, fz, width, power = 1) {
      pools.push({ near: new Vector3(nx, ny, nz), far: new Vector3(fx, fy, fz), width, power });
      return true;
    },
  };
  return { sink, pools };
}

describe('the headlight pool batch', () => {
  it('draws only at night, only what was added this frame, and reports overflow', () => {
    const batch = new HeadlightPools(2);
    batch.setNight(0);
    batch.begin();
    batch.end();
    expect(batch.active).toBe(false);
    expect(batch.mesh.visible).toBe(false);
    batch.setNight(0.8);
    batch.begin();
    expect(batch.add(0, 0, 0, 0, 0, 10, 4)).toBe(true);
    expect(batch.add(0, 0, 0, 0, 0, 10, 4)).toBe(true);
    expect(batch.add(0, 0, 0, 0, 0, 10, 4)).toBe(false);
    batch.end();
    expect(batch.overflowed).toBe(true);
    expect(batch.mesh.count).toBe(2);
    expect(batch.mesh.visible).toBe(true);
    // The quad runs from the near point to the far point, `width` across.
    const m = new Matrix4();
    batch.mesh.getMatrixAt(0, m);
    expect(new Vector3(0, 0, 0.5).applyMatrix4(m).z).toBeCloseTo(5, 5);
    expect(new Vector3(0.5, 0, 0).applyMatrix4(m).x).toBeCloseTo(2, 5);
    expect(new Vector3(0, 1, 0).applyMatrix4(m).y).toBeGreaterThan(0); // the quad faces up
    // The hidden template shares the material, so boot prewarm compiles the program.
    expect(batch.template.material).toBe(batch.material);
    expect(batch.template.visible).toBe(false);
    batch.dispose();
  });

  it('places nothing beyond the fade distance', () => {
    const batch = new HeadlightPools(4);
    batch.setEye(new Vector3(0, 100, 0));
    expect(batch.inRange(0, 0, FADE_END - 200)).toBe(true);
    expect(batch.inRange(0, 0, FADE_END + 10)).toBe(false);
    batch.dispose();
  });
});

describe('road traffic headlight pools', () => {
  type Run = ArterialCorridor['runs'][number];
  const road = (pts: P2[], bridge = false): VRoad => ({ pts, bridge, tunnel: false, cls: 'secondary', name: 'Example St' });
  const run = (r: VRoad, from: string, to: string): Run =>
    ({ road: r, from, to, allow: 'both', lanes: { forward: 1, reverse: 1 }, aadt: { forward: 12000, reverse: 12000 }, truckShare: 0.06, speedMph: 24 });
  const bounds = { minX: -510, maxX: 510, minZ: -250, maxZ: 250 };
  const left = road([[-500, 0], [0, 0]]), right = road([[0.12, 0], [250, 0], [500, 0]], true);
  const base = {
    city: { bounds, roads: [], rail: [], buildings: [] },
    arterials: [{ id: 'example', runs: [run(left, 'A', 'B'), run(right, 'B', 'C')] }],
    hourly: { weekday: Array(24).fill(1 / 24), weekend: Array(24).fill(1 / 24) },
    quality: 'high' as const,
  };
  const noon = Date.parse('2026-11-20T12:00:00-05:00');
  // Only the sloping bridge is drawn: its height is 2 + 0.05x, and the street west of it has none.
  const deck = (x: number, _z: number, r: VRoad) => (r === right ? 2 + x * 0.05 : null);

  it('lights one pool per drawn car, on its own deck, ahead in its direction of travel', () => {
    const fleet = new ArterialTraffic({ ...base, roadHeight: deck });
    const { sink, pools } = recorder();
    fleet.lights = sink;
    fleet.update(noon, 0.9);
    expect(fleet.visibleCars).toBeGreaterThan(0);
    expect(pools.length).toBeGreaterThan(0);
    expect(pools.length).toBeLessThanOrEqual(fleet.visibleCars);
    for (const { near, far, width } of pools) {
      // Both ends lie on the deck that carries the car, never on a surface elsewhere.
      expect(near.y).toBeCloseTo(2 + near.x * 0.05, 3);
      expect(far.y).toBeCloseTo(2 + far.x * 0.05, 3);
      const reach = Math.hypot(far.x - near.x, far.z - near.z);
      expect(reach).toBeGreaterThan(POOL.car.length - 1);
      expect(reach).toBeLessThan(POOL.truck.length + 1);
      expect([POOL.car.width, POOL.truck.width]).toContain(width);
    }
    // Pools point both ways along the two-way street: the lane's direction of travel.
    expect(new Set(pools.map((p) => Math.sign(p.far.x - p.near.x)))).toEqual(new Set([-1, 1]));
    fleet.dispose();
  });

  it('lights none by day, and none whose road ahead is not drawn', () => {
    const fleet = new ArterialTraffic({ ...base, roadHeight: deck });
    const day = recorder(false);
    fleet.lights = day.sink;
    fleet.update(noon, 0.9);
    expect(fleet.visibleCars).toBeGreaterThan(0);
    expect(day.pools).toEqual([]);
    // With no drawn road anywhere, there are no cars and so no pools.
    const none = new ArterialTraffic({ ...base, roadHeight: () => null });
    const night = recorder();
    none.lights = night.sink;
    none.update(noon, 0.9);
    expect(night.pools).toEqual([]);
    fleet.dispose();
    none.dispose();
  });
});
