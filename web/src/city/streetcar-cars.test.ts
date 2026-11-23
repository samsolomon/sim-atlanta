import { Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import { S70_LAYOUT } from '../vignette/streetcar';
import { createStreetcarCars, pointAt, streetcarPaths } from './streetcar-cars';

afterEach(() => vi.unstubAllGlobals());
const origin = { lon: -84.3916, lat: 33.7539 };
// A straight run into a 20 m-radius quarter curve, the tightest kind on the loop.
const pts: [number, number][] = [];
for (let x = -60; x < 0; x += 2) pts.push([x, 0]);
for (let a = 0; a <= 90; a += 3) pts.push([20 * Math.sin((a * Math.PI) / 180), 20 - 20 * Math.cos((a * Math.PI) / 180)]);
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
const rf = {
  paths: [{ id: 'p', routeId: 'marta:route:STREETCAR', coords: pts.flatMap(([x, z]) => sceneToLonLat(origin, x, z)), cum }],
  routes: [],
} as unknown as RoutesFile;

it('articulates the S70 through a 20 m curve with every joint closed and every truck on the rail', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const cars = createStreetcarCars(rf, origin, () => 0, []);
  const path = streetcarPaths(rf, origin).get('p')!;
  for (const s of [40, 55, 66, 75]) {
    const state = { id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: s, tier: 'scheduled' }, lengthM: { value: 24 } } as TrainState;
    expect(cars.update([state], 0)).toBe(1);
    const [B, C, A] = cars.cars();
    for (const m of [B, C, A]) m.updateMatrixWorld(true);
    const local = (id: 'A' | 'B' | 'C', z: number) =>
      new Vector3(0, 0, z - (S70_LAYOUT.sections[id].from + S70_LAYOUT.sections[id].to) / 2);
    for (const [mesh, id] of [
      [A, 'A'],
      [B, 'B'],
    ] as const) {
      const sec = S70_LAYOUT.sections[id];
      // The end section's joint coincides with the centre section's joint.
      const fromEnd = local(id, sec.pivots[0]).applyMatrix4(mesh.matrixWorld);
      const fromC = new Vector3(0, 0, sec.pivots[0]).applyMatrix4(C.matrixWorld);
      expect(fromEnd.distanceTo(fromC)).toBeLessThan(1e-6);
      // Its power truck sits on the track at s + pivot.
      const truck = local(id, sec.pivots[1]).applyMatrix4(mesh.matrixWorld);
      const rail = pointAt(path, s + sec.pivots[1]);
      expect(Math.hypot(truck.x - rail.x, truck.z - rail.z)).toBeLessThan(0.05);
    }
    // The centre section's axles sit on the track.
    for (const z of S70_LAYOUT.sections.C.pivots) {
      const axle = new Vector3(0, 0, z).applyMatrix4(C.matrixWorld);
      const rail = pointAt(path, s + z);
      expect(Math.hypot(axle.x - rail.x, axle.z - rail.z)).toBeLessThan(0.05);
    }
    for (const m of [B, C, A]) expect(m.userData.trainId).toBe('t');
  }
  expect(cars.update([], 0)).toBe(0);
  expect(cars.cars()).toHaveLength(0);
});

it('answers occupancy only near a drawn car', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const cars = createStreetcarCars(rf, origin, () => 0, []);
  const path = streetcarPaths(rf, origin).get('p')!;
  cars.update([{ id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 30 }, lengthM: { value: 24 } } as TrainState], 0);
  const p = pointAt(path, 30);
  expect(cars.occupied(p.x, p.z, 0)).toBe(true);
  expect(cars.occupied(p.x, p.z + 6, 0.5)).toBe(false);
  expect(cars.occupied(p.x - 40, p.z, 0.5)).toBe(false);
});

it('keeps the car straight and whole when it dwells at the very start of its shape', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const cars = createStreetcarCars(rf, origin, () => 0, []);
  expect(cars.update([{ id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 0 }, lengthM: { value: 24 } } as TrainState], 0)).toBe(1);
  const [B, C, A] = cars.cars();
  for (const m of [B, C, A]) {
    expect(Number.isFinite(m.position.x) && Number.isFinite(m.rotation.y)).toBe(true);
    expect(m.rotation.y).toBeCloseTo(C.rotation.y, 5);
  }
  expect(B.position.x).toBeLessThan(C.position.x);
  expect(A.position.x).toBeGreaterThan(C.position.x);
});

it('draws no car whose end would overhang an unmounted board', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  // Only x < -20 is mounted: a car centred at x = -25 (s = 35) reaches x ≈ -13.
  const cars = createStreetcarCars(rf, origin, (x) => (x < -20 ? 0 : null), []);
  expect(cars.update([{ id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 35 }, lengthM: { value: 24 } } as TrainState], 0)).toBe(0);
  expect(cars.update([{ id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 20 }, lengthM: { value: 24 } } as TrainState], 0)).toBe(1);
});
