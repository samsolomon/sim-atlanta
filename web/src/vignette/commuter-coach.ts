/**
 * Xpress-style highway commuter coach: a generic look-alike of the MCI D4500, the majority of
 * Atlanta's Xpress fleet (77 of SRTA's 2019 order, against 15 D45 CRT LE). No logos, wordmarks or
 * numbers. One front door; the wheelchair lift sits behind a flush curb-side panel.
 *
 * Dimensions from MCI's D-Series commuter spec sheet (2021): 13.84 m long, 2.59 m wide, 3.48 m high,
 * 8.08 m wheelbase, 1.93 m front and 2.68 m rear overhang, which leaves 1.15 m to the tag axle.
 * Estimated from photos: window belt and head heights, bay and lift-panel positions, windshield
 * rake, roof pod and hatches. Sources and dates: docs/xpress-coach.md.
 *
 * Faces +z; origin at the centre of the footprint on the ground. Curb side is −x, as on the
 * Xcelsior. Uses `busMaterial` and its `aKind` light attribute (1 headlight, 2 tail light,
 * 5 tinted coach glass (side windows and doors), 7 destination sign), so it adds no shader program.
 * Mirrors hang forward of the front face, outside COACH_LENGTH.
 */
import * as THREE from 'three';
import { Kit } from './xcelsior';

export const COACH_LENGTH = 13.84;
export const COACH_WIDTH = 2.59;
export const COACH_HEIGHT = 3.48;
// The body roof sits 12 cm under the spec height; the low roof pod brings it up to 3.48 m.
const W = COACH_WIDTH, H = COACH_HEIGHT - 0.12;
// Body faces sit 4 cm inside the overall length so lamps, glass and louvres stay within it.
const ZF = COACH_LENGTH / 2 - 0.04, ZR = -ZF;
const AXLE_F = COACH_LENGTH / 2 - 1.93; // spec front overhang
const AXLE_D = AXLE_F - 8.08; // drive axle, from the spec wheelbase
const AXLE_T = AXLE_D - 1.15; // tag axle: what the spec overhangs leave
const Y0 = 0.36; // body underside
const TYRE_R = 0.52;
const ARCH_R = 0.62, ARCH_Y = 0.5;
// High passenger deck: the window band sits above a tall plain luggage-bay body.
const BELT = 2.02, HEAD = 3.12;
const BEV = 0.1;
// Front: a short upright fascia, then a tall raked windshield up into a rounded roof cap.
const SCREEN_Y0 = 1.02, SCREEN_Y1 = 3.0, SCREEN_SET = 0.42; // set-back of the windshield top
const CAP_Z = ZF - 1.05; // where the roof cap meets the flat roof
// Side layers stand 1.5 cm apart: enough for City's 20 m near plane (and the Lab's far orbits),
// close enough that the panels don't read as slabs up close.
const LIFT = { skirt: 0.01, band: 0.02, glass: 0.025, pillar: 0.04, door: 0.03, doorGlass: 0.045, seam: 0.02 };

/** Livery colours read from Xpress coaches 2113 and 1924 (2024). */
export const XPRESS_LIVERY = {
  body: '#a4a9b0', roof: '#b3b8be', skirt: '#8e949b', band: '#101317', navy: '#1f2c58', blue: '#2f6fc2', pale: '#8fb3dc',
  fascia: '#24282e',
};

const C = {
  glass: '#1b2129', tyre: '#1a1b1e', rim: '#8f959b', rimLip: '#c2c6cb', hubRing: '#5d6268', hub: '#222428', well: '#15171a',
  grille: '#3a3e44', louvre: '#565b62', seam: '#757b83', sign: '#9a6420', mirror: '#202328', pod: '#9da2a9', hatch: '#868c93',
};

function profile() {
  const s = new THREE.Shape(), b = BEV;
  s.moveTo(ZR + b, Y0 + b);
  // Front arch, and one long arch over the drive and tag axles.
  const r = ARCH_R + b;
  s.lineTo(AXLE_T - r, Y0 + b);
  s.lineTo(AXLE_T - r, ARCH_Y);
  s.absarc(AXLE_T, ARCH_Y, r, Math.PI, Math.PI / 2, true);
  s.lineTo(AXLE_D, ARCH_Y + r);
  s.absarc(AXLE_D, ARCH_Y, r, Math.PI / 2, 0, true);
  s.lineTo(AXLE_D + r, Y0 + b);
  s.lineTo(AXLE_F - r, Y0 + b);
  s.lineTo(AXLE_F - r, ARCH_Y);
  s.absarc(AXLE_F, ARCH_Y, r, Math.PI, 0, true);
  s.lineTo(AXLE_F + r, Y0 + b);
  s.lineTo(ZF - 0.08 - b, Y0 + b);
  s.lineTo(ZF - b, 0.62);
  s.lineTo(ZF - b, SCREEN_Y0);
  s.lineTo(ZF - SCREEN_SET - b, SCREEN_Y1);
  s.quadraticCurveTo(ZF - SCREEN_SET - 0.12 - b, H - b, CAP_Z, H - b);
  s.lineTo(ZR + 0.35 + b, H - b);
  s.quadraticCurveTo(ZR + b, H - b, ZR + b, H - 0.35);
  s.lineTo(ZR + b, Y0 + b);
  return s;
}

