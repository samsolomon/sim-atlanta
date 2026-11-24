import type { P2 } from '../vignette/geom';
import type { Underpass } from './underpass';

const ux = -0.8730086035,
  uz = 0.4877048064;
const origin: P2 = [-761.16, -1885.765];
const bend = (s: number) => Math.max(0, s - 80) * 0.05 + Math.max(0, s - 128) * 0.115;

export const northAvenue: Underpass = {
  roadName: 'North Avenue Northwest',
  point(s, t) {
    t += bend(s);
    return [origin[0] + s * ux - t * uz, origin[1] + s * uz + t * ux];
  },
  local(x, z) {
    const dx = x - origin[0],
      dz = z - origin[1],
      s = dx * ux + dz * uz;
    return [s, -dx * uz + dz * ux - bend(s)];
  },
  floor: (s) => 296.6 + Math.max(0, s - 20) * 0.01,
  start: -30,
  end: 183,
  breaks: [20, 80, 128],
  halfWidth: 11.3,
  clearance: 4.5,
  spans: [
    { start: 0, end: 19, type: 'street', top: 302.32, clearance: 4.69, medianPier: true },
    { start: 24, end: 86, type: 'rail-ballast', top: 303.53, bankSkew: 0.35 },
    { start: 100, end: 107, type: 'terrain', finish: 'disused-ballast', top: 304.24 },
    { start: 115, end: 130, type: 'terrain', finish: 'disused-ballast', top: 304.03 },
    { start: 140, end: 153, type: 'terrain', finish: 'disused-ballast', top: 304.52 },
  ],
};
