import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { decodePlaceholder, encodePlaceholder, type PlaceholderAreaData } from './placeholder-data';
import { buildArea, createPlaceholder, placeholderMaterial } from './placeholder';
import { WHITE_ALBEDO, WHITE_MODEL, easeInOut } from './white-model';

/** One 100 × 60 m area at 40 m steps with two masses: a 10 m box and an L-shaped 30 m block. */
function sample(): PlaceholderAreaData {
  const bounds = { minX: 0, maxX: 100, minZ: -60, maxZ: 0 };
  const cols = 4, rows = 3; // x 0, 40, 80, 100; z −60, −20, 0 (clamped)
  const ground = Int16Array.from({ length: cols * rows }, (_, i) => 100 + i); // 10.0 m and up
  const ox = 50, oz = -30;
  // Rings counter-clockwise from above (area over (x, z) negative), in decimetres from (ox, oz).
  const box = [[10, -10], [20, -10], [20, -20], [10, -20]];
  const ell = [[40, -10], [70, -10], [70, -20], [55, -20], [55, -40], [40, -40]];
  const rings = [box, ell];
  const xz = rings.flat().flatMap(([x, z]) => [(x - ox) * 10, (z - oz) * 10]);
  const roof = [[0, 1, 2], [0, 2, 3], [0, 1, 2], [0, 2, 3], [0, 3, 5], [3, 4, 5]];
  return {
    area: { id: 'test', ox, oz, bounds, bottomY: 0, ground: { step: 40, cols, rows }, buildings: 2, ringVerts: 10, roofTris: 6 },
    ground, ringN: Uint8Array.from([4, 6]), y: Int16Array.from([100, 200, 100, 400]), xz: Int16Array.from(xz), roof: Uint8Array.from(roof.flat()),
  };
}

describe('placeholder file', () => {
  it('round-trips', () => {
    const a = sample(), b = { ...sample(), area: { ...sample().area, id: 'other' } };
    const [x, y] = decodePlaceholder(encodePlaceholder([a, b]).slice().buffer);
    expect(x.area).toEqual(a.area);
    expect(y.area.id).toBe('other');
    for (const k of ['ground', 'ringN', 'y', 'xz', 'roof'] as const) expect(Array.from(x[k])).toEqual(Array.from(a[k]));
  });
});

