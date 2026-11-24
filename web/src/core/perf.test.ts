import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { perf, targetBytes, textureBytes } from './perf';

describe('perf', () => {
  it('measures fps and frame-time percentiles from rAF stamps', () => {
    // 60 frames at 20 ms, then one 100 ms hitch.
    let ts = 100000;
    for (let i = 0; i < 60; i++) perf.frame((ts += 20), 1, 2);
    perf.frame((ts += 100), 1, 2);
    const f = perf.fps(10000);
    expect(f.p50).toBe(20);
    expect(f.max).toBe(100);
    expect(f.fps).toBeCloseTo((60 * 1000) / (59 * 20 + 100), 0);
    expect(f.updateP50).toBe(1);
    expect(f.renderP50).toBe(2);
  });

  it('marks ready only once colour is revealed and a frame has drawn', () => {
    perf.phase('city:revealed');
    expect(perf.phases.some(p => p.name === 'ready')).toBe(false);
    perf.phase('city:first-frame');
    expect(perf.phases.filter(p => p.name === 'ready')).toHaveLength(1);
    // A second City open gets its own ready.
    perf.phase('city:open');
    perf.phase('city:first-frame');
    expect(perf.phases.filter(p => p.name === 'ready')).toHaveLength(1);
    perf.phase('city:revealed');
    expect(perf.phases.filter(p => p.name === 'ready')).toHaveLength(2);
  });

  it('estimates texture bytes with mipmaps and render targets without', () => {
    const t = new THREE.DataTexture(new Uint8Array(256 * 128 * 4), 256, 128);
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    expect(textureBytes(t)).toEqual({ gpu: Math.round(256 * 128 * 4 * 4 / 3), cpu: 256 * 128 * 4 });
    t.minFilter = THREE.LinearFilter;
    expect(textureBytes(t).gpu).toBe(256 * 128 * 4);
    const rt = new THREE.WebGLRenderTarget(100, 50, { type: THREE.HalfFloatType });
    expect(targetBytes(rt)).toBe(100 * 50 * 8 + 100 * 50 * 4);
  });
});

describe('perf.captureDraws', () => {
  it('rows sum to the frame total, and unnamed meshes in different categories stay apart', async () => {
    const scene = new THREE.Scene();
    const mesh = (tris: number, name = '') => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris * 9), 3));
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial());
      m.name = name;
      return m;
    };
    const buildings = new THREE.Group(), terrain = new THREE.Group(), transport = new THREE.Group();
    buildings.add(mesh(100), mesh(40, 'Tower'));
    terrain.add(mesh(70));
    transport.add(mesh(30));
    // A range-limited mesh: only its drawRange counts.
    const ranged = mesh(50, 'Ranged');
    ranged.geometry.setDrawRange(0, 30);
    transport.add(ranged);
    scene.add(buildings, terrain, transport);
    const roots = new Map<THREE.Object3D, 'buildings' | 'terrain' | 'transport'>([[buildings, 'buildings'], [terrain, 'terrain'], [transport, 'transport']]);
    let drawn = 0;
    const camera = new THREE.PerspectiveCamera();
    const renderer = {
      renderBufferDirect(_c: unknown, _s: unknown, g: THREE.BufferGeometry) { drawn += Math.min(g.drawRange.count, g.attributes.position.count) / 3; },
      frame() { scene.traverseVisible(o => { const m = o as THREE.Mesh; if (m.isMesh) renderer.renderBufferDirect(camera, scene, m.geometry, m.material, m, null); }); },
    };
    const raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { setTimeout(() => { cb(0); drawn = 0; renderer.frame(); }, 0); return 0; }) as typeof requestAnimationFrame;
    const ctx = { renderer: renderer as unknown as THREE.WebGLRenderer, scene, roots: () => roots, post: () => [], quality: 'low' };
    perf.attach(ctx);
    try {
      const c = await perf.captureDraws() as { total: { tri: number }; byCategory: Record<string, { tri: number }>; top: { cat: string; path: string; tri: number }[] };
      expect(c.total.tri).toBe(250);
      expect(c.total.tri).toBe(drawn);
      expect(Object.values(c.byCategory).reduce((a, b) => a + b.tri, 0)).toBe(c.total.tri);
      expect(c.byCategory).toMatchObject({ buildings: { tri: 140 }, terrain: { tri: 70 }, transport: { tri: 40 } });
      // Every row belongs to one category, and the two unnamed meshes don't merge.
      const unnamed = c.top.filter(r => r.path.includes('unnamed'));
      expect(new Set(unnamed.map(r => r.cat)).size).toBe(unnamed.length);
      expect(c.top.reduce((a, r) => a + r.tri, 0)).toBe(c.total.tri);
    } finally {
      perf.detach(ctx);
      globalThis.requestAnimationFrame = raf;
    }
  });
});
