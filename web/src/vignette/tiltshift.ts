/**
 * Tilt-shift blur with a sharp focus band: no blur within `band` of the focus line, then a
 * smooth ramp to `strength` pixels per tap at the top and bottom edges. Run twice (x, then y).
 */
import * as THREE from 'three';

export function tiltShiftShader(dir: [number, number]) {
  return {
    name: 'TiltShift',
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uDir: { value: new THREE.Vector2(...dir) },
      uFocus: { value: 0.5 },
      uBand: { value: 0.16 },
      uStrength: { value: 1.6 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uTexel, uDir;
      uniform float uFocus, uBand, uStrength;
      varying vec2 vUv;
      void main() {
        float d = abs(vUv.y - uFocus);
        float k = smoothstep(uBand, 0.5, d) * uStrength;
        if (k < 0.01) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
        vec2 st = uDir * uTexel * k;
        vec4 sum = texture2D(tDiffuse, vUv) * 0.1633;
        sum += (texture2D(tDiffuse, vUv + st) + texture2D(tDiffuse, vUv - st)) * 0.1531;
        sum += (texture2D(tDiffuse, vUv + 2.0 * st) + texture2D(tDiffuse, vUv - 2.0 * st)) * 0.12245;
        sum += (texture2D(tDiffuse, vUv + 3.0 * st) + texture2D(tDiffuse, vUv - 3.0 * st)) * 0.0918;
        sum += (texture2D(tDiffuse, vUv + 4.0 * st) + texture2D(tDiffuse, vUv - 4.0 * st)) * 0.051;
        gl_FragColor = sum;
      }`,
  };
}
