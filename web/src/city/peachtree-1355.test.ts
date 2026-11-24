import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { create1355Peachtree, peachtree1355Id } from './peachtree-1355';

// The mapped tower and its parts, as staged for the brookwood-south area.
const site = {"id": "osm:way:885332250", "cls": "office", "floors": 20, "h": null, "rings": [[[606.86, -4245.27], [599.86, -4241.4], [599.22, -4242.73], [581.29, -4232.62], [582.02, -4231.6], [567.75, -4223.69], [573.45, -4213.43], [558.02, -4204.82], [559.4, -4202.41], [560.98, -4199.55], [564.1, -4193.91], [563.02, -4193.46], [562.29, -4192.58], [562.06, -4191.6], [562.28, -4190.59], [563.13, -4189.62], [564.23, -4189.26], [565.46, -4189.52], [566.22, -4190.08], [569.35, -4184.42], [570.7, -4181.97], [572.32, -4179.14], [580.33, -4183.64], [582.39, -4179.95], [584.52, -4176.09], [591.34, -4179.87], [593.04, -4176.8], [598.51, -4179.83], [607.39, -4184.75], [608.09, -4183.48], [626.37, -4193.62], [625.63, -4194.97], [632.62, -4198.85], [637.86, -4201.75], [632.15, -4212.03], [634.27, -4213.21], [639.51, -4216.07], [645.15, -4219.23], [640.48, -4227.66], [627.48, -4220.44], [612.09, -4248.17]]], "name": "1355 Peachtree", "parts": [{"id": "osm:way:1450754131", "rings": [[[588.65, -4195.08], [580.29, -4210.2], [560.98, -4199.55], [564.1, -4193.91], [563.02, -4193.46], [562.29, -4192.58], [562.06, -4191.6], [562.28, -4190.59], [563.13, -4189.62], [564.23, -4189.26], [565.46, -4189.52], [566.22, -4190.08], [569.35, -4184.42]]], "h": 72, "tier": "inferred"}, {"id": "osm:way:1450754132", "rings": [[[570.7, -4181.97], [578.35, -4186.19], [579.36, -4184.35], [595.57, -4193.3], [594.63, -4195.01], [583.53, -4215.08], [582.45, -4217.04], [566.17, -4208.04], [566.98, -4206.59], [559.4, -4202.41], [560.98, -4199.55], [580.29, -4210.2], [588.65, -4195.08], [569.35, -4184.42]]], "h": 68.4, "tier": "inferred"}, {"id": "osm:way:885332247", "rings": [[[558.02, -4204.82], [559.4, -4202.41], [566.98, -4206.59], [566.17, -4208.04], [582.45, -4217.04], [583.53, -4215.08], [594.63, -4195.01], [595.57, -4193.3], [579.36, -4184.35], [578.35, -4186.19], [570.7, -4181.97], [572.32, -4179.14], [580.33, -4183.64], [587.16, -4187.41], [603.25, -4196.34], [600.27, -4201.72], [592.01, -4216.6], [588.99, -4222.04], [573.45, -4213.43]]], "h": 57.6, "tier": "inferred"}, {"id": "osm:way:1450754134", "rings": [[[604.01, -4190.82], [622.3, -4200.96], [603.03, -4235.68], [585.22, -4225.8], [582.02, -4231.6], [567.75, -4223.69], [573.45, -4213.43], [588.99, -4222.04], [592.01, -4216.6], [606.91, -4224.86], [615.17, -4209.98], [600.27, -4201.72], [603.25, -4196.34], [587.16, -4187.41], [591.34, -4179.87], [596.81, -4182.9], [598.51, -4179.83], [607.39, -4184.75]]], "h": 32.4, "tier": "inferred"}, {"id": "osm:way:1450754136", "rings": [[[615.17, -4209.98], [606.91, -4224.86], [592.01, -4216.6], [600.27, -4201.72]]], "h": 32.4, "tier": "inferred"}, {"id": "osm:way:1450754137", "rings": [[[603.03, -4235.68], [599.86, -4241.4], [599.22, -4242.73], [581.29, -4232.62], [582.02, -4231.6], [585.22, -4225.8]]], "h": 32.4, "tier": "inferred"}, {"id": "osm:way:1450754138", "rings": [[[625.63, -4194.97], [622.3, -4200.96], [604.01, -4190.82], [607.39, -4184.75], [608.09, -4183.48], [626.37, -4193.62]]], "h": 32.4, "tier": "inferred"}, {"id": "osm:way:1450754140", "rings": [[[622.3, -4200.96], [625.63, -4194.97], [632.62, -4198.85], [606.86, -4245.27], [599.86, -4241.4], [603.03, -4235.68]]], "h": 28.8, "tier": "inferred"}, {"id": "osm:way:1450754135", "rings": [[[598.51, -4179.83], [596.81, -4182.9], [591.34, -4179.87], [593.04, -4176.8]]], "h": 21.6, "tier": "inferred"}, {"id": "osm:way:1450754141", "rings": [[[627.48, -4220.44], [612.09, -4248.17], [606.86, -4245.27], [632.62, -4198.85], [637.86, -4201.75], [632.15, -4212.03]]], "h": 21.6, "tier": "inferred"}, {"id": "osm:way:1450754139", "rings": [[[580.33, -4183.64], [582.39, -4179.95], [584.52, -4176.09], [591.34, -4179.87], [587.16, -4187.41]]], "h": 3.6, "tier": "inferred"}, {"id": "osm:way:1450754142", "rings": [[[634.27, -4213.21], [639.51, -4216.07], [645.15, -4219.23], [640.48, -4227.66], [627.48, -4220.44], [632.15, -4212.03]]], "h": 3.6, "tier": "inferred"}]} as VBuilding;

const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 600,
    bounds: { minX: 300, maxX: 900, minZ: -4500, maxZ: -3900 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2800).buffer,
);

it('steps the brick shaft back at its lidar roofs under a pitched crown, over the podium', () => {
  const other: VBuilding = { id: 'other', h: 10, floors: null, rings: [[[0, 0], [1, 0], [1, 1]]] };
  expect(site.id).toBe(peachtree1355Id);
  expect(create1355Peachtree([other], site, grid)).toBeNull();
  expect(create1355Peachtree([site], { ...site, parts: site.parts!.slice(1) }, grid)).toBeNull();
  const result = create1355Peachtree([site, other], site, grid)!;
  expect(result.buildings).toEqual([other]);
  expect(result.group.children.every(m => m.receiveShadow)).toBe(true);
  result.group.updateMatrixWorld(true);
  const roof = (x: number, z: number) =>
    new Raycaster(new Vector3(x, 500, z), new Vector3(0, -1, 0)).intersectObject(result.group)[0]?.point.y + 300;
  const floor = 280;
  const crown = roof(575, -4197);
  expect(crown).toBeGreaterThan(floor + 72.6); // the pitched crown, between eave and ridge
  expect(crown).toBeLessThanOrEqual(floor + 77.2);
  expect(roof(594, -4205)).toBeCloseTo(floor + 59.9, 0); // third tier
  expect(roof(612, -4198)).toBeCloseTo(floor + 34.9, 0); // podium
  expect(roof(604, -4213)).toBeCloseTo(floor + 38, 0); // podium pavilion
  let triangles = 0;
  result.group.traverse(o => { if ('geometry' in o) triangles += (o as { geometry: { attributes: { position: { count: number } } } }).geometry.attributes.position.count / 3; });
  expect(triangles).toBeLessThan(5000);
});
