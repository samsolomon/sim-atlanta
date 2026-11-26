import { Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import { S70_LAYOUT } from '../vignette/streetcar';
import { leadFirst } from './vehicle-follow';
import { alongAt, createStreetcarCars, pointAlong, pointAt, streetcarCovers, streetcarPaths } from './streetcar-cars';

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
    // Follow frames cab A, which leads, though the pool lists it last.
    expect(leadFirst(cars.cars())[0].x).toBeCloseTo(A.position.x);
    expect(leadFirst(cars.cars())[0].z).toBeCloseTo(A.position.z);
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
      const rail = pointAlong(path, alongAt(path, s) + sec.pivots[1]);
      expect(Math.hypot(truck.x - rail.x, truck.z - rail.z)).toBeLessThan(0.05);
    }
    // The centre section's axles sit on the track.
    for (const z of S70_LAYOUT.sections.C.pivots) {
      const axle = new Vector3(0, 0, z).applyMatrix4(C.matrixWorld);
      const rail = pointAlong(path, alongAt(path, s) + z);
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

it('applies the pivot offsets in drawn metres when GTFS distances run long', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  // The same shape, but its GTFS distances read 8% long.
  const long = { ...rf, paths: [{ ...rf.paths[0], cum: cum.map((c) => c * 1.08) }] } as unknown as RoutesFile;
  const cars = createStreetcarCars(long, origin, () => 0, []);
  cars.update([{ id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 30 * 1.08 }, lengthM: { value: 24 } } as TrainState], 0);
  const [B, , A] = cars.cars();
  for (const m of [B, A]) m.updateMatrixWorld(true);
  const truckA = new Vector3(0, 0, 8.2 - (2.305 + 12.055) / 2).applyMatrix4(A.matrixWorld);
  const truckB = new Vector3(0, 0, -8.2 + (2.305 + 12.055) / 2).applyMatrix4(B.matrixWorld);
  // Power trucks 16.4 m apart along the straight, not 16.4 × 1.08.
  expect(truckA.distanceTo(truckB)).toBeCloseTo(16.4, 1);
});

it('is found by Follow and by a tap on any of its sections', async () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const THREE = await import('three');
  const { drawnCar } = await import('./vehicle-follow');
  const { pickVehicle } = await import('./pick');
  const cars = createStreetcarCars(rf, origin, () => 0, []);
  const path = streetcarPaths(rf, origin).get('p')!;
  cars.update([{ id: 'sc-1', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 30 }, lengthM: { value: 24 } } as TrainState], 0);
  // Follow (locate / drawnAt) sees every drawn section at the car's position.
  for (const m of cars.cars()) expect(drawnCar(m)).not.toBeNull();
  // A tap on the car selects it.
  const p = pointAt(path, 30);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
  camera.position.set(p.x, 60, p.z + 0.01);
  camera.lookAt(p.x, 0, p.z);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  cars.group.updateMatrixWorld(true);
  const hit = pickVehicle(400, 400, 800, 800, camera, new THREE.Group(), [], [], [], undefined, undefined, undefined, cars.group);
  expect(hit).toEqual({ kind: 'train', id: 'sc-1' });
  // And with no streetcar group, nothing is picked there.
  expect(pickVehicle(400, 400, 800, 800, camera, new THREE.Group(), [], [], [])).toBeNull();
});

it('hides a car in the streetcar lane or crossing it, and keeps the next lane drawn', () => {
  // A 24 m streetcar on z = 0 from x = 0 to 24, with the same 1.4 m half width as occupied().
  const tram = { occupied: (x: number, z: number, margin: number, y = 0) =>
    Math.abs(y) < 2.5 && Math.hypot(x - Math.max(0, Math.min(24, x)), z) < 1.4 + margin };
  const east = Math.PI / 2, north = 0;
  expect(streetcarCovers(tram, 12, 0, 0, 4.5, east)).toBe(true); // sharing the lane
  expect(streetcarCovers(tram, 12, 0, 3.3, 4.5, east)).toBe(false); // the next lane over
  expect(streetcarCovers(tram, 12, 0, -3.3, 4.5, east)).toBe(false);
  expect(streetcarCovers(tram, 12, 0, 3.5, 4.5, north)).toBe(true); // nose across the rail
  expect(streetcarCovers(tram, 27, 0, 0, 4.5, east)).toBe(true); // rear bumper at its end
  expect(streetcarCovers(tram, 30, 0, 0, 4.5, east)).toBe(false); // clear behind it
  expect(streetcarCovers(tram, 12, 8, 0, 4.5, north)).toBe(false); // on a bridge overhead
});

it('yields only on the streetcar’s own level', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  const cars = createStreetcarCars(rf, origin, () => 0, []);
  const state = { id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: 30, tier: 'scheduled' }, lengthM: { value: 24 } } as TrainState;
  expect(cars.update([state], 0)).toBe(1);
  const [, C] = cars.cars();
  const { x, y, z } = C.position;
  expect(cars.occupied(x, z, 0)).toBe(true);
  expect(cars.occupied(x, z, 0, y)).toBe(true);
  expect(cars.occupied(x, z, 0, y + 8)).toBe(false);
});

it('lights the street ahead of cab A at night, on the drawn height, and not where the street ahead is undrawn', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx, width: 1, height: 1 }) });
  // The street is drawn at 0.5 m up to x = 5 and not beyond.
  const cars = createStreetcarCars(rf, origin, (x) => (x > 5 ? null : 0.5), []);
  const pools: { near: Vector3; far: Vector3 }[] = [];
  let active = true;
  cars.lights = { get active() { return active; }, inRange: () => true,
    add: (nx, ny, nz, fx, fy, fz) => { pools.push({ near: new Vector3(nx, ny, nz), far: new Vector3(fx, fy, fz) }); return true; } };
  const state = (s: number) => ({ id: 't', pathId: 'p', routeId: 'marta:route:STREETCAR', s: { value: s, tier: 'scheduled' }, lengthM: { value: 24 } } as TrainState);
  expect(cars.update([state(20)], 1)).toBe(1);
  expect(pools).toHaveLength(1);
  expect(pools[0].near.y).toBe(0.5);
  expect(pools[0].far.x).toBeGreaterThan(pools[0].near.x); // cab A leads along +s
  pools.length = 0;
  // Further on, the car is drawn but the street its pool would light is not.
  expect(cars.update([state(40)], 1)).toBe(1);
  expect(pools).toHaveLength(0);
  active = false;
  cars.update([state(20)], 0);
  expect(pools).toHaveLength(0);
});
