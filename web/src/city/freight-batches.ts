import * as THREE from 'three';
import { freightGeometry, type FreightUnit } from '../vignette/freight-stock';
import { MAX_UNITS } from './freight-consist';

/** Every freight material carries this many clipping planes. three.js compiles one program per
 * clipping-plane count, so padding downtown (4 board edges + 0–2 mouth cuts) and Brookwood (2
 * edges) to one count lets all instanced freight share a single shader program. */
export const FREIGHT_CLIP_PLANES = 6;
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

  constructor(private low = false) {
    this.group.name = 'Illustrative freight';
    this.group.add(this.poses);
  }

  /** A pose for one position in the train; it draws as whatever kind `append` is given. */
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
    this.batches.clear();
    this.shapes.clear();
    this.poses.clear();
    this.group.clear();
  }
}
