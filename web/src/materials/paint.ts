import { Float16BufferAttribute, type Material, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { SURFACE_GLSL } from './glsl';
import type { Surface } from './library';

export type SurfaceTier = 'high' | 'low';

/**
 * Defaults for every material the library patches. City sets them once from its quality and
 * the `?surfaces=off` switch, before landmarks build. applySurfaces also takes a tier per
 * material, so one page can show both tiers side by side.
 */
export const surfaceDefaults: { tier: SurfaceTier; enabled: boolean } = { tier: 'high', enabled: true };

/** Remembers which vertices of one builder were drawn with which surface. */
export class SurfacePainter {
  private ranges: { start: number; end: number; surface: Surface }[] = [];

  constructor(private readonly builder: { pos: number[] }) {}

  /** Everything `draw` adds to this painter's builder gets `surface`. Nested paints: the innermost wins. */
  paint<T>(surface: Surface, draw: () => T): T {
    const start = this.builder.pos.length / 3, result = draw();
    this.ranges.push({ start, end: this.builder.pos.length / 3, surface });
    return result;
  }

  /** True once any vertex has a real pattern (FLAT alone does not count). */
  get painted() { return this.ranges.some(r => r.end > r.start && r.surface.data[0] !== 0); }

  /** The `aSurface` attribute for the builder's geometry; unpainted vertices stay 0 (flat). */
  attribute(count = this.builder.pos.length / 3) {
    // Half floats: 8 bytes a vertex. Kinds, bonds and sizes in metres all fit comfortably.
    // The setters convert to half-float bits; unset vertices stay 0 (flat).
    const attribute = new Float16BufferAttribute(new Uint16Array(count * 4), 4), done = new Uint8Array(count);
    for (const { start, end, surface } of this.ranges)
      for (let i = start; i < Math.min(end, count); i++)
        if (!done[i]) { attribute.setXYZW(i, ...surface.data); done[i] = 1; }
    return attribute;
  }
}

/**
 * Adds the library to a vertex-coloured Lambert or Phong material whose geometry carries
 * `aSurface`. Patterns use model-space position and normal, so they follow the building's own
 * walls. Any existing onBeforeCompile and cache key are kept and run first. Code that sets its
 * own hook on the material afterwards must chain the same way, or the surfaces disappear.
 */
export function applySurfaces(material: Material, o: { tier?: SurfaceTier } = {}) {
  const tier = o.tier ?? surfaceDefaults.tier;
  if (material.userData.surfaces) return material; // already patched: a second patch would redeclare the GLSL
  material.userData.surfaces = tier;
  const before = material.onBeforeCompile.bind(material);
  // Read the key now: three's default key is the hook's source, which is about to become ours.
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => {
    before(shader, renderer);
    patchSurfaceShader(shader, tier);
  };
  material.customProgramCacheKey = () => `${key}|surfaces-${tier}`;
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
