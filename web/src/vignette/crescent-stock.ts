import * as THREE from 'three';
import { Builder, loft } from './geom';
import { CHARGER_LENGTH, CHARGER_TRUCKS, chargerBody } from './charger';
import { AIRO_LENGTH, AIRO_TRUCKS, airoCoach } from './airo';

export const stockNames = {
  charger: 'Siemens ALC-42 Charger',
  chargerPhase6: 'ALC-42 Charger, Phase VI',
  genesis: 'GE P42DC Genesis',
  coach: 'Amfleet II coach, Phase VI',
  coachPhase7: 'Amfleet II coach, Phase VII',
  cafe: 'Amfleet II café',
  diner: 'Viewliner II diner',
  sleeper: 'Viewliner II sleeper',
  baggageDorm: 'Viewliner II baggage-dorm',
  baggage: 'Viewliner II baggage car',
  airoCoach: 'Siemens Airo coach (corridor)',
} as const;
export type PassengerUnit = keyof typeof stockNames;
export const formation: PassengerUnit[] = [
  'charger',
  'genesis',
  'coachPhase7',
  'coachPhase7',
  'coach',
  'cafe',
  'diner',
  'sleeper',
  'baggageDorm',
];
export function dimensions(unit: PassengerUnit) {
  if (unit === 'charger' || unit === 'chargerPhase6') return { length: CHARGER_LENGTH, trucks: CHARGER_TRUCKS };
  if (unit === 'genesis') return { length: 21.03, trucks: 13.1 };
  if (isAmfleet(unit)) return { length: 26.01, trucks: 18.14 };
  if (unit === 'airoCoach') return { length: AIRO_LENGTH, trucks: AIRO_TRUCKS };
  return { length: 25.91, trucks: 18.14 };
}
function isAmfleet(unit: PassengerUnit) {
  return unit === 'coach' || unit === 'coachPhase7' || unit === 'cafe';
}
/** Roof heights over rail: Amfleet II 12 ft 8 in, Viewliner 14 ft (docs/crescent-stock.md). */
export const AMFLEET_ROOF = 3.86;
export const VIEWLINER_ROOF = 4.27;
export const consistLength = formation.reduce((sum, unit) => sum + dimensions(unit).length, 0);
export function layout(units: PassengerUnit[]) {
  let cursor = units.reduce((sum, unit) => sum + dimensions(unit).length, 0) / 2;
  return units.map((unit) => {
    const { length } = dimensions(unit);
    cursor -= length;
    return { unit, offset: cursor + length / 2, length };
  });
}

const silver = '#bfC4c5',
  roof = '#939da1',
  navy = '#173958',
  red = '#b63238';
/** Car stripe colours read from the dated photographs in docs/crescent-stock.md. */
const livery = {
  white: '#e9ecea',
  phase6Blue: '#2f5878',
  midnight: '#1b2140',
  blue: '#1f5480',
  green: '#14a67c',
  iiibRed: '#d9402e',
  iiibBlue: '#2a63ad',
};
const dark = '#343c41',
  glass = '#405963';

