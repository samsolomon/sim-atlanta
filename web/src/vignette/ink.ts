/**
 * Ink outlines: a screen-space edge pass over the scene's depth and colour. Silhouettes come
 * from depth jumps, creases (roof/wall, kerb/road) from colour steps. Lines fade with distance
 * so far-away detail doesn't turn to noise. One pass after the scene render, so every object
 * shares one consistent line, the "outline once, after compositing" rule.
 *
 * Foliage can opt out of interior lines. A foliage material marked with `inkFoliage` writes a
 * mode code into the colour buffer's alpha (opaque surfaces write 1). Between two foliage
 * pixels the pass draws no line, so cards and clumps inside a crown don't each get outlined.
 * Where foliage meets anything else, it draws a line only if the other side stays clear a few
 * pixels out: a real silhouette against sky, ground or a building, not a small gap between
 * leaves. Modes: 1 silhouette only, ink colour; 2 silhouette only, warm foliage ink;
 * 3 warm foliage ink, interior lines kept close up and faded out by `uInteriorM`.
 */
import * as THREE from 'three';

export function inkShader() {
  return {
    name: 'Ink',
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      tDepth: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uNear: { value: 20 },
      uFar: { value: 12000 },
      uStrength: { value: 0.75 },
      uInk: { value: new THREE.Color('#1c1820') },
      uWidth: { value: 1.0 },
      uFoliageInk: { value: new THREE.Color('#5a3a12') },
      uInteriorM: { value: 40 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform sampler2D tDiffuse, tDepth;
      uniform vec2 uTexel;
      uniform float uNear, uFar, uStrength, uWidth;
      uniform vec3 uInk, uFoliageInk;
      uniform float uInteriorM;
      // Foliage mode from alpha: 0 none, 1–3 (see inkFoliage). Opaque surfaces write 1.0.
      float mode(vec2 uv) { float a = texture2D(tDiffuse, uv).a; return a > 0.9 ? 0.0 : floor(a * 5.0 + 0.5); }
      varying vec2 vUv;
      float lin(vec2 uv) {
        float z = texture2D(tDepth, uv).x;
        return perspectiveDepthToViewZ(z, uNear, uFar) * -1.0;
      }
      float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
      void main() {
        vec4 col = texture2D(tDiffuse, vUv);
        if (uStrength < 0.01) { gl_FragColor = vec4(col.rgb, 1.0); return; }
        vec2 o = uTexel * uWidth;
        float d = lin(vUv);
        float dl = lin(vUv - vec2(o.x, 0.0)), dr = lin(vUv + vec2(o.x, 0.0));
        float dd = lin(vUv - vec2(0.0, o.y)), du = lin(vUv + vec2(0.0, o.y));
        // Relative depth jump; the second difference ignores smooth slopes (ground, roofs).
        float jump = max(abs(dl + dr - 2.0 * d), abs(du + dd - 2.0 * d)) / d;
        float edgeD = smoothstep(0.0015, 0.008, jump);
        float c = lum(col.rgb);
        float cl = lum(texture2D(tDiffuse, vUv - vec2(o.x, 0.0)).rgb), cr = lum(texture2D(tDiffuse, vUv + vec2(o.x, 0.0)).rgb);
        float cd = lum(texture2D(tDiffuse, vUv - vec2(0.0, o.y)).rgb), cu = lum(texture2D(tDiffuse, vUv + vec2(0.0, o.y)).rgb);
        float edgeC = smoothstep(0.035, 0.11, max(abs(cl - cr), abs(cu - cd)));
        // Fade lines out with distance so the far side doesn't fill with noise.
        float fade = 1.0 - smoothstep(1400.0, 4200.0, d);
        // Mostly silhouettes (depth); colour creases only faintly, so shapes stay clean inside.
        float line = clamp(max(edgeD, edgeC * 0.22), 0.0, 1.0) * fade * uStrength;
        vec3 ink = uInk;
        float m = mode(vUv);
        float ml = mode(vUv - vec2(o.x, 0.0)), mr = mode(vUv + vec2(o.x, 0.0));
        float md = mode(vUv - vec2(0.0, o.y)), mu = mode(vUv + vec2(0.0, o.y));
        float fm = max(max(m, max(ml, mr)), max(md, mu));
        if (fm > 0.5) {
          // Foliage in the 3×3 cross: decide whether this is a crown silhouette or an interior line.
          bool inside = m > 0.5 && ml > 0.5 && mr > 0.5 && md > 0.5 && mu > 0.5;
          float keep;
          if (inside) keep = fm > 2.5 ? 1.0 - smoothstep(uInteriorM * 0.4, uInteriorM, d) : 0.0;
          else {
            // Silhouette only if the non-foliage side stays clear 4 and 8 pixels further out (and,
            // from the outside, the crown stays solid): gaps between leaves don't qualify.
            vec2 o4 = o * 4.0, o8 = o * 8.0;
            float clear = 0.0;
            float want = m > 0.5 ? 0.0 : 1.0; // what the far side must be
            #define FAR(dir) (abs(step(0.5, mode(vUv + dir * o4)) - want) < 0.5 && abs(step(0.5, mode(vUv + dir * o8)) - want) < 0.5)
            if (abs(step(0.5, ml) - want) < 0.5 && FAR(vec2(-1.0, 0.0))) clear = 1.0;
            if (abs(step(0.5, mr) - want) < 0.5 && FAR(vec2(1.0, 0.0))) clear = 1.0;
            if (abs(step(0.5, md) - want) < 0.5 && FAR(vec2(0.0, -1.0))) clear = 1.0;
            if (abs(step(0.5, mu) - want) < 0.5 && FAR(vec2(0.0, 1.0))) clear = 1.0;
            keep = clear;
          }
          line *= keep;
          if (fm > 1.5) { ink = uFoliageInk; line *= 0.75; }
        }
        gl_FragColor = vec4(mix(col.rgb, ink, line), 1.0);
      }`,
  };
}

/** Foliage ink modes (see the shader notes above). */
export type InkFoliageMode = 1 | 2 | 3;
/**
 * Mark a foliage material so the ink pass outlines only its crown silhouette (any species can
 * use this). The mark rides in the colour alpha, so the material must be opaque (alphaTest is
 * fine; alpha blending is not).
 */
export function inkFoliage<M extends THREE.Material>(material: M, mode: InkFoliageMode): M {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>',
      `#include <dithering_fragment>\n gl_FragColor.a = ${(mode / 5).toFixed(2)};`);
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => (key ? key() : '') + ':inkFoliage' + mode;
  material.needsUpdate = true;
  return material;
}
