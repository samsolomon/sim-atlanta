import type * as THREE from 'three';
import { drawnCar } from './vehicle-follow';

/** Where City draws one train right now, for its card. A car counts only while it is visible
 * and on the kept side of its clip planes, so a North Line train inside the portal, or a
 * Crescent on a continuation or still easing toward the island, makes no inferred claim. */
export function drawnAt(trainId: string, cityCars: readonly THREE.Object3D[], brookwoodCars: readonly THREE.Object3D[]) {
  const mine = (cars: readonly THREE.Object3D[]) => cars.filter(c => c.userData.trainId === trainId && drawnCar(c));
  return {
    inferredTrack: mine(cityCars).some(c => c.userData.inferredTrack === true),
    inferredBerth: mine(brookwoodCars).some(c => c.userData.berthed === true),
  };
}
