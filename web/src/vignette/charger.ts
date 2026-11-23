/**
 * Siemens ALC-42 Charger, modelled from the Siemens data sheet and dated Crescent photographs
 * (see docs/crescent-stock.md). Generic look-alike paint: no wordmark, emblem, flag or numbers.
 *
 * Local frame: +z forward, x across, y up from the railhead. `d` below is the distance back
 * from the nose tip, which is how the photos were measured.
 */
import * as THREE from 'three';
import { Builder, loft } from './geom';

export type ChargerLivery = 'phase7' | 'phase6';

/** Over couplers (data sheet 21,793 mm). */
export const CHARGER_LENGTH = 21.79;
/** Truck centres, data sheet 12,440 mm. */
export const CHARGER_TRUCKS = 12.44;
/** Main roofline, measured from the #304 broadside; roof equipment reaches the published 4.48 m. */
export const CHARGER_ROOF = 4.3;
export const CHARGER_HEIGHT = 4.48;

const W = 1.52; // half width over the body sides (3.04 m)
const BOTTOM = 1.0;
const C = {
  midnight: '#151c33',
  amtrakBlue: '#2c5394',
  phase6Blue: '#23519c',
  red: '#d4463a',
  white: '#e6e9e7',
  mask: '#15181d',
  roof: '#2a313b',
  silver: '#b8bec1',
  under: '#2c3135',
  pilot: '#55595c',
  glass: '#30475a',
  frame: '#0c0e11',
  door: '#162342',
  grille: '#131a2a',
};

/**
 * Writes the Charger body, front end and running gear into `b`. Head lamps light only on a leading
 * unit and the rear markers only on a trailing one. Decals sit 15–50 mm proud so they hold up in
 * City's long depth range.
 */
