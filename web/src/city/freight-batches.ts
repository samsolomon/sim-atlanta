import * as THREE from 'three';
import { freightGeometry, type FreightUnit } from '../vignette/freight-stock';
import { MAX_UNITS } from './freight-consist';

/** Every freight material carries this many clipping planes. three.js compiles one program per
 * clipping-plane count, so padding downtown (4 board edges + 0–2 mouth cuts) and Brookwood (2
 * edges) to one count lets all instanced freight share a single shader program. */
export const FREIGHT_CLIP_PLANES = 6;
/** A tiny box with the same attributes as every freight shape (position, normal, color, stockLight). */
const TEMPLATE = (() => {
  const g = new THREE.BoxGeometry(0.1, 0.1, 0.1).toNonIndexed();
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(0.5), 3));
  g.setAttribute('stockLight', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  return g;
})();
/** A plane that never clips: everything in the scene lies on its kept side. */
const NEVER = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6);
export function freightClipPlanes(planes: THREE.Plane[]) {
  if (planes.length > FREIGHT_CLIP_PLANES) throw new Error(`freight takes at most ${FREIGHT_CLIP_PLANES} clip planes`);
  return [...planes, ...Array.from({ length: FREIGHT_CLIP_PLANES - planes.length }, () => NEVER)];
}

/**
 * A train draws one instanced batch per car kind and clipping material, whatever its length, on both
 * tiers. Poses are plain Object3Ds (for picking and follow); their kind can change between passages.
 * Low tier uses the reduced car shapes. An instanced, clipped Lambert is its own shader program
 * per clipping-plane count; see docs/freight-consists.md for the measured cost.
 */
export class FreightBatches {
  readonly group = new THREE.Group();
  readonly poses = new THREE.Group();
  private shapes = new Map<FreightUnit, THREE.BufferGeometry>();
  private batches = new Map<THREE.Material, Map<FreightUnit, THREE.InstancedMesh>>();
  private templates: THREE.InstancedMesh[] = [];

  constructor(private low = false) {
    this.group.name = 'Illustrative freight';
    this.group.add(this.poses);
  }

  /** A pose for one position in the train; it draws as whatever kind `append` is given. */
  /** A hidden one-instance batch so City's boot prewarm (core/prewarm.ts, when it lands) compiles this
   * material's instanced program before any car appears. Without it the first car of a passage compiles
   * after ready and stalls that frame. Every freight material shares one program (FREIGHT_CLIP_PLANES),
   * but each material object still needs one draw to bind it. */
  prewarm(material: THREE.Material) {
    const mesh = new THREE.InstancedMesh(TEMPLATE, material, 1);
    mesh.name = 'freight prewarm template';
    mesh.visible = false;
    mesh.setMatrixAt(0, new THREE.Matrix4());
    this.group.add(mesh);
    this.templates.push(mesh);
  }

  createPose(material: THREE.Material) {
    const pose = Object.assign(new THREE.Object3D(), { material });
    pose.visible = false;
    this.poses.add(pose);
    return pose;
  }

  private shape(kind: FreightUnit) {
    let shape = this.shapes.get(kind);
    if (!shape) this.shapes.set(kind, (shape = freightGeometry(kind, { low: this.low })));
    return shape;
  }

  begin() {
    for (const kinds of this.batches.values()) for (const mesh of kinds.values()) mesh.count = 0;
  }

  append(kind: FreightUnit, pose: THREE.Object3D & { material: THREE.Material }) {
    const material = pose.material;
    if (!this.batches.has(material)) this.batches.set(material, new Map());
    const kinds = this.batches.get(material)!;
    let mesh = kinds.get(kind);
    if (!mesh) {
      mesh = new THREE.InstancedMesh(this.shape(kind), material, MAX_UNITS);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      kinds.set(kind, mesh);
    }
    pose.updateMatrix();
    mesh.setMatrixAt(mesh.count++, pose.matrix);
  }

  finish() {
    let draws = 0;
    for (const kinds of this.batches.values()) for (const mesh of kinds.values()) {
      mesh.visible = mesh.count > 0;
      if (mesh.visible) {
        draws++;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
    return draws;
  }

  dispose() {
    this.group.removeFromParent();
    for (const kinds of this.batches.values()) for (const mesh of kinds.values()) mesh.dispose();
    for (const shape of this.shapes.values()) shape.dispose();
    for (const mesh of this.templates) mesh.dispose();
    this.templates = [];
    this.batches.clear();
    this.shapes.clear();
    this.poses.clear();
    this.group.clear();
  }
}
