/**
 * Ink outlines: a screen-space edge pass over the scene's depth and colour. Silhouettes come
 * from depth jumps, creases (roof/wall, kerb/road) from colour steps. Lines fade with distance
 * so far-away detail doesn't turn to noise. One pass after the scene render, so every object
 * shares one consistent line, the "outline once, after compositing" rule.
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
      uInk: { value: new THREE.Color('#2a2430') },
      uWidth: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform sampler2D tDiffuse, tDepth;
      uniform vec2 uTexel;
      uniform float uNear, uFar, uStrength, uWidth;
      uniform vec3 uInk;
      varying vec2 vUv;
      float lin(vec2 uv) {
        float z = texture2D(tDepth, uv).x;
        return perspectiveDepthToViewZ(z, uNear, uFar) * -1.0;
      }
      float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
      void main() {
        vec4 col = texture2D(tDiffuse, vUv);
        if (uStrength < 0.01) { gl_FragColor = col; return; }
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
        float line = clamp(max(edgeD, edgeC * 0.7), 0.0, 1.0) * fade * uStrength;
        gl_FragColor = vec4(mix(col.rgb, uInk, line), col.a);
      }`,
  };
}
