import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { P2 } from '../vignette/geom';
import { freightGeometry, FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, type FreightUnit } from '../vignette/freight-stock';
import { curveSwing, MAX_CURVE_SWING_M } from './freight-clearance';
import { profileKinds, type LineProfile } from './freight-consist';
import { DOWNTOWN_PROFILE } from './freight';
import { NORCROSS_PROFILE } from './brookwood-freight';
import { corridor } from './brookwood-corridor';

/** Half the widest body, from the built geometry on either tier (cars are laid out along z). */
const halfWidth = (unit: FreightUnit) => Math.max(...[false, true].map((low) => {
  const g = freightGeometry(unit, { low });
  g.computeBoundingBox();
  const { min, max } = g.boundingBox!;
  g.dispose();
  return Math.max(-min.x, max.x);
}));

function worstOn(profile: LineProfile, chains: P2[][]) {
  return profileKinds(profile).map((kind) => {
    const w = halfWidth(kind);
    const worst = chains.map((c) => curveSwing(c, FREIGHT_LENGTH[kind], FREIGHT_TRUCK_SPACING[kind], w))
      .reduce((a, b) => (b.swing > a.swing ? b : a));
    return { kind, swing: +worst.swing.toFixed(3), at: worst.at.map(Math.round) };
  });
}

describe('freight curve swing (freight-clearance.ts)', () => {
  it('catches the unsmoothed downtown corner at (−558, −1015)', () => {
    // Pre-#512 source polyline: a hard corner where a 28.6 m autorack swung about 0.4 m.
    const kink: P2[] = [[-579.37, -1092.05], [-569.31, -1055.02], [-567.01, -1046.65], [-558.28, -1014.91], [-542.33, -972.46]];
    expect(curveSwing(kink, FREIGHT_LENGTH.autorack, FREIGHT_TRUCK_SPACING.autorack, halfWidth('autorack')).swing)
      .toBeGreaterThan(MAX_CURVE_SWING_M);
    // Straight track swings nothing.
    expect(curveSwing([[0, 0], [0, 200]], FREIGHT_LENGTH.autorack, FREIGHT_TRUCK_SPACING.autorack, 1.6).swing).toBeLessThan(1e-9);
  });

  it('keeps every Norcross kind within the limit on Brookwood Main 2', () => {
    for (const r of worstOn(NORCROSS_PROFILE, [corridor.main2.pts as P2[]])) expect(r.swing, JSON.stringify(r)).toBeLessThanOrEqual(MAX_CURVE_SWING_M);
  });

  const file = resolve(__dirname, '../../public/data/scene/downtown/vignette.json');
  type Run = { freightS?: [number, number]; pts: P2[] };
  const runs = () => (JSON.parse(readFileSync(file, 'utf8')) as { terrainTransport?: { rail: Run[] } }).terrainTransport?.rail.filter((r) => r.freightS) ?? [];
  // Data baked before #512 has 79 freight vertices (the smoothed line has 176): skip rather than fail.
  const smoothed = () => existsSync(file) && runs().reduce((n, r) => n + r.pts.length, 0) > 120;
  it.skipIf(!smoothed())('keeps every downtown kind within the limit on each drawn chain (needs pnpm data)', () => {
    // Join runs end to end in freightS order, as CityFreight's sections do.
    const oriented = runs().map((r) => ({ s: Math.min(...r.freightS!), pts: r.freightS![0] > r.freightS![1] ? [...r.pts].reverse() : r.pts }))
      .sort((a, b) => a.s - b.s);
    const chains: P2[][] = [];
    for (const { pts } of oriented) {
      const last = chains.at(-1)?.at(-1);
      if (last && Math.hypot(last[0] - pts[0][0], last[1] - pts[0][1]) < 0.3) chains.at(-1)!.push(...pts.slice(1));
      else chains.push([...pts]);
    }
    const kinds = worstOn(DOWNTOWN_PROFILE, chains);
    expect(kinds.map((k) => k.kind)).toEqual(expect.arrayContaining(['autorack', 'wellA']));
    for (const r of kinds) expect(r.swing, JSON.stringify(r)).toBeLessThanOrEqual(MAX_CURVE_SWING_M);
  });
});
