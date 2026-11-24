import { expect, it } from 'vitest';
import { Box3, Mesh } from 'three';
import { readFileSync } from 'node:fs';
import type { VBuilding } from '../vignette/world';
import { createScadAtlanta, scadAtlantaId } from './midtown-culture-scad';
const buildings: VBuilding[] = JSON.parse(
  readFileSync(
    new URL('../../../pipeline/prototypes/square-board/brookwood-south/context.json', import.meta.url),
    'utf8',
  ),
).buildings;
const site = buildings.find((b) => b.id === scadAtlantaId)!;
it('preserves the rotated archived stepped footprint and consumes only SCAD', () => {
  const m = createScadAtlanta(buildings, site, 299, () => 300)!;
  expect(m.buildings).toEqual(buildings.filter((b) => b !== site));
  const box = new Box3().setFromObject(m.group, true);
  expect(box.min.x).toBeGreaterThan(-35);
  expect(box.max.x).toBeLessThan(140);
  expect(box.min.z).toBeGreaterThan(-4871);
  expect(box.max.z).toBeLessThan(-4676);
  expect(box.max.y).toBeCloseTo(323.1, 1);
  const positions = (m.group.children[0] as Mesh).geometry.getAttribute('position');
  let outwardPiers = 0;
  for (let i=0;i<positions.count;i++)
    if(positions.getX(i)>40.8 && positions.getZ(i)>15 && positions.getZ(i)<25 && positions.getY(i)>10) outwardPiers++;
  expect(outwardPiers).toBeGreaterThan(0);
  expect(m.yields).toHaveLength(1);
  const ring = m.yields[0].ring;
  expect(ring.every(([x, z]) => x > 50 && x < 80 && z < -4700 && z > -4730)).toBe(true);
});
it('preserves generic fallback without usable parts or ground', () => {
  expect(createScadAtlanta(buildings, { ...site, parts: [] }, 299, () => 300)).toBeNull();
  expect(createScadAtlanta(buildings, site, 299, () => null)).toBeNull();
  expect(createScadAtlanta(buildings, site, null, () => 300)).toBeNull();
});
