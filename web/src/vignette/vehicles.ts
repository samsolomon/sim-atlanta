/**
 * Low-poly vehicle kit. Each model is a side profile extruded across its width (so hoods,
 * windscreens and roofs slope), plus glass, wheels and lights. All face +z, origin at the
 * centre of the footprint on the ground.
 *
 * Per-vertex `aKind`: 0 paint (takes the instance colour), 1 headlight, 2 taillight,
 * 3 glass, 4 fixed colour (tyres, trim, livery: ignores the instance colour), 5 amber marker (fixed
 * colour, lit at night), 6 semi van box (white, or a plain colour carried in the braking attribute).
 */
import { roadSedanGeometry } from './road-sedan';
import { roadSemiGeometry, SEMI_LENGTH } from './road-semi';
import * as THREE from 'three';

export type VehicleType = 'sedan' | 'hatch' | 'suv' | 'pickup' | 'van' | 'box' | 'tractor' | 'trailer' | 'semi';

/** The semi is the long-hood sleeper tractor and 53 ft van of road-semi.ts, one rigid 22.97 m body. */
export const LENGTH: Record<VehicleType, number> = { sedan: 4.885, hatch: 4.1, suv: 4.9, pickup: 5.6, van: 5.3, box: 8.2, tractor: 6.4, trailer: 14.6, semi: SEMI_LENGTH };

class Kit {
  pos: number[] = [];
  col: number[] = [];
  kind: number[] = [];
  private c = new THREE.Color();
  add(g: THREE.BufferGeometry, color: string, kind: number) {
    const gg = g.index ? g.toNonIndexed() : g;
    const p = gg.attributes.position.array;
    this.c.set(color);
    for (let i = 0; i < p.length; i++) this.pos.push(p[i]);
    for (let i = 0; i < p.length / 3; i++) {
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }
  /** Side profile [x along length (+ = front), y up] extruded `w` wide, centred. */
  prism(pts: [number, number][], w: number, color: string, kind: number, x0 = 0) {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x + x0, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(-Math.PI / 2);
    this.add(g, color, kind);
  }
  box(w: number, h: number, l: number, x: number, y: number, z: number, color: string, kind: number) {
    const g = new THREE.BoxGeometry(w, h, l);
    g.translate(x, y, z);
    this.add(g, color, kind);
  }
  wheels(zs: number[], track: number, r: number, width = 0.26) {
    for (const z of zs)
      for (const x of [-track / 2, track / 2]) {
        const g = new THREE.CylinderGeometry(r, r, width, 10).rotateZ(Math.PI / 2);
        g.translate(x, r, z);
        this.add(g, '#1d1e21', 4);
        const hub = new THREE.CylinderGeometry(r * 0.45, r * 0.45, width + 0.02, 8).rotateZ(Math.PI / 2);
        hub.translate(x, r, z);
        this.add(hub, '#9ea3a8', 4);
      }
  }
  lights(front: number, rear: number, y: number, track: number, ry = y) {
    for (const x of [-track / 2, track / 2]) {
      this.box(0.36, 0.14, 0.05, x, y, front, '#fff', 1);
      this.box(0.3, 0.14, 0.05, x, ry, rear, '#fff', 2);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.kind, 1));
    g.computeVertexNormals();
    return g;
  }
}

const GLASS = '#26303a';

function car(len: number, profile: [number, number][], glass: [number, number][], w = 1.8, wheelR = 0.33) {
  const k = new Kit();
  k.prism(profile, w, '#fff', 0);
  k.prism(glass, w + 0.04, GLASS, 3);
  k.box(w + 0.02, 0.16, len * 0.98, 0, 0.42, 0, '#2a2b2f', 4); // rocker / bumper line
  k.wheels([len * 0.31, -len * 0.31], w - 0.1, wheelR);
  k.lights(len / 2 + 0.01, -len / 2 - 0.01, 0.72, w - 0.5, 0.82);
  return k.geometry();
}

