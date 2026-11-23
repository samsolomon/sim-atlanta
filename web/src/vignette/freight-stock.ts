import * as THREE from 'three';
import { Builder } from './geom';

/**
 * Freight units. 'locomotive' wears an NS-like scheme (black, white nose stripes) and
 * 'locomotiveCsx' a CSX-like one (blue-grey, yellow nose and sill). Both are a GE
 * ES44AC/AC44C6M-style body. No marks, emblems or lettering. See docs/freight-stock.md.
 */
export type FreightUnit =
  | 'locomotive'
  | 'locomotiveCsx'
  | 'boxcar'
  | 'boxcarBlue'
  | 'tank'
  | 'hopper'
  | 'gondola'
  | 'autorack'
  | 'intermodal';
/** Over-coupler lengths in metres, rounded from common North American car classes (docs/freight-stock.md). */
export const FREIGHT_LENGTH = {
  locomotive: 22.3,
  locomotiveCsx: 22.3,
  boxcar: 16.8,
  boxcarBlue: 16.8,
  tank: 18.0,
  hopper: 18.0,
  gondola: 17.0,
  autorack: 27.4,
  intermodal: 22.0,
} as const satisfies Record<FreightUnit, number>;
export const FREIGHT_TRUCK_SPACING = {
  locomotive: 14,
  locomotiveCsx: 14,
  boxcar: 12,
  boxcarBlue: 12,
  tank: 13.1,
  hopper: 13.4,
  gondola: 12.6,
  autorack: 19.8,
  intermodal: 18.4,
} as const satisfies Record<FreightUnit, number>;
export const FREIGHT_NAMES: Record<FreightUnit, string> = {
  locomotive: 'Locomotive, NS-like',
  locomotiveCsx: 'Locomotive, CSX-like',
  boxcar: 'Boxcar',
  boxcarBlue: 'Boxcar (blue)',
  tank: 'Tank car',
  hopper: 'Covered hopper',
  gondola: 'Gondola',
  autorack: 'Autorack',
  intermodal: 'Double-stack well car',
};

const LIVERY = {
  ns: { body: '#1b1c1f', cab: '#1b1c1f', radiator: '#202226', nose: '#1b1c1f', deck: '#1b1c1f', rail: '#e8e4d8', stripe: '#ece8dc' },
  csx: { body: '#2b3a4d', cab: '#2b3a4d', radiator: '#27364a', nose: '#e2b23a', deck: '#e2b23a', rail: '#e2b23a', stripe: '' },
};

