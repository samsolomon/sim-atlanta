/**
 * MARTA bus: a New Flyer Xcelsior 40-foot (most of MARTA's fleet; CNG with roof tanks), built in
 * code like the CQ400. 12.2 m long, 2.6 m wide, about 3.4 m to the top of the tank fairing.
 * Faces +z; origin at the centre of the footprint on the ground. In three.js, facing +z, the
 * right-hand (curb) side is −x, so both doors are on −x.
 *
 * Livery colours are parameters (`BusLivery`) until reference photos confirm MARTA's scheme;
 * the default is a placeholder. No logos.
 *
 * Per-vertex `aKind` (read by `busMaterial`): 0 fixed, 1 headlight, 2 tail light, 3 glass,
 * 7 destination sign.
 */
import * as THREE from 'three';

export const BUS_LENGTH = 12.2;
const W = 2.59;
const H = 3.18; // roof
const FLOOR = 0.42;

export interface BusLivery {
  body: string;
  skirt: string;
  accent: string;
  accent2: string;
}
export const DEFAULT_LIVERY: BusLivery = { body: '#eef0f1', skirt: '#1f4f9c', accent: '#f08a24', accent2: '#f6c33b' };

const C = { glass: '#1f262e', frame: '#2a2f36', tyre: '#1b1c1f', hub: '#a9adb2', under: '#2c2f34', roofCap: '#e3e6e8', bumper: '#2d3036', mirror: '#2a2d33' };

