/**
 * Meshes that draw nothing. A builder that emits a material slot with no faces leaves a mesh whose
 * geometry has no vertices; three.js still binds its program, uploads its uniforms and issues a
 * zero-length draw for it every frame (seven such meshes on 2026-11-24's default view, ~0.06 ms each
 * at 6x CPU on the A16 viewport). Hiding them costs nothing visible.
 *
 * Only static geometry is hidden (a position attribute marked dynamic is left alone), and a hidden
 * mesh shows again the moment it gets vertices: when a new geometry is assigned to it, or when its
 * geometry's position attribute or index is replaced. An owner that toggles visibility itself (a
 * night-only part) still wins; at worst an empty mesh draws nothing, as before.
 * Hidden meshes carry userData.emptyHidden, and perf.captureDraws() lists them, so their owners can
 * find out why they are empty.
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
    watchForVertices(m);
    hidden++;
  });
  return hidden;
}

const vertexCount = (g: THREE.BufferGeometry) => g.index ? g.index.count : (g.attributes.position?.count ?? 0);

/** Show a hidden mesh again as soon as its geometry gains vertices (a lazy fill or a swap). */
function watchForVertices(m: THREE.Mesh) {
  const reveal = () => {
    if (!m.userData.emptyHidden || !vertexCount(m.geometry)) return;
    m.userData.emptyHidden = false;
    m.visible = true;
  };
  const watchGeometry = (g: THREE.BufferGeometry) => {
    const { setAttribute, setIndex } = g;
    g.setAttribute = function (name, attribute) { const r = setAttribute.call(this, name, attribute); if (g === m.geometry) reveal(); return r; };
    g.setIndex = function (index) { const r = setIndex.call(this, index); if (g === m.geometry) reveal(); return r; };
  };
  let geometry = m.geometry;
  watchGeometry(geometry);
  Object.defineProperty(m, 'geometry', {
    configurable: true, enumerable: true,
    get: () => geometry,
    set: (g: THREE.BufferGeometry) => { geometry = g; watchGeometry(g); reveal(); },
  });
}
