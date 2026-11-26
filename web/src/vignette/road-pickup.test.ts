import { describe, expect, it } from 'vitest';
import { Box3, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { PICKUP_LENGTH, roadPickupGeometry } from './road-pickup';

const triangles = (g: ReturnType<typeof roadPickupGeometry>) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

describe('road pickup', () => {
  it('carries the work trim as alternate colours on the same faces, for one traffic mesh', () => {
    const both = roadPickupGeometry({ trim: 'xlt', alt: 'xl' }), xlt = roadPickupGeometry({ trim: 'xlt' }), xl = roadPickupGeometry({ trim: 'xl' });
    const tris = (g: typeof both) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    // Same shape: one mesh's triangles serve both trims.
    expect(tris(both)).toBe(tris(xlt));
    expect(tris(both)).toBe(tris(xl));
    expect(xlt.getAttribute('aAlt')).toBeUndefined();
    const alt = both.getAttribute('aAlt'), kind = both.getAttribute('aKind'), color = both.getAttribute('color');
    let differs = 0;
    for (let i = 0; i < alt.count; i++) {
      // Encoded as kind + 10 so a geometry without aAlt (default w 0 or 1) never switches.
      expect(alt.getW(i)).toBeGreaterThan(9.5);
      // A part that isn't paint on the XLT never becomes paint on the work trim: paint multiplies the vertex
      // colour by the instance colour, and only paint vertices are white.
      if (kind.getX(i) !== 0) expect(alt.getW(i) - 10).not.toBe(0);
      if (kind.getX(i) !== alt.getW(i) - 10 || Math.abs(color.getX(i) - alt.getX(i)) > 1e-4) differs++;
    }
    // Only the trim parts change: grille bars, bumpers, wheels and lips, a minority of vertices.
    expect(differs).toBeGreaterThan(0);
    expect(differs / alt.count).toBeLessThan(0.5);
    for (const g of [both, xlt, xl]) g.dispose();
  });

  it('has F-150 SuperCrew 5.5 ft proportions, centred on its footprint', () => {
    const g = roadPickupGeometry();
    g.computeBoundingBox();
    const b = g.boundingBox as Box3;
    expect(b.max.z - b.min.z).toBeCloseTo(PICKUP_LENGTH, 1);
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.05);
    expect(b.max.y).toBeGreaterThan(1.9);
    expect(b.max.y).toBeLessThan(1.98);
    // Body 2.03 m; mirrors stand out to about 2.4 m, as the standard mirrors do (95.7 in).
    expect(b.max.x - b.min.x).toBeLessThan(2.45);
    g.dispose();
  });

  it('keeps the traffic form light and the close form detailed', () => {
    const far = roadPickupGeometry(), near = roadPickupGeometry({ near: true });
    expect(triangles(far)).toBeLessThan(1400);
    expect(triangles(near)).toBeGreaterThan(triangles(far) * 1.5);
    far.dispose(); near.dispose();
  });

  it('winds every face it shows outward from both sides, above, front and rear', () => {
    for (const near of [true, false])
      for (const trim of ['xl', 'xlt'] as const) {
        const geometry = roadPickupGeometry({ near, trim });
        const material = new MeshBasicMaterial({ side: DoubleSide });
        const mesh = new Mesh(geometry, material);
        const ray = new Raycaster();
        const inward: string[] = [];
        const cast = (o: Vector3, d: Vector3) => {
          ray.set(o, d);
          const hit = ray.intersectObject(mesh)[0];
          // A grazing hit (glass seen edge-on through its 8 mm stand-off) shows no area; skip it.
          if (hit?.face && hit.face.normal.dot(d) > 0.1) inward.push(`${o.toArray().map((v) => v.toFixed(2))} → ${d.toArray()}`);
        };
        for (let z = -2.95; z <= 2.95; z += 0.06)
          for (let y = 0.05; y <= 1.95; y += 0.05) {
            cast(new Vector3(-4, y, z), new Vector3(1, 0, 0));
            cast(new Vector3(4, y, z), new Vector3(-1, 0, 0));
          }
        for (let z = -2.95; z <= 2.95; z += 0.06) for (let x = -1.2; x <= 1.2; x += 0.05) cast(new Vector3(x, 5, z), new Vector3(0, -1, 0));
        for (let x = -1.2; x <= 1.2; x += 0.04)
          for (let y = 0.05; y <= 1.95; y += 0.04) {
            cast(new Vector3(x, y, 8), new Vector3(0, 0, -1));
            cast(new Vector3(x, y, -8), new Vector3(0, 0, 1));
          }
        material.dispose();
        geometry.dispose();
        expect(inward.slice(0, 10), `${near ? 'near' : 'far'} ${trim}: ${inward.length} back faces`).toEqual([]);
      }
  }, 30_000); // seconds of raycasts; more under the full suite's load
});
