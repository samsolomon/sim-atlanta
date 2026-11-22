import { readFileSync } from 'node:fs';
import { Color, InstancedMesh, Mesh } from 'three';
import { expect, it } from 'vitest';
import { pointInRing } from '../vignette/geom';
import { World, type VData } from '../vignette/world';
import { marchonFinishes } from './marchon-frontage';

const context: VData = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/king-memorial/context.json', import.meta.url), 'utf8'));
const garage = context.buildings.find(b => b.id === 'osm:way:1254384192')!;

it.each([null, 14])('seats tires and paint on the Marchon surface when the recorded height is %s', h => {
  const building = { ...garage, h }, base = -7, roof = base + (h ?? 11);
  const world = new World({ ...context, buildings: [building] }, null, { terrain: 'flat', clumps: 1, lightMapMax: 256 });
  world.buildBuildings(() => base, 8, marchonFinishes([building]));
  const [mesh, equipment] = world.group.children;
  expect((equipment as InstancedMesh).count).toBe(0);
  const geo = (mesh as Mesh).geometry;
  const positions = geo.getAttribute('position'), colors = geo.getAttribute('color');
  const tire = new Color('#242528'), paint = new Color('#ece6d4'), concrete = new Color('#a6a69e');
  const near = (a: Color, b: Color) => Math.abs(a.r-b.r) + Math.abs(a.g-b.g) + Math.abs(a.b-b.b) < 1e-6;
  const contacts = new Set<string>();
  let stripes = 0, parapet = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    const col = new Color(colors.getX(i), colors.getY(i), colors.getZ(i));
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    if (near(col, concrete)) parapet = Math.max(parapet, y);
    if (near(col, paint)) {
      expect(y).toBeCloseTo(roof + 0.04);
      expect(pointInRing(x, z, garage.rings[0])).toBe(true);
      stripes++;
    }
    if (near(col, tire)) {
      expect(y).toBeGreaterThanOrEqual(roof);
      expect(pointInRing(x, z, garage.rings[0])).toBe(true);
      if (y === roof) contacts.add(x + '/' + z);
    }
  }
  expect(parapet).toBeCloseTo(roof + 1.1);
  expect(stripes).toBeGreaterThan(0);
  expect(contacts.size).toBe(7 * 4 * 2); // Seven cars, four tires, two points on each patch.
});
