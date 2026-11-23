import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MeshLambertMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { Builder } from '../vignette/geom';
import { localLandmarkShell } from '../city/landmark-shell';
import type { VBuilding } from '../vignette/world';
import { BUILDING_TEXTURE_BUDGET, bucketBytes, LIBRARY_TEXTURE_BUDGET, TEXTURE_SOURCES } from './budget';
import { applySurfaces, catalogue, patchSurfaceShader, SURFACE_GLSL, SURFACE_KINDS, SurfacePainter, surfaces } from '.';

const SRC = join(__dirname, '..');
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}
const MAKES_TEXTURE = /new (THREE\.)?(DataTexture|CanvasTexture|CompressedTexture|Data3DTexture|DataArrayTexture|VideoTexture|DepthTexture|FramebufferTexture|CubeTexture|Texture|WebGL(Cube|3D|Array)?RenderTarget)\(|TextureLoader|KTX2Loader/;

describe('texture budget', () => {
  const makers = sources(SRC).filter(path => MAKES_TEXTURE.test(readFileSync(path, 'utf8'))).map(path => relative(SRC, path));

  it('lists every file that constructs a texture', () => {
    expect(makers.filter(path => !TEXTURE_SOURCES[path])).toEqual([]);
  });

  it('has no stale entries', () => {
    expect(Object.keys(TEXTURE_SOURCES).filter(path => !makers.includes(path))).toEqual([]);
  });

  it('keeps the library within its budget (it is procedural: 0 bytes)', () => {
    expect(makers.filter(path => path.startsWith('materials/')).every(path => TEXTURE_SOURCES[path].bucket === 'library')).toBe(true);
    expect(bucketBytes('library')).toBeLessThanOrEqual(LIBRARY_TEXTURE_BUDGET);
  });

  it('keeps landmark textures within the building budget', () => {
    expect(bucketBytes('building')).toBeLessThanOrEqual(BUILDING_TEXTURE_BUDGET);
  });
});

describe('library', () => {
  it('gives every catalogue material a known kind and a hex colour', () => {
    for (const s of catalogue()) {
      expect(SURFACE_KINDS[s.data[0]]).toBe(s.kind);
      expect(s.kind).not.toBe('none');
      expect(s.colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(s.data.every(Number.isFinite)).toBe(true);
    }
  });

  it('covers every kind the shader draws', () => {
    expect(new Set(catalogue().map(s => s.kind))).toEqual(new Set(SURFACE_KINDS.slice(1)));
  });

  it('draws painted brick with joints in its own colour and half the contrast', () => {
    expect(surfaces.brick({ colour: 'painted' }).data).toEqual([1, 0, .5, -1]);
    expect(surfaces.brick({ bond: 'flemish' }).data).toEqual([1, 1, 1, 1]);
  });
});

describe('SurfacePainter', () => {
  it('tags painted vertices, leaves the rest flat, and lets the innermost paint win', () => {
    const b = new Builder(), painter = new SurfacePainter(), copper = surfaces.agedCopper(), stucco = surfaces.stucco();
    b.tri([0, 0, 0], [1, 0, 0], [0, 1, 0], '#fff');
    painter.paint(b, stucco, () => {
      b.tri([0, 0, 0], [1, 0, 0], [0, 1, 0], '#fff');
      painter.paint(b, copper, () => b.tri([0, 0, 0], [1, 0, 0], [0, 1, 0], '#fff'));
    });
    const a = painter.attribute(b.pos.length / 3);
    const kindAt = (i: number) => a.getX(i);
    expect([0, 3, 6].map(kindAt)).toEqual([0, stucco.data[0], copper.data[0]]);
    expect(painter.painted).toBe(true);
  });
});

describe('shader patch', () => {
  const lambert = () => ({ vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' });

  it('compiles the fine detail out of the low tier', () => {
    const high = lambert(), low = lambert();
    patchSurfaceShader(high, 'high');
    patchSurfaceShader(low, 'low');
    expect(high.fragmentShader).not.toContain('#define SURFACE_LOW');
    expect(low.fragmentShader).toContain('#define SURFACE_LOW');
    expect(high.fragmentShader).toContain('surfaceColour(vSurface');
    expect(high.vertexShader).toContain('vSurfacePos = position');
  });

  it('keeps an existing hook and keys programs by tier', () => {
    const m = new MeshLambertMaterial();
    let ran = 0;
    m.onBeforeCompile = () => { ran++; };
    m.customProgramCacheKey = () => 'mine';
    applySurfaces(m, { tier: 'low' });
    const shader = { ...lambert(), uniforms: {} } as never;
    m.onBeforeCompile(shader, null as never);
    expect(ran).toBe(1);
    expect(m.customProgramCacheKey()).toBe('mine|surfaces-low');
  });

  it('takes no derivatives inside the detail branches', () => {
    // fwidth is undefined in non-uniform control flow; only the frame footprint may use it.
    expect(SURFACE_GLSL.match(/fwidth\(/g)).toHaveLength(1);
  });
});

describe('landmark shells', () => {
  const site: VBuilding = { id: 'x', rings: [[[-10, -10], [10, -10], [10, 10], [-10, 10]]] } as unknown as VBuilding;
  const shell = () => localLandmarkShell([site], site, 'test', [0, 0], [1, 0], [[0, 0]], 0, 0)!;

  it('leave unpainted landmarks exactly as before', () => {
    const s = shell();
    s.prism(s.ring, 0, 10, '#a65e45', '#7f7b74');
    const mesh = s.finish().group.children[0] as unknown as { geometry: { attributes: Record<string, unknown> }; material: MeshLambertMaterial };
    expect(mesh.geometry.attributes.aSurface).toBeUndefined();
    expect(mesh.material.onBeforeCompile).toBe(MeshLambertMaterial.prototype.onBeforeCompile);
  });

  it('paint walls and roofs separately through prism', () => {
    const s = shell(), brick = surfaces.brick();
    s.prism(s.ring, 0, 10, '#a65e45', '#7f7b74', { wall: brick });
    const mesh = s.finish().group.children[0] as unknown as { geometry: { attributes: { aSurface: { getX(i: number): number; count: number } } } };
    const a = mesh.geometry.attributes.aSurface;
    expect(a.getX(0)).toBe(brick.data[0]); // first wall vertex
    expect(a.getX(a.count - 1)).toBe(0); // last roof vertex stays flat
  });

  it('keep window glass flat inside a painted wall', () => {
    const s = shell(), brick = surfaces.brick();
    s.paint(brick, () => {
      s.prism(s.ring, 0, 10, '#a65e45', '#7f7b74');
      s.facade([-10, -10], [10, -10], 1, 9, 3, 2.5, .5, .6, ['#334455'], 0);
    });
    const mesh = s.finish().group.children[0] as unknown as { geometry: { attributes: { aSurface: { getX(i: number): number; count: number } } } };
    const a = mesh.geometry.attributes.aSurface;
    expect(a.getX(0)).toBe(brick.data[0]);
    expect(a.getX(a.count - 1)).toBe(0); // the last window pane
  });
});
