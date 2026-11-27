import { DoubleSide, MeshLambertMaterial, ShaderLib, UniformsUtils, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { FACADE_GLOW_RUNS, facadeGlow, patchFacades } from './facade';

/** Runs a facade material's hook on three's own Lambert sources, as the renderer would. */
function compiled(o: Parameters<typeof patchFacades>[2] = {}) {
  const mat = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
  patchFacades(mat, { value: 1 }, o);
  const sh = { vertexShader: ShaderLib.lambert.vertexShader, fragmentShader: ShaderLib.lambert.fragmentShader, uniforms: UniformsUtils.clone(ShaderLib.lambert.uniforms) } as unknown as WebGLProgramParametersWithUniforms;
  mat.onBeforeCompile(sh, {} as WebGLRenderer);
  return { mat, sh };
}

describe('facade program', () => {
  it('adds each vertex range\'s glow to the emitted light', () => {
    const glow = facadeGlow();
    const { sh } = compiled({ plain: true, glow });
    // Vertex: the range lookup by gl_VertexID, bounded by the table size, into vGlow.
    expect(sh.vertexShader).toContain(`uniform ivec2 uGlowRange[${FACADE_GLOW_RUNS}]`);
    expect(sh.vertexShader).toMatch(/gl_VertexID >= uGlowRange\[i\]\.x && gl_VertexID < uGlowRange\[i\]\.y\) \{ vGlow = uGlowRgb\[i\]/);
    // Fragment: vGlow reaches the emitted light, after the emissive map like a material's emissive.
    const frag = sh.fragmentShader;
    const at = frag.indexOf('#include <emissivemap_fragment>');
    expect(at).toBeGreaterThan(0);
    expect(frag.slice(at)).toMatch(/totalEmissiveRadiance \+=[^;]*\+ vGlow;/);
    expect(frag).toContain('varying vec3 vGlow;');
    // The material's table is the shader's uniform (sync writes it in place).
    expect(sh.uniforms.uGlowRgb).toBe(glow.rgb);
    expect(sh.uniforms.uGlowCount).toBe(glow.count);
    expect(sh.uniforms.uFacadePlain.value).toBe(1);
  });

  it('keeps procedural windows on for generic walls and one cache key for every caller', () => {
    const generic = compiled(), batch = compiled({ plain: true, glow: facadeGlow() });
    expect(generic.sh.uniforms.uFacadePlain.value).toBe(0);
    expect(generic.sh.uniforms.uGlowCount.value).toBe(0);
    expect(generic.sh.vertexShader).toContain('vStyle = uFacadePlain > 0.5 ? -1.0 : aStyle;');
    expect(batch.mat.customProgramCacheKey()).toBe(generic.mat.customProgramCacheKey());
    expect(batch.sh.vertexShader).toBe(generic.sh.vertexShader);
    expect(batch.sh.fragmentShader).toBe(generic.sh.fragmentShader);
  });
});
