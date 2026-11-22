import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { CAPITOL_ID, H, createCapitol } from './capitol';

const file = resolve(__dirname, '../../public/data/scene/downtown/vignette.json');
const staged = existsSync(file);
const vd = staged ? JSON.parse(readFileSync(file, 'utf8')) as { buildings: VBuilding[]; roads: { name: string | null; pts: P2[] }[] } : null!;

/** Ground falling 3 m from west to east across the site, like the real hill. */
const slope = (x: number) => 2 - (x - 270) * 0.03;

describe.skipIf(!staged)('Georgia State Capitol', () => {
  const generic = staged ? vd.buildings.find((b) => b.id === CAPITOL_ID)! : null!;
  const ring = staged ? generic.rings[0] : [];
  const world = (model: NonNullable<ReturnType<typeof createCapitol>>) => {
    model.group.updateMatrixWorld(true);
    const pts: Vector3[] = [];
    model.group.traverse((o) => {
      if (!(o instanceof Mesh) || !o.visible && o.name !== 'Capitol lit windows') return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) pts.push(new Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
    });
    return pts;
  };

  it('replaces exactly the generic Capitol and leaves the input list alone', () => {
    const before = [...vd.buildings];
    const model = createCapitol(vd.buildings, (x) => slope(x))!;
    expect(model).not.toBeNull();
    expect(model.buildings.length).toBe(vd.buildings.length - 1);
    expect(model.buildings.some((b) => b.id === CAPITOL_ID)).toBe(false);
    expect(vd.buildings).toEqual(before);
    expect(model.triangles).toBeLessThan(12000);
  });

  it('falls back to the generic building when it is missing, moved or off the ground grid', () => {
    expect(createCapitol(vd.buildings.filter((b) => b.id !== CAPITOL_ID), () => 0)).toBeNull();
    const moved = { ...generic, rings: [ring.map(([x, z]) => [x + 4, z] as P2)] };
    expect(createCapitol([moved], () => 0)).toBeNull();
    expect(createCapitol([generic], (x) => (x > 360 ? null : 0))).toBeNull();
  });

  it('stands on the lowest grade and reaches the HABS heights', () => {
    const model = createCapitol([generic], (x) => slope(x))!;
    const lowest = Math.min(...ring.map(([x]) => slope(x)));
    expect(model.datum).toBeCloseTo(lowest);
    const box = new Box3().setFromPoints(world(model));
    expect(box.min.y).toBeLessThanOrEqual(lowest - 0.5); // walls run below every perimeter point
    expect(box.max.y - lowest).toBeCloseTo(H.statue, 1); // 259'-7"
    const leaf = new Box3().setFromObject(model.group.getObjectByName('Capitol gold dome and lantern')!, true);
    expect(leaf.max.y - lowest).toBeCloseTo(H.lanternTop, 1); // 233'-10"
    expect(leaf.max.x - leaf.min.x).toBeGreaterThan(19.5); // 20 m dome, gilded
    expect(leaf.max.x - leaf.min.x).toBeLessThan(26);
  });

  it('centres the dome on the crossing, within a metre of OSM\'s mapped dome part', () => {
    const model = createCapitol([generic], () => 0)!;
    const [x, z] = model.dome.centre;
    expect(Math.hypot(x - 320.6, z - 539.4)).toBeLessThan(1); // osm:way/536753432 centroid
    expect(model.dome.radius * 2).toBeCloseTo(19.8, 0);
  });

  it('stays inside the mapped footprint', () => {
    const model = createCapitol([generic], () => 0)!;
    const eastDoor = model.eastDoor;
    for (const p of world(model)) {
      if (pointInRing(p.x, p.z, ring)) continue;
      // The east stair (sheet 20) runs out past the mapped wall, up to the door sill.
      if (p.y <= H.eastDoor + 1e-6 && Math.hypot(p.x - eastDoor[0], p.z - eastDoor[1]) < 6.5) continue;
      const d = Math.min(...ring.map((a, i) => segDist(p.x, p.z, a, ring[(i + 1) % ring.length])));
      expect(d).toBeLessThan(0.9); // the pediment's overhang and window reveals
    }
  });

  it('faces its portico onto Washington St, not Capitol Ave', () => {
    const model = createCapitol([generic], () => 0)!;
    const pts = world(model);
    const apex = pts.filter((p) => Math.abs(p.y - H.pediment) < 0.01); // datum 0 here
    expect(apex.length).toBeGreaterThan(0);
    const ax = apex.reduce((s, p) => s + p.x, 0) / apex.length, az = apex.reduce((s, p) => s + p.z, 0) / apex.length;
    const street = (name: string) => vd.roads.filter((r) => r.name === name);
    const near = (x: number, z: number, roads: { pts: P2[] }[]) =>
      Math.min(...roads.flatMap((r) => r.pts.slice(1).map((b, i) => segDist(x, z, r.pts[i], b))));
    const washington = street('Washington Street Southwest'), capitolAve = street('Capitol Avenue Southeast');
    expect(washington.length).toBeGreaterThan(0);
    expect(capitolAve.length).toBeGreaterThan(0);
    const [dx, dz] = model.dome.centre;
    // The pediment apex is the west front: nearer Washington St than the dome is, and farther from Capitol Ave.
    expect(near(ax, az, washington)).toBeLessThan(near(dx, dz, washington) - 20);
    expect(near(ax, az, capitolAve)).toBeGreaterThan(near(dx, dz, capitolAve) + 20);
  });
});
