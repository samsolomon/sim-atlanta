import * as THREE from 'three';
import { expect, it } from 'vitest';
import { anyCarInView } from './in-view';

/** The City camera for `cam=x,z,bearing,tilt,distance` (setView in city.ts). */
function cityCamera(x: number, z: number, bearing: number, tilt: number, distance: number, y = -50) {
  const camera = new THREE.PerspectiveCamera(40, 999 / 496, 1, 20000);
  const az = THREE.MathUtils.degToRad(-bearing), po = THREE.MathUtils.degToRad(tilt);
  camera.position.set(x + distance * Math.sin(po) * Math.sin(az), y + distance * Math.cos(po), z + distance * Math.sin(po) * Math.cos(az));
  camera.lookAt(x, y, z);
  return camera;
}
function car(x: number, z: number, planes?: THREE.Plane[]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 20), new THREE.MeshBasicMaterial({ clippingPlanes: planes ?? null }));
  mesh.position.set(x, -60, z);
  return mesh;
}

it('sees North Line cars from the wide Brookwood split camera, far outside the old 60 m box', () => {
  const camera = cityCamera(-190, -4650, 10, 52, 1210);
  // On the open guideway north of the portal (x 556–731, z -5550 to -5700).
  expect(anyCarInView([car(640, -5600)], camera)).toBe(true);
  // A car still behind the portal clip plane does not count.
  const portal = new THREE.Plane(new THREE.Vector3(0, 0, -1), -5560); // keeps z < -5560
  expect(anyCarInView([car(640, -5450, [portal])], camera)).toBe(false);
  // Hidden cars and cars behind the camera do not count.
  const hidden = car(640, -5600); hidden.visible = false;
  expect(anyCarInView([hidden, car(-190, 2000)], camera)).toBe(false);
});
