import { BoxGeometry, BufferGeometry, DoubleSide, Color, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, PerspectiveCamera, Plane, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { batchLandmarks, buildLandmarkBatches, landmarkBatchReport, StaticLandmarkMaterial } from './landmark-batch';
import { FACADE_GLOW_RUNS, patchFacades } from './facade';

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
    // Packed positions: read through each mesh's transform; Int16 steps here are well under 1 mm.
    const found = meshes(b.group).some(m => Array.from({ length: m.geometry.attributes.position.count },
      (_, i) => m.localToWorld(new Vector3().fromBufferAttribute(m.geometry.attributes.position, i)))
      .some(v => v.distanceTo(expected) < 1e-3));
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

  it('keeps lit panes in the wall draw at any night factor, each run lit by its own source (lit walls)', () => {
    const container = new Group();
    // As landmarkShell builds them since #484: lit panes share the body's shadow flags and side.
    const sites = [landmark(10, '#f2d5a5', 0.64), landmark(30, '#e4d3a2', 0.5), landmark(50, '#f2d5a5', 0.64)];
    for (const s of sites) {
      s.lamps.castShadow = s.lamps.receiveShadow = true;
      s.lamps.material.side = DoubleSide;
      container.add(s.group);
    }
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    expect(b.stats.litWalls).toBe(1);
    // 0.3 is not one of the probes (1, 0.5, 0): the runs' light still follows their sources.
    for (const n of [0.3, 1]) {
      for (const s of sites) s.setNight(n);
      b.sync();
      const drawn = shown(b.group);
      expect(drawn).toHaveLength(1);
      const mesh = drawn[0], mat = mesh.material as MeshLambertMaterial;
      const { glow, plain } = mat.userData.facade;
      expect(plain).toBe(true);
      // Body, then the two lamp runs (two sites share a colour and factor), in buffer order.
      expect(glow.count.value).toBe(3);
      const rgb = Array.from(glow.rgb.value as Float32Array);
      const range = Array.from(glow.range.value as Int32Array).slice(0, 6);
      const lamp = (hex: string, k: number) => new Color(hex).toArray().map(c => c * k * n);
      // Each light goes to its own geometry. Runs have distinct sizes: the three bodies (3 x 36
      // vertices), the two lamp sets that share a colour (2 x 36) and the third lamp set (36).
      const expected: Record<number, number[]> = { 108: [0, 0, 0], 72: lamp('#f2d5a5', 0.64), 36: lamp('#e4d3a2', 0.5) };
      for (let i = 0; i < 3; i++) {
        const want = expected[range[i * 2 + 1] - range[i * 2]];
        expect(want).toBeDefined();
        for (let c = 0; c < 3; c++) expect(rgb[i * 3 + c]).toBeCloseTo(want[c], 6);
      }
      // The ranges tile the draw.
      expect(range[0]).toBe(mesh.geometry.drawRange.start);
      expect(range[2]).toBe(range[1]);
      expect(range[4]).toBe(range[3]);
      expect(range[5]).toBe(mesh.geometry.drawRange.start + mesh.geometry.drawRange.count);
    }
    // One program: the batch draws with the generic buildings' facade hook and their settings.
    const generic = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
    patchFacades(generic);
    const mat = shown(b.group)[0].material as MeshLambertMaterial;
    expect(mat.customProgramCacheKey()).toBe(generic.customProgramCacheKey());
    expect([mat.type, mat.side, mat.vertexColors, mat.flatShading, mat.fog]).toEqual([generic.type, generic.side, generic.vertexColors, generic.flatShading, generic.fog]);
  });

  it('draws lit walls without the facade hook while no run glows, and with it once one does', () => {
    const container = new Group();
    const sites = [landmark(10, '#f2d5a5', 0.64), landmark(30, '#e4d3a2', 0.5), landmark(50, '#f2d5a5', 0.64)];
    for (const s of sites) {
      s.lamps.castShadow = s.lamps.receiveShadow = true;
      s.lamps.material.side = DoubleSide;
      container.add(s.group);
    }
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    const generic = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
    patchFacades(generic);
    const at = (n: number) => { for (const s of sites) s.setNight(n); b.sync(); return shown(b.group); };
    // Day: still one draw, on a material with no facade hook (no glow loop per vertex), otherwise the same.
    const day = at(0);
    expect(day).toHaveLength(1);
    const mesh = day[0], plain = mesh.material as MeshLambertMaterial;
    expect(plain.userData.facade).toBeUndefined();
    expect(plain.customProgramCacheKey()).not.toBe(generic.customProgramCacheKey());
    // City clips whatever material a mounted mesh holds (clipScenery): the twin swapped in later keeps it.
    const planes = [new Plane(new Vector3(1, 0, 0), 5)];
    plain.clippingPlanes = planes;
    plain.clipShadows = true;
    // A dim dusk value glows, so the facade program takes over in the same draw.
    expect(at(0.01)).toEqual([mesh]);
    const lit = mesh.material as MeshLambertMaterial;
    expect(lit).not.toBe(plain);
    expect(lit.customProgramCacheKey()).toBe(generic.customProgramCacheKey());
    // Every setting the day draw shades with matches the lit one's.
    for (const k of ['type', 'side', 'vertexColors', 'flatShading', 'fog', 'transparent', 'opacity', 'emissiveIntensity', 'clippingPlanes', 'clipShadows', 'clipIntersection'] as const) expect(plain[k]).toEqual(lit[k]);
    expect(lit.clippingPlanes).toBe(planes);
    expect(plain.emissive.equals(lit.emissive) && plain.color.equals(lit.color)).toBe(true);
    // Back to day: the plain twin again, and disposing the one attached disposes both.
    expect((at(0)[0].material)).toBe(plain);
    let litDisposed = 0, plainDisposed = 0;
    lit.addEventListener('dispose', () => { litDisposed++; });
    plain.addEventListener('dispose', () => { plainDisposed++; });
    plain.dispose();
    expect([plainDisposed, litDisposed]).toEqual([1, 1]);
  });

  it('keeps the night runs when any member has a setting the facade program lacks (alpha hashing)', () => {
    const container = new Group();
    const sites = [landmark(10), landmark(30, '#e4d3a2', 0.5)];
    for (const s of sites) {
      s.lamps.castShadow = s.lamps.receiveShadow = true;
      s.lamps.material.side = DoubleSide;
      container.add(s.group);
    }
    // Not the first run in the class (runs sort dimmest light first), so only a per-member check sees it.
    (sites[0].lamps.material as MeshLambertMaterial & { alphaHash: boolean }).alphaHash = true;
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    expect(b.stats.litWalls).toBe(0);
    for (const s of sites) s.setNight(1);
    b.sync();
    expect(shown(b.group).some(m => (m.material as MeshLambertMaterial & { alphaHash: boolean }).alphaHash)).toBe(true);
  });

  it('falls back to night runs when a group has more runs than one draw can carry', () => {
    const container = new Group();
    const sites = Array.from({ length: FACADE_GLOW_RUNS + 1 }, (_, i) => landmark(10 + i * 20, `#${(0x101010 + i * 0x0a0805).toString(16)}`, 0.6, 20));
    for (const s of sites) {
      s.lamps.castShadow = s.lamps.receiveShadow = true;
      s.lamps.material.side = DoubleSide;
      container.add(s.group);
    }
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    expect(b.stats.litWalls).toBe(0);
    expect(b.stats.litWallOverflow).toBe(1);
    for (const s of sites) s.setNight(1);
    b.sync();
    expect(shown(b.group).length).toBeGreaterThan(FACADE_GLOW_RUNS);
  });

  it('bakes a constant material colour into the vertices and keeps a colour that changes at night', () => {
    const container = new Group();
    const a = landmark(10), c = landmark(20);
    a.body.material.color.set('#ff0000');
    for (const s of [a, c]) container.add(s.group);
    const b = batchLandmarks([a, c], container);
    const body = meshes(b.group).find(m => m.castShadow)!;
    expect((body.material as MeshLambertMaterial).color.getHex()).toBe(0xffffff);
    // Stored as normalised bytes.
    expect(body.geometry.attributes.color.array).toBeInstanceOf(Uint8Array);
    expect(body.geometry.attributes.color.normalized).toBe(true);
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
    // The dev report names them, with the reason.
    flood.name = 'floodlight';
    c.body.name = 'hooked body';
    const report = landmarkBatchReport();
    expect(report.some(r => r.why === 'changes visibility')).toBe(true);
    expect(report.some(r => r.why === 'hooked')).toBe(true);
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

  it('reverses the winding of a mirrored mesh, so its faces still front the way its normals point', () => {
    const container = new Group();
    const a = landmark(10), c = landmark(20);
    c.group.scale.z = -1;
    for (const s of [a, c]) container.add(s.group);
    const b = batchLandmarks([a, c], container);
    const body = meshes(b.group).find(m => m.castShadow)!;
    const p = body.geometry.attributes.position, n = body.geometry.attributes.normal;
    const v = [0, 1, 2].map(() => new Vector3()), face = new Vector3(), normal = new Vector3();
    let agree = 0;
    for (let t = 0; t < p.count; t += 3) {
      v.forEach((x, k) => x.fromBufferAttribute(p, t + k));
      face.subVectors(v[1], v[0]).cross(new Vector3().subVectors(v[2], v[0]));
      if (face.dot(normal.fromBufferAttribute(n, t)) > 0) agree++;
    }
    expect(agree).toBe(p.count / 3);
  });

  it('draws a far cell with its panes baked into the walls by day, in full up close and at night', async () => {
    // A 40 x 40 m facade with 1 x 2 m panes 7 cm proud of it, as a body, per landmark.
    const facade = () => {
      const P: number[] = [];
      const quad = (x0: number, y0: number, x1: number, y1: number, z: number) =>
        P.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y0, z, x1, y1, z, x0, y1, z);
      quad(0, 0, 40, 40, 0);
      for (let x = 1; x < 39; x += 3) for (let y = 1; y < 38; y += 4) quad(x, y, x + 1, y + 2, 0.07);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(P, 3));
      g.setAttribute('color', new Float32BufferAttribute(P.map(() => 0.5), 3));
      g.computeVertexNormals();
      return g;
    };
    const container = new Group();
    const sites = [10, 60].map(x => {
      const s = landmark(x);
      s.body.geometry = facade();
      return s;
    });
    for (const s of sites) container.add(s.group);
    // As landmarkShell builds them since #484: lit panes share the body's shadow flags.
    for (const s of sites) {
      s.lamps.castShadow = s.lamps.receiveShadow = true;
      s.lamps.material.side = DoubleSide;
    }
    const b = batchLandmarks(sites, container, { lod: { farM: 700, nearM: 600, minArea: 4 }, syncFar: true });
    container.add(b.group);
    container.updateMatrixWorld(true);
    const cell = [...b.cells.values()][0];
    // The far version arrives after batching (from a worker in the browser).
    expect(b.group.getObjectByName('landmark batch (far)')).toBeUndefined();
    await b.farReady;
    const far = b.group.getObjectByName('landmark batch (far)') as Mesh;
    const farTris = far.geometry.index!.count / 3;
    // Walls and lit panes share one draw, day and night (lit walls); that is the full version a far cell swaps out.
    const near = meshes(b.group).find(m => m.name === 'landmark batch (lit walls)')!;
    // Two walls (four triangles) stand in for ~500 pane triangles; the lamp cubes sit on no wall and stay.
    expect(farTris).toBeLessThan(30);
    expect(farTris).toBeGreaterThanOrEqual(4);
    // The full version keeps casting; the far one does not.
    expect(far.castShadow).toBe(false);
    // One buffer: the far index reads the class's (grown) buffer, as the full draws do.
    expect(far.geometry.attributes.position).toBe(near.geometry.attributes.position);
    // By day nothing glows: both versions draw with the full version's plain twin, not the facade program.
    expect(far.material).toBe(near.material);
    expect((far.material as MeshLambertMaterial).userData.facade).toBeUndefined();
    const camera = new PerspectiveCamera();
    const at = (d: number) => { camera.position.set(30, 10, 20 + d); camera.updateMatrixWorld(); cell.update(camera); };
    at(2000);
    expect(far.visible).toBe(true);
    // Hidden from the view only: still visible (so it casts), but its view draw is skipped.
    expect(near.visible).toBe(true);
    near.onBeforeRender.call(near, ...([] as unknown as Parameters<typeof near.onBeforeRender>));
    expect(near.geometry.drawRange.count).toBe(-1);
    near.onAfterRender.call(near, ...([] as unknown as Parameters<typeof near.onAfterRender>));
    expect(near.geometry.drawRange.count).toBeGreaterThan(0);
    // Hysteresis: 650 m is still far, 550 m is near.
    at(650);
    expect(far.visible).toBe(true);
    at(550);
    expect(far.visible).toBe(false);
    expect(near.onBeforeRender).toBe(Mesh.prototype.onBeforeRender);
    // A streaming ring can pin a level.
    b.setCellDetail(`${cell.cell}`, 'lod');
    at(550);
    expect(far.visible).toBe(true);
    // At night the lit panes, which share the walls' draw, change, so the cell draws in full: the
    // same one draw, with the panes' light in its glow ranges (the far walls carry no panes).
    for (const s of sites) s.setNight(1);
    b.sync();
    expect(far.visible).toBe(false);
    expect(near.onBeforeRender).toBe(Mesh.prototype.onBeforeRender);
    expect(shown(b.group)).toEqual([near]);
    expect(far.material).toBe(near.material);
    const glow = (near.material as MeshLambertMaterial).userData.facade.glow;
    expect(glow.count.value).toBe(2);
    expect(Math.max(...glow.rgb.value)).toBeGreaterThan(0);
  });

  it('builds the same batches as a sliced generator as all at once', () => {
    const make = () => {
      const container = new Group();
      const sites = [10, 30, 50, 1100].map(x => landmark(x, x === 30 ? '#e4d3a2' : '#f2d5a5'));
      for (const s of sites) container.add(s.group);
      return { container, sites };
    };
    const a = make(), b = make();
    const whole = batchLandmarks(a.sites, a.container);
    const steps = buildLandmarkBatches(b.sites, b.container);
    const labels: (string | void)[] = [];
    let step = steps.next();
    while (!step.done) { labels.push(step.value); step = steps.next(); }
    const sliced = step.value;
    expect(labels.filter(l => l === 'landmark probe')).toHaveLength(4);
    expect(labels).toContain('landmark cell');
    const shape = (g: Group) => meshes(g).map(m => [m.name, m.geometry.drawRange.start, m.geometry.drawRange.count, m.visible,
      Array.from(m.geometry.attributes.position.array as Float32Array).reduce((x, y) => x + y, 0).toFixed(3)]);
    expect(shape(sliced.group)).toEqual(shape(whole.group));
    expect(sliced.stats.merged).toBe(whole.stats.merged);
  });

  it('packs positions as Int16 and normals as Int8 within 1/32767 of the cell, through the mesh transform', () => {
    const container = new Group();
    const sites = [10, 300].map(x => landmark(x));
    for (const s of sites) container.add(s.group);
    const before = sites[1].body.localToWorld(new Vector3().fromBufferAttribute(sites[1].body.geometry.attributes.position, 5));
    const b = batchLandmarks(sites, container);
    container.add(b.group);
    container.updateMatrixWorld(true);
    const body = meshes(b.group).find(m => m.castShadow)!;
    const p = body.geometry.attributes.position, n = body.geometry.attributes.normal;
    expect(p.array).toBeInstanceOf(Int16Array);
    expect(n.array).toBeInstanceOf(Int8Array);
    const step = body.scale.x / 32767;
    const near = Math.min(...Array.from({ length: p.count }, (_, i) => body.localToWorld(new Vector3().fromBufferAttribute(p, i)).distanceTo(before)));
    expect(near).toBeLessThan(step * 2);
    // Uniform scale, so normals come back as stored.
    expect(body.scale.x).toBe(body.scale.y);
    for (let i = 0; i < n.count; i++) expect(new Vector3().fromBufferAttribute(n, i).length()).toBeCloseTo(1, 1);
  });
});
