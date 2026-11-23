import * as THREE from 'three';
import { CAR_LENGTH } from '../vignette/cq400';
import { BUS_LENGTH } from '../vignette/xcelsior';
import type { CityBuses } from './buses';

export type VehicleSelection = { kind: 'train' | 'bus'; id: string } | { kind: 'freight'; line?: string };

/** Work only on a tap. Project the visible length of each drawn car into CSS pixels.
 * Comparing screen distances gives the same touch radius on both quality tiers. */
export function pickVehicle(x: number, y: number, width: number, height: number,
  camera: THREE.PerspectiveCamera, trains: THREE.Group, buses: CityBuses['positions'],
  edges: THREE.Plane[], scenery: THREE.Object3D[], freight?: THREE.Group, intercity?: THREE.Group, corridorFreight?: THREE.Group): VehicleSelection | null {
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const hits: { vehicle: VehicleSelection; distance: number; point: THREE.Vector3 }[] = [];
  function consider(vehicle: VehicleSelection, planes: THREE.Plane[]) {
    for (const plane of [...planes, ...frustum.planes]) {
      const da = plane.distanceToPoint(a), db = plane.distanceToPoint(b);
      if (da < 0 && db < 0) return;
      if (da < 0) a.lerp(b, da / (da - db));
      else if (db < 0) b.lerp(a, db / (db - da));
    }
    a.project(camera);
    b.project(camera);
    const ax = (1 + a.x) * width / 2, ay = (1 - a.y) * height / 2;
    const dx = (b.x - a.x) * width / 2, dy = (a.y - b.y) * height / 2;
    const t = THREE.MathUtils.clamp(((x-ax)*dx + (y-ay)*dy) / (dx*dx + dy*dy || 1), 0, 1);
    const distance = Math.hypot(x - ax - t*dx, y - ay - t*dy);
    if (distance <= 24) hits.push({ vehicle, distance, point: a.clone().lerp(b,t).unproject(camera) });
  }
  function railCar(car: THREE.Object3D, length: number, vehicle: VehicleSelection) {
    if (!car.visible) return;
    const material = (car as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material;
    // The roof can be visible above a wall while the body is hidden.
    for (const height of [2, vehicle.kind === 'freight' ? 4 : 3.4]) {
      a.set(0, height, -length / 2).applyMatrix4(car.matrixWorld);
      b.set(0, height, length / 2).applyMatrix4(car.matrixWorld);
      consider(vehicle, material.clippingPlanes ?? edges);
    }
  }
  for (const car of trains.children) railCar(car, CAR_LENGTH, { kind: 'train', id: car.userData.trainId });
  for (const car of intercity?.children ?? []) railCar(car, car.userData.lengthM, { kind: 'train', id: car.userData.trainId });
  for (const car of freight?.children ?? []) railCar(car, car.userData.lengthM, { kind: 'freight' });
  for (const car of corridorFreight?.children ?? []) railCar(car, car.userData.lengthM, { kind: 'freight', line: car.userData.line });
  for (const bus of buses) {
    const dx = Math.sin(bus.a) * BUS_LENGTH / 2, dz = Math.cos(bus.a) * BUS_LENGTH / 2;
    for (const height of [1.7, 3]) {
      a.set(bus.x - dx, bus.y + height, bus.z - dz);
      b.set(bus.x + dx, bus.y + height, bus.z + dz);
      consider({ kind: 'bus', id: bus.id }, edges);
    }
  }
  hits.sort((one,two) => one.distance - two.distance ||
    camera.position.distanceToSquared(one.point) - camera.position.distanceToSquared(two.point));
  const ray = new THREE.Raycaster();
  for (const hit of hits) {
    ray.set(camera.position, a.copy(hit.point).sub(camera.position).normalize());
    ray.far = camera.position.distanceTo(hit.point) - 1; // allow the near face of the vehicle
    const occluded = ray.intersectObjects(scenery, true).some(({ object, point, face }) => {
      const materials = (object as THREE.Mesh).material;
      const material = Array.isArray(materials) ? materials[face?.materialIndex ?? 0] : materials;
      return material?.visible && !material.clippingPlanes?.some(plane => plane.distanceToPoint(point) < 0);
    });
    if (!occluded) return hit.vehicle;
  }
  return null;
}

/** OrbitControls captures pointer events on this canvas. A pan, pinch, or cancelled
 * gesture must never act as a tap, even when its final position returns to the start. */
export function listenForTap(canvas: HTMLCanvasElement, select: (x: number, y: number) => void) {
  const events = new AbortController();
  const options = { signal: events.signal, capture: true };
  let finger: { id: number; x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', e => {
    finger = e.button === 0 && e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  }, options);
  canvas.addEventListener('pointermove', e => {
    if (finger && Math.hypot(e.clientX - finger.x, e.clientY - finger.y) > 6) finger = null;
  }, options);
  canvas.addEventListener('pointercancel', () => { finger = null; }, options);
  canvas.addEventListener('pointerup', e => {
    const started = finger;
    finger = null;
    if (started?.id === e.pointerId && Math.hypot(e.clientX - started.x, e.clientY - started.y) <= 6) {
      select(e.clientX, e.clientY);
    }
  }, options);
  return () => events.abort();
}
