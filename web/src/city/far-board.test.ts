import { expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, ShaderMaterial } from 'three';
import { Builder } from '../vignette/geom';
import { dominantWallStyle, landmarkKind, landmarkParts, styledBoxMesh } from './far-board';

/** One wall quad (two triangles) w × h metres at height y0, all in one style. */
function wall(pos: number[], style: number[], st: number, w: number, y0: number, h: number) {
  for (const [a, b, c] of [[[0, y0], [w, y0], [w, y0 + h]], [[0, y0], [w, y0 + h], [0, y0 + h]]]) {
    for (const [x, y] of [a, b, c]) { pos.push(x, y, 0); style.push(st); }
  }
}

it('picks the wall style covering the most area, and never a ground-floor base style over another', () => {
  const pos: number[] = [], style: number[] = [];
  wall(pos, style, 53, 40, 0, 4);   // arcade base: 160 m², the largest by itself
  wall(pos, style, 21, 10, 4, 12);  // office shaft above it: 120 m²
  wall(pos, style, -1, 40, 16, 0.5); // roof edge, no style
  const pick = dominantWallStyle(pos, style, 0, pos.length / 3);
  expect(pick.style).toBe(21);
  expect(pick.first).toBe(6);
  // The base is kept apart as the ground-floor band, up to its top.
  expect(pick.baseStyle).toBe(53);
  expect(pick.baseTop).toBe(4);
  // A building that is only a base keeps it.
  const only = dominantWallStyle(pos, style, 0, 6);
  expect(only.style).toBe(53);
  // Area, not vertex count: a large plain wall beats many small panels.
  const p2: number[] = [], s2: number[] = [];
  for (let i = 0; i < 5; i++) wall(p2, s2, 2, 1, i, 1);
  wall(p2, s2, 0, 30, 0, 10);
  expect(dominantWallStyle(p2, s2, 0, p2.length / 3).style).toBe(0);
});

it("gives each far wall the near wall's normal and facade axis, whichever way its footprint runs", () => {
  // The facade shader takes its u axis from the wall normal (vignette/world.ts patchFacades); a far
  // wall facing the other way would mirror the window cells and light different windows at night.
  const tangent = (nx: number, nz: number) => { const l = Math.hypot(-nz, nx); return [-nz / l, nx / l]; };
  for (const ring of [[[5, 5], [35, 5], [35, 15], [5, 15]], [[5, 15], [35, 15], [35, 5], [5, 5]]] as [number, number][][]) {
    const near = new Builder();
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      near.quad([a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], 20, c[1]], [a[0], 20, a[1]], '#888');
    }
    const ng = near.geometry().toNonIndexed();
    ng.computeVertexNormals();
    const want = new Map<string, number[]>();
    const np = ng.getAttribute('position'), nn = ng.getAttribute('normal');
    for (let v = 0; v < np.count; v += 3) want.set(`${np.getX(v)},${np.getZ(v)}|${np.getX(v + 1)},${np.getZ(v + 1)}`, [nn.getX(v), nn.getZ(v)]);
    const box = { cx: 20, cz: 10, ux: 1, uz: 0, hx: 15, hz: 5, y0: 0, y1: 20, r: 0.5, g: 0.5, b: 0.5, ring: ring.flat(), style: 0, base: 0 };
    const { day } = styledBoxMesh([box], new MeshLambertMaterial());
    const p = day.geometry.getAttribute('position'), n = day.geometry.getAttribute('normal'), idx = day.geometry.index!;
    let walls = 0;
    for (let t = 0; t < idx.count; t += 3) {
      const [i0, i1, i2] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      const e = [p.getX(i1) - p.getX(i0), p.getY(i1) - p.getY(i0), p.getZ(i1) - p.getZ(i0)], f = [p.getX(i2) - p.getX(i0), p.getY(i2) - p.getY(i0), p.getZ(i2) - p.getZ(i0)];
      const cross = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]];
      if (Math.abs(n.getY(i0)) > 0.5) { expect(cross[1], 'roof faces up').toBeGreaterThan(0); continue; }
      // Wound to face its stored normal, and that normal is the near wall's on the same edge.
      expect(cross[0] * n.getX(i0) + cross[2] * n.getZ(i0)).toBeGreaterThan(0);
      const ends = [...new Set([i0, i1, i2].map(i => `${p.getX(i)},${p.getZ(i)}`))];
      expect(ends).toHaveLength(2);
      const key = [...want.keys()].find(k => k.split('|').every(e => ends.includes(e)))!;
      const [wx, wz] = want.get(key)!;
      expect(n.getX(i0)).toBeCloseTo(wx, 2);
      expect(n.getZ(i0)).toBeCloseTo(wz, 2);
      expect(tangent(n.getX(i0), n.getZ(i0))).toEqual(tangent(wx, wz).map(v => expect.closeTo(v, 2)) as never);
      walls++;
    }
    expect(walls).toBe(8);
  }
});

it('sorts landmark meshes for the hidelm A/B by what they cost to shade', () => {
  const hooked = new MeshLambertMaterial();
  hooked.onBeforeCompile = () => {};
  const keyed = new MeshLambertMaterial();
  keyed.customProgramCacheKey = () => 'k';
  expect(landmarkKind(new MeshLambertMaterial())).toBe('plain');
  expect(landmarkKind(new MeshBasicMaterial({ transparent: true }))).toBe('glass');
  expect(landmarkKind(hooked)).toBe('hooked');
  expect(landmarkKind(keyed)).toBe('hooked');
  expect(landmarkKind(new ShaderMaterial())).toBe('hooked');
  const box = new BoxGeometry();
  const glass = new Mesh(box, new MeshBasicMaterial({ transparent: true }));
  const plain = new Mesh(box, new MeshLambertMaterial());
  const both = new Mesh(box, [new MeshLambertMaterial(), hooked]);
  const root = new Group().add(glass, new Group().add(plain, both));
  expect(landmarkParts([root], 'glass')).toEqual([glass]);
  expect(landmarkParts([root], 'hooked')).toEqual([both]);
  expect(landmarkParts([root], 'plain')).toEqual([plain, both]);
  expect(landmarkParts([root], 'all')).toEqual([glass, plain, both]);
});
