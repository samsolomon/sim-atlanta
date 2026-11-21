import * as THREE from 'three';

/** Slow drifting flakes over the whole board, with no per-frame geometry uploads. */
export class Snow {
  readonly mesh: THREE.Points;
  private material: THREE.ShaderMaterial;
  constructor(count: number) {
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) points.set([(Math.random() - 0.5) * 2400, Math.random() * 500, (Math.random() - 0.5) * 2400], i * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    this.material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uDpr: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime, uAmount, uDpr;
        uniform vec3 uCenter;
        varying float vAlpha;
        void main() {
          float seed = fract(sin(position.x * 12.9898 + position.z * 78.233) * 43758.5453);
          vec3 p = position + uCenter;
          p.y = mod(position.y - uTime * (5.0 + seed * 4.0), 500.0);
          p.x += sin(uTime * 0.4 + position.z) * 5.0;
          p.z += cos(uTime * 0.3 + position.x) * 4.0;
          vAlpha = step(seed, uAmount) * 0.8;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.5 + seed * 1.5) * uDpr;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float a = (1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5))) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(0.94, 0.96, 1.0, a);
        }`,
    });
    this.mesh = new THREE.Points(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  update(time: number, center: THREE.Vector3, amount: number, dpr: number) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uCenter.value.copy(center);
    this.material.uniforms.uAmount.value = amount;
    this.material.uniforms.uDpr.value = dpr;
    this.mesh.visible = amount > 0.01;
  }
}
