/**
 * Meshes that draw nothing. A builder that emits a material slot with no faces leaves a mesh whose
 * geometry has no vertices; three.js still binds its program, uploads its uniforms and issues a
 * zero-length draw for it every frame (seven such meshes on 2026-11-24's default view, ~0.06 ms each
 * at 6x CPU on the A16 viewport). Hiding them costs nothing visible.
 *
 * Only static geometry is hidden: a position attribute marked dynamic may be filled later.
 * Hidden meshes carry userData.emptyHidden, and perf.captureDraws() lists them, so their owners can
 * find out why they are empty (some may be bugs).
 */
import * as THREE from 'three';

export function hideEmptyMeshes(root: THREE.Object3D | null | undefined): number {
  if (!root) return 0;
  let hidden = 0;
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || !m.visible || m.userData.emptyHidden) return;
    const g = m.geometry as THREE.BufferGeometry | undefined;
    const position = g?.attributes.position as THREE.BufferAttribute | undefined;
    if (!g || !position || position.usage !== THREE.StaticDrawUsage) return;
    const count = g.index ? g.index.count : position.count;
    if (count > 0) return;
    m.visible = false;
    m.userData.emptyHidden = true;
    hidden++;
  });
  return hidden;
}
