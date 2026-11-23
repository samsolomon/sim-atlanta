import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { VRoad } from '../vignette/world';
import { isMidtownArterial, midtownLights } from './midtown-night';
import rows from '../../../pipeline/prototypes/square-board/midtown-rows.json';

const road = (name: string | null, extra: Partial<VRoad> = {}) =>
  ({ cls: 'primary', sub: null, name, bridge: false, tunnel: false, pts: [], ...extra }) as VRoad;

it('lights the named Midtown arterials only on the surface', () => {
  for (const name of ['Peachtree Street Northeast', 'West Peachtree Street Northwest', 'Spring Street Northwest',
    'Juniper Street Northeast', 'Piedmont Avenue Northeast', '10th Street Northwest', '14th Street Northeast',
    'North Avenue Northwest', '17th Street Northwest', 'Peachtree Road Northeast'])
    expect(isMidtownArterial(road(name)), name).toBe(true);
  for (const name of ['Peachtree Place Northeast', '11th Street Northeast', 'Williams Street Northwest', 'Peachtree Connector', null])
    expect(isMidtownArterial(road(name)), String(name)).toBe(false);
  // The 17th Street deck and covered ways carry no surface lamps.
  expect(isMidtownArterial(road('17th Street Northwest', { bridge: true }))).toBe(false);
  expect(isMidtownArterial(road('Spring Street Northwest', { tunnel: true }))).toBe(false);
});

it('every arterial the request names exists in the staged rows', () => {
  const names = new Set<string>();
  for (const row of Object.keys(rows)) {
    const context = JSON.parse(readFileSync(new URL(`../../../pipeline/prototypes/square-board/${row}/context.json`, import.meta.url)).toString());
    for (const r of context.roads as VRoad[]) if (isMidtownArterial(r)) names.add(r.name!.replace(/ (Northeast|Northwest)$/, ''));
  }
  for (const name of ['Peachtree Street', 'West Peachtree Street', 'Spring Street', 'Juniper Street', 'Piedmont Avenue',
    '10th Street', '14th Street', 'North Avenue', '17th Street']) expect(names, name).toContain(name);
});

it('places mapped path lamps and lamp nodes inside the five rows', () => {
  expect(midtownLights.paths.length).toBe(404);
  expect(midtownLights.lamps.length).toBe(24);
  const minZ = Math.min(...Object.values(rows).map(r => r.minZ)), maxZ = Math.max(...Object.values(rows).map(r => r.maxZ));
  for (const pts of midtownLights.paths) for (const [x, z] of pts) {
    expect(x).toBeGreaterThan(-1300); expect(x).toBeLessThan(2100);
    expect(z).toBeGreaterThan(minZ - 400); expect(z).toBeLessThan(maxZ + 400);
  }
});
