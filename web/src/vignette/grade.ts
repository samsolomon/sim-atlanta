/**
 * Colour grade and film grain, applied last (display space): a little more contrast and
 * saturation, warm highlights and cool shadows, a soft vignette, and fine animated grain.
 * After the reference: punchy light, cool shade, and a printed, non-digital surface.
 */
import * as THREE from 'three';

export function gradeShader() {
  return {
    name: 'Grade',
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uAmount: { value: 1 },
      uGrain: { value: 0.045 },
      uRes: { value: new THREE.Vector2(1024, 1024) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime, uAmount, uGrain;
      uniform vec2 uRes;
      varying vec2 vUv;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() {
        vec4 src = texture2D(tDiffuse, vUv);
        vec3 c = src.rgb;
        if (uAmount > 0.001) {
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          vec3 g = (c - 0.5) * 1.12 + 0.5;                       // contrast
          g = mix(vec3(l), g, 1.14);                              // saturation
          g += mix(vec3(-0.035, -0.01, 0.05), vec3(0.03, 0.012, -0.03), smoothstep(0.15, 0.85, l)); // cool shade, warm light
          float vig = 1.0 - smoothstep(0.35, 1.15, length(vUv - 0.5) * 1.4); // edges must be ordered in GLSL
          g *= mix(0.86, 1.0, vig);
          float n = hash(floor(vUv * uRes) + fract(uTime) * 917.0) - 0.5;
          g += n * uGrain * (1.0 - 0.5 * l);                     // grain, stronger in shadows
          c = mix(c, g, uAmount);
        }
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
      }`,
  };
}
