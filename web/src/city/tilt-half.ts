/**
 * Tilt-shift at half resolution (High). The two tilt-shift blurs (vignette/tiltshift.ts, 9 taps each)
 * ran at full resolution; here they run into half-resolution targets, and one full-resolution
 * composite blends the sharp frame toward the upsampled blur by the same focus ramp. Inside the
 * focus band the ramp is 0, so the in-focus strip is the full-resolution frame, untouched.
 *
 * The H and V passes stay the uniform holders City already drives (strength, texel, enabled); this
 * pass renders their materials, so their radius stays in CSS px whatever the target size.
 */
import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const compositeFrag = /* glsl */ `
  uniform sampler2D tSharp, tBlur;
  uniform float uFocus, uBand, uStrength;
  varying vec2 vUv;
  void main() {
    vec4 sharp = texture2D(tSharp, vUv);
    // The tilt-shift ramp (tiltshift.ts): k is the blur step in CSS px. Below half a CSS px the
    // half-resolution copy would add more softening than the blur itself, so blend in gradually.
    float k = smoothstep(uBand, 0.5, abs(vUv.y - uFocus)) * uStrength;
    float w = clamp(k * 2.0, 0.0, 1.0);
    gl_FragColor = w <= 0.0 ? sharp : mix(sharp, texture2D(tBlur, vUv), w);
  }`;

export class HalfTiltShiftPass extends Pass {
  private readonly a = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly b = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly fsq = new FullScreenQuad();
  private readonly composite: THREE.ShaderMaterial;

  constructor(private readonly h: ShaderPass, private readonly v: ShaderPass) {
    super();
    this.composite = new THREE.ShaderMaterial({
      name: 'TiltShiftComposite',
      uniforms: { tSharp: { value: null }, tBlur: { value: this.b.texture }, uFocus: { value: 0.5 }, uBand: { value: 0.16 }, uStrength: { value: 1 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: compositeFrag,
      depthTest: false, depthWrite: false,
    });
  }

  setSize(width: number, height: number) {
    const w = Math.max(1, Math.ceil(width / 2)), h = Math.max(1, Math.ceil(height / 2));
    this.a.setSize(w, h);
    this.b.setSize(w, h);
  }

  render(renderer: THREE.WebGLRenderer, write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    this.h.uniforms.tDiffuse.value = read.texture;
    this.fsq.material = this.h.material;
    renderer.setRenderTarget(this.a);
    this.fsq.render(renderer);
    this.v.uniforms.tDiffuse.value = this.a.texture;
    this.fsq.material = this.v.material;
    renderer.setRenderTarget(this.b);
    this.fsq.render(renderer);
    const u = this.composite.uniforms, src = this.h.uniforms;
    u.tSharp.value = read.texture;
    u.uFocus.value = src.uFocus.value;
    u.uBand.value = src.uBand.value;
    u.uStrength.value = src.uStrength.value;
    this.fsq.material = this.composite;
    renderer.setRenderTarget(this.renderToScreen ? null : write);
    this.fsq.render(renderer);
  }

  dispose() {
    this.a.dispose();
    this.b.dispose();
    this.fsq.dispose();
    this.composite.dispose();
  }
}
