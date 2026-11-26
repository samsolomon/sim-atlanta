import { describe, expect, it } from 'vitest';
import { Box3, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { roadSemiGeometry, SEMI_LENGTH } from './road-semi';

const triangles = (near: boolean) => {
  const g = roadSemiGeometry({ near });
  const n = (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  g.dispose();
  return n;
};

describe('road semi', () => {
  it('is a 589-proportioned sleeper tractor and 53 ft van, 22.97 m to the rear lamps', () => {
    expect(SEMI_LENGTH).toBeCloseTo(22.97, 2);
    const g = roadSemiGeometry();
    g.computeBoundingBox();
    const box = g.boundingBox as Box3;
    // Centred on its footprint like every traffic body; 13 ft 6 in van over a 102 in body.
    expect(Math.abs(box.max.z + box.min.z)).toBeLessThan(0.15);
    expect(box.max.y).toBeCloseTo(4.115, 2);
    expect(box.max.x - box.min.x).toBeLessThan(2.8);
    g.dispose();
  });

  it('keeps the traffic form within its triangle budget', () => {
    const near = triangles(true),
      far = triangles(false);
    // 1,370 at the first review, plus Sam's grille slats (+168), mirrors (+72) and amber lamps.
    expect(far).toBeLessThan(1700);
    expect(near).toBeGreaterThan(far * 2);
  });

  it('winds every face it shows outward from five directions (single-sided fender undersides face the ground)', () => {
    for (const near of [true, false]) {
      const geometry = roadSemiGeometry({ near });
      const material = new MeshBasicMaterial({ side: DoubleSide });
      const mesh = new Mesh(geometry, material);
      const ray = new Raycaster();
      const inward: string[] = [];
      const cast = (origin: Vector3, dir: Vector3) => {
        ray.set(origin, dir);
        const hit = ray.intersectObject(mesh)[0];
        if (hit?.face && hit.face.normal.dot(dir) > 0) inward.push(`${origin.toArray().map((v) => v.toFixed(2))} → ${dir.toArray()}`);
      };
      for (let z = -11.4; z <= 11.4; z += 0.19)
        for (let y = 0.05; y <= 4.1; y += 0.11) {
          cast(new Vector3(-5, y, z), new Vector3(1, 0, 0));
          cast(new Vector3(5, y, z), new Vector3(-1, 0, 0));
        }
      for (let z = -11.4; z <= 11.4; z += 0.19) for (let x = -1.3; x <= 1.3; x += 0.07) cast(new Vector3(x, 8, z), new Vector3(0, -1, 0));
      for (let x = -1.3; x <= 1.3; x += 0.05)
        for (let y = 0.05; y <= 4.1; y += 0.05) {
          cast(new Vector3(x, y, 20), new Vector3(0, 0, -1));
          cast(new Vector3(x, y, -20), new Vector3(0, 0, 1));
        }
      material.dispose();
      geometry.dispose();
      expect(inward.slice(0, 12), `${near ? 'near' : 'distant'}: ${inward.length} back faces`).toEqual([]);
    }
  });
});
