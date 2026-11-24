/**
 * Static scenery keeps its transforms. three.js recomposes every object's local matrix from its
 * position, rotation and scale each frame (matrixAutoUpdate) and, because that marks the world
 * matrix stale, multiplies every world matrix again: about 1,200 objects, 0.5 ms a frame on the
 * Studio and ~9% of the phone's main thread at 6x CPU throttling. Measured over a panning session,
 * only freight moves; boards, scenery, houses, landmarks and their batches never do.
 *
 * `freezeStatic(root)` computes the subtree's matrices once and turns matrixAutoUpdate off for
 * everything in it, so later frames skip both steps. Traversal still runs, so objects added later
 * (house near tiles, a late landmark) and anything that sets matrixAutoUpdate back on keep updating
 * themselves. An owner that moves a frozen object must call `object.updateMatrix()` (or
 * `refreeze(object)`); in dev, `checkFrozen()` reports any frozen object whose position, rotation or
 * scale no longer matches its matrix.
 *
 * Note: three.js marks a subtree's world matrices stale whenever an ancestor recomposes its own
 * matrix, so the containers above frozen subtrees (the scene, an area's group) take freezeSelf().
 *
 * Contract (streaming): call it once an area is positioned in the scene, from City's addArea.
 */
import * as THREE from 'three';

// Dev only: what checkFrozen() verifies. Production keeps no references (areas unmount).
const frozen = new Set<THREE.Object3D>();
const track = import.meta.env.DEV;
const scratch = new THREE.Matrix4();

/** Freeze a positioned, static subtree. Call after it is in its final place. */
export function freezeStatic(root: THREE.Object3D | null | undefined) {
  if (!root) return;
  // Ancestors first: a container frozen just before may not have drawn yet.
  root.updateWorldMatrix(true, true);
  root.traverse(o => {
    o.matrixAutoUpdate = false;
    // updateWorldMatrix leaves this set; cleared, the next frame doesn't recompute them all again.
    o.matrixWorldNeedsUpdate = false;
    if (track) frozen.add(o);
  });
}

/**
 * Freeze one object but not its children: a container that never moves (the scene, an area's group)
 * whose own updateMatrix() would otherwise mark every world matrix below it stale each frame.
 */
export function freezeSelf(o: THREE.Object3D | null | undefined) {
  if (!o) return;
  o.updateWorldMatrix(true, true);
  o.matrixAutoUpdate = false;
  o.matrixWorldNeedsUpdate = false;
  if (track) frozen.add(o);
}

/** Recompose one frozen object after its owner moved it on purpose. */
export function refreeze(o: THREE.Object3D) {
  o.updateMatrix();
  o.matrixWorldNeedsUpdate = true;
}

/** Forget a subtree that left the scene (disposed area). */
export function unfreeze(root: THREE.Object3D) {
  root.traverse(o => frozen.delete(o));
}

/**
 * Dev check: frozen objects whose position, rotation or scale no longer compose to their matrix,
 * i.e. something moved them without refreeze(). Returns their paths; recomposes them so the scene
 * stays right, and stops tracking objects that have left the scene.
 */
export function checkFrozen(scene: THREE.Object3D): string[] {
  const moved: string[] = [];
  for (const o of frozen) {
    let inScene = false;
    for (let n: THREE.Object3D | null = o; n; n = n.parent) if (n === scene) { inScene = true; break; }
    if (!inScene) { frozen.delete(o); continue; }
    if (o.matrixAutoUpdate) continue;
    scratch.compose(o.position, o.quaternion, o.scale);
    const a = scratch.elements, b = o.matrix.elements;
    let same = true;
    for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 1e-5 * Math.max(1, Math.abs(b[i]))) { same = false; break; }
    if (same) continue;
    const path: string[] = [];
    for (let n: THREE.Object3D | null = o; n && n !== scene; n = n.parent) path.unshift(n.name || n.type);
    moved.push(path.join(' / '));
    refreeze(o);
  }
  return moved;
}

/** Objects currently frozen (for tests and the perf report). */
export function frozenCount() {
  return frozen.size;
}