export function passengerGeometry(unit: PassengerUnit, leading: boolean, trailing: boolean) {
  const b = new Builder(),
    windows = new Builder(),
    lamps = new Builder();
  if (unit === 'charger' || unit === 'chargerPhase6') {
    chargerBody(b, lamps, leading, trailing, unit === 'charger' ? 'phase7' : 'phase6');
    return finishStockGeometry(b, windows, lamps);
  }
  if (unit === 'airoCoach') {
    airoCoach(b, windows, lamps, trailing);
    return finishStockGeometry(b, windows, lamps);
  }
  const { length, trucks } = dimensions(unit);
  const end = length / 2 - 0.32;
  const power = unit === 'genesis';
  const amfleet = isAmfleet(unit);
  const wheel = new THREE.CylinderGeometry(0.46, 0.46, 0.18, 10).rotateZ(Math.PI / 2);
  for (const z of [-trucks / 2, trucks / 2]) {
    for (const x of [-0.72, 0.72])
      for (const dz of [-1.05, 1.05]) {
        const g = wheel.clone().translate(x, 0.46, z + dz);
        b.addGeometry(g, '#42484a');
        g.dispose();
      }
    for (const x of [-1, 1]) b.box(0.28, 0.45, 3.25, x, 0.61, z, dark);
    b.box(1.95, 0.43, 2.9, 0, 0.9, z, dark);
  }
  wheel.dispose();
  b.box(2.54, 0.33, length - 0.85, 0, 1.15, 0, dark);
  for (const sign of [-1, 1]) b.box(0.41, 0.28, 0.55, 0, 0.89, sign * (length / 2 - 0.275), dark);
  b.box(2.34, 0.76, power ? 7.4 : 4.2, 0, 0.77, -1.8, '#525a5e');
  if (power) {
    function section(z: number, w: number, h: number, bottom: number) {
      return [
        [-w + 0.18, bottom, z],
        [w - 0.18, bottom, z],
        [w, bottom + 0.38, z],
        [w, h - 0.53, z],
        [w - 0.39, h, z],
        [-w + 0.39, h, z],
        [-w, h - 0.53, z],
        [-w, bottom + 0.38, z],
      ];
    }
    const height = 4.45;
    const brow = end - 1.18,
      chin = end - 0.22;
    const rear = section(-end, 1.52, height, 1.27);
    const cab = section(brow, 1.52, height, 1.27);
    const windshield = section(chin, 1.46, 3.26, 1.27);
    const nose = section(end, 1.16, 2.65, 1.48);
    const flank = silver;
    loft(b, [rear, cab], [dark, flank, flank, navy, roof, navy, flank, flank], true, false);
    loft(
      b,
      [cab, windshield, nose],
      [
        dark,
        silver,
        silver,
        navy,
        navy,
        navy,
        silver,
        silver,
      ],
      false,
      true,
    );
    const glassZ = (y: number) => chin - ((y - 3.26) / (height - 3.26)) * (chin - brow) + 0.022;
    for (const side of [-1, 1]) {
      const pane = [
        [side * 0.07, 3.35, glassZ(3.35)],
        [side * 1.05, 3.35, glassZ(3.35)],
        [side * 1.07, height - 0.14, glassZ(height - 0.14)],
        [side * 0.07, height - 0.14, glassZ(height - 0.14)],
      ];
      if (side < 0) pane.reverse();
      b.quad(pane[0], pane[1], pane[2], pane[3], '#486777');
      b.box(0.04, 0.73, 1.23, side * 1.544, 3.39, brow - 0.82, '#385260');
      b.box(0.04, 1.92, 0.72, side * 1.53, 2.57, brow - 2.05, '#a3aeb0');
      b.box(0.04, 0.27, end + brow - 3, side * 1.53, 1.6, (brow - end - 3) / 2, '#9fa7ac');
      b.box(0.045, 0.14, end + brow - 3, side * 1.54, 1.41, (brow - end - 3) / 2, red);
      b.box(0.05, 1.02, 5.32, side * 1.54, 3.21, -end + 3.35, '#27323b');
      for (let i = 0; i < 17; i++) b.box(0.06, 0.94, 0.07, side * 1.57, 3.21, -end + 0.9 + i * 0.3, '#59646a');
      const lamp = leading ? lamps : b;
      lamp.box(0.27, 0.25, 0.08, side * 0.91, 2.13, end + 0.03, leading ? '#fff1c7' : dark);
      lamp.box(0.18, 0.19, 0.08, side * 0.12, 2.99, chin + 0.13, leading ? '#fff3d4' : dark);
    }
    for (const z of [-end + 2, -end + 4]) {
      const fan = new THREE.CylinderGeometry(0.82, 0.82, 0.12, 14).translate(0, height + 0.05, z);
      b.addGeometry(fan, dark);
      fan.dispose();
    }
    b.box(0.68, 0.22, 1.22, 0, height + 0.1, 0.35, dark);
    b.box(2.58, 0.48, 0.15, 0, 0.9, end - 0.18, '#52585c');
  } else {
    const w = 1.6,
      h = amfleet ? AMFLEET_ROOF : VIEWLINER_ROOF;
    // The flat fluted side runs down to about 1.4 m (Elizabeth, June 2026); Amfleet's tube tucks in more.
    const foot = amfleet ? 1.3 : 1.45,
      sideFoot = amfleet ? 1.42 : 1.4;
    const section = (z: number) => [
      [-foot, 1.23, z],
      [foot, 1.23, z],
      [w, sideFoot, z],
      [w, 3.13, z],
      [w - 0.14, h - 0.49, z],
      [w - 0.48, h - 0.14, z],
      [0.62, h, z],
      [-0.62, h, z],
      [-w + 0.48, h - 0.14, z],
      [-w + 0.14, h - 0.49, z],
      [-w, 3.13, z],
      [-w, sideFoot, z],
    ];
    loft(
      b,
      [section(-end), section(end)],
      [dark, silver, silver, silver, roof, roof, roof, roof, roof, silver, silver, silver],
    );
    for (const x of [-0.42, -0.21, 0, 0.21, 0.42]) b.box(0.044, 0.028, 2 * end - 0.2, x, h + 0.012, 0, '#aab3b6');
    for (const side of [-1, 1]) {
      // Flat strips keep fluting and glazing in the same draw as the body.
      const panel = (
        builder: Builder,
        z: number,
        y: number,
        width: number,
        height: number,
        color: string,
        depth = 0.012,
      ) => {
        const x = side * (w + depth);
        const pts = [
          [x, y - height / 2, z + width / 2],
          [x, y - height / 2, z - width / 2],
          [x, y + height / 2, z - width / 2],
          [x, y + height / 2, z + width / 2],
        ];
        // Above 3.13 m the side sheet steps inward toward the roof; follow it point by point.
        for (const point of pts)
          if (point[1] > 3.13) point[0] -= (side * 0.14 * (Math.min(point[1], h - 0.49) - 3.13)) / (h - 0.49 - 3.13);
        if (side < 0) pts.reverse();
        builder.quad(pts[0], pts[1], pts[2], pts[3], color);
      };
      // Stripes, all sharing the lower window row (2.48–3.10 m) so they line up from car to car.
      const run = 2 * end - 0.12;
      const band = (y0: number, y1: number, color: string, depth = 0.012) => panel(b, 0, (y0 + y1) / 2, run, y1 - y0, color, depth);
      band(1.45, 1.485, red); // sill line on every car, at the foot of the fluting
      if (unit === 'coachPhase7') {
        // Phase VII: midnight from the door end, a white diagonal, then Amtrak blue; class colour by the door.
        band(1.485, 1.5, livery.white);
        const y0 = 2.07,
          y1 = 3.13;
        // A band segment from z0 to z1 whose top edges shift by lean0 and lean1 (diagonals).
        const strip = (z0: number, z1: number, color: string, depth: number, lean0 = 0, lean1 = lean0) => {
          const x = side * (w + depth);
          const pts = [
            [x, y0, z1],
            [x, y0, z0],
            [x, y1, z0 + lean0],
            [x, y1, z1 + lean1],
          ];
          if (side < 0) pts.reverse();
          b.quad(pts[0], pts[1], pts[2], pts[3], color);
        };
        // Diagonals read off the 25003 broadside: near the door they lean back toward the car's far end,
        // the last one near the far end leans forward.
        const door = end - 1.05,
          lean = 0.4,
          d1 = door - 9.6,
          d2 = door - 1.3,
          d3 = -end + 1.2;
        strip(-end + 0.06, d3, livery.blue, 0.012, 0, lean);
        strip(d3 + 0.12, d1, livery.blue, 0.012, lean, -lean);
        strip(d1 + 0.15, d2, livery.midnight, 0.012, -lean, -0.2);
        strip(d2 + 0.15, door - 0.5, livery.green, 0.012, -0.2, 0);
        strip(d3, d3 + 0.12, livery.white, 0.012, lean);
        strip(d1, d1 + 0.15, livery.white, 0.012, -lean);
        // A shallower lean keeps the class panel clear of the last window frame (edge at 10.1 m).
        strip(d2, d2 + 0.15, livery.white, 0.012, -0.2);
      } else if (amfleet) {
        // Phase VI: one blue band holding the windows, red/white/red pinstripes above it.
        band(2.07, 3.13, livery.phase6Blue);
        band(3.13, 3.15, livery.white);
        band(3.15, 3.18, red);
        band(3.18, 3.2, livery.white);
        band(3.2, 3.23, red);
      } else if (unit === 'baggage') {
        // No dated photo of a Crescent full baggage car was found; keep the earlier thin stripes (unverified).
        band(2.49, 2.71, '#386a9c');
        band(2.905, 3.095, red);
      } else {
        // Viewliner II, Phase IIIB: three equal bands spanning the lower windows, blue at the sill.
        band(2.48, 2.68, livery.iiibBlue);
        band(2.68, 2.88, livery.white);
        band(2.88, 3.08, livery.iiibRed);
      }
      const flutes = amfleet ? 7 : 12;
      for (let i = 0; i < flutes; i++) panel(b, 0, 1.56 + 0.075 * i, 2 * end - 0.1, 0.021, '#8c989f');
      const door = (z: number, cargo: boolean) => {
        panel(b, z, 2.41, cargo ? 2.54 : 0.91, 1.83, '#727f84', 0.025);
        panel(b, z, 2.42, cargo ? 2.43 : 0.79, 1.74, silver, 0.03);
        if (cargo) panel(b, z, 2.42, 0.055, 1.74, dark, 0.036);
        else {
          panel(b, z, 2.9, 0.52, 0.48, glass, 0.036);
          for (const y of [0.65, 0.91, 1.17]) b.box(0.27, 0.07, 0.81, side * (w - 0.17), y, z, '#61696d');
        }
      };
      if (unit !== 'diner' && unit !== 'baggage') door(end - 1.05, false);
      if (unit === 'diner') {
        panel(b, -7.5, 2.78, 1.45, 0.92, '#9ea9ab', 0.026);
        for (let i = 0; i < 6; i++) panel(b, -7.5, 2.47 + i * 0.12, 1.27, 0.045, dark, 0.03);
      }
      if (unit === 'baggageDorm' || unit === 'baggage') door(-5.85, true);
      if (unit === 'baggage') {
        door(5.85, true);
        continue;
      }
      const count = unit === 'baggageDorm' ? 5 : unit === 'diner' ? 7 : unit === 'sleeper' ? 10 : 13;
      for (let i = 0; i < count; i++) {
        if (unit === 'cafe' && i >= 5 && i <= 7) continue;
        const z =
          unit === 'baggageDorm'
            ? 0.7 + i * 1.91
            : unit === 'diner'
              ? -1.8 + i * 1.92
              : -10.7 + i * (unit === 'sleeper' ? 2.24 : 1.68);
        const width = amfleet ? 1.18 : unit === 'diner' ? 1.58 : 1.32;
        const pane = (y: number, height: number, inset: number) => {
          panel(b, z, y, width + 0.09, height + 0.09, '#46515a', inset);
          panel(i % 5 === 1 && unit !== 'diner' ? b : windows, z, y, width, height, glass, inset + 0.003);
        };
        pane(2.79, 0.62, 0.025);
        if (!amfleet && (unit === 'diner' || side === 1 || i % 3 !== 0)) {
          // Clerestory sits on the inward-stepping upper side sheet.
          pane(3.51, 0.36, 0.012);
        }
      }
    }
    for (const sign of [-1, 1]) {
      b.box(1.32, 2.13, 0.24, 0, 2.47, sign * (end + 0.1), dark);
      b.box(0.78, 1.89, 0.05, 0, 2.47, sign * (end + 0.24), silver);
      b.box(0.55, 0.49, 0.055, 0, 2.84, sign * (end + 0.27), glass);
    }
    if (trailing) for (const x of [-1.08, 1.08]) lamps.box(0.19, 0.19, 0.06, x, 3.22, -end - 0.045, '#fa2924');
  }
  return finishStockGeometry(b, windows, lamps);
}

/** Merges glazing and lamps after the body and tags them for the night shader. */
export function finishStockGeometry(b: Builder, windows: Builder, lamps: Builder) {
  const baseCount = b.col.length / 3,
    windowCount = windows.col.length / 3;
  b.pos.push(...windows.pos, ...lamps.pos);
  b.col.push(...windows.col, ...lamps.col);
  const g = b.geometry();
  const glow = new Float32Array(b.col.length / 3);
  glow.fill(1, baseCount, baseCount + windowCount);
  glow.fill(2, baseCount + windowCount);
  g.setAttribute('stockLight', new THREE.BufferAttribute(glow, 1));
  return g;
}

export function passengerMaterial(night: { value: number }) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.stockNight = night;
    shader.vertexShader =
      'attribute float stockLight; varying float vStockLight;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStockLight = stockLight;');
    shader.fragmentShader =
      'uniform float stockNight; varying float vStockLight;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (vStockLight > 1.5) totalEmissiveRadiance += diffuseColor.rgb * (0.6 + 1.8 * stockNight);
        else if (vStockLight > 0.5) totalEmissiveRadiance += vec3(.72,.48,.26) * stockNight;`,
      );
  };
  return material;
}
