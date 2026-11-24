import * as THREE from 'three';
import { freightGeometry, type FreightUnit } from '../vignette/freight-stock';

/** Cars with the same shape and clipping planes submit one draw as they round the track. */
export class FreightBatches {
  readonly group = new THREE.Group();
  readonly poses = new THREE.Group();
  private shapes = new Map<FreightUnit, THREE.BufferGeometry>();
  private batches = new Map<THREE.Material, Map<FreightUnit, THREE.InstancedMesh>>();

  constructor(private consist: readonly FreightUnit[], private instanced: boolean) {
    this.group.name = 'Illustrative freight';
    this.group.add(this.poses);
  }

  createCar(kind: FreightUnit, material: THREE.Material) {
    if (!this.shapes.has(kind)) this.shapes.set(kind, freightGeometry(kind));
    const car = this.instanced ? Object.assign(new THREE.Object3D(), { material })
      : new THREE.Mesh(this.shapes.get(kind)!, material);
    car.receiveShadow = true;
    this.poses.add(car);
    return car;
  }

  begin() {
    for (const kinds of this.batches.values()) for (const mesh of kinds.values()) mesh.count = 0;
  }

  append(kind: FreightUnit, pose: THREE.Object3D & { material: THREE.Material }) {
    if (!this.instanced) return;
    const material = pose.material;
    if (!this.batches.has(material)) this.batches.set(material, new Map());
    const kinds = this.batches.get(material)!;
    let mesh = kinds.get(kind);
    if (!mesh) {
      mesh = new THREE.InstancedMesh(this.shapes.get(kind)!, material, this.consist.filter(k => k === kind).length);
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
    for (const kinds of this.batches.values()) for (const mesh of kinds.values()) {
      mesh.visible = mesh.count > 0;
      if (mesh.visible) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
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
