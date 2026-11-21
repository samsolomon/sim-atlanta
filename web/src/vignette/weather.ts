/**
 * Weather for the vignette: live conditions from Open-Meteo (free, no key) when the page may
 * fetch it, or a picked preset. Drives cloud (flat light, soft shadows), rain (streaks and wet
 * surfaces), fog (distance haze) and storms (lightning).
 */
import * as THREE from 'three';

export { PRESETS, fetchLive, fromWmo, type Weather, type WeatherKind } from '../core/weather';

/** Rain streaks animated entirely in the vertex shader: one draw call, no per-frame uploads. */
export class Rain {
  readonly mesh: THREE.LineSegments;
  private mat: THREE.ShaderMaterial;
  constructor(count = 9000, box = 700, height = 260) {
    const base = new Float32Array(count * 2 * 3);
    const end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * box;
      const z = (Math.random() - 0.5) * box;
      const y = Math.random() * height;
      for (let k = 0; k < 2; k++) {
        base.set([x, y, z], (i * 2 + k) * 3);
        end[i * 2 + k] = k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(base, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uH: { value: height }, uAmount: { value: 0 }, uColor: { value: new THREE.Color('#c9d3e2') } },
      vertexShader: /* glsl */ `
        attribute float aEnd;
        uniform float uTime; uniform vec3 uCenter; uniform float uH; uniform float uAmount;
        varying float vA;
        void main() {
          float id = position.x * 12.9898 + position.z * 78.233;
          float keep = step(fract(sin(id) * 43758.5453), uAmount);
          float y = mod(position.y - uTime * 55.0, uH);
          vec3 p = vec3(position.x + uCenter.x, y + uCenter.y - 10.0, position.z + uCenter.z);
          p += vec3(0.6, 2.4, 0.3) * aEnd; // streak length and a little wind
          vA = keep * (0.35 + 0.65 * aEnd);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uColor, 0.55 * vA); }`,
    });
    this.mesh = new THREE.LineSegments(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
  }
  update(t: number, center: THREE.Vector3, amount: number) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uCenter.value.copy(center);
    this.mat.uniforms.uAmount.value = amount;
    this.mesh.visible = amount > 0.01;
  }
}
