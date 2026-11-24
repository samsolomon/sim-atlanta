import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { vehicleGeometry } from './vehicles';

describe('road sedan rear lenses', () => {
  it('keeps the brake-light surface ahead of the bumper across both rear corners', () => {
    const geometry = vehicleGeometry('sedan');
    const material = new MeshBasicMaterial();
    const car = new Mesh(geometry, material);
    const ray = new Raycaster();
    const kinds = geometry.getAttribute('aKind');
    try {
      for (const side of [-1, 1]) {
        for (const x of [0.28, 0.5, 0.65, 0.76, 0.82, 0.85, 0.87, 0.885]) {
          ray.set(new Vector3(side * x, 0.922, -4), new Vector3(0, 0, 1));
          const face = ray.intersectObject(car)[0]?.face;
          expect(face && kinds.getX(face.a), `rear lamp at x=${side * x}`).toBe(2);
        }
      }
    } finally {
      material.dispose();
      geometry.dispose();
    }
  });
});
