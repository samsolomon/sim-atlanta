/**
 * A GE AC4400CW-family freight locomotive as rebuilt into the Wabtec CM44AC, modelled from dated
 * photographs (docs/freight-stock.md). Generic look-alike paint: no emblem, lettering or numbers.
 *
 * Local frame: +z toward the cab (the front), x across, y up from the railhead. The origin is
 * midway between the trucks, as for the other freight units.
 */
import * as THREE from 'three';
import { Builder } from './geom';

/** AC4400CW data: 73 ft 2 in over couplers; truck centres (centre bolster) 53 ft; 13 ft 2 in truck wheelbase. */
export const GE_LENGTH = 22.3;
export const GE_TRUCKS = 16.15;
/** Cab roof 15 ft 4 in, radiator top 15 ft 6 in. */
export const GE_CAB_ROOF = 4.67;
export const GE_RADIATOR_TOP = 4.72;

export type LocoLivery = 'csx' | 'ns';
const PAINT = {
  // CSX-like: blue-grey body, yellow nose, rear panel, sill stripe and end railings. Inputs are lighter
  // than the targets because the grade darkens them: the hood renders near #3f5263, as CSX 7232 and 69 read.
  csx: { body: '#76889a', bodyShade: '#647688', nose: '#ddb15e', rearPanel: '#ddb15e', sill: '#ddb15e', endRail: '#ddb15e', sideRail: '#76889a', cabFace: '#76889a', noseStripe: '' },
  // NS-like: black all over with white horizontal stripes across the nose and white end railings.
  ns: { body: '#2e2f33', bodyShade: '#26272a', nose: '#2e2f33', rearPanel: '#2e2f33', sill: '#2e2f33', endRail: '#e6e2d6', sideRail: '#2e2f33', cabFace: '#2e2f33', noseStripe: '#ece8dc' },
};
// Running gear in weathered dark grey-brown, not black, as in the photos.
const DARK = '#6a655e',
  FRAME = '#6f6a63',
  GRILLE = '#15191d',
  GLASS = '#3a4c5a',
  STEEL = '#4a4d50';

/**
 * Body, running gear and lamps. `lamps` receives the lit parts: head and ditch lights and number
 * boards at the end that leads, the rear headlight when the unit runs long hood forward.
 */
