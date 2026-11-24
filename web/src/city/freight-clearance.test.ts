import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { P2 } from '../vignette/geom';
import { freightGeometry, FREIGHT_LENGTH, FREIGHT_TRUCK_SPACING, type FreightUnit } from '../vignette/freight-stock';
import { curveSwing, MAX_CURVE_SWING_M, MIN_OVERHEAD_CLEARANCE_M } from './freight-clearance';
import { profileKinds, type LineProfile } from './freight-consist';
import { DOWNTOWN_PROFILE } from './freight';
import { NORCROSS_PROFILE } from './brookwood-freight';
import { corridor } from './brookwood-corridor';
import { createSurfaceTransport } from '../terrain/transport';
import { GroundGrid } from '../terrain/grid';
import { prepareEastCut } from './east-cut';
import { withoutTram } from './streetcar';

/** Height of the tallest body above the railhead, on either tier. */
const height = (unit: FreightUnit) => Math.max(...[false, true].map((low) => {
  const g = freightGeometry(unit, { low });
  g.computeBoundingBox();
  g.dispose();
  return g.boundingBox!.max.y;
}));

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

  const dir = resolve(__dirname, '../../public/data/scene/downtown');
  const staged = () => smoothed() && ['scene.json', 'ground.json', 'ground.i16', '../../ga/routes.json'].every((f) => existsSync(resolve(dir, f)));
  it.skipIf(!staged())('clears the tallest downtown car under every deck that crosses a drawn chain (needs pnpm data)', () => {
    const json = (f: string) => JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
    const city = json('vignette.json'), spec = json('scene.json'), routes = json('../../ga/routes.json');
    const grid = new GroundGrid(json('ground.json'), Uint8Array.from(readFileSync(resolve(dir, 'ground.i16'))).buffer);
    // As City builds it, with the bare grid standing in for the drawn terrain (within 5 cm of the
    // browser's soffit heights on 2026-11-24).
    const transport = createSurfaceTransport(withoutTram(city), grid, (x, z) => grid.sample(x, z), prepareEastCut(routes, spec, grid, city.terrainTransport.rail));
    const meshes: THREE.Mesh[] = [];
    transport.group.updateMatrixWorld(true);
    transport.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    // Count a soffit whichever way its faces wind.
    for (const m of meshes) for (const mat of [m.material].flat()) mat.side = THREE.DoubleSide;
    const tallest = Math.max(...profileKinds(DOWNTOWN_PROFILE).map(height));
    const ray = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0), from = new THREE.Vector3();
    ray.far = tallest + 2;
    let lowest = { clear: Infinity, at: [0, 0] }, covered = 0;
    for (const tread of transport.freightTreads) {
      let last = -Infinity;
      for (const p of tread) {
        if (Math.abs(p.s - last) < 2) continue;
        last = p.s;
        ray.set(from.copy(p.position).setY(p.position.y + 0.4), up);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (!hit) continue;
        covered++;
        if (hit.distance + 0.4 < lowest.clear) lowest = { clear: hit.distance + 0.4, at: [Math.round(p.position.x), Math.round(p.position.z)] };
      }
    }
    // The line passes under at least the three overpasses the probe found.
    expect(covered).toBeGreaterThan(10);
    expect(lowest.clear - tallest, JSON.stringify({ ...lowest, tallest })).toBeGreaterThanOrEqual(MIN_OVERHEAD_CLEARANCE_M);
  });
});
