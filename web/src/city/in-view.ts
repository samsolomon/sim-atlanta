import * as THREE from 'three';

const frustum = new THREE.Frustum();
const view = new THREE.Matrix4();
const sphere = new THREE.Sphere();

/** True when some shown car is inside the camera frustum and on the kept side of every
 * clip plane on its material. A car still inside a tunnel portal is clipped, so it does
 * not count. Used to keep a truth-tier note up whenever its vehicles can be seen. */
export function anyCarInView(cars: Iterable<THREE.Object3D>, camera: THREE.Camera) {
  camera.updateMatrixWorld();
  frustum.setFromProjectionMatrix(view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const car of cars) {
    if (!car.visible || !(car instanceof THREE.Mesh)) continue;
    const geometry = car.geometry as THREE.BufferGeometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    car.updateWorldMatrix(true, false);
    sphere.copy(geometry.boundingSphere!).applyMatrix4(car.matrixWorld);
    if (!frustum.intersectsSphere(sphere)) continue;
    const planes = (car.material as THREE.Material).clippingPlanes ?? [];
    if (planes.every(p => p.distanceToPoint(sphere.center) > -sphere.radius)) return true;
  }
  return false;
}
