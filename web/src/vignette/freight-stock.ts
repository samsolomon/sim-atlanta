import * as THREE from 'three';
import { boxcarBody } from './boxcar';
import { grainHopperBody } from './grain-hopper';
import { WELL_LENGTH, WELL_LOADS, WELL_TRUCKS, wellCarBody } from './intermodal';
import { TANK_LENGTH, TANK_TRUCKS, tankCarBody } from './tank-car';
import { GONDOLA_LENGTH, GONDOLA_TRUCKS, gondolaBody } from './gondola';
import { Builder } from './geom';
import { finishStockGeometry } from './crescent-stock';
import { EMD_DIMENSIONS, emdLocomotive } from './emd-loco';
import { GE_LENGTH, GE_TRUCKS, geLocomotive } from './freight-loco';

/** 'locomotive' is the CSX-like CM44AC; 'locomotiveNs' the same GE body in an NS-like scheme. */
export type FreightUnit = 'locomotive' | 'locomotiveNs' | 'es44acNs' | 'es44ah' | 'sd70ace' | 'gp382' | 'boxcar' | 'boxcarFaded' | 'boxcarBlue' | 'grainHopper' | 'wellA' | 'wellB' | 'wellC' | 'tank' | 'gondolaEmpty' | 'gondolaScrap';
const BOXCAR_PAINT = { boxcar: 'oxide', boxcarFaded: 'faded', boxcarBlue: 'blue' } as const;
function isBoxcar(unit: FreightUnit): unit is keyof typeof BOXCAR_PAINT {
  return Object.hasOwn(BOXCAR_PAINT, unit);
}
function isGondola(unit: FreightUnit): unit is 'gondolaEmpty' | 'gondolaScrap' {
  return unit === 'gondolaEmpty' || unit === 'gondolaScrap';
}
function isWell(unit: FreightUnit): unit is keyof typeof WELL_LOADS {
  return Object.hasOwn(WELL_LOADS, unit);
}
/** Dimensions in metres: locomotive from AC4400CW data (docs/freight-stock.md); boxcar illustrative. */
export const FREIGHT_LENGTH = { locomotive: GE_LENGTH, locomotiveNs: GE_LENGTH, es44acNs: GE_LENGTH, es44ah: GE_LENGTH, sd70ace: EMD_DIMENSIONS.sd70ace.length, gp382: EMD_DIMENSIONS.gp382.length, grainHopper: 17.8816, boxcar: 16.8, boxcarFaded: 16.8, boxcarBlue: 16.8, wellA: WELL_LENGTH, wellB: WELL_LENGTH, wellC: WELL_LENGTH, tank: TANK_LENGTH, gondolaEmpty: GONDOLA_LENGTH, gondolaScrap: GONDOLA_LENGTH } as const;
export const FREIGHT_TRUCK_SPACING = { locomotive: GE_TRUCKS, locomotiveNs: GE_TRUCKS, es44acNs: GE_TRUCKS, es44ah: GE_TRUCKS, sd70ace: EMD_DIMENSIONS.sd70ace.trucks, gp382: EMD_DIMENSIONS.gp382.trucks, grainHopper: 13.4, boxcar: 12, boxcarFaded: 12, boxcarBlue: 12, wellA: WELL_TRUCKS, wellB: WELL_TRUCKS, wellC: WELL_TRUCKS, tank: TANK_TRUCKS, gondolaEmpty: GONDOLA_TRUCKS, gondolaScrap: GONDOLA_TRUCKS } as const;

/**
 * Local +z faces the cab. The origin is midway between the trucks at rail height. Locomotives carry
 * a `stockLight` attribute (see passengerMaterial): head, ditch and number-board lamps at the end that
 * leads (`leadFront`, or `leadRear` for long hood forward). Plain Lambert materials ignore it.
 */
export function freightGeometry(unit: FreightUnit, { leadFront = false, leadRear = false, low = false } = {}) {
  const b = new Builder();
  if (!isBoxcar(unit) && !isWell(unit) && !isGondola(unit) && unit !== 'grainHopper' && unit !== 'tank') {
    const lamps = new Builder();
    if (unit === 'sd70ace' || unit === 'gp382') emdLocomotive(b, lamps, unit, leadFront, leadRear);
    else geLocomotive(b, lamps, unit === 'locomotive' || unit === 'es44ah' ? 'csx' : 'ns', leadFront, leadRear, unit === 'es44acNs' || unit === 'es44ah' ? 'es44' : 'cm44ac');
    return finishStockGeometry(b, new Builder(), lamps);
  }
  const length = FREIGHT_LENGTH[unit];
  const frame = '#393d40', steel = '#55585a';
  const truck = FREIGHT_TRUCK_SPACING[unit] / 2;
  for (const center of [-truck, truck]) {
    b.box(2.5, .55, 3, 0, .68, center, frame);
    for (const dz of [-.95, .95]) {
      for (const x of [-.72, .72]) {
        // Start at a quarter turn so a vertex of the polygonal wheel, not a flat, rests on the rail.
        const sides = low && unit === 'grainHopper' ? 6 : 10;
        const wheel = new THREE.CylinderGeometry(.49, .49, .16, sides, 1, false, Math.PI / 2).rotateZ(Math.PI / 2);
        wheel.translate(x, .49, center + dz);
        b.addGeometry(wheel, steel);
        wheel.dispose();
      }
    }
  }
  // A through centre sill, except under the well car's floor and the tank car's stub sills.
  if (!isWell(unit) && unit !== 'tank') b.box(unit === 'grainHopper' ? .35 : 2.98, .42, length - .7, 0, 1.14, 0, frame);
  for (const end of [-1, 1]) b.box(.46, .32, .65, 0, .98, end * (length / 2 - .32), frame);
  if (unit === 'grainHopper') grainHopperBody(b, low);
  else if (isWell(unit)) wellCarBody(b, unit, low);
  else if (unit === 'tank') tankCarBody(b, low);
  else if (isGondola(unit)) gondolaBody(b, unit, low);
  else boxcarBody(b, BOXCAR_PAINT[unit]);
  // A zero stockLight attribute so the lit stock material can be shared with locomotives.
  const g = b.geometry();
  g.setAttribute('stockLight', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count), 1));
  return g;
}
