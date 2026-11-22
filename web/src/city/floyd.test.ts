import { describe, expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import type { VBuilding } from '../vignette/world';
import { createFloyd } from './floyd';
import { georgiaStateScene } from './georgia-state-geometry';

// Rail Accuracy's two mapped face midpoints in City metres. The model must also
// tolerate their translation onto City's smoothed line without moving the towers.
const station = georgiaStateScene({ lon: -84.3916, lat: 33.7539 });
const sample = (u: number, bedY: number) => {
  const [x, z] = station.fromFrame(u, 0);
  return { x, z, bedY };
};
const west = sample(station.faces.nw.u, -12);
const east = sample(station.faces.se.u, -9);
const delta = new Vector3(east.x - west.x, 0, east.z - west.z);
const length = delta.length(), along = delta.clone().normalize();
const right = new Vector3(-along.z, 0, along.x);
const base: VBuilding = { id: '4a81824b-9095-406e-8c5d-60b4b8bf12fd', rings: [], h: 25.2, floors: 2 };
const neighbour = { ...base, id: 'another-building' };

describe('Floyd tower replacement', () => {
  it.each([0, -2.3])('leaves the paired tracks and platform edges open at lateral offset %s m', offset => {
    const samples = [west, east].map(p => ({ ...p, x: p.x + right.x * offset, z: p.z + right.z * offset }));
    const buildings = [base, neighbour];
    const model = createFloyd(buildings, samples, () => -14)!;
    expect(model.buildings).toEqual([neighbour]);
    expect(buildings).toEqual([base, neighbour]);
    model.group.updateMatrixWorld(true);
    const origin = new Vector3(samples[0].x, 0, samples[0].z);
    const ray = (position: Vector3, direction: Vector3, far: number) =>
      new Raycaster(position, direction, 0, far).intersectObject(model.group, true)[0];
    // Cast through the actual triangles at train and platform heights. A wall drawn
    // across either end or a tower body sunk down to ground interrupts these rays.
    for (const lateral of [...station.faces.se.opening, -2.43, 2.43]) {
      for (const y of [east.bedY + 1.2, east.bedY + 4.2]) {
        const start = origin.clone().addScaledVector(right, lateral).addScaledVector(along, -1);
        start.y = y;
        expect(ray(start, along, length + 2)).toBeUndefined();
      }
    }
    const mid = origin.clone().addScaledVector(along, length / 2);
    mid.y = east.bedY + 2;
    expect(ray(mid, right, 12)?.distance).toBeCloseTo(9, 3);
    expect(ray(mid, right.clone().negate(), 12)?.distance).toBeCloseTo(9, 3);
    expect(ray(mid, new Vector3(0, 1, 0), 12)?.point.y).toBeCloseTo(model.eastFace.soffitY, 3);
    expect(model.eastFace).toMatchObject({ x: samples[1].x, z: samples[1].z, clearWidthM: 18 });
    // High rays meet two slabs with open sky between them.
    for (const [u, hasTower] of [[15, true], [58, false], [100, true]] as const) {
      const position = origin.clone().addScaledVector(along, u).addScaledVector(right, 25);
      position.y = 90;
      expect(!!ray(position, new Vector3(0, -1, 0), 65)).toBe(hasTower);
    }
    expect(model.group.children).toHaveLength(2);
    const offices = model.group.getObjectByName('Floyd office windows') as Mesh;
    expect(offices.visible).toBe(false);
    model.setNight(0.7);
    expect(offices.visible).toBe(true);
    model.setNight(0);
    expect(offices.visible).toBe(false);
    expect((model.group.children[0] as Mesh).geometry.attributes.position.count / 3).toBeLessThan(3000);
    model.dispose();
  });

  it('retains the generic scene for missing or unregistered inputs', () => {
    expect(createFloyd([neighbour], [west, east], () => 0)).toBeNull();
    expect(createFloyd([base], [west, east], () => null)).toBeNull();
    expect(createFloyd([base], [west, east], () => NaN)).toBeNull();
    for (const points of [[], [west], [east, west], [west, west, east], [west, { ...east, bedY: NaN }]]) {
      expect(createFloyd([base], points, () => -14)).toBeNull();
    }
  });
});
