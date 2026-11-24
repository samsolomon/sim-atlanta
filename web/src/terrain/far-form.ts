import * as THREE from 'three';

/**
 * Transport far form. Past FAR_M from the camera, transport meshes draw a prefix of their own
 * triangles: the parts that still read at a few pixels (road surfaces, deck sides, ballast,
 * track slabs). Sub-pixel detail (lane lines, deck undersides, parapet tops and inner faces,
 * rail profiles, lamp posts and ties) is ordered after it and skipped with setDrawRange.
 *
 * The order is a permutation of whole triangles, so a near mesh draws exactly the triangles it
 * drew before; nothing is copied and no program is added. Height queries that read these
 * positions (deckAt) remap their triangle lists through the permutation returned here.
 *
 * `?perf&transportfar=0` keeps every mesh in its near form, for A/B runs from one build.
 */
export const FAR_M = { low: 700, high: 1600 } as const;
/** Each mesh switches out at (1 + BAND) × FAR_M and back at (1 − BAND) × FAR_M. */
export const FAR_BAND = 0.1;

type Quality = keyof typeof FAR_M;
export interface FarForm {
  mesh: THREE.Mesh;
  /** Vertices drawn when far (non-indexed geometry); 0 hides the mesh when far. */
  keep: number;
  /** A lamp head: when far, shown only while the night glow is up. */
  glowAtNight?: boolean;
  box: THREE.Box3 | null;
  far: boolean;
}

const forms = new Set<FarForm>();
let ordering = true;
/** Tests: build without reordering, to compare height queries against the original order. */
export function setFarOrdering(on: boolean) {
  ordering = on;
}
let changed = false;
const disabled = (() => {
  const p = new URLSearchParams(globalThis.location?.search ?? '');
  return p.has('perf') && p.get('perf') !== '0' && p.get('perf') !== 'off' && p.get('transportfar') === '0';
})();

/** True once after any mesh changed form; City redraws its (manual) shadow map. */
export function takeFarChange() {
  const c = changed;
  changed = false;
  return c;
}

/** Hysteresis: the next state of one mesh at this distance. */
export function farState(distance: number, wasFar: boolean, range: number) {
  return wasFar ? distance > range * (1 - FAR_BAND) : distance > range * (1 + FAR_BAND);
}

const scratch = new THREE.Color();
/** Linear vertex colours as Builder writes them, for matching triangles by colour. */
export function builderColours(colours: readonly THREE.ColorRepresentation[]) {
  return colours.map((c) => {
    scratch.set(c);
    return [scratch.r, scratch.g, scratch.b] as const;
  });
}

/**
 * Reorder a non-indexed geometry in place: kept triangles first (in their original order),
 * then dropped ones. Returns the vertex count of the kept prefix and, per old triangle, its
 * new triangle index.
 */
export function orderForFar(geometry: THREE.BufferGeometry, drop: (triangle: number) => boolean) {
  if (geometry.index) throw new Error('orderForFar expects non-indexed geometry');
  const count = geometry.getAttribute('position').count / 3;
  const newOfOld = new Int32Array(count);
  if (!ordering) {
    for (let t = 0; t < count; t++) newOfOld[t] = t;
    return { keep: count * 3, newOfOld };
  }
  let kept = 0;
  for (let t = 0; t < count; t++) if (!drop(t)) newOfOld[t] = kept++;
  let next = kept;
  for (let t = 0; t < count; t++) if (drop(t)) newOfOld[t] = next++;
  if (kept === count) return { keep: count * 3, newOfOld };
  for (const name of Object.keys(geometry.attributes)) {
    const attribute = geometry.getAttribute(name) as THREE.BufferAttribute;
    const size = attribute.itemSize * 3, source = attribute.array as Float32Array;
    const copy = source.slice();
    for (let t = 0; t < count; t++) source.set(copy.subarray(t * size, (t + 1) * size), newOfOld[t] * size);
    attribute.needsUpdate = true;
  }
  return { keep: kept * 3, newOfOld };
}

/** Triangles whose first vertex has one of these Builder colours. */
export function colourDrop(geometry: THREE.BufferGeometry, colours: readonly THREE.ColorRepresentation[]) {
  const col = geometry.getAttribute('color');
  const wanted = builderColours(colours);
  return (t: number) => {
    const i = t * 3;
    const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
    return wanted.some(([R, G, B]) => Math.abs(r - R) < 1e-4 && Math.abs(g - G) < 1e-4 && Math.abs(b - B) < 1e-4);
  };
}

/** Register a mesh with a far form. Unregisters itself when its geometry is disposed.
 * Caution: Mesh.raycast honours geometry.drawRange, so a pick or audit run while a mesh is in
 * its far state misses the dropped triangles (ties, rails, markings). Height queries here read
 * positions directly and are unaffected. */
export function registerFar(mesh: THREE.Mesh, keep: number, options: { glowAtNight?: boolean } = {}) {
  const form: FarForm = { mesh, keep, glowAtNight: options.glowAtNight, box: null, far: false };
  forms.add(form);
  mesh.geometry.addEventListener('dispose', () => {
    forms.delete(form);
  });
  return form;
}

const point = new THREE.Vector3();
function worldBox(form: FarForm) {
  const { mesh } = form;
  mesh.updateWorldMatrix(true, false);
  if (mesh instanceof THREE.InstancedMesh) {
    mesh.computeBoundingBox();
    return mesh.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  }
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
}

/** Per frame: set each registered mesh to its near or far form. `night` is the lamp glow (0–1). */
export function updateFarForms(camera: THREE.Vector3, quality: Quality, night: number) {
  if (disabled) return;
  const range = FAR_M[quality];
  for (const form of forms) {
    if (!form.mesh.parent) continue;
    form.box ??= worldBox(form);
    const far = farState(form.box.distanceToPoint(camera), form.far, range);
    if (far !== form.far) {
      form.far = far;
      changed = true;
    }
    apply(form, night);
  }
}

function apply(form: FarForm, night: number) {
  const { mesh } = form;
  if (form.keep === 0) {
    const visible = !form.far || (form.glowAtNight === true && night > 0);
    if (mesh.visible !== visible) {
      mesh.visible = visible;
      if (!form.glowAtNight) changed = true;
    }
    return;
  }
  const count = form.far ? form.keep : Infinity;
  if (mesh.geometry.drawRange.count !== count) mesh.geometry.setDrawRange(0, count);
}

/** For tests and the dev console. */
export function farForms() {
  return [...forms];
}
