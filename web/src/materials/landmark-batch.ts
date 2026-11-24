import { Box3, type BufferGeometry, DoubleSide, Group, Material, Mesh, MeshLambertMaterial, Object3D, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** For opaque, static landmark bodies with baked vertex colours and no per-building uniforms. */
export class StaticLandmarkMaterial extends MeshLambertMaterial {
  constructor() { super({ vertexColors: true, side: DoubleSide }); }
}

/** Called before City applies board clipping. Keep batches local so close views still cull. */
export function batchLandmarkBodies(landmarks: Object3D[]) {
  const tiles = new Map<string, Mesh<BufferGeometry, StaticLandmarkMaterial>[]>();
  const center = new Vector3();
  for (const landmark of landmarks) {
    landmark.updateMatrixWorld(true);
    landmark.traverse(o => {
      if (!(o instanceof Mesh) || !(o.material instanceof StaticLandmarkMaterial)) return;
      // A skin can extend the base material with local-coordinate patterns or night lighting.
      if (o.material.onBeforeCompile !== Material.prototype.onBeforeCompile || !o.castShadow || !o.receiveShadow) return;
      if (o.matrixWorld.determinant() <= 0 || !o.geometry.getAttribute('position').count) return;
      o.geometry.computeBoundingBox();
      new Box3().copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld).getCenter(center);
      const key = `${Math.floor(center.x / 500)},${Math.floor(center.z / 500)}`;
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key)!.push(o);
    });
  }
  const group = new Group();
  group.name = 'Downtown landmark bodies';
  group.userData.perf = 'buildings';
  group.userData.building = true;
  for (const meshes of tiles.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) continue;
    const batch = new Mesh(geometry, meshes[0].material);
    batch.castShadow = batch.receiveShadow = true;
    group.add(batch);
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      if (mesh.material !== batch.material) mesh.material.dispose();
    }
  }
  return group;
}