export function chargerBody(b: Builder, lamps: Builder, leading: boolean, trailing: boolean, livery: ChargerLivery) {
  const end = CHARGER_LENGTH / 2 - 0.32;
  const len = 2 * end;
  const z = (d: number) => end - d;
  const p7 = livery === 'phase7';
  const body = p7 ? C.midnight : C.phase6Blue;

  // Transverse rings from the rear to the nose: d, roof height, half width, top chamfer across and down.
  const ring = (d: number, h: number, w: number, ch: number, cv: number) => [
    [-w + 0.1, BOTTOM, z(d)],
    [w - 0.1, BOTTOM, z(d)],
    [w, BOTTOM + 0.08, z(d)],
    [w, h - cv, z(d)],
    [w - ch, h, z(d)],
    [-w + ch, h, z(d)],
    [-w, h - cv, z(d)],
    [-w, BOTTOM + 0.08, z(d)],
  ];
  const R = {
    rear: ring(len, CHARGER_ROOF, W, 0.38, 0.34),
    cab: ring(4.2, CHARGER_ROOF, W, 0.38, 0.34),
    brow: ring(2.3, 4.25, W, 0.44, 0.45),
    screenTop: ring(1.0, 3.92, W, 0.52, 0.4),
    screenFoot: ring(0.34, 2.95, W, 0.56, 0.1),
    shelf: ring(0.14, 2.72, 1.46, 0.5, 0.08),
    arc: ring(0.06, 2.6, 1.42, 0.46, 0.06),
    tip: ring(0, 2.54, 1.36, 0.42, 0.05),
  };
  // Panel order: bottom, lower chamfer, side, top chamfer, roof, top chamfer, side, lower chamfer.
  const panels = (side: string, chamfer: string, top: string) => [C.under, C.red, side, chamfer, top, chamfer, side, C.red];
  loft(b, [R.rear, R.cab], panels(body, body, C.roof), true, false, p7 ? C.amtrakBlue : C.silver);
  loft(b, [R.cab, R.brow, R.screenTop], panels(body, C.red, p7 ? C.mask : C.red), false, false);
  loft(b, [R.screenTop, R.screenFoot], panels(body, C.red, C.mask), false, false);
  loft(b, [R.screenFoot, R.shelf], panels(body, C.white, C.mask), false, false);
  loft(b, [R.shelf, R.arc], panels(body, body, C.white), false, false);
  loft(b, [R.arc, R.tip], panels(body, body, body), false, true, body);

  // Height of the flat side sheet's top edge at distance d from the nose (piecewise between rings).
  const sideTop = (d: number) => {
    const knots: [number, number][] = [[0.34, 2.85], [1.0, 3.52], [2.3, 3.8], [4.2, 3.96], [len, 3.96]];
    for (let i = 1; i < knots.length; i++) {
      const [d0, y0] = knots[i - 1],
        [d1, y1] = knots[i];
      if (d <= d1) return y0 + ((Math.max(d, d0) - d0) / (d1 - d0)) * (y1 - y0);
    }
    return 3.96;
  };
  /** A flat polygon on each side sheet, given as [d, y] points; `eps` lifts it off the paint below. */
  const sidePoly = (pts: [number, number][], color: string, eps = 0.02) => {
    for (const s of [-1, 1]) {
      const x = s * (W + eps);
      const v = pts.map(([d, y]) => [x, y, z(d)]);
      // Signed area in (z, y): the +x side wants clockwise order, the -x side anticlockwise.
      let area = 0;
      for (let i = 0; i < v.length; i++) {
        const a = v[i],
          c = v[(i + 1) % v.length];
        area += a[2] * c[1] - c[2] * a[1];
      }
      if ((s > 0) === area > 0) v.reverse();
      for (let i = 1; i < v.length - 1; i++) b.tri(v[0], v[i], v[i + 1], color);
    }
  };
  /** A band between two height profiles over [d0, d1], clipped to the side sheet. */
  const sideBand = (d0: number, d1: number, lo: (d: number) => number, hi: (d: number) => number, color: string, eps: number, steps = 8) => {
    for (let i = 0; i < steps; i++) {
      const a = d0 + ((d1 - d0) * i) / steps,
        c = d0 + ((d1 - d0) * (i + 1)) / steps;
      const top = (d: number) => Math.min(hi(d), sideTop(d));
      const bot = (d: number) => Math.min(lo(d), top(d));
      sidePoly([[a, bot(a)], [c, bot(c)], [c, top(c)], [a, top(a)]], color, eps);
    }
  };
  const lerpKnots = (knots: [number, number][]) => (d: number) => {
    if (d <= knots[0][0]) return knots[0][1];
    for (let i = 1; i < knots.length; i++) {
      const [d0, y0] = knots[i - 1],
        [d1, y1] = knots[i];
      if (d <= d1) return y0 + ((d - d0) / (d1 - d0)) * (y1 - y0);
    }
    return knots[knots.length - 1][1];
  };

  // Sill: red band with a fine white line over it, nose to rear.
  sidePoly([[0.34, 1.08], [len, 1.08], [len, 1.18], [0.34, 1.18]], C.red);
  sidePoly([[0.34, 1.18], [len, 1.18], [len, 1.22], [0.34, 1.22]], C.white);

  if (p7) {
    // Red cab cap wrapping back from the cheeks, edged below by a white arc that runs out at the roof.
    const capEdge = lerpKnots([[0.34, 2.9], [1.2, 3.1], [2.2, 3.45], [3.0, 3.75], [3.6, 3.96], [4.2, 4.06]]);
    sideBand(0.34, 4.2, (d) => capEdge(d) - 0.1, capEdge, C.white, 0.03, 12);
    sideBand(0.34, 4.2, capEdge, () => 9, C.red, 0.03, 12);
    // Side swoosh: a white diagonal from the sill (about 8.6 m back) to the roof ahead of the grilles,
    // with the lighter blue behind it. Positions fitted to the #363 broadside (estimated).
    const foot = 8.6,
      head = 12.0,
      y0 = 1.22,
      y1 = 3.96;
    const lead = (y: number) => foot + ((y - y0) / (y1 - y0)) * (head - foot);
    const width = (y: number) => 0.55 + ((y - y0) / (y1 - y0)) * (0.14 - 0.55);
    const ys = [y0, 1.9, 2.6, 3.3, y1];
    const swoosh: [number, number][] = [
      ...ys.map((y) => [lead(y), y] as [number, number]),
      ...[...ys].reverse().map((y) => [lead(y) + width(y), y] as [number, number]),
    ];
    sidePoly(swoosh, C.white, 0.03);
    const behind: [number, number][] = [...ys.map((y) => [lead(y) + width(y), y] as [number, number]), [len, y1], [len, y0]];
    sidePoly(behind.reverse(), C.amtrakBlue, 0.015);
  } else {
    // Phase VI: a thin red crescent over the cab, white beneath, and a silver tail with a red chevron.
    const capEdge = lerpKnots([[0.34, 2.75], [0.87, 3.43], [1.95, 3.86], [3.25, 3.96], [3.6, 4.05]]);
    sideBand(0.34, 3.6, (d) => capEdge(d) - 0.07, capEdge, C.white, 0.03, 10);
    sideBand(0.34, 3.6, capEdge, () => 9, C.red, 0.03, 10);
    const back = len - 1.8,
      tip = len - 4.3,
      mid = 2.4;
    // Chevron read off the #304 broadside: rear edge 1.8 m from the tail, point 4.3 m forward of it.
    const notch = len - 3.1,
      lead = len - 2.9;
    sidePoly([[len, 1.22], [back, 1.22], [notch, mid], [back, 3.96], [len, 3.96]], C.silver, 0.015);
    sidePoly([[back, 1.22], [lead, 1.22], [tip, mid], [notch, mid]], C.red, 0.03);
    sidePoly([[notch, mid], [tip, mid], [lead, 3.96], [back, 3.96]], C.red, 0.03);
  }

  // Side hardware: cab door with its window, cab windows, grilles and the X-braced radiator panel.
  const rect = (d: number, y: number, wd: number, h: number, color: string, eps: number) =>
    sidePoly([[d - wd / 2, y - h / 2], [d + wd / 2, y - h / 2], [d + wd / 2, y + h / 2], [d - wd / 2, y + h / 2]], color, eps);
  rect(2.5, 2.38, 0.8, 2.3, C.frame, 0.035);
  rect(2.5, 2.38, 0.72, 2.22, p7 ? C.door : '#1d4282', 0.04);
  rect(2.5, 3.05, 0.42, 0.6, C.glass, 0.05);
  rect(1.6, 3.0, 0.3, 0.62, C.glass, 0.05);
  rect(3.85, 3.2, 0.55, 0.62, C.glass, 0.05);
  rect(len - 8.5, 2.5, 1.0, 1.85, C.grille, 0.035);
  rect(len - 4.9, 3.13, 0.8, 0.7, C.grille, 0.035);
  const xd0 = len - 7.75,
    xd1 = len - 5.5,
    xy0 = 1.5,
    xy1 = 3.45;
  rect((xd0 + xd1) / 2, (xy0 + xy1) / 2, xd1 - xd0, xy1 - xy0, C.grille, 0.035);
  const brace = p7 ? C.amtrakBlue : C.phase6Blue;
  sidePoly([[xd0, xy0], [xd0 + 0.2, xy0], [xd1, xy1], [xd1 - 0.2, xy1]], brace, 0.05);
  sidePoly([[xd1 - 0.2, xy0], [xd1, xy0], [xd0 + 0.2, xy1], [xd0, xy1]], brace, 0.05);
  for (const s of [-1, 1]) {
    b.box(0.1, 0.08, 0.14, s * 1.62, 3.42, z(2.0), C.frame); // mirror and camera arm
    for (const y of [0.62, 0.9]) b.box(0.16, 0.05, 0.62, s * 1.44, y, z(2.5), C.pilot); // cab steps
  }

  // Windscreen: two panes with a centre post on the raked plane between screenTop and screenFoot.
  const screenZ = (y: number) => z(0.34 + ((y - 2.95) / (3.92 - 2.95)) * (1.0 - 0.34));
  const onScreen = (builder: Builder, pts: [number, number][], color: string, lift: number) => {
    const v = pts.map(([x, y]) => [x, y + lift * 0.6, screenZ(y) + lift]);
    for (let i = 1; i < v.length - 1; i++) builder.tri(v[0], v[i], v[i + 1], color);
  };
  const box2 = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  for (const s of [-1, 1]) {
    const [a, c] = s < 0 ? [-0.93, -0.05] : [0.05, 0.93];
    onScreen(b, box2(a - 0.03, 2.99, c + 0.03, 3.84), C.frame, 0.012);
    onScreen(b, box2(a, 3.02, c, 3.81), C.glass, 0.02);
    // Number board, top outboard corner. Blank by design: no operator numbers.
    const [n0, n1] = s < 0 ? [-0.86, -0.56] : [0.56, 0.86];
    onScreen(leading ? lamps : b, box2(n0, 3.66, n1, 3.76), leading ? '#eef0ea' : '#a7adb0', 0.028);
    // Pantograph wiper parked near vertical, both leaning the same way as in the photos.
    const px = s < 0 ? -0.66 : 0.41,
      tx = s < 0 ? -0.23 : 0.77;
    onScreen(b, [[px - 0.02, 3.04], [px + 0.02, 3.04], [tx + 0.02, 3.76], [tx - 0.02, 3.76]], C.frame, 0.03);
  }
  // Roof hatch in the black cap above the windscreen, laid on the brow's slope (screenTop to brow).
  const slope = Math.atan2(4.25 - 3.92, 2.3 - 1.0);
  const hatchY = 3.92 + ((1.62 - 1.0) / (2.3 - 1.0)) * (4.25 - 3.92);
  b.box(0.95, 0.05, 0.62, 0, 0, 0, C.frame, new THREE.Matrix4().makeTranslation(0, hatchY + 0.01, z(1.62)).multiply(new THREE.Matrix4().makeRotationX(slope)));

  // Lower nose: two round LED headlights under the centre post, lamp "eyes" with ditch and marker lights.
  const disc = (builder: Builder, x: number, y: number, zz: number, r: number, color: string) => {
    const g = new THREE.CylinderGeometry(r, r, 0.05, 8).rotateX(Math.PI / 2).translate(x, y, zz);
    builder.addGeometry(g, color);
    g.dispose();
  };
  for (const s of [-1, 1]) {
    disc(leading ? lamps : b, s * 0.16, 2.8, z(0.13), 0.085, leading ? '#fff4da' : '#5b6266');
    const front = z(0) + 0.006;
    const eye = s < 0
      ? [[-1.22, 2.5], [-0.48, 2.39], [-0.6, 1.89], [-1.16, 2.09]]
      : [[0.48, 2.39], [1.22, 2.5], [1.16, 2.09], [0.6, 1.89]];
    const v = eye.map(([x, y]) => [x, y, front]);
    b.tri(v[0], v[2], v[1], C.mask);
    b.tri(v[0], v[3], v[2], C.mask);
    disc(leading ? lamps : b, s * 1.0, 2.25, front + 0.02, 0.09, leading ? '#fff1cf' : '#6a7175');
    disc(b, s * 0.72, 2.12, front + 0.02, 0.07, '#7a1f1f');
  }

  // Coupler beam, centre plate, fittings and pilot.
  b.box(2.9, 0.58, 0.26, 0, 1.36, z(0) + 0.06, '#1a1d21');
  b.box(1.15, 0.24, 0.04, 0, 1.5, z(0) + 0.2, body);
  b.box(1.15, 0.03, 0.045, 0, 1.4, z(0) + 0.2, C.white);
  b.box(1.15, 0.12, 0.045, 0, 1.32, z(0) + 0.2, C.red);
  for (const s of [-1, 1]) {
    [['#c98a2c', 1.35], ['#3c7fc4', 1.16], ['#5a5f63', 0.97]].forEach(([color, x]) =>
      disc(b, s * (x as number), 1.52, z(0) + 0.2, 0.065, color as string),
    );
    for (const x of [1.18, 0.93]) disc(b, s * x, 1.2, z(0) + 0.2, 0.06, '#8c2020');
  }
  b.box(2.6, 0.5, 0.2, 0, 0.83, z(0) + 0.08, '#2b2f33');
  b.box(2.75, 0.5, 0.16, 0, 0.36, z(0) + 0.14, C.pilot); // snowplough
  b.box(0.42, 0.34, 0.5, 0, 0.92, z(0) + 0.07, C.frame); // coupler, front face at the over-couplers length
  b.box(0.42, 0.34, 0.3, 0, 0.92, z(len) - 0.15, C.frame);
  // Rear end markers, lit only when this unit ends the train.
  for (const s of [-1, 1]) disc(trailing ? lamps : b, s * 1.05, 1.62, z(len) - 0.03, 0.08, trailing ? '#fa2924' : '#5a1616');

  // Underframe, fuel tank and two Bo trucks with 44 in wheels.
  b.box(2.6, 0.26, len - 0.3, 0, 0.87, 0, C.under);
  b.box(2.3, 0.56, 5.6, 0, 0.58, 0, '#262b2f');
  const wheel = new THREE.CylinderGeometry(0.56, 0.56, 0.16, 12).rotateZ(Math.PI / 2);
  for (const tz of [-CHARGER_TRUCKS / 2, CHARGER_TRUCKS / 2]) {
    for (const x of [-0.72, 0.72])
      for (const dz of [-1.4, 1.4]) {
        const g = wheel.clone().translate(x, 0.56, tz + dz);
        b.addGeometry(g, '#42484a');
        g.dispose();
      }
    for (const x of [-1, 1]) b.box(0.26, 0.5, 3.6, x, 0.66, tz, C.pilot);
    b.box(1.95, 0.3, 3.0, 0, 0.92, tz, '#24282b');
  }
  wheel.dispose();

  // Roof equipment over the engine room rises to the published overall height.
  b.box(2.2, 0.12, len - 5.6, 0, CHARGER_ROOF + 0.06, z(4.6 + (len - 5.6) / 2), C.roof);
  for (const d of [len - 3.2, len - 5.0]) {
    const fan = new THREE.CylinderGeometry(0.7, 0.7, 0.06, 14).translate(0, CHARGER_HEIGHT - 0.03, z(d));
    b.addGeometry(fan, C.frame);
    fan.dispose();
  }
}
