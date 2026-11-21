import * as THREE from 'three';
import { Builder } from './geom';

export type FreightUnit = 'locomotive' | 'boxcar';
/** Illustrative dimensions in metres. The existing vehicle catalogue specifies the locomotive length. */
export const FREIGHT_LENGTH = { locomotive: 22.3, boxcar: 16.8 } as const;
export const FREIGHT_TRUCK_SPACING = { locomotive: 14, boxcar: 12 } as const;

/** Local +z faces the cab. The origin is midway between the trucks at rail height. */
export function freightGeometry(unit: FreightUnit) {
  const b = new Builder();
  const loco = unit === 'locomotive';
  const length = FREIGHT_LENGTH[unit];
  const frame = '#393d40', steel = '#55585a', body = '#234959', yellow = '#e1ad48';
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
    b.box(2.64, .48, 4.3, 0, 3.94, -7.45, '#294953'); // flared radiator
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
    for (let i = 1; i + 1 < cabRear.length; i++) b.tri(cabRear[0], cabRear[i + 1], cabRear[i], body);
    connect(cabRear, cabBrow, body);
    connect(cabBrow, cabFront, body);
    for (const sign of [-1, 1]) {
      const x0 = sign * .09, x1 = sign * 1.12;
      const glass = [[x0, 3.59, 7.80], [x1, 3.59, 7.80], [x1, 4.24, 6.98], [x0, 4.24, 6.98]];
      if (sign < 0) glass.reverse();
      b.quad(glass[0], glass[1], glass[2], glass[3], '#78949c');
      b.box(.04, .57, 1.7, sign * 1.525, 3.58, 5.62, '#587786');
    }
    const hood = shell(7.57, 1.46, 3.32, .28);
    const tip = shell(9.35, .99, 2.90, .13);
    connect(hood, tip, yellow);
    b.box(2.93, .7, .2, 0, .73, 10.5, '#343d43'); // pilot and end platform
    for (const side of [-1, 1]) {
      b.box(.065, .94, .065, side * 1.34, 2.05, 10.25, yellow);
      b.box(.9, .07, .065, side * .93, 2.49, 10.25, yellow);
      b.box(.065, .94, .065, side * .5, 2.05, 10.25, yellow);
      for (let i = 0; i < 3; i++)
        b.box(.49, .08, .38, side * 1.33, .55 + i * .31, 10.15 - i * .21, steel);
    }
    for (const x of [-1.47, 1.47]) {
      b.box(.07, .08, 13.7, x, 2.5, -2.67, yellow);
      for (const z of [-9.4, -6.1, -2.7, .7, 4]) b.box(.07, .92, .07, x, 2.04, z, steel);
      for (let i = 0; i < 4; i++) b.box(.065, .64, .59, Math.sign(x) * .99, 3.26, -4.5 + .77 * i, '#182e36');
      b.box(.27, .21, .13, x * .60, 2.03, 9.36, '#f3e6bf');
    }
    b.box(.24, .29, .14, 0, 4.10, 7.20, '#fff3cb');
  } else {
    const oxide = '#9c5940', rib = '#854632';
    b.box(3.04, 2.94, 15.75, 0, 2.84, 0, oxide);
    b.box(3.16, .18, 15.94, 0, 4.39, 0, '#8a8177');
    for (const side of [-1, 1]) {
      b.box(.1, 2.55, 3.07, side * 1.55, 2.76, 0, rib); // sliding door
      for (const z of [-7.5, -6.1, -4.7, -3.3, -1.65, 1.65, 3.3, 4.7, 6.1, 7.5])
        b.box(.12, 2.91, .11, side * 1.54, 2.83, z, rib);
    }
    for (let z = -7; z <= 7; z += 1.4) b.box(3.12, .08, .09, 0, 4.5, z, '#a59b8c');
  }
  return b.geometry();
}
