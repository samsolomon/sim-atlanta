import * as THREE from 'three';
import { expect, it } from 'vitest';
import type { TrainState } from '../model/types';
import { berthCentre, corridorChainage, crescentPlacement, isBerthed } from './brookwood';
import { drawnAt } from './drawn-at';

const car = (z: number, data: Record<string, unknown>, planes: THREE.Plane[] = []) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 20), new THREE.MeshBasicMaterial({ clippingPlanes: planes }));
  mesh.position.set(0, 0, z);
  Object.assign(mesh.userData, { trainId: 't', lengthM: 20, ...data });
  return mesh;
};

it('claims the North Line track only while a car is drawn on the open cut', () => {
  expect(drawnAt('t', [car(0, { inferredTrack: true })], []).inferredTrack).toBe(true);
  // Inside the portal: clipped (keeps z < -100), so the card drops the claim.
  const portal = new THREE.Plane(new THREE.Vector3(0, 0, -1), -100);
  expect(drawnAt('t', [car(0, { inferredTrack: true }, [portal])], []).inferredTrack).toBe(false);
  const hidden = car(0, { inferredTrack: true }); hidden.visible = false;
  expect(drawnAt('t', [hidden], []).inferredTrack).toBe(false);
  // Another train's car never counts.
  expect(drawnAt('u', [car(0, { inferredTrack: true })], []).inferredTrack).toBe(false);
});

it('claims the Brookwood berth only for a consist at the berth, not on a continuation', () => {
  const stop: TrainState = {
    id: 't', routeId: 'amtrak:route:Crescent', pathId: 'p', heading: 45, lon: -84.392477, lat: 33.799445, headsign: '', vehicleType: '',
    s: { value: 0, tier: 'scheduled', source: 'amtrak-gtfs', asOf: '' }, lengthM: { value: 234, tier: 'illustrative', source: '', asOf: '' },
  };
  expect(isBerthed(crescentPlacement(stop)!.center)).toBe(true);
  expect(isBerthed(berthCentre - 60)).toBe(false); // still easing in
  expect(isBerthed(corridorChainage.min + 200)).toBe(false); // the west continuation (x ≈ -800)
  expect(drawnAt('t', [], [car(0, { berthed: true })]).inferredBerth).toBe(true);
  expect(drawnAt('t', [], [car(0, { berthed: false })]).inferredBerth).toBe(false);
});