class Kit {
  pos: number[] = [];
  col: number[] = [];
  kind: number[] = [];
  private c = new THREE.Color();
  geo(g: THREE.BufferGeometry, color: string, kind = 0) {
    const gg = g.index ? g.toNonIndexed() : g;
    const p = gg.attributes.position.array;
    this.c.set(color);
    for (let i = 0; i < p.length; i++) this.pos.push(p[i]);
    for (let i = 0; i < p.length / 3; i++) {
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.kind.push(kind);
    }
  }
  box(w: number, h: number, l: number, x: number, y: number, z: number, color: string, kind = 0) {
    const g = new THREE.BoxGeometry(w, h, l);
    g.translate(x, y, z);
    this.geo(g, color, kind);
  }
  /** Side profile (z along, y up) extruded across width w, centred on x0. */
  profile(pts: [number, number][], w: number, color: string, kind = 0, x0 = 0) {
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(-Math.PI / 2);
    g.translate(x0, 0, 0);
    this.geo(g, color, kind);
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

export function busGeometry(liv: BusLivery = DEFAULT_LIVERY) {
  const k = new Kit();
  const h = BUS_LENGTH / 2;
  // Body: a slab with a slightly rounded front top and a squared rear.
  k.profile(
    [
      [-h, FLOOR - 0.12],
      [h - 0.05, FLOOR - 0.12],
      [h, FLOOR + 0.2],
      [h, H - 0.35],
      [h - 0.12, H - 0.1],
      [h - 0.4, H],
      [-h + 0.15, H],
      [-h, H - 0.15],
    ],
    W,
    liv.body,
  );
  // Lower skirt colour band along both sides and the rear.
  for (const s of [-1, 1]) k.box(0.02, 0.62, BUS_LENGTH - 0.3, s * (W / 2 + 0.005), FLOOR + 0.22, -0.1, liv.skirt);
  k.box(W - 0.1, 0.62, 0.02, 0, FLOOR + 0.22, -h - 0.005, liv.skirt);
  // Accent sweep above the skirt (two colours), rising toward the rear.
  for (const s of [-1, 1]) {
    for (const [dy, color] of [
      [0, liv.accent],
      [0.11, liv.accent2],
    ] as [number, string][]) {
      const g = new THREE.BoxGeometry(0.03, 0.09, BUS_LENGTH - 1.2);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(0.03));
      g.translate(s * (W / 2 + 0.008), FLOOR + 0.6 + dy, -0.4);
      k.geo(g, color);
    }
  }
  // Windscreen: the Xcelsior's tall single pane in a black surround, destination sign above.
  k.box(W - 0.06, H - 0.3 - (FLOOR + 0.85), 0.04, 0, (H - 0.3 + FLOOR + 0.85) / 2, h + 0.015, C.frame);
  k.box(W - 0.24, H - 0.8 - (FLOOR + 0.95), 0.04, 0, (H - 0.8 + FLOOR + 0.95) / 2, h + 0.03, C.glass, 3);
  k.box(W - 0.5, 0.3, 0.04, 0, H - 0.55, h + 0.03, '#ffb84a', 7);
  // Front: dark bumper, headlight clusters, bike rack.
  k.box(W - 0.05, 0.36, 0.18, 0, FLOOR + 0.02, h + 0.04, C.bumper);
  for (const s of [-1, 1]) {
    k.box(0.42, 0.16, 0.05, s * 0.95, FLOOR + 0.42, h + 0.015, '#ffffff', 1);
    k.box(0.18, 0.1, 0.05, s * 0.6, FLOOR + 0.42, h + 0.015, '#f2a230', 0); // turn signal
  }
  k.box(1.6, 0.06, 0.55, 0, FLOOR + 0.12, h + 0.45, C.frame); // folded bike rack
  for (const s of [-1, 1]) k.box(0.05, 0.6, 0.05, s * 0.75, FLOOR + 0.4, h + 0.42, C.frame);
  // Mirrors.
  for (const s of [-1, 1]) {
    k.box(0.06, 0.06, 0.45, s * (W / 2 + 0.2), H - 0.65, h - 0.2, C.mirror);
    k.box(0.12, 0.42, 0.16, s * (W / 2 + 0.38), H - 0.85, h - 0.02, C.mirror);
  }
  // Side windows: a continuous dark band with pillars, both sides; driver's window at the front.
  for (const s of [-1, 1]) {
    const x = s * (W / 2 + 0.012);
    k.box(0.02, 1.0, BUS_LENGTH - 1.8, x, FLOOR + 1.62, -0.55, C.frame);
    for (let z = -h + 0.6; z < h - 1.6; z += 1.45) k.box(0.03, 0.9, 1.3, x + s * 0.005, FLOOR + 1.64, z + 0.65, C.glass, 3);
    k.box(0.03, 1.05, 1.0, x + s * 0.005, FLOOR + 1.66, h - 0.9, C.glass, 3);
  }
  // Doors on the curb side (−x): front (behind the windscreen) and rear (behind the front axle
  // halfway point), glazed.
  for (const zc of [h - 1.15, -0.55]) {
    k.box(0.03, 2.25, 1.2, -(W / 2 + 0.02), FLOOR + 1.12, zc, C.frame);
    for (const dz of [-0.29, 0.29]) k.box(0.035, 1.9, 0.5, -(W / 2 + 0.03), FLOOR + 1.15, zc + dz, C.glass, 3);
  }
  // Roof: CNG tank fairing over the front two-thirds, rear HVAC/engine cap.
  k.profile(
    [
      [-2.6, H],
      [h - 1.6, H],
      [h - 2.0, H + 0.36],
      [-2.2, H + 0.36],
    ],
    W - 0.35,
    C.roofCap,
  );
  k.box(W - 0.5, 0.28, 2.0, 0, H + 0.14, -h + 1.4, C.roofCap);
  // Rear: engine grille and tail lights.
  k.box(W - 0.5, 0.6, 0.04, 0, FLOOR + 0.95, -h - 0.02, C.under);
  for (const s of [-1, 1]) k.box(0.22, 0.5, 0.05, s * 1.05, FLOOR + 0.95, -h - 0.025, '#ffffff', 2);
  k.box(W - 0.6, 0.32, 0.04, 0, H - 0.45, -h - 0.02, '#ffb84a', 7); // rear route sign
  // Wheels: front axle and rear axle (wheelbase ~7.2 m), dual rear.
  const wheel = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14).rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 10).rotateZ(Math.PI / 2);
  for (const [z, dual] of [
    [h - 2.6, false],
    [h - 2.6 - 7.2, true],
  ] as [number, boolean][]) {
    for (const s of [-1, 1]) {
      // A dark wheel arch on the body side, and the tyre's outer face just proud of it.
      k.box(0.03, 1.12, 1.4, s * (W / 2 + 0.013), 0.56, z, C.under);
      const x = s * (W / 2 - (dual ? 0.12 : 0.1));
      const g = wheel.clone();
      g.translate(x, 0.5, z);
      k.geo(g, C.tyre);
      const hb = hub.clone();
      hb.translate(x + s * 0.02, 0.5, z);
      k.geo(hb, C.hub);
    }
  }
  return k.geometry();
}

/** Material: lights glow by `night`; head lights always on, tails red. */
export function busMaterial(night: { value: number }) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nvarying float vKind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = aKind;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying float vKind;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vKind > 1.5 && vKind < 2.5) diffuseColor.rgb = vec3(0.9, 0.08, 0.06);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float glow = 0.3 + 1.5 * uNight;
        if (vKind > 0.5 && vKind < 2.5) totalEmissiveRadiance += diffuseColor.rgb * glow;
        if (vKind > 2.5 && vKind < 3.5) totalEmissiveRadiance += vec3(1.0, 0.93, 0.78) * uNight * 0.6;
        if (vKind > 6.5) totalEmissiveRadiance += diffuseColor.rgb * (0.5 + uNight);`,
      );
  };
  m.customProgramCacheKey = () => 'xcelsior';
  return m;
}
