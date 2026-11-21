/**
 * MARTA bus: a New Flyer Xcelsior 40-foot (most of MARTA's fleet; CNG with roof enclosures),
 * built in code to the manufacturer's published dimensions (New Flyer Xcelsior family
 * brochure, 2021) and proportions traced from its side-elevation drawing:
 *   12.24 m over body (12.50 m over bumpers) · 2.6 m wide · 3.38 m over the CNG roof enclosures
 *   wheelbase 7.2 m · front overhang ≈ 2.2 m · 305/70R22.5 tyres (≈ 1.0 m diameter)
 *   step height 356 mm · front door behind the windscreen, rear door ahead of the rear axle.
 *
 * Faces +z; origin at the centre of the footprint on the ground. Facing +z the right-hand
 * (curb) side is −x, so the doors are on −x. Livery is a parameter (`BusLivery`) until reference
 * photos confirm MARTA's scheme. No logos.
 *
 * Per-vertex `aKind` (read by `busMaterial`): 0 fixed, 1 headlight, 2 tail light, 3 glass,
 * 7 destination sign.
 */
import * as THREE from 'three';

export const BUS_LENGTH = 12.5; // over bumpers
const L = 12.24; // over body
const W = 2.6;
const H = 3.02; // roof (body)
const H_CNG = 3.38; // over roof enclosures
const Y0 = 0.3; // underside of the body (ground clearance)
const ZF = L / 2; // front face
const ZR = -L / 2; // rear face
const AXLE_F = ZF - 2.2;
const AXLE_R = AXLE_F - 7.2;
const TYRE_R = 0.5;
const ARCH_R = 0.6;
const ARCH_Y = 0.46; // arch centre height
const BEV = 0.08; // edge rounding

export interface BusLivery {
  body: string;
  skirt: string;
  accent: string;
  accent2: string;
}
export const DEFAULT_LIVERY: BusLivery = { body: '#eef0f1', skirt: '#1f4f9c', accent: '#f08a24', accent2: '#f6c33b' };

