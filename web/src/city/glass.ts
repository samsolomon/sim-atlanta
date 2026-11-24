/**
 * In-canvas glass for City (High): the blurred, saturated backing behind each DOM glass panel,
 * drawn by the renderer so the panels can drop CSS `backdrop-filter`. With any backdrop-filter
 * over the canvas the browser composites the canvas through an extra full-screen pass every
 * frame; without one the canvas is presented directly (docs/ui-controls-brief.md, "Glass over
 * City: performance budget").
 *
 * Two steps a frame, and only while a panel shows:
 * 1. `pass`, a no-swap pass just before grade: it copies grade's input to quarter resolution and
 *    blurs it there (a 4-tap box downsample, then a separable Gaussian, sigma 22 CSS px).
 * 2. `gradeHook`, run inside grade (City's last pass, already a full-screen draw to the canvas, so
 *    no extra pass or program): inside each rounded rect it replaces the frame with the blurred
 *    backdrop, graded as grade grades the scene (no grain: a blur averages it out), then CSS
 *    saturate(1.35). The DOM panel keeps its tint, edge and shadow on top.
 *
 * Rects come from ui/glass.ts in CSS px; one scale (drawing-buffer px per CSS px) turns them and
 * the blur radius into device px, so a changed pixel ratio keeps the glass the same size.
 */
import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { GLASS_MAX, GLASS_STRIDE, type GlassSource } from '../ui/glass';

/** CSS `backdrop-filter: blur(22px) saturate(1.35)` on `.a2-g`. */
const BLUR_CSS_PX = 22;
const SATURATE = 1.35;
/** The blur runs at 1/DOWN of the drawing buffer. */
const DOWN = 4;
/** Linear-filtered taps per side; each covers two texels, so the kernel spans ±2·TAPS texels. */
const TAPS = 16;

const fullVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** One program for both steps (City's program budget is tight): with uDown, 4 bilinear taps
 * average the 4x4 block of source texels under one quarter-res texel; otherwise a separable
 * Gaussian along uDir. */
const blurFrag = /* glsl */ `
  uniform sampler2D tSrc;
  uniform float uDown;
  uniform vec2 uSrcTexel;
  uniform vec2 uDir;          // one texel along the blur axis, in uv
  uniform float uW0;
  uniform float uW[${TAPS}];
  uniform float uO[${TAPS}];
  varying vec2 vUv;
  void main() {
    if (uDown > 0.5) {
      vec2 o = uSrcTexel;
      vec3 b = texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb
             + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb;
      gl_FragColor = vec4(b * 0.25, 1.0);
      return;
    }
    vec3 c = texture2D(tSrc, vUv).rgb * uW0;
    for (int i = 0; i < ${TAPS}; i++) {
      vec2 d = uDir * uO[i];
      c += (texture2D(tSrc, vUv + d).rgb + texture2D(tSrc, vUv - d).rgb) * uW[i];
    }
    gl_FragColor = vec4(c, 1.0);
  }`;

/** Grade hook (vignette/grade.ts `after`): declarations, and code run after grade's own colour
 * work with `gl_FragColor` set. Rects are device px, origin bottom-left. */
const hookPars = /* glsl */ `
  uniform sampler2D tGlass;
  uniform int uGlassCount;
  uniform vec4 uGlassRect[${GLASS_MAX}];   // left, bottom, width, height
  uniform vec4 uGlassShape[${GLASS_MAX}];  // radius, corner mask (TL 1, TR 2, BR 4, BL 8), alpha, edge inset
  float glassCover(vec2 p) {
    float cover = 0.0;
    for (int i = 0; i < ${GLASS_MAX}; i++) {
      if (i >= uGlassCount) break;
      vec4 rect = uGlassRect[i];
      if (p.x < rect.x - 1.0 || p.y < rect.y - 1.0 || p.x > rect.x + rect.z + 1.0 || p.y > rect.y + rect.w + 1.0) continue;
      vec4 sh = uGlassShape[i];
      vec2 half_ = rect.zw * 0.5;
      vec2 q = p - (rect.xy + half_);
      float bit = q.x < 0.0 ? (q.y > 0.0 ? 1.0 : 8.0) : (q.y > 0.0 ? 2.0 : 4.0);
      float r = sh.x * mod(floor(sh.y / bit), 2.0);
      vec2 e = abs(q) - (half_ - sh.w) + r;
      float d = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - r;
      cover = max(cover, clamp(0.5 - d, 0.0, 1.0) * sh.z);
    }
    return cover;
  }`;

function hookMain(output: boolean) {
  return /* glsl */ `
    float glassA = uGlassCount > 0 ? glassCover(gl_FragCoord.xy) : 0.0;
    if (glassA > 0.0) {
      vec4 gb = texture2D(tGlass, vUv);
      ${output ? `#ifdef TONE_MAPPING
      gb.rgb = toneMapping(gb.rgb);
      #endif
      gb = linearToOutputTexel(gb);` : ''}
      float glassL;
      vec3 gc = gradeColor(gb.rgb, vUv, glassL);
      float s = ${SATURATE.toFixed(2)};
      gc = mat3(0.213 + 0.787 * s, 0.213 - 0.213 * s, 0.213 - 0.213 * s,
                0.715 - 0.715 * s, 0.715 + 0.285 * s, 0.715 - 0.715 * s,
                0.072 - 0.072 * s, 0.072 - 0.072 * s, 0.072 + 0.928 * s) * gc;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, clamp(gc, 0.0, 1.0), glassA);
    }`;
}

/** Gaussian weights for linear-filtered taps: each tap samples between texels 2i+1 and 2i+2. */
export function gaussianTaps(sigma: number, taps = TAPS) {
  const w = (x: number) => Math.exp(-(x * x) / (2 * sigma * sigma));
  let total = w(0);
  const weights: number[] = [], offsets: number[] = [];
  for (let i = 0; i < taps; i++) {
    const a = w(2 * i + 1), b = w(2 * i + 2);
    weights.push(a + b);
    offsets.push(a + b > 0 ? (2 * i + 1) + b / (a + b) : 0);
    total += 2 * (a + b);
  }
  return { w0: w(0) / total, weights: weights.map(x => x / total), offsets };
}

export class CityGlass {
  /** True while the last pass blurred something this frame. */
  private blurred = false;
  private active = false;
  private readonly a = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly b = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly blur = new THREE.ShaderMaterial({
    name: 'GlassBlur', vertexShader: fullVert, fragmentShader: blurFrag,
    uniforms: { tSrc: { value: null }, uDown: { value: 0 }, uSrcTexel: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2() }, uW0: { value: 1 },
      uW: { value: new Array(TAPS).fill(0) }, uO: { value: new Array(TAPS).fill(0) } },
    depthTest: false, depthWrite: false,
  });
  private readonly fsq = new FullScreenQuad();
  private readonly rects = Array.from({ length: GLASS_MAX }, () => new THREE.Vector4());
  private readonly shapes = Array.from({ length: GLASS_MAX }, () => new THREE.Vector4());
  private readonly count = { value: 0 };
  private src: GlassSource | null = null;
  private uploaded = -1;
  private scale = 0;
  private width = 1;
  private height = 1;
  readonly pass: Pass;
  /** For gradeShader({ after }): grade draws the backings. */
  readonly gradeHook: { uniforms: Record<string, THREE.IUniform>; pars: string; main: string };

  /** `output`: grade's input is linear (grade tone-maps and converts it), so the backing does too. */
  constructor(o: { output?: boolean } = {}) {
    this.gradeHook = {
      uniforms: { tGlass: { value: this.a.texture }, uGlassCount: this.count, uGlassRect: { value: this.rects }, uGlassShape: { value: this.shapes } },
      pars: hookPars,
      main: hookMain(!!o.output),
    };
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const glass = this;
    this.pass = new (class GlassBlurPass extends Pass {
      constructor() { super(); this.needsSwap = false; }
      render(renderer: THREE.WebGLRenderer, _w: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) { glass.blurFrom(renderer, read.texture); }
      setSize() { /* sized by CityGlass.setSize */ }
    })();
  }

  /** Drawing-buffer size and device px per CSS px. */
  setSize(width: number, height: number, scale: number) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    const w = Math.max(1, Math.ceil(this.width / DOWN)), h = Math.max(1, Math.ceil(this.height / DOWN));
    this.a.setSize(w, h);
    this.b.setSize(w, h);
    this.blur.uniforms.uSrcTexel.value.set(1 / this.width, 1 / this.height);
    const t = gaussianTaps((BLUR_CSS_PX * scale) / DOWN);
    this.blur.uniforms.uW0.value = t.w0;
    this.blur.uniforms.uW.value = t.weights;
    this.blur.uniforms.uO.value = t.offsets;
    this.scale = scale;
    this.uploaded = -1;
  }

  /** Before the composer renders: whether any panel shows this frame (else the blur is skipped). */
  prepare(src: GlassSource | null) {
    this.pass.enabled = !!src;
    this.src = src;
    this.count.value = 0;
    this.blurred = false;
    this.active = false;
    if (!src) return;
    if (src.version !== this.uploaded) this.upload(src);
    for (let i = 0; i < src.count; i++) if (src.data[i * GLASS_STRIDE + 6] > 0.002) { this.active = true; break; }
  }

  private blurFrom(renderer: THREE.WebGLRenderer, input: THREE.Texture) {
    if (!this.active) return;
    const prev = renderer.getRenderTarget();
    const u = this.blur.uniforms;
    this.fsq.material = this.blur;
    u.uDown.value = 1;
    u.tSrc.value = input;
    renderer.setRenderTarget(this.a);
    this.fsq.render(renderer);
    u.uDown.value = 0;
    this.blur.uniforms.tSrc.value = this.a.texture;
    this.blur.uniforms.uDir.value.set(1 / this.a.width, 0);
    renderer.setRenderTarget(this.b);
    this.fsq.render(renderer);
    this.blur.uniforms.tSrc.value = this.b.texture;
    this.blur.uniforms.uDir.value.set(0, 1 / this.a.height);
    renderer.setRenderTarget(this.a);
    this.fsq.render(renderer);
    renderer.setRenderTarget(prev);
    this.blurred = true;
    // Grade (next) draws the backings.
    this.count.value = this.src?.count ?? 0;
  }

  /** After the composer: whether the panels can rely on the canvas (nothing to back, or grade drew
   * the backings over this frame's blur). */
  drew(): boolean {
    return !this.active || this.blurred;
  }

  private upload(src: GlassSource) {
    const s = this.scale, H = this.height;
    // Half a CSS px inside the DOM edge, so the backing never shows outside the panel's border.
    const inset = 0.5 * s;
    for (let i = 0; i < src.count; i++) {
      const o = i * GLASS_STRIDE, d = src.data;
      const x = d[o] * s, w = d[o + 2] * s, h = d[o + 3] * s, y = H - (d[o + 1] * s + h);
      this.rects[i].set(x, y, w, h);
      this.shapes[i].set(d[o + 4] * s, d[o + 5], d[o + 6], inset);
    }
    this.uploaded = src.version;
  }

  /** Render targets, for the perf inventory. */
  targets() { return [this.a, this.b]; }

  dispose() {
    this.a.dispose();
    this.b.dispose();
    this.blur.dispose();
    this.fsq.dispose();
  }
}