export function vehicleGeometry(t: VehicleType): THREE.BufferGeometry {
  switch (t) {
    case 'sedan':
      return roadSedanGeometry();
    case 'hatch':
      return car(
        4.1,
        [[-2.05, 0.32], [2.05, 0.32], [2.05, 0.7], [1.85, 0.84], [0.9, 0.95], [0.25, 1.46], [-1.75, 1.44], [-2.05, 1.0], [-2.05, 0.7]],
        [[0.86, 0.98], [0.24, 1.42], [-1.72, 1.4], [-1.98, 1.02]],
        1.75,
        0.31,
      );
    case 'suv':
      return car(
        4.9,
        [[-2.45, 0.38], [2.45, 0.38], [2.45, 0.85], [2.25, 1.05], [1.15, 1.12], [0.55, 1.74], [-2.25, 1.74], [-2.45, 1.2], [-2.45, 0.85]],
        [[1.1, 1.15], [0.55, 1.7], [-2.2, 1.7], [-2.38, 1.2]],
        1.92,
        0.38,
      );
    case 'pickup': {
      const k = new Kit();
      k.prism([[0.1, 0.4], [2.8, 0.4], [2.8, 0.95], [2.6, 1.12], [1.55, 1.2], [1.0, 1.8], [0.1, 1.8]], 1.95, '#fff', 0);
      k.prism([[1.52, 1.23], [1.0, 1.76], [0.15, 1.76], [0.15, 1.23]], 1.99, GLASS, 3);
      k.box(1.95, 0.6, 2.7, 0, 0.7, -1.25, '#fff', 0); // bed floor block
      for (const x of [-0.93, 0.93]) k.box(0.1, 0.5, 2.7, x, 1.25, -1.25, '#fff', 0);
      k.box(1.95, 0.5, 0.1, 0, 1.25, -2.6, '#fff', 0);
      k.box(1.97, 0.16, 5.5, 0, 0.45, 0, '#2a2b2f', 4);
      k.wheels([1.85, -1.75], 1.85, 0.4, 0.3);
      k.lights(2.81, -2.66, 0.82, 1.4, 1.2);
      return k.geometry();
    }
    case 'van': {
      const k = new Kit();
      k.prism([[-2.65, 0.4], [2.65, 0.4], [2.65, 0.9], [2.45, 1.15], [1.7, 1.35], [1.1, 2.15], [-2.65, 2.15]], 1.98, '#fff', 0);
      k.prism([[1.67, 1.4], [1.12, 2.1], [0.6, 2.1], [0.6, 1.4]], 2.02, GLASS, 3);
      k.box(2.0, 0.16, 5.2, 0, 0.48, 0, '#2a2b2f', 4);
      k.wheels([1.75, -1.85], 1.85, 0.36, 0.28);
      k.lights(2.66, -2.66, 0.85, 1.5, 1.0);
      return k.geometry();
    }
    case 'box': {
      const k = new Kit();
      // Cab in front, box behind. The box is fixed white; the cab takes the paint.
      k.prism([[1.9, 0.55], [4.1, 0.55], [4.1, 1.25], [3.95, 1.5], [3.65, 2.55], [1.9, 2.75]], 2.3, '#fff', 0, 0);
      k.prism([[3.92, 1.6], [3.62, 2.45], [2.8, 2.6], [2.8, 1.6]], 2.34, GLASS, 3);
      k.box(2.5, 3.0, 6.0, 0, 2.15, -1.1, '#eeece6', 4);
      k.box(2.1, 0.4, 8.0, 0, 0.55, 0, '#2a2b2f', 4);
      k.wheels([3.0, -2.6, -3.6], 2.05, 0.48, 0.32);
      k.lights(4.11, -4.11, 1.0, 1.8, 0.9);
      return k.geometry();
    }
    case 'tractor': {
      const k = new Kit();
      // Long-nose sleeper cab; kingpin (fifth wheel) at z ≈ −2.0.
      k.prism([[-0.6, 0.6], [3.2, 0.6], [3.2, 1.55], [2.95, 1.75], [1.25, 1.95], [0.95, 3.05], [-0.6, 3.25]], 2.45, '#fff', 0);
      k.prism([[1.2, 2.0], [0.93, 2.95], [0.3, 3.05], [0.3, 2.0]], 2.49, GLASS, 3);
      k.box(1.1, 0.8, 0.8, 0, 2.05, 3.3, '#b9bcc0', 4); // grille
      for (const x of [-1.33, 1.33]) k.box(0.16, 2.4, 0.16, x, 2.3, -0.75, '#b9bcc0', 4); // exhaust stacks
      k.box(2.2, 0.5, 6.2, 0, 0.75, 0.1, '#2a2b2f', 4); // chassis
      k.wheels([2.4, -1.6, -2.85], 2.1, 0.52, 0.34);
      k.lights(3.21, -3.2, 1.2, 1.9, 0.9);
      return k.geometry();
    }
    case 'semi':
      // The traffic form; the Model Lab also shows the close form.
      return roadSemiGeometry();
    case 'trailer': {
      const k = new Kit();
      k.box(2.55, 2.9, 14.4, 0, 2.75, 0, '#fff', 0);
      k.box(2.0, 0.3, 14.0, 0, 1.15, 0, '#2a2b2f', 4);
      k.wheels([-5.2, -6.4], 2.1, 0.52, 0.34);
      for (const x of [-1.0, 1.0]) k.box(0.3, 0.2, 0.05, x, 1.35, -7.23, '#fff', 2);
      return k.geometry();
    }
  }
}