/** A thin panel on the side at x = ±(W/2 + lift). */
function side(k: Kit, sides: number[], z0: number, z1: number, y0: number, y1: number, color: string, kind = 0, lift = 0.02) {
  for (const s of sides) k.box(0.004, y1 - y0, z1 - z0, s * (W / 2 + lift), (y0 + y1) / 2, (z0 + z1) / 2, color, kind);
}

/** A flat polygon on the side at x = ±(W/2 + lift); corners are [z, y], fanned from the first. */
function decal(k: Kit, sides: number[], pts: [number, number][], color: string, lift: number, kind = 0) {
  for (const s of sides) {
    const p = pts.map(([z, y]) => [s * (W / 2 + lift), y, z]);
    const tri: number[] = [];
    for (let i = 1; i < p.length - 1; i++) tri.push(...p[0], ...p[i], ...p[i + 1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
    k.geo(g, color, kind);
  }
}

export function commuterCoachGeometry(low = false) {
  const k = new Kit();
  const liv = XPRESS_LIVERY;
  const both = [-1, 1];
  const body = new THREE.ExtrudeGeometry(profile(), {
    depth: W - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV,
    bevelSegments: low ? 1 : 3, curveSegments: low ? 3 : 12,
  });
  body.translate(0, 0, -(W - 2 * BEV) / 2);
  body.rotateY(-Math.PI / 2);
  k.geo(body, liv.body);

  // Wheel wells: dark half-tubes over the front arch and the long drive/tag arch.
  const seg = low ? 5 : 16;
  for (const zc of [AXLE_F, AXLE_D, AXLE_T]) {
    const well = new THREE.CylinderGeometry(ARCH_R - 0.02, ARCH_R - 0.02, W - 0.06, seg, 1, true, 0, Math.PI);
    well.rotateZ(Math.PI / 2).translate(0, ARCH_Y, zc);
    k.geo(well, C.well);
  }
  k.box(W - 0.06, 0.02, AXLE_D - AXLE_T, 0, ARCH_Y + ARCH_R - 0.03, (AXLE_D + AXLE_T) / 2, C.well);

  // Roof: a lighter deck with a slight tone break, the rear AC pod and two escape hatches.
  k.box(W - 0.5, 0.03, CAP_Z - (ZR + 0.5), 0, H + 0.03, (CAP_Z + ZR + 0.5) / 2, liv.roof);
  const pod = new THREE.BoxGeometry(W - 0.62, 0.1, 3.4);
  k.geo(pod.translate(0, H + 0.05, ZR + 2.3), C.pod);
  if (!low) k.box(W - 0.9, 0.004, 3.0, 0, H + 0.115, ZR + 2.3, C.grille); // condenser grille, 1.5 cm proud of the pod
  for (const z of [AXLE_F - 1.6, AXLE_D + 2.4]) k.box(0.62, 0.06, 0.62, 0, H + 0.07, z, C.hatch);

  // Lower body: a darker skirt that stops at each wheel arch, then luggage-bay door seams
  // (three bays each side) and, on the curb side, the flush wheelchair-lift panel.
  const r = ARCH_R + 0.12;
  if (!low) for (const [z0, z1] of [[ZR + 0.2, AXLE_T - r], [AXLE_D + r, AXLE_F - r], [AXLE_F + r, ZF - 0.3]]) {
    side(k, both, z0, z1, Y0 + 0.02, 0.56, liv.skirt, 0, LIFT.skirt);
  }
  const DOOR_F: [number, number] = [ZF - 1.5, ZF - 0.62];
  const LIFT_PANEL: [number, number] = [AXLE_D + r + 0.15, AXLE_D + r + 1.45]; // estimated
  const bayTop = BELT - 0.32, bayBottom = 0.66;
  const seams = (s: number, z0: number, z1: number, n: number, top = bayTop) => {
    for (let i = 0; i <= n; i++) {
      const z = z0 + (i * (z1 - z0)) / n;
      side(k, [s], z - 0.015, z + 0.015, bayBottom, top, C.seam, 0, LIFT.seam);
    }
    side(k, [s], z0, z1, top - 0.015, top + 0.015, C.seam, 0, LIFT.seam);
  };
  seams(1, AXLE_D + r + 0.15, AXLE_F - r - 0.1, low ? 1 : 3);
  seams(-1, LIFT_PANEL[1] + 0.12, AXLE_F - r - 0.1, low ? 1 : 3);
  if (!low) seams(-1, LIFT_PANEL[0], LIFT_PANEL[1], 1, BELT - 0.1); // taller lift door, flush

  // Window band: one tinted glass layer (dim at night) with dark pillars over it.
  const bandRear = ZR + 0.9;
  side(k, both, bandRear, DOOR_F[0] - 0.08, BELT, HEAD, C.glass, 5, LIFT.glass);
  side(k, both, bandRear, DOOR_F[0] - 0.08, BELT - 0.05, BELT, liv.band, 0, LIFT.pillar);
  side(k, both, bandRear, DOOR_F[0] - 0.08, HEAD, HEAD + 0.06, liv.band, 0, LIFT.pillar);
  if (!low) {
    const bays = 7, bay = (DOOR_F[0] - 0.1 - bandRear) / bays;
    for (let i = 0; i <= bays; i++) {
      const z = bandRear + i * bay;
      side(k, both, z - 0.05, z + 0.05, BELT, HEAD, liv.band, 0, LIFT.pillar);
    }
  }
  // Driver's window on the street side sits lower than the passenger band.
  side(k, [1], DOOR_F[0], ZF - 0.5, 1.5, HEAD, C.glass, 0, LIFT.glass);
  // The single curb-side door: a glazed front entrance down to the step.
  for (const [z0, z1] of [DOOR_F]) {
    side(k, [-1], z0, z1, Y0 + 0.08, HEAD + 0.04, liv.band, 0, LIFT.door);
    side(k, [-1], z0 + 0.06, z1 - 0.06, 0.55, HEAD - 0.04, C.glass, 5, LIFT.doorGlass);
    if (!low) side(k, [-1], (z0 + z1) / 2 - 0.015, (z0 + z1) / 2 + 0.015, Y0 + 0.1, HEAD, liv.band, 0, LIFT.doorGlass + 0.02);
  }

  // Livery sails below the band: pale and blue rise aft over the drive-axle arch; a tall navy one
  // ends at the skirt over the lift panel. Spaced 2 cm apart, they read as one decal.
  const sz = AXLE_D + 2.0;
  decal(k, both, [[sz, BELT - 0.06], [sz - 4.4, BELT - 0.06], [sz - 1.0, 1.32]], liv.pale, 0.012);
  decal(k, both, [[sz, BELT - 0.06], [sz - 3.5, BELT - 0.06], [sz - 1.2, 1.32]], liv.blue, 0.027);
  decal(k, both, [[sz, BELT - 0.06], [sz - 1.8, BELT - 0.06], [sz - 0.5, 0.66]], liv.navy, 0.042);

  // Front: dark fascia and a tall raked windshield that wraps a little round each corner.
  k.box(W - 0.16, 0.42, 0.05, 0, 0.72, ZF - 0.02, liv.fascia);
  const faceZ = (y: number, lift: number) => ZF - (SCREEN_SET * (y - SCREEN_Y0)) / (SCREEN_Y1 - SCREEN_Y0) + lift;
  const front = (x0: number, x1: number, y0: number, y1: number, color: string, kind: number, lift: number) => {
    const a = [x0, y0, faceZ(y0, lift)], b = [x1, y0, faceZ(y0, lift)], c = [x1, y1, faceZ(y1, lift)], d = [x0, y1, faceZ(y1, lift)];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    k.geo(g, color, kind);
  };
  front(-W / 2 + 0.06, W / 2 - 0.06, SCREEN_Y0 + 0.04, SCREEN_Y1, liv.band, 0, 0.03);
  front(-W / 2 + 0.12, W / 2 - 0.12, SCREEN_Y0 + 0.1, SCREEN_Y1 - 0.06, C.glass, 0, 0.05);
  for (const s of both) {
    // Corner wrap: a raked strip of glass on each side face just behind the front.
    decal(k, [s], [[ZF - 0.02, SCREEN_Y0 + 0.1], [ZF - 0.36, SCREEN_Y0 + 0.1], [ZF - SCREEN_SET - 0.3, SCREEN_Y1 - 0.06], [ZF - SCREEN_SET - 0.02, SCREEN_Y1 - 0.06]], C.glass, LIFT.glass);
  }
  // Destination sign behind the top of the windshield, under the roof cap, as on the D4500.
  front(-W / 2 + 0.4, W / 2 - 0.4, SCREEN_Y1 - 0.3, SCREEN_Y1 - 0.1, C.sign, 7, 0.07);
  for (const s of both) {
    k.box(0.5, 0.07, 0.04, s * 0.9, 0.86, ZF + 0.01, '#f4f1e8', 1);
    if (!low) k.box(0.16, 0.05, 0.04, s * 0.95, 0.6, ZF + 0.01, '#f4f1e8', 1);
    // Forward-hung "rams-horn" mirrors: an arm from the cap corner, swept forward and down.
    const armX = s * (W / 2 - 0.05), tipX = s * (W / 2 + 0.12);
    k.box(0.06, 0.06, 0.62, armX, H - 0.32, ZF - SCREEN_SET + 0.08, C.mirror);
    k.box(Math.abs(tipX - armX) + 0.06, 0.06, 0.06, (armX + tipX) / 2, H - 0.32, ZF - SCREEN_SET + 0.38, C.mirror);
    if (!low) k.box(0.05, 0.55, 0.05, tipX, H - 0.6, ZF - SCREEN_SET + 0.4, C.mirror);
    k.box(0.1, 0.42, 0.22, tipX, 2.35, ZF - SCREEN_SET + 0.42, C.mirror);
  }

  // Rear: no rear window. A body-colour cap with an upper intake grille, the louvred engine door
  // and tall tail-lamp clusters.
  k.box(W - 0.4, 1.25, 0.03, 0, 1.2, ZR - 0.005, C.grille);
  k.box(W - 0.8, 0.36, 0.03, 0, 2.72, ZR - 0.005, C.grille);
  if (!low) {
    for (let y = 0.7; y < 1.8; y += 0.11) k.box(W - 0.5, 0.035, 0.04, 0, y, ZR - 0.02, C.louvre);
    for (let y = 2.6; y < 2.88; y += 0.09) k.box(W - 0.9, 0.03, 0.04, 0, y, ZR - 0.02, C.louvre);
  }
  for (const s of both) {
    k.box(0.16, 0.42, 0.04, s * (W / 2 - 0.18), 1.18, ZR - 0.01, '#d0251c', 2);
    if (!low) k.box(0.16, 0.14, 0.04, s * (W / 2 - 0.18), 0.82, ZR - 0.01, '#e8a73a', 1);
  }

  // Wheels: single front tyres, dual drive tyres, single tag tyres, each with a steel disc face as on
  // the XN40: a bright rim lip, a grey dished disc, and a darker hub centre.
  const wseg = low ? 8 : 20; // a multiple of 4, so a vertex rests on the ground
  const tyre = (x: number, z: number, w: number) => {
    const g = new THREE.CylinderGeometry(TYRE_R, TYRE_R, w, wseg).rotateZ(Math.PI / 2);
    g.translate(x, TYRE_R, z);
    k.geo(g, C.tyre);
  };
  const face = (g: THREE.BufferGeometry, x: number, z: number, color: string) => {
    g.rotateY(Math.PI / 2).translate(x, TYRE_R, z);
    k.geo(g, color);
  };
  for (const s of both) {
    const xo = s * (W / 2 - 0.2), f = xo + s * 0.15;
    for (const z of [AXLE_F, AXLE_D, AXLE_T]) {
      tyre(xo, z, 0.3);
      if (low) {
        face(new THREE.CircleGeometry(0.3, 6), f + s * 0.006, z, C.rim);
        face(new THREE.CircleGeometry(0.13, 4), f + s * 0.02, z, C.hub);
      } else {
        // Layers stand just outside the tyre's end cap, 4 mm apart.
        face(new THREE.RingGeometry(0.26, 0.32, 20, 1), f + s * 0.006, z, C.rimLip);
        face(new THREE.CircleGeometry(0.26, 20), f + s * 0.006, z, C.rim);
        face(new THREE.RingGeometry(0.12, 0.17, 14, 1), f + s * 0.01, z, C.hubRing);
        face(new THREE.CircleGeometry(0.12, 12), f + s * 0.014, z, C.hub);
      }
    }
    if (!low) tyre(s * (W / 2 - 0.52), AXLE_D, 0.3); // inner dual, hidden at City distance
  }
  return k.geometry();
}
