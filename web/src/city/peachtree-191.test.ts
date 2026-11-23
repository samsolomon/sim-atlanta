import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { createPeachtree191 } from './peachtree-191';

const tower: VBuilding = { id: 'cca22dcb-b333-4b2a-9371-869465370bda', h: 234.7, floors: 50,
  rings: [[[383.42,-580.85],[385.97,-580.82],[385.66,-554.90],[382.52,-554.94],[382.39,-544.43],
    [394.52,-544.24],[421.76,-544.01],[421.83,-549.69],[441.81,-549.45],[455.76,-549.28],
    [486.8,-548.9],[491.49,-548.84],[491.93,-585.06],[487.17,-585.13],[456.25,-585.5],
    [423.1,-585.91],[423.19,-593.04],[383.57,-593.51]]] };
const neighbor = { ...tower, id: '10389dea-9cd3-4d48-afe6-c077296e0724' };

it('places two open lanterns on the mapped roof parts and leaves the western entrance low', () => {
  const ground = 12;
  const site = createPeachtree191([neighbor,tower], () => ground)!;
  expect(site.buildings).toEqual([neighbor]);
  site.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x,300,z),new Vector3(0,-1,0)).intersectObject(site.group,true)[0]?.point.y;
  for (const [x,z] of [[426.8,-567.7],[471.5,-567.2]]) {
    expect(roof(x,z)).toBeCloseTo(ground+232,2);
    expect(roof(x+7.3,z+7.3)).toBeCloseTo(ground+234.7,2);
    expect(roof(x+11.75,z+12.8)).toBeCloseTo(ground+217.28,2);
  }
  expect(roof(449,-567.5)).toBeCloseTo(ground+203);
  expect(roof(400,-567)).toBeCloseTo(ground+17);
  expect(roof(397,-538)).toBeUndefined();
  const through = new Raycaster(new Vector3(414,ground+224,-563.8),new Vector3(1,0,0),0,29);
  expect(through.intersectObject(site.group,true)).toHaveLength(0);
  expect(site.group.children.filter(child => child instanceof Mesh)).toHaveLength(3);
});

it('supports both complete crown footprints at the 203 m shaft roof', () => {
  const site = createPeachtree191([tower], () => 0)!;
  const [shaft, , crowns] = site.group.children as Mesh[];
  const vertices = crowns.geometry.getAttribute('position');
  const down = new Raycaster(new Vector3(), new Vector3(0,-1,0), 0, 1);
  // Every projected vertex must land on the shaft roof, including the four
  // recess-facing corners. A missed roof would fall through to the podium.
  expect(vertices.count).toBeGreaterThan(0);
  for (let i = 0; i < vertices.count; i++) {
    down.ray.origin.set(vertices.getX(i), 203.5, vertices.getZ(i));
    expect(down.intersectObject(shaft).length).toBeGreaterThan(0);
  }
});

it('retains generic geometry when the footprint or its terrain support is missing', () => {
  expect(createPeachtree191([neighbor], () => 0)).toBeNull();
  expect(createPeachtree191([{...tower,rings: []}], () => 0)).toBeNull();
  expect(createPeachtree191([tower], x => x < 390 ? null : 12)).toBeNull();
  expect(createPeachtree191([tower], () => NaN)).toBeNull();
});