/** Plain van colours for the occasional non-white semi van, indexed from 1 (0 is white). */
export const VAN_PAINT = ['#2d4f7c', '#8e2a26', '#3f6b4a'];
/** About one semi van in seven is a plain colour; the choice rides on the slot's own draw. */
export function vanPaintIndex(threshold: number) {
  const u = (threshold * 977) % 1;
  return u < 0.86 ? 0 : 1 + Math.min(VAN_PAINT.length - 1, Math.floor(((u - 0.86) / 0.14) * VAN_PAINT.length));
}
const glslColor = (hex: string) => {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
};

/**
 * Shared vehicle material: paint from the instance colour, fixed glass/tyres/trim, and head
 * and tail lights that glow by `night` (road cars can light their own brakes).
 */
export function vehicleMaterial(night: { value: number }, brakes = false) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  const shaderKey = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => shaderKey() + (brakes ? '-brakes' : '');
  m.onBeforeCompile = (sh) => {
    if (brakes) {
      // braking = lamp (0 or 1) + 2 × van paint index, so the semi's van colour needs no attribute of its own.
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float braking; varying float vBrake; varying float vVan;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBrake = mod(braking, 2.0); vVan = floor(braking * 0.5 + 0.25);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBrake; varying float vVan;')
        .replace('#include <alphamap_fragment>', `if (vKind > 5.5 && vVan > 0.5) diffuseColor.rgb = vVan < 1.5 ? ${glslColor(VAN_PAINT[0])} : vVan < 2.5 ? ${glslColor(VAN_PAINT[1])} : ${glslColor(VAN_PAINT[2])};\n#include <alphamap_fragment>`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (vKind > 1.5 && vKind < 2.5) totalEmissiveRadiance += vec3(3.6, 0.06, 0.01) * vBrake;');
    }
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nvarying float vKind;\nvarying vec3 vRaw;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = aKind;\nvRaw = color.rgb;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vKind;\nvarying vec3 vRaw;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vKind > 0.5 && vKind < 1.5) diffuseColor.rgb = vec3(1.0, 0.96, 0.82);
        else if (vKind > 1.5 && vKind < 2.5) diffuseColor.rgb = vec3(0.85, 0.08, 0.06);
        else if (vKind > 2.5) diffuseColor.rgb = vRaw;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (vKind > 0.5 && vKind < 2.5) totalEmissiveRadiance += diffuseColor.rgb * (0.12 + 1.6 * uNight);
        if (vKind > 4.5 && vKind < 5.5) totalEmissiveRadiance += diffuseColor.rgb * 1.6 * uNight;
        if (vKind > 2.5 && vKind < 3.5) totalEmissiveRadiance += vec3(0.0, 0.01, 0.02);`,
      );
  };
  return m;
}

export const PAINT = ['#f4f2ee', '#f4f2ee', '#e9e9e7', '#2b2d31', '#1c1d20', '#8a9097', '#b8bcc0', '#a3322b', '#2d4f7c', '#5b7fa6', '#d9c9a3', '#3f6b4a', '#7a2f35'];
export const FLEET = ['#f4f2ee', '#d8dde2', '#b03a2e', '#2f5b8c', '#e2b23c', '#3d6b47'];