/** Local +z faces the cab. The origin is midway between the trucks at rail height. */
export function freightGeometry(unit: FreightUnit) {
  const b = new Builder();
  const loco = unit === 'locomotive' || unit === 'locomotiveCsx';
  const length = FREIGHT_LENGTH[unit];
  const L = LIVERY[unit === 'locomotiveCsx' ? 'csx' : 'ns'];
  const frame = '#393d40', steel = '#55585a', body = L.body, yellow = L.deck;
  const truck = FREIGHT_TRUCK_SPACING[unit] / 2;
  for (const center of [-truck, truck]) {
    b.box(2.5, .55, loco ? 4.6 : 3, 0, .68, center, frame);
    for (const dz of loco ? [-1.6, 0, 1.6] : [-.95, .95]) {
      for (const x of [-.72, .72]) {
        const wheel = new THREE.CylinderGeometry(.49, .49, .16, 10).rotateZ(Math.PI / 2);
        wheel.translate(x, .49, center + dz);
        b.addGeometry(wheel, steel);
        wheel.dispose();
      }
    }
  }
  b.box(2.98, .42, length - .7, 0, 1.14, 0, frame);
  for (const end of [-1, 1]) b.box(.46, .32, .65, 0, .98, end * (length / 2 - .32), frame);
  if (loco) {
    b.box(2.45, 1.02, 7.3, 0, .79, -.6, '#404747'); // fuel tank between the trucks
    b.box(3.13, .26, 21.4, 0, 1.47, 0, yellow);
    b.box(1.94, 2.38, 13.8, 0, 2.79, -2.65, body); // long hood with walkways on both sides
    b.box(2.64, .48, 4.3, 0, 3.94, -7.45, L.radiator); // flared radiator
    for (const z of [-8.45, -6.65]) {
      const fan = new THREE.CylinderGeometry(.75, .75, .12, 12);
      fan.translate(0, 4.22, z);
      b.addGeometry(fan, frame);
      fan.dispose();
    }
    // Sections through the short hood give the nose its bevels and the cab its sloping glass.
    function shell(z: number, width: number, top: number, bevel: number) {
      return [[-width, 1.59, z], [width, 1.59, z], [width, top - bevel, z],
        [width - bevel, top, z], [-width + bevel, top, z], [-width, top - bevel, z]];
    }
    function connect(rear: number[][], front: number[][], color: string) {
      for (let i = 0; i < rear.length; i++) {
        const j = (i + 1) % rear.length;
        b.quad(rear[i], rear[j], front[j], front[i], color);
      }
      for (let i = 1; i + 1 < front.length; i++) b.tri(front[0], front[i], front[i + 1], color);
    }
    const cabRear = shell(4.1, 1.52, 4.37, .37);
    const cabBrow = shell(6.8, 1.52, 4.37, .37);
    const cabFront = shell(7.92, 1.48, 3.48, .25);
    for (let i = 1; i + 1 < cabRear.length; i++) b.tri(cabRear[0], cabRear[i + 1], cabRear[i], L.cab);
    connect(cabRear, cabBrow, L.cab);
    connect(cabBrow, cabFront, L.cab);
    for (const sign of [-1, 1]) {
      const x0 = sign * .09, x1 = sign * 1.12;
      const glass = [[x0, 3.59, 7.80], [x1, 3.59, 7.80], [x1, 4.24, 6.98], [x0, 4.24, 6.98]];
      if (sign < 0) glass.reverse();
      b.quad(glass[0], glass[1], glass[2], glass[3], '#78949c');
      b.box(.04, .57, 1.7, sign * 1.525, 3.58, 5.62, '#587786');
    }
    const hood = shell(7.57, 1.46, 3.32, .28);
    const tip = shell(9.35, .99, 2.90, .13);
    connect(hood, tip, L.nose);
    if (L.stripe) {
      // NS-like nose: horizontal white stripes across the short hood's sides and front.
      const xAt = (z: number) => 1.46 + ((0.99 - 1.46) * (z - 7.57)) / (9.35 - 7.57);
      for (const y of [1.78, 2.0, 2.22, 2.44, 2.66]) {
        const h = 0.1;
        b.box(2 * 0.99 - 0.08, h, 0.02, 0, y, 9.36, L.stripe);
        for (const sign of [-1, 1]) {
          const z0 = 7.57,
            z1 = 9.35;
          const q = [
            [sign * (xAt(z0) + 0.012), y - h / 2, z0],
            [sign * (xAt(z1) + 0.012), y - h / 2, z1],
            [sign * (xAt(z1) + 0.012), y + h / 2, z1],
            [sign * (xAt(z0) + 0.012), y + h / 2, z0],
          ];
          if (sign < 0) q.reverse();
          b.quad(q[0], q[1], q[2], q[3], L.stripe);
        }
      }
    }
    b.box(2.93, .7, .2, 0, .73, 10.5, '#343d43'); // pilot and end platform
    for (const side of [-1, 1]) {
      b.box(.065, .94, .065, side * 1.34, 2.05, 10.25, L.rail);
      b.box(.9, .07, .065, side * .93, 2.49, 10.25, L.rail);
      b.box(.065, .94, .065, side * .5, 2.05, 10.25, L.rail);
      for (let i = 0; i < 3; i++)
        b.box(.49, .08, .38, side * 1.33, .55 + i * .31, 10.15 - i * .21, steel);
    }
    for (const x of [-1.47, 1.47]) {
      b.box(.07, .08, 13.7, x, 2.5, -2.67, L.rail);
      for (const z of [-9.4, -6.1, -2.7, .7, 4]) b.box(.07, .92, .07, x, 2.04, z, steel);
      for (let i = 0; i < 4; i++) b.box(.065, .64, .59, Math.sign(x) * .99, 3.26, -4.5 + .77 * i, '#182e36');
      b.box(.27, .21, .13, x * .60, 2.03, 9.36, '#f3e6bf');
    }
    b.box(.24, .29, .14, 0, 4.10, 7.20, '#fff3cb');
  } else carBody(b, unit, length);
  return b.geometry();
}

