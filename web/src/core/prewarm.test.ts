import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createPrewarmer } from './prewarm';

/** A renderer double: render() "compiles" each drawable material on the camera's layer, as three.js
 * does on a first draw, except for objects listed in `refuse` (a draw that can't compile them). */
function fakeRenderer(refuse = new Set<THREE.Object3D>()) {
  const props = new Map<THREE.Material, { currentProgram?: object }>();
  let renders = 0;
  const renderer = {
    properties: { get: (m: THREE.Material) => { if (!props.has(m)) props.set(m, {}); return props.get(m)!; } },
    shadowMap: { autoUpdate: true, needsUpdate: false },
    getRenderTarget: () => null,
    setRenderTarget: () => {},
    render(scene: THREE.Scene, cam: THREE.Camera) {
      renders++;
      scene.traverseVisible(o => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (!m || !m.visible || refuse.has(o) || !o.layers.test(cam.layers)) return;
        renderer.properties.get(m).currentProgram = {};
      });
    },
  };
  return { renderer: renderer as unknown as THREE.WebGLRenderer, renders: () => renders, compiled: (m: THREE.Material) => !!props.get(m)?.currentProgram };
}

const mesh = (m = new THREE.MeshBasicMaterial()) => new THREE.Mesh(new THREE.BufferGeometry(), m);

describe('createPrewarmer', () => {
  it('draws a hidden, never-drawn object once and restores it', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const group = new THREE.Group();
    group.visible = false;
    const lamp = mesh();
    group.add(lamp);
    scene.add(group);
    const r = fakeRenderer();
    const p = createPrewarmer(r.renderer, scene, camera, THREE.HalfFloatType);
    p.scan();
    expect(p.pending).toBe(1);
    expect(p.step(1)).toBe(1);
    expect(r.compiled(lamp.material)).toBe(true);
    expect(group.visible).toBe(false);
    expect(lamp.frustumCulled).toBe(true);
    expect(lamp.layers.isEnabled(31)).toBe(false);
  });

  it('never retries an object its draw could not compile, so rescans go quiet', () => {
    const scene = new THREE.Scene();
    const stubborn = mesh();
    scene.add(stubborn);
    const r = fakeRenderer(new Set([stubborn]));
    const p = createPrewarmer(r.renderer, scene, new THREE.PerspectiveCamera(), THREE.HalfFloatType);
    for (let i = 0; i < 5; i++) { p.scan(); while (p.step(1)); }
    expect(r.renders()).toBe(1);
    expect(p.pending).toBe(0);
  });

  it('skips materials that are switched off, and gives up on a material after two objects', () => {
    const scene = new THREE.Scene();
    const off = new THREE.MeshBasicMaterial({ visible: false });
    scene.add(mesh(off));
    const shared = new THREE.MeshBasicMaterial();
    const many = Array.from({ length: 6 }, () => mesh(shared));
    for (const m of many) scene.add(m);
    const r = fakeRenderer(new Set(many));
    const p = createPrewarmer(r.renderer, scene, new THREE.PerspectiveCamera(), THREE.HalfFloatType);
    for (let i = 0; i < 6; i++) { p.scan(); while (p.step(1)); }
    expect(r.renders()).toBe(2);
  });

  it('draws a batch of never-drawn objects in one scratch render', () => {
    const scene = new THREE.Scene();
    const objs = [mesh(), mesh(), mesh()];
    for (const o of objs) scene.add(o);
    const r = fakeRenderer();
    const p = createPrewarmer(r.renderer, scene, new THREE.PerspectiveCamera(), THREE.HalfFloatType);
    p.scan();
    expect(p.step(4)).toBe(3);
    expect(r.renders()).toBe(1);
    expect(objs.every(o => r.compiled(o.material))).toBe(true);
  });

  it('uploads a hidden group before it shows, ahead of the compile backlog, and resolves when done', async () => {
    const scene = new THREE.Scene();
    const backlog = mesh();
    scene.add(backlog);
    const area = new THREE.Group();
    area.visible = false;
    const parts = [mesh(), mesh(), mesh()];
    for (const m of parts) area.add(m);
    scene.add(area);
    const r = fakeRenderer();
    // Already compiled: upload draws them anyway (the point is the buffers).
    const props = (r.renderer as unknown as { properties: { get(m: THREE.Material): { currentProgram?: object } } }).properties;
    for (const m of parts) props.get(m.material as THREE.Material).currentProgram = {};
    const p = createPrewarmer(r.renderer, scene, new THREE.PerspectiveCamera(), THREE.HalfFloatType);
    p.scan();
    let done = false;
    const up = p.upload(area).then(() => { done = true; });
    expect(p.step(2)).toBe(2);
    expect(r.compiled(backlog.material)).toBe(false);
    await Promise.resolve();
    expect(done).toBe(false);
    expect(p.step(2)).toBe(2); // the last part, then the backlog
    await up;
    expect(done).toBe(true);
    expect(r.compiled(backlog.material)).toBe(true);
    expect(area.visible).toBe(false);
  });

  it('refuses a group that is not in the scene', async () => {
    const scene = new THREE.Scene();
    const p = createPrewarmer(fakeRenderer().renderer, scene, new THREE.PerspectiveCamera(), THREE.HalfFloatType);
    await expect(p.upload(new THREE.Group())).rejects.toThrow(/add the group to the scene/);
  });
});
