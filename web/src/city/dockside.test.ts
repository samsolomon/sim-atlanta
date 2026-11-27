import * as THREE from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { createDockside, docksideId } from './dockside';

it('roofs the whole lake porch, including the slope toward the building', () => {
  const site = { id: docksideId, rings: [] } as unknown as VBuilding;
  const model = createDockside([site], site, null, () => 0)!;
  model.group.updateMatrixWorld(true);
  const down = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  // Between the porch ridge and the eave against the brick block; the ceiling sits at 3.4 m.
  for (const x of [1311.6, 1311.9, 1312.2]) {
    down.ray.origin.set(x, 50, -3355);
    expect(down.intersectObjects(model.group.children)[0].point.y).toBeGreaterThan(3.5);
  }
});
