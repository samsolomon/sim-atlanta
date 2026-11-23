import { expect, it } from 'vitest';
import { Box3, Mesh, MeshLambertMaterial } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createVarsity, varsityId } from './midtown-culture-varsity';

const archive = new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url);
const buildings: VBuilding[] = JSON.parse(readFileSync(archive, 'utf8')).buildings;
const site = buildings.find(b => b.id === varsityId)!;
// The lot falls about 2 m from North Avenue (z -1943) toward the deck (z -1993).
const slope = (_x: number, z: number) => 300 + (z + 1943) * 0.04;

function glows(group: Mesh['parent']) {
  const out: MeshLambertMaterial[] = [];
  group!.traverse(o => {
    if (o instanceof Mesh && o.material instanceof MeshLambertMaterial && o.material.emissiveIntensity !== undefined
      && o.material.emissive.getHex() !== 0) out.push(o.material);
  });
  return out;
}

it('replaces only the archived Varsity footprint and keeps the deck', () => {
  expect(site).toBeDefined();
  const model = createVarsity(buildings, site, Math.floor(slope(0, -2017)), slope)!;
  expect(model.buildings).toHaveLength(buildings.length - 1);
  expect(model.buildings.some(b => b.id === 'osm:way:234941900')).toBe(true);
  const box = new Box3().setFromObject(model.group);
  // The blade crown stands ~16 m over the North Avenue sidewalk; the V reaches ~14 m.
  expect(box.max.y - 300).toBeGreaterThan(15);
  expect(box.max.y - 300).toBeLessThan(20);
  expect(box.min.y).toBeLessThan(Math.floor(slope(0, -2017)) + 0.01);
});

it('lights the neon and the warm glazing together at night and darkens both by day', () => {
  const model = createVarsity(buildings, site, 297, slope)!;
  const lamps = glows(model.group);
  expect(lamps.length).toBe(2);
  model.setNight(1);
  for (const m of lamps) expect(m.emissiveIntensity).toBeGreaterThan(0.5);
  model.setNight(0);
  for (const m of lamps) expect(m.emissiveIntensity).toBe(0);
});

it('stands the V sign on its own ground', () => {
  const flat = new Box3().setFromObject(createVarsity(buildings, site, 297, () => 300)!.group);
  // Only the sign samples around x 176, z -1946; a mound there must lift the whole sign.
  const raised = createVarsity(buildings, site, 297, (x, z) => (Math.abs(x - 176) < 1 && Math.abs(z + 1946) < 1 ? 320 : 300))!;
  expect(new Box3().setFromObject(raised.group).max.y - flat.max.y).toBeGreaterThan(15);
});

it('declines without a datum, ground, or a single ring', () => {
  expect(createVarsity(buildings, site, null, () => 0)).toBeNull();
  expect(createVarsity(buildings, site, 0, () => null)).toBeNull();
  expect(createVarsity(buildings, { ...site, rings: [...site.rings, site.rings[0]] }, 0, () => 0)).toBeNull();
  expect(createVarsity(buildings, buildings.find(b => b.id !== varsityId)!, 0, () => 0)).toBeNull();
});
