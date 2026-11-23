import * as THREE from 'three';
import { Builder } from './geom';
import { finishStockGeometry } from './crescent-stock';
import { GE_LENGTH, GE_TRUCKS, geLocomotive } from './freight-loco';

/** 'locomotive' is the CSX-like CM44AC; 'locomotiveNs' the same GE body in an NS-like scheme. */
export type FreightUnit = 'locomotive' | 'locomotiveNs' | 'boxcar';
/** Dimensions in metres: locomotive from AC4400CW data (docs/freight-stock.md); boxcar illustrative. */
export const FREIGHT_LENGTH = { locomotive: GE_LENGTH, locomotiveNs: GE_LENGTH, boxcar: 16.8 } as const;
export const FREIGHT_TRUCK_SPACING = { locomotive: GE_TRUCKS, locomotiveNs: GE_TRUCKS, boxcar: 12 } as const;

/**
 * Local +z faces the cab. The origin is midway between the trucks at rail height. Locomotives carry
 * a `stockLight` attribute (see passengerMaterial): head, ditch and number-board lamps at the end that
 * leads (`leadFront`, or `leadRear` for long hood forward). Plain Lambert materials ignore it.
 */
export function freightGeometry(unit: FreightUnit, { leadFront = false, leadRear = false } = {}) {
  const b = new Builder();
  if (unit === 'locomotive' || unit === 'locomotiveNs') {
    const lamps = new Builder();
    geLocomotive(b, lamps, unit === 'locomotive' ? 'csx' : 'ns', leadFront, leadRear);
    return finishStockGeometry(b, new Builder(), lamps);
  }
  const length = FREIGHT_LENGTH[unit];
  const frame = '#393d40', steel = '#55585a';
  const truck = FREIGHT_TRUCK_SPACING[unit] / 2;
  for (const center of [-truck, truck]) {
    b.box(2.5, .55, 3, 0, .68, center, frame);
    for (const dz of [-.95, .95]) {
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
  {
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
  // A zero stockLight attribute so the lit stock material can be shared with locomotives.
  const g = b.geometry();
  g.setAttribute('stockLight', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count), 1));
  return g;
}
