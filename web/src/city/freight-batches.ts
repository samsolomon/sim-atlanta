import * as THREE from 'three';
import { neverClip } from './brookwood';
import { freightGeometry, type FreightUnit } from '../vignette/freight-stock';
import { BOX_40_SCALE, CONTAINER_PALETTE } from '../vignette/intermodal';
import { MAX_UNITS, type WellLoad } from './freight-consist';

/** Every freight material carries this many clipping planes. three.js compiles one program per
 * clipping-plane count, so padding downtown (4 board edges + 0–2 mouth cuts) and Brookwood (2
 * edges) to one count lets all instanced freight share a single shader program. */
export const FREIGHT_CLIP_PLANES = 6;
/** A tiny box with the same attributes as every freight shape (position, normal, color, stockLight,
 * aSlot, aShade) plus the per-instance aLoad. */
const TEMPLATE = (() => {
  const g = new THREE.BoxGeometry(0.1, 0.1, 0.1).toNonIndexed();
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(0.5), 3));
  g.setAttribute('stockLight', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aSlot', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aShade', new THREE.Float32BufferAttribute(new Float32Array(n).fill(1), 1));
  g.setAttribute('aLoad', new THREE.InstancedBufferAttribute(new Float32Array(4), 4));
  return g;
})();

/** Linear-space palette, shared by every freight material. */
const palette = { value: CONTAINER_PALETTE.map((hex) => new THREE.Color(hex)) };
/**
 * Per-instance container loads. `aLoad` is (bottom colour + 1, top colour + 1, bottom length,
 * top length); a colour of 0 hides that box, and a length of BOX_40_SCALE shortens it to 40 ft about
 * the car's centre. Vertices with aSlot 0 (the car itself) are untouched.
 */
function patchFreight(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.containerPalette = palette;
  shader.vertexShader = `attribute float aSlot;
attribute float aShade;
attribute vec4 aLoad;
uniform vec3 containerPalette[${CONTAINER_PALETTE.length}];
` + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
if (aSlot > 0.5) {
  bool topBox = aSlot > 1.5;
  float paint = topBox ? aLoad.y : aLoad.x;
  if (paint < 0.5) transformed = vec3(0.0);
  else {
    transformed.z *= topBox ? aLoad.w : aLoad.z;
    vColor = aShade * containerPalette[int(paint + 0.5) - 1];
  }
}`);
}
const patchKey = () => 'freight-containers-1';

/**
 * Every City freight material: vertex-coloured Lambert, padded to FREIGHT_CLIP_PLANES, with the one
 * container patch and cache key, so downtown, Brookwood and the boot templates share a program.
 */
export function freightMaterial(planes: THREE.Plane[]) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: freightClipPlanes(planes), clipShadows: true });
  material.onBeforeCompile = patchFreight;
  material.customProgramCacheKey = patchKey;
  return material;
}

const NO_LOAD = [0, 0, 1, 1] as const;
/** Stored as float32, so an unchanged load compares equal and isn't re-uploaded every frame. */
const SHORT = Math.fround(BOX_40_SCALE);
const encode = (load: WellLoad | undefined): readonly number[] => load
  ? [load.bottom ? load.bottom.color + 1 : 0, load.top ? load.top.color + 1 : 0, load.bottom && !load.bottom.long ? SHORT : 1, load.top && !load.top.long ? SHORT : 1]
  : NO_LOAD;
export function freightClipPlanes(planes: THREE.Plane[]) {
  if (planes.length > FREIGHT_CLIP_PLANES) throw new Error(`freight takes at most ${FREIGHT_CLIP_PLANES} clip planes`);
  return [...planes, ...neverClip(FREIGHT_CLIP_PLANES - planes.length)];
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
  private views: THREE.BufferGeometry[] = [];
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

  /** The kind's shared vertex buffers plus this mesh's own per-instance `aLoad`. */
  private view(kind: FreightUnit) {
    const shape = this.shape(kind), view = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(shape.attributes)) view.setAttribute(name, attribute);
    const load = new THREE.InstancedBufferAttribute(new Float32Array(MAX_UNITS * 4), 4).setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < MAX_UNITS; i++) load.setXYZW(i, ...(NO_LOAD as [number, number, number, number]));
    view.setAttribute('aLoad', load);
    this.views.push(view);
    return view;
  }

  append(kind: FreightUnit, pose: THREE.Object3D & { material: THREE.Material }, load?: WellLoad) {
    const material = pose.material;
    if (!this.batches.has(material)) this.batches.set(material, new Map());
    const kinds = this.batches.get(material)!;
    let mesh = kinds.get(kind);
    if (!mesh) {
      mesh = new THREE.InstancedMesh(this.view(kind), material, MAX_UNITS);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.receiveShadow = true;
      mesh.count = 0;
      this.group.add(mesh);
      kinds.set(kind, mesh);
    }
    pose.updateMatrix();
    const [a, b, c, d] = encode(load);
    const loads = mesh.geometry.getAttribute('aLoad') as THREE.InstancedBufferAttribute;
    if (loads.getX(mesh.count) !== a || loads.getY(mesh.count) !== b || loads.getZ(mesh.count) !== c || loads.getW(mesh.count) !== d) {
      loads.setXYZW(mesh.count, a, b, c, d);
      loads.needsUpdate = true;
    }
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
    for (const view of this.views) view.dispose();
    this.views = [];
    for (const mesh of this.templates) mesh.dispose();
    this.templates = [];
    this.batches.clear();
    this.shapes.clear();
    this.poses.clear();
    this.group.clear();
  }
}
