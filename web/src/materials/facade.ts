import * as THREE from 'three';
import { SIDING_GLSL } from './siding';
import { GENERIC_V2_GLSL } from '../vignette/generic-v2-glsl';

/**
 * The shared facade program: every wall that opts in draws with one shader, so night windows cost
 * no extra draws, programs or textures. Design note: docs/facade-night.md.
 *
 * Two sources of night light ride the wall draw:
 *  - **Procedural windows** (`aStyle` walls: generic buildings, far boxes, future coarse levels):
 *    window cells come from the wall's world position, and a hash of each cell picks whether it is
 *    lit and how brightly, scaled by the City night factor. Nothing is stored per window.
 *  - **Glow ranges** (`plain` walls: landmark batches): a skin picks its lit panes when it builds
 *    them (litFacade's litHash, landmarkShell's seeded stream), and a batch draw names the vertex
 *    ranges that glow and with what emitted light (`gl_VertexID`, so nothing is stored per vertex).
 *
 * Every material made here shares one program per three.js variant: the hook below is one function
 * literal, so its cache key is the same for every caller. Change the material's other settings
 * (side, flat shading, a map) and it becomes a new program.
 */

/** Glow ranges one facade draw can carry. Each costs two vertex uniform vectors. */
export const FACADE_GLOW_RUNS = 16;

/** The per-material table of glowing vertex ranges: [start, end) and the light each emits now. */
export interface FacadeGlow {
  count: { value: number };
  /** start, end pairs: vertex ids as the draw sees them (gl_VertexID). */
  range: { value: Int32Array };
  /** Emitted radiance (linear RGB, already times intensity) added to the range's fragments. */
  rgb: { value: Float32Array };
}

export function facadeGlow(): FacadeGlow {
  return { count: { value: 0 }, range: { value: new Int32Array(FACADE_GLOW_RUNS * 2) }, rgb: { value: new Float32Array(FACADE_GLOW_RUNS * 3) } };
}

const NO_GLOW = facadeGlow();
const DAY = { value: 0 };

export interface FacadeOptions {
  /** Walls with no procedural windows (landmark batches): their style is ignored. */
  plain?: boolean;
  /** Vertex ranges that glow (landmark batches). */
  glow?: FacadeGlow;
}

/**
 * Facades: punched windows on brick, ribbon windows on stone, curtain wall on towers,
 * storefront glass at street level. Computed per fragment from world position.
 */