const C = {
  glass: '#1d242c',
  frame: '#20252c',
  tyre: '#1a1b1e',
  rim: '#8f959b',
  rimLip: '#b4b9be',
  hubRing: '#5d6268',
  hub: '#222428',
  well: '#15171a',
  roofCap: '#e6e9eb',
  bumper: '#2b2e34',
  mirror: '#24272c',
  grille: '#2f3238',
};

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
  box(w: number, h: number, l: number, x: number, y: number, z: number, color: string, kind = 0, rot?: THREE.Euler) {
    const g = new THREE.BoxGeometry(w, h, l);
    if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot));
    g.translate(x, y, z);
    this.geo(g, color, kind);
  }
  /** A side-on panel at x = ±(W/2 + lift), from z0..z1 and y0..y1, on each listed side. */
  side(sides: number[], z0: number, z1: number, y0: number, y1: number, color: string, kind = 0, lift = 0.006) {
    for (const s of sides) this.box(0.02, y1 - y0, z1 - z0, s * (W / 2 + lift), (y0 + y1) / 2, (z0 + z1) / 2, color, kind);
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

/** The body's side profile (z along, y up), with semicircular wheel arches cut into the bottom. */
function bodyProfile() {
  const s = new THREE.Shape();
  // The bevel grows the outline by BEV, so trace the profile inset by BEV.
  const b = BEV;
  s.moveTo(ZR + b, Y0 + b);
  for (const zc of [AXLE_R, AXLE_F]) {
    const r = ARCH_R + b;
    s.lineTo(zc - r, Y0 + b);
    s.lineTo(zc - r, ARCH_Y);
    s.absarc(zc, ARCH_Y, r, Math.PI, 0, true);
    s.lineTo(zc + r, Y0 + b);
  }
  s.lineTo(ZF - 0.12 - b, Y0 + b);
  // Front: a slight lower bulge, then the windscreen leaning back gently into the roof.
  s.lineTo(ZF - b, 0.75);
  s.lineTo(ZF - b, 1.12);
  s.lineTo(ZF - 0.07 - b, 2.75);
  s.quadraticCurveTo(ZF - 0.1 - b, H - b, ZF - 0.42 - b, H - b);
  s.lineTo(ZR + 0.3 + b, H - b);
  s.quadraticCurveTo(ZR + b, H - b, ZR + b, H - 0.3);
  s.lineTo(ZR + b, Y0 + b);
  return s;
}

export function busGeometry(liv: BusLivery = DEFAULT_LIVERY) {
  const k = new Kit();
  // ---- body shell: profile extruded across the width with rounded edges ------------------
  const body = new THREE.ExtrudeGeometry(bodyProfile(), {
    depth: W - 2 * BEV,
    bevelEnabled: true,
    bevelThickness: BEV,
    bevelSize: BEV,
    bevelSegments: 3,
    curveSegments: 20,
  });
  body.translate(0, 0, -(W - 2 * BEV) / 2);
  body.rotateY(-Math.PI / 2);
  k.geo(body, liv.body);
  // Dark wheel wells: an open half-tube lining the top of each arch, just inside the arch wall.
  for (const zc of [AXLE_R, AXLE_F]) {
    const well = new THREE.CylinderGeometry(ARCH_R - 0.015, ARCH_R - 0.015, W - 0.04, 28, 1, true, 0, Math.PI);
    well.rotateZ(Math.PI / 2); // axis across the bus; theta 0..PI is now the upper half
    well.translate(0, ARCH_Y, zc);
    k.geo(well, C.well);
    // The straight lower lips of the arch (from ARCH_Y down to the skirt).
    for (const dz of [-1, 1]) k.box(W - 0.1, ARCH_Y - Y0, 0.01, 0, (ARCH_Y + Y0) / 2, zc + dz * (ARCH_R - 0.02), C.well);
  }

  // ---- livery: lower skirt band and two accent lines -------------------------------------
  const both = [-1, 1];
  const skirtTop = 0.95;
  const runs: [number, number][] = [
    [ZR + 0.15, AXLE_R - ARCH_R - 0.08],
    [AXLE_R + ARCH_R + 0.08, AXLE_F - ARCH_R - 0.08],
    [AXLE_F + ARCH_R + 0.08, ZF - 0.2],
  ];
  for (const [z0, z1] of runs) k.side(both, z0, z1, Y0 + 0.08, skirtTop - 0.05, liv.skirt);
  k.side(both, ZR + 0.15, ZF - 0.2, skirtTop + 0.04, skirtTop + 0.12, liv.accent);
  k.side(both, ZR + 0.15, ZF - 0.2, skirtTop + 0.17, skirtTop + 0.24, liv.accent2);
  k.box(W - 0.2, skirtTop - Y0 - 0.13, 0.02, 0, (Y0 + skirtTop) / 2 + 0.02, ZR - 0.006, liv.skirt);

  // ---- side windows (belt 1.42 m, head 2.62 m), doors on the curb side (−x) ------------------
  const BELT = 1.42;
  const HEAD = 2.62;
  const win = (sides: number[], z0: number, z1: number, y0 = BELT, y1 = HEAD) => {
    k.side(sides, z0 - 0.06, z1 + 0.06, y0 - 0.06, y1 + 0.06, C.frame, 0, 0.007);
    k.side(sides, z0, z1, y0, y1, C.glass, 3, 0.011);
  };
  const DOOR_R: [number, number] = [AXLE_R + 1.55, AXLE_R + 2.75];
  const DOOR_F: [number, number] = [ZF - 1.28, ZF - 0.22];
  // Curb side: rear-quarter window, rear door, three windows, front door.
  win([-1], AXLE_R - 0.25, DOOR_R[0] - 0.15);
  win([-1], DOOR_R[1] + 0.15, DOOR_R[1] + 1.75);
  win([-1], DOOR_R[1] + 1.85, DOOR_R[1] + 3.45);
  win([-1], DOOR_R[1] + 3.55, DOOR_F[0] - 0.15);
  // Street side: the same bays, with windows where the doors would be, and the driver's window.
  win([1], AXLE_R - 0.25, DOOR_R[0] - 0.15);
  win([1], DOOR_R[0] - 0.05, DOOR_R[1] + 1.75);
  win([1], DOOR_R[1] + 1.85, DOOR_R[1] + 3.45);
  win([1], DOOR_R[1] + 3.55, DOOR_F[0] - 0.15);
  win([1], DOOR_F[0] + 0.05, ZF - 0.3); // driver's window: same belt line, its own pillar
  // Rear quarter: a short window high above the engine bay.
  win(both, ZR + 0.5, AXLE_R - 0.85, BELT + 0.25, HEAD - 0.05);
  // Doors: glazed leaves in a dark frame, nearly full height from the low floor.
  for (const [z0, z1] of [DOOR_R, DOOR_F]) {
    k.side([-1], z0 - 0.04, z1 + 0.04, Y0 + 0.08, HEAD + 0.12, C.frame, 0, 0.009);
    const mid = (z0 + z1) / 2;
    k.side([-1], z0 + 0.05, mid - 0.03, Y0 + 0.4, HEAD + 0.02, C.glass, 3, 0.013);
    k.side([-1], mid + 0.03, z1 - 0.05, Y0 + 0.4, HEAD + 0.02, C.glass, 3, 0.013);
  }

  // ---- front: big curved windscreen, sign, swept headlights, bumper, mirrors -----------------
  const fz = (y: number) => (y < 1.12 ? ZF : ZF - ((y - 1.12) / (2.75 - 1.12)) * 0.07); // front face at height y
  const windscreen = (inset: number, lift: number, color: string, kind: number) => {
    const N = 10;
    const ya = 1.2 + inset;
    const yb = 2.66 - inset;
    // Slight wrap: the outer columns curve back toward the sides.
    const wrap = (x: number) => 0 * x; // flat: the body's rounded corners already give the wrap
    const P = (x: number, y: number) => [x, y, fz(y) + lift + wrap(x)];
    for (let i = 0; i < N; i++) {
      const xa = -W / 2 + 0.16 + inset + ((W - 0.32 - 2 * inset) * i) / N;
      const xb = -W / 2 + 0.16 + inset + ((W - 0.32 - 2 * inset) * (i + 1)) / N;
      k.geo(quad(P(xa, ya), P(xb, ya), P(xb, yb), P(xa, yb)), color, kind);
    }
  };
  windscreen(-0.06, 0.02, C.frame, 0);
  windscreen(0, 0.03, C.glass, 3);
  // Destination sign band above the windscreen.
  k.box(W - 0.42, 0.24, 0.03, 0, 2.86, fz(2.86) + 0.012, C.frame);
  k.box(W - 0.62, 0.15, 0.03, 0, 2.86, fz(2.86) + 0.02, '#ffb84a', 7);
  // Headlights: swept lenses at the lower corners, angled up toward the sides.
  for (const s of both) {
    k.box(0.5, 0.14, 0.04, s * 0.88, 0.86, ZF + 0.012, C.frame, 0, new THREE.Euler(0, 0, s * 0.18));
    k.box(0.42, 0.09, 0.04, s * 0.88, 0.86, ZF + 0.022, '#ffffff', 1, new THREE.Euler(0, 0, s * 0.18));
  }
  // A soft "smile" crease across the lower front.
  k.box(1.1, 0.04, 0.02, 0, 0.66, ZF + 0.008, C.grille);
  // Bumper (12.5 m over bumpers → 0.13 m proud of the body).
  k.box(W - 0.1, 0.3, 0.16, 0, Y0 + 0.16, ZF + 0.06, C.bumper);
  // Folded bike rack.
  k.box(1.5, 0.05, 0.45, 0, Y0 + 0.36, ZF + 0.32, C.frame);
  // Mirrors on arms reaching forward from the top corners.
  for (const s of both) {
    k.box(0.05, 0.05, 0.55, s * (W / 2 - 0.05), H - 0.12, ZF + 0.12, C.mirror, 0, new THREE.Euler(0.5, 0, 0));
    k.box(0.12, 0.42, 0.18, s * (W / 2 - 0.02), H - 0.6, ZF + 0.42, C.mirror);
  }

  // ---- roof: CNG enclosure (front two-thirds) and the sculpted rear engine cap ---------------
  const roofPiece = (shape: THREE.Shape, width: number) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -width / 2);
    g.rotateY(-Math.PI / 2);
    k.geo(g, C.roofCap);
  };
  const enclosure = new THREE.Shape();
  enclosure.moveTo(AXLE_R + 0.9, H - 0.01);
  enclosure.lineTo(ZF - 1.0, H - 0.01);
  enclosure.quadraticCurveTo(ZF - 1.05, H_CNG - 0.05, ZF - 1.6, H_CNG - 0.04);
  enclosure.lineTo(AXLE_R + 1.6, H_CNG - 0.04);
  enclosure.quadraticCurveTo(AXLE_R + 1.0, H_CNG - 0.05, AXLE_R + 0.9, H - 0.01);
  roofPiece(enclosure, W - 0.5);
  const cap = new THREE.Shape();
  cap.moveTo(ZR + 0.25, H - 0.01);
  cap.lineTo(AXLE_R + 0.2, H - 0.01);
  cap.quadraticCurveTo(AXLE_R - 0.2, H + 0.26, AXLE_R - 0.8, H + 0.26);
  cap.lineTo(ZR + 0.5, H + 0.26);
  cap.quadraticCurveTo(ZR + 0.25, H + 0.24, ZR + 0.25, H - 0.01);
  roofPiece(cap, W - 0.4);

  // ---- rear: engine door, tail lights, route sign, bumper ------------------------------------
  k.box(W - 0.6, 0.9, 0.02, 0, 1.05, ZR - 0.006, C.grille);
  for (let i = 0; i < 5; i++) k.box(W - 0.8, 0.03, 0.02, 0, 0.75 + i * 0.15, ZR - 0.012, '#4a4e55');
  for (const s of both) {
    k.box(0.16, 0.62, 0.03, s * (W / 2 - 0.16), 1.05, ZR - 0.01, '#ffffff', 2);
    k.box(0.16, 0.12, 0.03, s * (W / 2 - 0.16), 1.45, ZR - 0.01, '#f2a230', 0);
  }
  k.box(W - 0.8, 0.22, 0.03, 0, 2.5, ZR - 0.01, C.frame);
  k.box(W - 1.0, 0.13, 0.03, 0, 2.5, ZR - 0.018, '#ffb84a', 7);
  k.box(W - 0.1, 0.26, 0.14, 0, Y0 + 0.14, ZR - 0.06, C.bumper);

  // ---- wheels: round tyres with rims; duals at the rear --------------------------------------
  // Tyres: an open tread band with ring sidewalls, so the dished rim can sit inside it.
  const tyre = (x: number, z: number, width: number) => {
    const t = new THREE.CylinderGeometry(TYRE_R, TYRE_R, width, 32, 1, true).rotateZ(Math.PI / 2);
    t.translate(x, TYRE_R, z);
    k.geo(t, C.tyre);
    for (const f of [-1, 1]) {
      const wall = new THREE.RingGeometry(0.29, TYRE_R, 32, 1).rotateY(Math.PI / 2);
      wall.translate(x + (f * width) / 2, TYRE_R, z);
      k.geo(wall, C.tyre);
    }
    const back = new THREE.CircleGeometry(0.3, 24).rotateY(Math.PI / 2); // closes the wheel's middle
    back.translate(x, TYRE_R, z);
    k.geo(back, C.well);
  };
  // Steel disc wheels: a grey dished face, a lighter lip, a dark hub centre with lug ring.
  const disc = (r: number, w: number, x: number, z: number, color: string, seg = 28) => {
    const g = new THREE.CylinderGeometry(r, r, w, seg).rotateZ(Math.PI / 2);
    g.translate(x, TYRE_R, z);
    k.geo(g, color);
  };
  for (const s of both) {
    const xo = s * (W / 2 - 0.2); // outer tyre centre; its face is at xo + s*0.15
    tyre(xo, AXLE_F, 0.3);
    tyre(xo, AXLE_R, 0.3);
    tyre(s * (W / 2 - 0.52), AXLE_R, 0.3); // inner dual
    for (const z of [AXLE_F, AXLE_R]) {
      const face = xo + s * 0.15;
      const lip = new THREE.RingGeometry(0.245, 0.3, 28, 1).rotateY(Math.PI / 2); // bright rim lip
      lip.translate(face - s * 0.002, TYRE_R, z);
      k.geo(lip, C.rimLip);
      disc(0.25, 0.02, face - s * 0.035, z, C.rim); // dished steel face, set back
      disc(0.15, 0.03, face - s * 0.025, z, C.hubRing, 20); // lug-nut ring
      disc(0.1, 0.04, face - s * 0.01, z, C.hub, 16); // dark hub centre
    }
  }
  return k.geometry();
}

function quad(a: number[], b: number[], c: number[], d: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  return g;
}

/** Material: lights glow by `night`; headlights always on, tail lights red. */
export function busMaterial(night: { value: number }) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
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
