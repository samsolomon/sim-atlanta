import { Float32BufferAttribute, type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { SURFACE_GLSL } from './glsl';
import type { Surface } from './library';

export type SurfaceTier = 'high' | 'low';

/**
 * Defaults for every material the library patches. City sets them once from its quality and
 * the `?surfaces=off` switch (FLAT), before landmarks build; the model lab overrides the tier
 * per material instead, so it can show both tiers side by side.
 */
export const surfaceDefaults: { tier: SurfaceTier; enabled: boolean } = { tier: 'high', enabled: true };

/** Remembers which vertices of a builder were drawn with which surface. */
export class SurfacePainter {
  private ranges: { start: number; end: number; surface: Surface }[] = [];

  /** Everything `draw` adds to `builder` gets `surface`. Nested paints: the innermost wins. */
  paint<T>(builder: { pos: number[] }, surface: Surface, draw: () => T): T {
    const start = builder.pos.length / 3, result = draw();
    this.ranges.push({ start, end: builder.pos.length / 3, surface });
    return result;
  }

  get painted() { return this.ranges.some(r => r.end > r.start); }

  /** The `aSurface` attribute for a geometry of `count` vertices; unpainted vertices stay 0 (flat). */
  attribute(count: number) {
    const data = new Float32Array(count * 4), done = new Uint8Array(count);
    for (const { start, end, surface } of this.ranges)
      for (let i = start; i < Math.min(end, count); i++) if (!done[i]) { data.set(surface.data, i * 4); done[i] = 1; }
    return new Float32BufferAttribute(data, 4);
  }
}

/**
 * Adds the library to a vertex-coloured Lambert or Phong material whose geometry carries
 * `aSurface`. Patterns use model-space position and normal, so they follow the building's own
 * walls. Any existing onBeforeCompile and cache key are kept and run first.
 */
export function applySurfaces(material: Material, o: { tier?: SurfaceTier } = {}) {
  const tier = o.tier ?? surfaceDefaults.tier;
  const before = material.onBeforeCompile.bind(material);
  const key = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before(shader, renderer);
    patchSurfaceShader(shader, tier);
  };
  material.customProgramCacheKey = () => `${key()}|surfaces-${tier}`;
  material.needsUpdate = true;
  return material;
}

/** The text edit behind applySurfaces, exported for tests. */
export function patchSurfaceShader(shader: { vertexShader: string; fragmentShader: string }, tier: SurfaceTier) {
  const define = tier === 'low' ? '#define SURFACE_LOW\n' : '';
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec4 aSurface;\nvarying vec4 vSurface;\nvarying vec3 vSurfacePos;\nvarying vec3 vSurfaceNormal;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurface = aSurface; vSurfacePos = position; vSurfaceNormal = normal;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${define}varying vec4 vSurface;\nvarying vec3 vSurfacePos;\nvarying vec3 vSurfaceNormal;\n${SURFACE_GLSL}`)
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = surfaceColour(vSurface, vSurfacePos, normalize(vSurfaceNormal), diffuseColor.rgb);');
}