describe.each([true, false])('placeholder geometry (normals %s)', normals => {
  const built = buildArea(sample(), normals);
  const g = built.geometry, pos = g.getAttribute('position'), index = g.index!;
  const world = (i: number) => new THREE.Vector3(pos.getX(i) / 10 + 50, pos.getY(i) / 10, pos.getZ(i) / 10 - 30);
  const normal = (t: number) => {
    const [a, b, c] = [0, 1, 2].map(k => world(index.getX(t * 3 + k)));
    return b.sub(a).cross(c.sub(a)).normalize();
  };
  const centroid = (t: number) => [0, 1, 2].map(k => world(index.getX(t * 3 + k))).reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(3);

  it('orders skirt, ground, masses', () => {
    expect(built.skirtEnd).toBe(3 * 2 * (2 * 3 + 2 * 2));
    expect(built.groundEnd - built.skirtEnd).toBe(3 * 2 * 3 * 2);
    // Box: 8 wall + 2 roof; L: 12 wall + 4 roof.
    expect(built.massEnd - built.groundEnd).toBe(3 * (10 + 16));
    expect(index.count).toBe(built.massEnd);
  });

  it('faces every ground and roof triangle up, and every wall and skirt out', () => {
    for (let t = built.skirtEnd / 3; t < built.groundEnd / 3; t++) expect(normal(t).y).toBeGreaterThan(0.9);
    for (let t = 0; t < built.skirtEnd / 3; t++) {
      const n = normal(t), c = centroid(t);
      // Outward: away from the area's centre.
      expect(n.x * (c.x - 50) + n.z * (c.z + 30)).toBeGreaterThan(0);
    }
    for (let t = built.groundEnd / 3; t < built.massEnd / 3; t++) {
      const n = normal(t), c = centroid(t);
      if (Math.abs(n.y) > 0.9) { expect(n.y).toBeGreaterThan(0); expect(c.y).toBeCloseTo(t < built.groundEnd / 3 + 10 ? 20 : 40, 5); continue; }
      // A wall faces away from its building's middle (box 15, −15; the L's walls face off its hull).
      const mid = t < built.groundEnd / 3 + 10 ? new THREE.Vector3(15, 0, -15) : new THREE.Vector3(52, 0, -22);
      const out = n.x * (c.x - mid.x) + n.z * (c.z - mid.z);
      if (t < built.groundEnd / 3 + 10) expect(out).toBeGreaterThan(0);
      else expect(Math.abs(n.y)).toBeLessThan(1e-6);
    }
  });

  it('carries normals that agree with the winding', () => {
    const n = built.geometry.getAttribute('normal');
    if (!normals) { expect(n).toBeUndefined(); return; }
    for (let t = 0; t < index.count / 3; t++) {
      const face = normal(t);
      // Ground normals are smooth; walls, roofs and the skirt match their face.
      const i = index.getX(t * 3), v = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i));
      expect(v.dot(face)).toBeGreaterThan(t >= built.skirtEnd / 3 && t < built.groundEnd / 3 ? 0.5 : 0.99);
    }
  });

  it('seats the ground on the grid and clamps the last column to the edge', () => {
    // Node (col 3, row 0): x clamped to 100, z −60, y 10.3 m.
    expect(world(3).toArray()).toEqual([100, 10.3, -60]);
    expect(world(11).toArray()).toEqual([100, 11.1, 0]);
  });
});

describe('placeholder look', () => {
  it('shares the white model’s white on a plain Lambert material', () => {
    const m = placeholderMaterial();
    expect(m.color.getHex()).toBe(new THREE.Color(WHITE_MODEL).multiplyScalar(WHITE_ALBEDO).getHex());
    expect(m.transparent).toBe(false);
    expect(m.flatShading).toBe(false);
    // No shader changes: a program City already compiles (the mosaic plinth's).
    expect(m.customProgramCacheKey()).toBe(new THREE.MeshLambertMaterial().customProgramCacheKey());
  });

  it('dissolves masses first, then ground, then skirt, and hides at the end', () => {
    const p = createPlaceholder([sample()], { reducedMotion: false });
    const mesh = p.group.children[0] as THREE.Mesh;
    const b = buildArea(sample());
    p.show('test');
    expect(mesh.geometry.drawRange.count).toBe(b.massEnd);
    p.reveal('test');
    p.update(0);
    expect(mesh.geometry.drawRange.count).toBe(b.massEnd);
    const counts: number[] = [];
    for (let t = 50; t < 1000; t += 50) { p.update(t); counts.push(mesh.geometry.drawRange.count); }
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    expect(counts.some(c => c === b.groundEnd || (c < b.groundEnd && c > b.skirtEnd))).toBe(true);
    p.update(1000);
    expect(mesh.visible).toBe(false);
    expect(p.fading).toBe(false);
    p.show('test');
    expect(mesh.visible).toBe(true);
    expect(mesh.geometry.drawRange.count).toBe(b.massEnd);
  });

  it('leaves dissolving areas out of the cream-ink rects and reports shadow changes', () => {
    let changes = 0;
    const p = createPlaceholder([sample()], { reducedMotion: false, changed: () => changes++ });
    const out = new Float32Array(16 * 4);
    // Created shown; hiding and showing again each report a change.
    p.hide('test');
    expect(changes).toBe(1);
    expect(p.rects(out)).toBe(0);
    p.show('test');
    expect(changes).toBe(2);
    expect(p.rects(out)).toBe(1);
    expect(Array.from(out.slice(0, 4))).toEqual([0, -60, 100, 0]);
    p.reveal('test');
    expect(p.rects(out)).toBe(0);
    p.update(0); p.update(1000);
    expect(changes).toBe(3);
    p.show('test');
    expect(changes).toBe(4);
  });

  it('dissolves in when the file arrives late, and counts as white for the ink', () => {
    const p = createPlaceholder([sample()], { reducedMotion: false });
    const mesh = p.group.children[0] as THREE.Mesh;
    const b = buildArea(sample());
    p.hide('test');
    p.appear('test');
    expect(mesh.visible).toBe(true);
    expect(mesh.geometry.drawRange.count).toBe(0);
    expect(p.rects(new Float32Array(64))).toBe(1);
    p.update(0); p.update(500);
    const mid = mesh.geometry.drawRange.count;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(b.massEnd);
    p.update(1000);
    expect(mesh.geometry.drawRange.count).toBe(b.massEnd);
    expect(p.fading).toBe(false);
    expect(mesh.userData.fading).toBe(false);
  });

  it('ends the skirt at the plinth bottom City gives', () => {
    const g = buildArea(sample(), true, -12.5).geometry, pos = g.getAttribute('position');
    let low = Infinity;
    for (let i = 0; i < pos.count; i++) low = Math.min(low, pos.getY(i));
    expect(low).toBe(-125);
  });

  it('eases in and out', () => {
    expect(easeInOut(0)).toBeCloseTo(0, 5);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 3);
    expect(easeInOut(1)).toBeCloseTo(1, 5);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
  });
});