export function geLocomotive(b: Builder, lamps: Builder, livery: LocoLivery, leadFront: boolean, leadRear: boolean) {
  const P = PAINT[livery];
  const half = GE_LENGTH / 2;
  const front = half - 0.35; // pilot face
  const rear = -half + 0.35;

  // --- Underframe, walkway deck, sill stripe, pilots.
  b.box(3.05, 0.34, GE_LENGTH - 0.8, 0, 1.38, 0, FRAME);
  for (const s of [-1, 1]) b.box(0.03, 0.14, GE_LENGTH - 0.9, s * 1.53, 1.4, 0, P.sill); // sill stripe
  for (const [z, dir] of [[front, 1], [rear, -1]] as const) {
    b.box(3.0, 0.55, 0.35, 0, 0.98, z - dir * 0.1, DARK); // end sill / anticlimber
    // Snowplough, raked forward.
    const plough = new THREE.Matrix4().makeTranslation(0, 0.42, z + dir * 0.05).multiply(new THREE.Matrix4().makeRotationX(dir * -0.45));
    b.box(2.9, 0.62, 0.08, 0, 0, 0, '#5d5953', plough);
    b.box(0.32, 0.26, 0.42, 0, 0.92, z + dir * 0.12, '#1c1e20'); // coupler
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box(0.5, 0.05, 0.3, s * 1.25, 0.5 + i * 0.3, z - dir * 0.05, STEEL); // steps
  }

  // --- Trucks: GE Hi-Ad style, three axles, 4.01 m wheelbase, 42 in wheels.
  const wheel = new THREE.CylinderGeometry(0.53, 0.53, 0.14, 12).rotateZ(Math.PI / 2);
  for (const tz of [-GE_TRUCKS / 2, GE_TRUCKS / 2]) {
    for (const dz of [-2.0, 0, 2.0])
      for (const x of [-0.72, 0.72]) {
        const g = wheel.clone().translate(x, 0.53, tz + dz);
        b.addGeometry(g, '#7a756e');
        g.dispose();
      }
    for (const s of [-1, 1]) {
      b.box(0.2, 0.42, 4.7, s * 1.0, 0.68, tz, DARK); // cast side frame
      for (const dz of [-1.0, 1.0]) b.box(0.24, 0.3, 0.42, s * 1.05, 0.58, tz + dz, '#30343a'); // spring nests
      for (const dz of [-2.0, 0, 2.0]) b.box(0.26, 0.24, 0.3, s * 1.02, 0.53, tz + dz, '#2a2d30'); // journal boxes
    }
    b.box(2.2, 0.3, 3.4, 0, 1.0, tz, '#26292c'); // bolster / motors
  }
  wheel.dispose();

  // --- Fuel tank between the trucks (5,000 gal), rounded ends; air reservoirs above it.
  const tank = new THREE.CylinderGeometry(0.62, 0.62, 8.6, 14).rotateX(Math.PI / 2).scale(1.95, 1, 1).translate(0, 0.78, -0.2);
  b.addGeometry(tank, '#77716a');
  tank.dispose();
  for (const s of [-1, 1]) {
    const res = new THREE.CylinderGeometry(0.2, 0.2, 3.2, 10).rotateX(Math.PI / 2).translate(s * 0.95, 1.33, 2.0);
    b.addGeometry(res, '#3a3e42');
    res.dispose();
  }

  // --- Short hood (nose) and cab. The nose front is a flat panel slightly raked back at the top.
  const noseZ = 9.95,
    cabFrontZ = 8.2,
    cabRearZ = 5.55;
  b.box(2.5, 1.95, noseZ - cabFrontZ, 0, 2.55 + 0.0, (noseZ + cabFrontZ) / 2, P.nose);
  b.box(2.5, 0.06, noseZ - cabFrontZ, 0, 3.55, (noseZ + cabFrontZ) / 2, P.nose === P.body ? P.bodyShade : '#c69a28');
  // Nose face details: stacked headlights high and just off centre, porthole, ditch lights at the
  // bottom corners, small markers at pilot level, the nose door outline.
  const face = noseZ + 0.012;
  const plate = (builder: Builder, x: number, y: number, w: number, h: number, color: string, dz = 0) => builder.box(w, h, 0.03, x, y, face + dz, color);
  plate(b, 0.0, 2.45, 0.86, 1.6, P.nose === P.body ? '#202226' : '#c89a27'); // nose door
  for (const y of [3.2, 2.95]) plate(leadFront ? lamps : b, 0.62, y, 0.2, 0.2, leadFront ? '#fff4d8' : '#5f6468', 0.02);
  plate(b, 0.62, 3.2, 0.26, 0.5, '#181a1d', 0.01);
  plate(b, -0.68, 3.08, 0.2, 0.26, GLASS, 0.02); // porthole
  for (const s of [-1, 1]) {
    plate(b, s * 1.0, 1.82, 0.28, 0.28, '#181a1d', 0.01);
    plate(leadFront ? lamps : b, s * 1.0, 1.82, 0.18, 0.18, leadFront ? '#fff2cf' : '#5f6468', 0.02); // ditch lights
    plate(b, s * 0.55, 1.72, 0.08, 0.08, s < 0 ? '#9b2a22' : '#2b7a3a', 0.02); // markers
  }
  if (P.noseStripe) {
    // NS-like nose: white stripes across the face and around both sides of the short hood.
    for (const y of [1.8, 2.05, 2.3, 2.55, 2.8]) {
      plate(b, 0, y, 2.46, 0.1, P.noseStripe, 0.004);
      for (const s of [-1, 1]) b.box(0.02, 0.1, noseZ - cabFrontZ, s * 1.26, y, (noseZ + cabFrontZ) / 2, P.noseStripe);
    }
  }
  // Nose handrails.
  for (const s of [-1, 1]) {
    b.box(0.05, 1.0, 0.05, s * 1.3, 2.05, noseZ + 0.2, P.endRail);
    b.box(0.05, 0.05, 0.55, s * 1.3, 2.55, noseZ, P.endRail);
    b.box(0.05, 0.05, 1.7, s * 1.42, 2.4, (noseZ + cabFrontZ) / 2, P.endRail);
  }
  b.box(2.65, 0.05, 0.05, 0, 2.55, noseZ + 0.2, P.endRail);

  // Cab: GEVO-style flat roof, front with a two-pane windscreen, number boards on the roof's front edge.
  // The cab body stops short of the nose; above the nose the front rakes back to the roof.
  const rake = 0.55,
    yNose = 3.55,
    topZ = cabFrontZ - rake;
  b.box(3.1, GE_CAB_ROOF - 1.55, topZ - cabRearZ, 0, (GE_CAB_ROOF + 1.55) / 2, (topZ + cabRearZ) / 2, P.body);
  b.box(3.1, yNose - 1.55, rake, 0, (yNose + 1.55) / 2, cabFrontZ - rake / 2, P.body);
  {
    const W = 1.55;
    const bl = [-W, yNose, cabFrontZ],
      br = [W, yNose, cabFrontZ],
      tr = [W, GE_CAB_ROOF, topZ],
      tl = [-W, GE_CAB_ROOF, topZ];
    b.quad(bl, br, tr, tl, P.cabFace); // raked front
    for (const s of [-1, 1]) {
      const x = s * W;
      const tri = [[x, yNose, cabFrontZ], [x, GE_CAB_ROOF, topZ], [x, yNose, topZ]];
      if (s < 0) tri.reverse();
      b.tri(tri[0], tri[1], tri[2], P.body); // cheek
    }
  }
  b.box(3.14, 0.1, topZ - cabRearZ + 0.1, 0, GE_CAB_ROOF + 0.02, (topZ + cabRearZ) / 2, P.bodyShade); // roof
  // A point on the raked face at height y, lifted off it by `lift` along +z.
  const onRake = (y: number, lift: number) => cabFrontZ - (rake * (y - yNose)) / (GE_CAB_ROOF - yNose) + lift;
  const rakeQuad = (builder: Builder, x0: number, x1: number, y0: number, y1: number, color: string, lift: number) =>
    builder.quad([x0, y0, onRake(y0, lift)], [x1, y0, onRake(y0, lift)], [x1, y1, onRake(y1, lift)], [x0, y1, onRake(y1, lift)], color);
  for (const s of [-1, 1]) {
    const [x0, x1] = s < 0 ? [-1.36, -0.06] : [0.06, 1.36];
    rakeQuad(b, x0, x1, 3.7, 4.42, GLASS, 0.02); // windscreen pane
    rakeQuad(b, s * 0.5 - 0.02, s * 0.5 + 0.02, 3.75, 4.3, '#111', 0.035); // wiper
    // Number boards: black boxes on the roof's front edge above the outer windscreen corners.
    b.box(0.62, 0.22, 0.3, s * 1.08, GE_CAB_ROOF + 0.13, topZ - 0.05, '#111316');
    (leadFront ? lamps : b).box(0.5, 0.13, 0.02, s * 1.08, GE_CAB_ROOF + 0.13, topZ + 0.11, leadFront ? '#f3efe2' : '#6a6e72');
    // Side windows with a visor above, and the cab door.
    b.box(0.03, 0.7, 1.2, s * 1.565, 3.92, topZ - 0.75, GLASS);
    b.box(0.12, 0.04, 1.25, s * 1.61, 4.32, topZ - 0.75, '#15181b'); // visor
    b.box(0.03, 1.7, 0.75, s * 1.565, 2.45, cabRearZ + 0.55, P.bodyShade); // cab door
    b.box(0.03, 0.45, 0.45, s * 1.57, 3.0, cabRearZ + 0.55, GLASS);
  }

  // --- Long hood. Behind the cab, the taller electrical cabinet with louvres (intake); then the
  // engine hood with the exhaust; then the flared radiator overhanging the walkways at the rear.
  const hoodW = 2.06;
  b.box(hoodW, 2.65, 2.7, 0, 1.55 + 2.65 / 2, cabRearZ - 1.35, P.body); // electrical cabinet
  b.box(hoodW + 0.04, 0.5, 2.6, 0, 4.4, cabRearZ - 1.35, P.bodyShade); // raised intake / DB box (estimated)
  // Engine hood: nearly cab height, as in the photos (top about 4.3 m).
  b.box(hoodW, 2.75, 9.3, 0, 1.55 + 1.375, -2.85 - 0.6, P.body); // engine hood
  b.box(hoodW - 0.3, 0.1, 9.1, 0, 4.33, -3.45, P.bodyShade); // roof walk
  b.box(0.55, 0.3, 0.8, 0, 4.48, -1.6, '#2a2a2a'); // exhaust stack
  // Radiator: wings flare to full width above side intake grilles.
  const rz0 = -10.4,
    rz1 = -7.0;
  b.box(hoodW, 2.75, rz1 - rz0, 0, 2.93, (rz0 + rz1) / 2, P.body);
  b.box(3.1, 0.95, rz1 - rz0, 0, GE_RADIATOR_TOP - 0.47, (rz0 + rz1) / 2, P.body);
  b.box(3.0, 0.06, rz1 - rz0 - 0.2, 0, GE_RADIATOR_TOP + 0.01, (rz0 + rz1) / 2, GRILLE); // radiator fans grille
  for (const zc of [-9.6, -8.6, -7.6]) b.box(2.5, 0.05, 0.9, 0, GE_RADIATOR_TOP + 0.04, zc, '#1d2125');
  for (const s of [-1, 1]) {
    b.box(0.03, 0.85, rz1 - rz0 - 0.4, s * 1.565, GE_RADIATOR_TOP - 0.5, (rz0 + rz1) / 2, GRILLE); // wing intakes
    // Hood side detail: louvred panels behind the cab and door seams along the engine hood.
    for (let i = 0; i < 3; i++) b.box(0.03, 0.62, 0.48, s * (hoodW / 2 + 0.01), 3.55, cabRearZ - 0.55 - i * 0.62, GRILLE);
    for (let z = -7.6; z < 4; z += 1.15) b.box(0.02, 2.5, 0.03, s * (hoodW / 2 + 0.01), 2.9, z, P.bodyShade);
    for (let i = 0; i < 2; i++) b.box(0.03, 0.4, 0.55, s * (hoodW / 2 + 0.01), 2.1, -4.8 + i * 0.75, GRILLE);
    // Side handrail on stanchions along the walkway.
    b.box(0.04, 0.04, 14.2, s * 1.47, 2.58, -3.1, P.sideRail);
    for (let z = -10.0; z <= 3.9; z += 1.55) b.box(0.04, 1.0, 0.04, s * 1.47, 2.08, z, P.sideRail);
  }
  // Rear end: flat panel under the radiator with the rear headlight and number boards.
  b.box(2.1, 2.55, 0.04, 0, 2.85, rz0 - 0.02, P.rearPanel);
  for (const y of [3.95, 3.7]) (leadRear ? lamps : b).box(0.2, 0.2, 0.03, 0, y, rz0 - 0.05, leadRear ? '#fff4d8' : '#5f6468');
  for (const s of [-1, 1]) {
    (leadRear ? lamps : b).box(0.48, 0.13, 0.03, s * 0.72, 4.35, rz0 - 0.05, leadRear ? '#f3efe2' : '#6a6e72');
    b.box(0.05, 1.0, 0.05, s * 1.3, 2.05, rear - 0.2, P.endRail);
    b.box(0.05, 0.05, 0.6, s * 1.3, 2.55, rear + 0.05, P.endRail);
  }
  b.box(2.65, 0.05, 0.05, 0, 2.55, rear - 0.2, P.endRail);
}