export function patchFacades(mat: THREE.Material, night: { value: number } = DAY, o: FacadeOptions = {}) {
  const plain = { value: o.plain ? 1 : 0 }, glow = o.glow ?? NO_GLOW;
  mat.userData.facade = { plain: !!o.plain, glow };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = night;
    sh.uniforms.uFacadePlain = plain;
    sh.uniforms.uGlowCount = glow.count;
    sh.uniforms.uGlowRange = glow.range;
    sh.uniforms.uGlowRgb = glow.rgb;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aStyle;\nattribute float aBase;\nuniform float uFacadePlain;\nuniform int uGlowCount;\nuniform ivec2 uGlowRange[${FACADE_GLOW_RUNS}];\nuniform vec3 uGlowRgb[${FACADE_GLOW_RUNS}];\nvarying float vStyle;\nvarying float vBase;\nvarying vec3 vWPos;\nvarying vec3 vWN;\nvarying vec3 vGlow;`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvStyle = uFacadePlain > 0.5 ? -1.0 : aStyle; vBase = aBase;\nvGlow = vec3(0.0);\nfor (int i = 0; i < ' + FACADE_GLOW_RUNS + '; i++) { if (i >= uGlowCount) break; if (gl_VertexID >= uGlowRange[i].x && gl_VertexID < uGlowRange[i].y) { vGlow = uGlowRgb[i]; break; } }\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying vec3 vGlow;\nvarying float vStyle;\nvarying float vBase;\nvarying vec3 vWPos;\nvarying vec3 vWN;\nfloat hh(vec2 p){vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z);}')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float litWin = vStyle < -1.5 ? 1.0 : 0.0;
        float litLevel = 0.46;
        if (vStyle > -0.5) {
          // The wall's real (per-face) normal: exact, unlike screen-space derivatives, which are
          // noisy at city-scale coordinates and made windows speckle and shimmer.
          vec3 fN = normalize(vWN);
          vec3 tng = normalize(vec3(-fN.z, 0.0, fN.x) + vec3(1e-5, 0.0, 0.0));
          float u = dot(vWPos, tng);
          float y = vWPos.y - vBase;
          vec3 glass = vec3(0.24, 0.30, 0.38);
          vec3 frame = diffuseColor.rgb * 0.82;
          float st = floor(vStyle + 0.5);
          float win = 0.0;
          // Houses at 7–10 and 12 draw their own windows; keep the shader's off even after the distance fade.
          float hasWin = 1.0;
          if (st > 19.5) {
${GENERIC_V2_GLSL}
          } else {
          if (st > 2.5) {
            // Houses (styles 3 clapboard, 4 brick, 5 stucco, 6 shingle, 11 ashlar). Fine siding lines fade
            // to their average once a course is under a couple of pixels, so walls never shimmer.
${SIDING_GLSL}
            // Masonry foundation band below the first floor.
            if (y < 0.75) diffuseColor.rgb = vec3(0.47, 0.44, 0.41) * (0.92 + 0.08 * hh(floor(vec2(u / 0.4, y / 0.2))));
            // Double-hung windows in 3.6 m bays on each 3.05 m storey: some paired, white trim,
            // a meeting rail, and shutters on some bays.
            float bay = floor(u / 3.6), storey = floor((y - 0.9) / 3.05);
            vec2 f = vec2(fract(u / 3.6), fract((y - 0.9) / 3.05));
            float pair = step(0.45, hh(vec2(bay, storey) + 3.0));
            float halfW = mix(0.13, 0.23, pair);
            float above = step(0.9, y);
            float inY = step(0.12, f.y) * step(f.y, 0.62);
            float trim = step(0.5 - halfW, f.x) * step(f.x, 0.5 + halfW) * inY * above;
            float glassX = step(0.5 - halfW + 0.025, f.x) * step(f.x, 0.5 + halfW - 0.025) * (1.0 - pair * step(abs(f.x - 0.5), 0.012));
            float glassY = step(0.145, f.y) * step(f.y, 0.595) * (1.0 - step(abs(f.y - 0.37), 0.009));
            win = glassX * glassY * above * hasWin;
            trim *= hasWin;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.92, 0.88), trim * (1.0 - win));
            float shutters = hasWin * step(0.62, hh(vec2(bay, 7.0))) * inY * above
              * (step(0.5 - halfW - 0.085, f.x) * step(f.x, 0.5 - halfW - 0.012) + step(0.5 + halfW + 0.012, f.x) * step(f.x, 0.5 + halfW + 0.085));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.2, 0.17), shutters);
          } else if (y < 4.2 && y > 0.4) {
            // Storefront: tall panes with mullions, a band above.
            float f = fract(u / 3.2);
            win = step(0.08, f) * step(f, 0.92) * step(0.5, y) * step(y, 3.4);
          } else if (st < 0.5) {
            vec2 c = vec2(u / 2.6, (y - 4.2) / 3.4);
            vec2 f = fract(c);
            win = step(0.3, f.x) * step(f.x, 0.72) * step(0.22, f.y) * step(f.y, 0.78);
            if (f.y < 0.2 && f.y > 0.12) diffuseColor.rgb *= 0.9; // sill line
          } else if (st < 1.5) {
            float f = fract((y - 4.2) / 3.6);
            float g = fract(u / 1.8);
            win = step(0.38, f) * step(f, 0.9) * step(0.06, g);
          } else {
            float f = fract((y - 4.2) / 3.8);
            float g = fract(u / 1.5);
            win = step(0.2, f) * (0.85 + 0.15 * step(0.08, g));
            glass = mix(vec3(0.42, 0.55, 0.66), vec3(0.62, 0.72, 0.80), clamp(y / 140.0, 0.0, 1.0));
          }
          // Where windows shrink below ~2 px, fade the pattern to its average so walls don't shimmer.
          vec2 fw = fwidth(vec2(u / 2.6, y / 3.4));
          float clarity = 1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y));
          win = mix(0.4, win, clarity) * hasWin;
          float tint = 0.9 + 0.2 * hh(floor(vec2(u / 2.6, y / 3.4)));
          // Night: about a third of offices and homes still lit; shopfronts mostly lit.
          float cellH = st > 2.5 ? hh(floor(vec2(u / 3.6, (y - 0.9) / 3.05)) + 29.0) : hh(floor(vec2(u / 2.6, y / 3.4)) + 17.0);
          // Homes: about a third of rooms lit on every storey; offices as before, shopfronts mostly lit.
          litWin = win * (st > 2.5 ? step(0.66, cellH) : y < 4.2 ? step(0.25, cellH) : step(0.66, cellH));
          litLevel = 0.45 + 0.6 * fract(cellH * 7.13);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass * tint, win);
          // Houses keep their masonry foundation band instead of the generic plinth line.
          diffuseColor.rgb = mix(diffuseColor.rgb, frame, (1.0 - win) * step(y, 0.4) * step(st, 2.5));
          }
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.72, 0.4) * litWin * uNight * litLevel + vGlow;`,
      );
  };
}
