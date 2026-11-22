import { describe, expect, it, vi } from 'vitest';
import { Mesh, MeshPhongMaterial, Raycaster, Vector3 } from 'three';
import type { VBuilding } from '../vignette/world';
import { createWestin } from './westin';
import { skylineReflection } from './skyline-reflection';

const hotel: VBuilding = { id: '16cab934-34dc-4dca-8eb2-3ce9dc57d877', h: 219.7, floors: null,
  rings: [[[252.35,-637.58],[242.48,-637.69],[233.53,-594.59],[264.64,-594.43],
    [358.1,-593.95],[358.26,-637.36],[313.57,-637.7],[276.06,-637.55]]] };
const bridge = { ...hotel, id: '611ec9d1-fe49-476b-8af7-4d38dbe71254' };
const eastBuilding = { ...hotel, id: '3b44d236-c74c-40cc-bf2b-7a42547418fe' };
const buildings = [bridge, hotel, eastBuilding];

describe('Westin Peachtree Plaza', () => {
  it('sets the round shaft and northeast lift on the elevated western end of the long podium', () => {
    const y = 12;
    const model = createWestin(buildings, () => y)!;
    expect(model.buildings).toEqual([bridge, eastBuilding]);
    expect(buildings[1]).toBe(hotel);
    model.group.updateMatrixWorld(true);
    const roof = (x: number, z: number) => new Raycaster(new Vector3(x, 300, z), new Vector3(0,-1,0))
      .intersectObject(model.group, true)[0]?.point.y;
    expect(roof(279.5,-614.9)).toBeCloseTo(y + 254.2, 2); // antenna tip
    expect(roof(274,-614.9)).toBeCloseTo(y + 220.05, 2); // original roof
    expect(roof(296.65,-627.2)).toBeCloseTo(y + 219.95, 2);
    expect(roof(263,-601)).toBeCloseTo(y + 26);
    expect(roof(352,-612)).toBeCloseTo(y + 26);
    expect(roof(365,-612)).toBeUndefined();
    const side = new Raycaster(new Vector3(220,y+130,-614.9), new Vector3(1,0,0))
      .intersectObject(model.group, true)[0];
    expect(side.point.x).toBeCloseTo(259.9, 2);
  });

  it('keeps the ordinary building list available when the footprint or ground is missing', () => {
    expect(createWestin([eastBuilding], () => 0)).toBeNull();
    expect(createWestin([{ ...hotel, rings: [] }], () => 0)).toBeNull();
    expect(createWestin(buildings, () => NaN)).toBeNull();
    expect(createWestin(buildings, x => x > 350 ? null : -4)).toBeNull();
  });

  it('fades room lights on the existing glass mesh and releases both generated maps on teardown', () => {
    const model = createWestin(buildings, () => 0)!;
    const material = (model.group.getObjectByName('Westin guest tower and Sun Dial') as Mesh).material as MeshPhongMaterial;
    const releaseDay = vi.fn(), releaseNight = vi.fn();
    material.map!.addEventListener('dispose', releaseDay);
    material.emissiveMap!.addEventListener('dispose', releaseNight);
    model.setNight(0.75);
    expect(material.emissiveIntensity).toBe(3);
    model.setNight(0);
    expect(material.emissiveIntensity).toBe(0);
    expect(model.group.children).toHaveLength(2);
    material.dispose();
    expect(releaseDay).toHaveBeenCalledOnce();
    expect(releaseNight).toHaveBeenCalledOnce();
  });
});

it('places a mapped tower in the reflected direction and respects its ground elevation', () => {
  const tower: VBuilding = { ...hotel, h: 30, rings: [[[20,-6],[24,-6],[24,6],[20,6]]] };
  const empty = skylineReflection([], 0, 0, 40, () => 0).image;
  const low = skylineReflection([tower], 0, 0, 40, () => 0).image;
  const raised = skylineReflection([tower], 0, 0, 40, () => 20).image;
  // The middle column faces +X. The opposite side is across the panorama seam.
  const horizon = (empty.height / 2 * empty.width + empty.width / 2) * 4;
  const opposite = empty.height / 2 * empty.width * 4;
  expect(low.data[horizon]).toBe(empty.data[horizon]);
  expect(raised.data[horizon]).not.toBe(empty.data[horizon]);
  expect(raised.data[opposite]).toBe(empty.data[opposite]);
});