/** Car bodies above the shared underframe and trucks. Colours are generic railcar paints, no marks. */
function carBody(b: Builder, unit: FreightUnit, length: number) {
  const steel = '#55585a';
  if (unit === 'boxcar' || unit === 'boxcarBlue') {
    const paint = unit === 'boxcar' ? '#9c5940' : '#3d5f86',
      rib = unit === 'boxcar' ? '#854632' : '#334f70';
    b.box(3.04, 2.94, 15.75, 0, 2.84, 0, paint);
    b.box(3.16, .18, 15.94, 0, 4.39, 0, '#8a8177');
    for (const side of [-1, 1]) {
      b.box(.1, 2.55, 3.07, side * 1.55, 2.76, 0, rib); // sliding door
      for (const z of [-7.5, -6.1, -4.7, -3.3, -1.65, 1.65, 3.3, 4.7, 6.1, 7.5])
        b.box(.12, 2.91, .11, side * 1.54, 2.83, z, rib);
    }
    for (let z = -7; z <= 7; z += 1.4) b.box(3.12, .08, .09, 0, 4.5, z, '#a59b8c');
  } else if (unit === 'tank') {
    // General-service tank car: a black barrel with a slight belly, end heads, a walkway and dome.
    const barrel = new THREE.CylinderGeometry(1.5, 1.5, length - 1.6, 14).rotateX(Math.PI / 2).translate(0, 2.85, 0);
    b.addGeometry(barrel, '#1f2124');
    barrel.dispose();
    for (const end of [-1, 1]) {
      const head = new THREE.SphereGeometry(1.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2)
        .scale(1, 1, 0.35).rotateX((end * Math.PI) / 2).translate(0, 2.85, end * (length / 2 - .8));
      b.addGeometry(head, '#1f2124');
      head.dispose();
    }
    b.box(.9, .35, .9, 0, 4.42, 0, '#2a2c30'); // manway and valves
    b.box(1.4, .05, 2.4, 0, 4.36, 0, '#4b4e52'); // top platform
    for (const side of [-1, 1]) b.box(.06, .06, length - 2.4, side * 1.0, 4.2, 0, '#9a9da0'); // handrails
    b.box(3.0, .1, length - 1.2, 0, 1.35, 0, '#2a2c30'); // stub sill
  } else if (unit === 'hopper') {
    // Three-bay covered hopper in light grey: tall slab sides, rounded roof, three discharge bays.
    const grey = '#b7b8b4', shade = '#a4a5a1';
    b.box(3.1, 2.9, length - 1.4, 0, 3.05, 0, grey);
    const roof = new THREE.CylinderGeometry(1.55, 1.55, length - 1.4, 12, 1, false, -Math.PI / 2, Math.PI)
      .rotateX(Math.PI / 2).scale(1, .22, 1).translate(0, 4.5, 0);
    b.addGeometry(roof, grey);
    roof.dispose();
    b.box(.9, .06, length - 2, 0, 4.86, 0, shade); // roof hatch strip
    for (const z of [-4.4, 0, 4.4]) b.box(2.2, 1.1, 2.6, 0, 1.15, z, shade); // bays
    for (const side of [-1, 1]) for (let z = -7.5; z <= 7.5; z += 1.5) b.box(.08, 2.8, .1, side * 1.57, 3.05, z, shade);
  } else if (unit === 'gondola') {
    // Mill gondola: low open box, black with ribbed sides and a scrap load showing above the rim.
    const paint = '#2a2726', rib = '#211f1e';
    b.box(3.1, .12, length - 1.0, 0, 1.4, 0, paint); // floor
    for (const side of [-1, 1]) {
      b.box(.12, 1.35, length - 1.0, side * 1.5, 2.08, 0, paint);
      for (let z = -7.2; z <= 7.2; z += 1.2) b.box(.1, 1.35, .12, side * 1.58, 2.08, z, rib);
    }
    for (const end of [-1, 1]) b.box(3.1, 1.35, .12, 0, 2.08, end * (length / 2 - .56), paint);
    b.box(2.7, .5, length - 2.2, 0, 2.6, 0, '#6b5446'); // rusty scrap load
  } else if (unit === 'autorack') {
    // Enclosed autorack: tall flat sides of perforated panels, a curved roof and end doors.
    const panel = '#c9cbc8', perf = '#9fa3a3', frameCol = '#8e8f8c';
    b.box(3.12, 4.5, length - 1.0, 0, 3.55, 0, panel);
    for (const side of [-1, 1]) {
      for (const y of [2.1, 3.55, 5.0]) b.box(.03, .9, length - 1.6, side * 1.57, y, 0, perf); // perforated rows
      for (let z = -12.4; z <= 12.4; z += 1.55) b.box(.08, 4.5, .1, side * 1.58, 3.55, z, frameCol);
    }
    const roof = new THREE.CylinderGeometry(1.56, 1.56, length - 1.0, 12, 1, false, -Math.PI / 2, Math.PI)
      .rotateX(Math.PI / 2).scale(1, .2, 1).translate(0, 5.8, 0);
    b.addGeometry(roof, '#b6b8b5');
    roof.dispose();
    for (const end of [-1, 1]) b.box(3.0, 4.4, .08, 0, 3.55, end * (length / 2 - .46), '#7c7f80');
  } else if (unit === 'intermodal') {
    // Single well car carrying two 53 ft-class boxes, double-stacked. Box colours are generic.
    const well = '#3a3d40';
    b.box(2.6, .55, length - 4.0, 0, .62, 0, well); // well floor, low between the trucks
    for (const side of [-1, 1]) b.box(.22, 1.2, length - 3.6, side * 1.35, 1.05, 0, well);
    for (const end of [-1, 1]) b.box(3.0, 1.0, 2.0, 0, 1.15, end * (length / 2 - 1.2), well);
    const box = (y: number, color: string, rib: string) => {
      b.box(2.59, 2.9, 16.15, 0, y, 0, color);
      for (const side of [-1, 1]) for (let z = -7.8; z <= 7.8; z += .6) b.box(.03, 2.7, .05, side * 1.31, y, z, rib);
      b.box(2.4, .06, 15.9, 0, y + 1.47, 0, rib);
    };
    box(2.37, '#7a1f22', '#651a1d'); // lower box
    box(5.29, '#d4d1c8', '#b9b6ad'); // upper box
  }
  void steel;
}