// The staged file (pnpm data:bake) against the board it stands in for: every mosaic area but
// downtown (built at boot), at the bounds City mounts it with. Skipped without staged data.
describe('staged placeholder', async () => {
  const { existsSync, readFileSync } = await import('node:fs');
  const { gunzipSync } = await import('node:zlib');
  const { bounds } = await import('../square-board/sections');
  const file = new URL('../../public/data/scene/placeholder/board.bin.gz', import.meta.url);
  it.skipIf(!existsSync(file))('covers every area City loads after boot, at its bounds', () => {
    const areas = decodePlaceholder(Uint8Array.from(gunzipSync(readFileSync(file))).buffer);
    const ids = areas.map(a => a.area.id).sort();
    expect(ids).toEqual(Object.keys(bounds).filter(id => id !== 'downtown').sort());
    for (const a of areas) {
      expect(a.area.bounds).toEqual(bounds[a.area.id as keyof typeof bounds]);
      // Masses stand on the board: every ring vertex inside its area's bounds, give or take a metre.
      for (let i = 0; i < a.xz.length; i += 2) {
        const x = a.area.ox + a.xz[i] / 10, z = a.area.oz + a.xz[i + 1] / 10;
        expect(x).toBeGreaterThan(a.area.bounds.minX - 60);
        expect(x).toBeLessThan(a.area.bounds.maxX + 60);
        expect(z).toBeGreaterThan(a.area.bounds.minZ - 60);
        expect(z).toBeLessThan(a.area.bounds.maxZ + 60);
      }
      expect(a.area.buildings).toBeGreaterThan(0);
      // Every roof triangle faces up in the stored decimetres the reader draws (review: winding
      // chosen before rounding left some facing down).
      let at = 0, rt = 0, down = 0;
      for (let i = 0; i < a.area.buildings; i++) {
        const n = a.ringN[i];
        for (let t = 0; t < n - 2; t++) {
          const [p, q, r] = [0, 1, 2].map(k => a.roof[(rt + t) * 3 + k] + at);
          const ex = a.xz[q * 2] - a.xz[p * 2], ez = a.xz[q * 2 + 1] - a.xz[p * 2 + 1];
          const fx = a.xz[r * 2] - a.xz[p * 2], fz = a.xz[r * 2 + 1] - a.xz[p * 2 + 1];
          if (ez * fx - ex * fz < 0) down++;
        }
        at += n; rt += n - 2;
      }
      expect(down, a.area.id).toBe(0);
    }
  });
});
