import { BoxGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { batchLandmarks, StaticLandmarkMaterial } from './landmark-batch';

/** A landmarkShell-like site: a shadowed body and an unshadowed lit-window mesh with its own night factor. */
function landmark(x: number, glow = '#f2d5a5', factor = 0.64, z = 20) {
  const group = new Group();
  group.position.set(x, 10, z);
  group.rotation.y = 0.3;
  const body = new Mesh(new BoxGeometry().toNonIndexed(), new StaticLandmarkMaterial());
  const colors = new Float32Array(body.geometry.attributes.position.count * 3).fill(0.5);
  body.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  body.castShadow = body.receiveShadow = true;
  const lamps = new Mesh(new BoxGeometry(0.5, 0.5, 0.5).toNonIndexed(),
    new MeshLambertMaterial({ vertexColors: true, emissive: glow, emissiveIntensity: 0 }));
  lamps.geometry.setAttribute('color', body.geometry.getAttribute('color').clone());
  group.add(body, lamps);
  return { group, body, lamps, setNight(n: number) { lamps.material.emissiveIntensity = n * factor; } };
}
const meshes = (g: Group) => { const out: Mesh[] = []; g.traverse(o => { if ((o as Mesh).isMesh) out.push(o as Mesh); }); return out; };
const shown = (g: Group) => meshes(g).filter(m => m.visible);

describe('batchLandmarks', () => {
  it('bakes nearby landmarks relative to the container and leaves distant ones alone', () => {
    const container = new Group();
    container.position.set(100, 0, 0);
    const sites = [10, 20, 30, 1100].map(x => landmark(x));
    for (const s of sites) container.add(s.group);
    const expected = sites[1].body.localToWorld(new Vector3().fromBufferAttribute(sites[1].body.geometry.attributes.position, 0));
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    container.updateMatrixWorld(true);
    // Three bodies plus three lamp sets in one cell; the far site is alone in its cell.
    expect(b.stats.merged).toBe(6);
    expect(sites.map(s => s.group.children.length)).toEqual([0, 0, 0, 2]);
    const positions = meshes(b.group).map(m => m.geometry.attributes.position);
    const found = positions.some(p => Array.from({ length: p.count }, (_, i) => new Vector3().fromBufferAttribute(p, i).add(container.position))
      .some(v => v.distanceTo(expected) < 1e-4));
    expect(found).toBe(true);
    const body = meshes(b.group).find(m => m.castShadow)!;
    expect(body.receiveShadow).toBe(true);
    expect(meshes(b.group).filter(m => !m.castShadow).every(m => !m.receiveShadow)).toBe(true);
  });

  it('draws differently lit windows as one range by day and as their own ranges at night', () => {
    const container = new Group();
    const sites = [landmark(10, '#f2d5a5', 0.64), landmark(30, '#e4d3a2', 0.5), landmark(50, '#f2d5a5', 0.64)];
    for (const s of sites) container.add(s.group);
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    for (const s of sites) s.setNight(0);
    b.sync();
    // Day: one body draw and one lamp draw for the whole cell.
    expect(shown(b.group)).toHaveLength(2);
    for (const s of sites) s.setNight(1);
    b.sync();
    // Night: the body and two lamp runs (two sites share a colour and factor).
    const lit = shown(b.group).filter(m => !m.castShadow);
    expect(lit).toHaveLength(2);
    const intensities = lit.map(m => (m.material as MeshLambertMaterial).emissiveIntensity).sort();
    expect(intensities).toEqual([0.5, 0.64]);
    // The night ranges together cover the day range, and share its buffers.
    const day = meshes(b.group).find(m => !m.castShadow && !m.visible && m.name.includes('day'))!;
    expect(lit.reduce((n, m) => n + m.geometry.drawRange.count, 0)).toBe(day.geometry.drawRange.count);
    expect(lit.every(m => m.geometry.attributes.position === day.geometry.attributes.position)).toBe(true);
  });

  it('bakes a constant material colour into the vertices and keeps a colour that changes at night', () => {
    const container = new Group();
    const a = landmark(10), c = landmark(20);
    a.body.material.color.set('#ff0000');
    for (const s of [a, c]) container.add(s.group);
    const b = batchLandmarks([a, c], container);
    const body = meshes(b.group).find(m => m.castShadow)!;
    expect((body.material as MeshLambertMaterial).color.getHex()).toBe(0xffffff);
    const col = body.geometry.attributes.color;
    const reds = new Set(Array.from({ length: col.count }, (_, i) => col.getY(i).toFixed(2)));
    expect([...reds].sort()).toEqual(['0.00', '0.50']);

    const d = landmark(10), e = landmark(20);
    const container2 = new Group();
    container2.add(d.group, e.group);
    const night = (n: number) => { d.body.material.color.setScalar(1 - 0.2 * n); };
    const b2 = batchLandmarks([{ group: d.group, setNight: night }, e], container2);
    night(1);
    b2.sync();
    const dyn = shown(b2.group).find(m => m.castShadow && (m.material as MeshLambertMaterial).color.getHex() !== 0xffffff);
    expect(dyn && (dyn.material as MeshLambertMaterial).color.equals(new Color().setScalar(0.8))).toBe(true);
  });

  it('leaves meshes that hide at night, hooked materials and unlisted landmarks untouched', () => {
    const container = new Group();
    const a = landmark(10), c = landmark(20), unlisted = landmark(30);
    const flood = new Mesh(new BoxGeometry().toNonIndexed(), new MeshLambertMaterial());
    a.group.add(flood);
    c.body.material.onBeforeCompile = () => {};
    for (const s of [a, c, unlisted]) container.add(s.group);
    const night = (n: number) => { a.setNight(n); flood.visible = n > 0.01; };
    batchLandmarks([{ group: a.group, setNight: night }, c], container);
    expect(flood.parent).toBe(a.group);
    expect(c.body.parent).toBe(c.group);
    expect(unlisted.group.children).toHaveLength(2);
  });

  it('keeps a geometry another mesh still draws', () => {
    const container = new Group();
    const a = landmark(10), c = landmark(20);
    const twin = new Mesh(a.body.geometry, new MeshLambertMaterial({ transparent: true }));
    a.group.add(twin);
    for (const s of [a, c]) container.add(s.group);
    batchLandmarks([a, c], container);
    expect(twin.geometry.attributes.position.count).toBeGreaterThan(0);
    expect(twin.parent).toBe(a.group);
  });
});
