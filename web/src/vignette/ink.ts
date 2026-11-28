/**
 * Ink outlines: a screen-space edge pass over the scene's depth and colour. Silhouettes come
 * from depth jumps, creases (roof/wall, kerb/road) from colour steps. Lines fade with distance
 * so far-away detail doesn't turn to noise. One pass after the scene render, so every object
 * shares one consistent line, the "outline once, after compositing" rule.
 *
 * Foliage can opt out of interior lines. Meshes registered with `inkFoliageMesh` are drawn a
 * second time, after the scene, into a small foliage mask (FoliageMaskPass): each fragment that
 * survives the material's alpha test and matches the scene depth writes its mode. The ink pass
 * reads that mask, never the colour buffer, so rain, snow and other blended effects drawn over a
 * crown cannot change it. Between two foliage pixels it draws no line, so cards and clumps inside
 * a crown don't each get outlined. Where foliage meets anything else it draws a line only if the
 * other side stays clear 4 and 8 pixels out: a real silhouette against sky, ground or a building,
 * not a small gap between leaves. A large depth jump between two foliage pixels (one crown in
 * front of another) keeps its line. Modes: 1 silhouette only, ink colour; 2 silhouette only, warm
 * foliage ink; 3 warm foliage ink, interior lines kept close up and faded out by `uInteriorM`.
 * With nothing registered the pass costs what it always did (`uFoliage` 0).
 */
import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

/** The most areas the ink pass tests for the placeholder's cream night lines. */
export const MARK_RECTS = 16;
/** Points on the x-rayed vehicle's centreline (city/ghosts.ts): its own surface is never ghosted. */
export const GHOST_SELF_POINTS = 10;

export function inkShader() {
  return {
    name: 'Ink',
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      tDepth: { value: null as THREE.Texture | null },
      tMask: { value: EMPTY_MASK as THREE.Texture },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
      uNear: { value: 20 },
      uFar: { value: 12000 },
      uStrength: { value: 0.75 },
      uInk: { value: new THREE.Color('#1c1820') },
      uWidth: { value: 1.0 },
      uFoliageInk: { value: new THREE.Color('#7a5520') },
      uInteriorM: { value: 40 },
      // 1 when the scene has inkFoliage materials; 0 skips the foliage samples entirely (City today).
      uFoliage: { value: 0 },
      // City's white placeholder (city/placeholder.ts): at night (uMarkNight 1), lines whose nearest
      // surface lies inside an area still drawn white (uMarkRects: minX, minZ, maxX, maxZ) take
      // uMarkInk, cream on the night-blue masses. The surface comes from depth through uInvViewProj.
      uMarkInk: { value: new THREE.Color('#efe6cf') },
      uMarkNight: { value: 0 },
      uMarkCount: { value: 0 },
      uMarkRects: { value: Array.from({ length: MARK_RECTS }, () => new THREE.Vector4()) },
      uInvViewProj: { value: new THREE.Matrix4() },
      // City's ghosts (city/ghosts.ts): hidden vehicles write a code (level / 16) into the scene's
      // alpha; uGhost 1 when any did this frame. Levels 1–3 x-ray the selected bus, streetcar or
      // train; 4–9 are trains in tunnel, shallow to deep; 10–15 their track window, near to far.
      // The pass fills each level in its service colour and outlines levels 1–9. A pixel whose
      // surface lies on the x-rayed vehicle itself (within uGhostSelfR of its centreline) is its
      // visible part and is left alone. uInvViewProj must be current while uGhost is 1.
      uGhost: { value: 0 },
      uGhostNight: { value: 0 },
      uGhostRail: { value: new THREE.Color('#1f5fd1') },
      uGhostBus: { value: new THREE.Color('#227971') },
      uGhostStreetcar: { value: new THREE.Color('#3b82e6') },
      uGhostSelf: { value: Array.from({ length: GHOST_SELF_POINTS }, () => new THREE.Vector3()) },
      uGhostSelfCount: { value: 0 },
      uGhostSelfR: { value: 2.6 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform sampler2D tDiffuse, tDepth, tMask;
      uniform vec2 uTexel;
      uniform float uNear, uFar, uStrength, uWidth;
      uniform vec3 uInk, uFoliageInk;
      uniform float uInteriorM, uFoliage, uMarkNight;
      uniform vec3 uMarkInk;
      uniform int uMarkCount;
      uniform vec4 uMarkRects[${MARK_RECTS}];
      uniform mat4 uInvViewProj;
      uniform float uGhost, uGhostNight, uGhostSelfR;
      uniform vec3 uGhostRail, uGhostBus, uGhostStreetcar;
      uniform vec3 uGhostSelf[${GHOST_SELF_POINTS}];
      uniform int uGhostSelfCount;
      float ghostLevel(float a) { float l = floor(a * 16.0 + 0.5); return l >= 1.0 && l <= 15.0 ? l : 0.0; }
      // The surface at uv lies on the x-rayed vehicle (near its centreline polyline).
      bool ghostSelf(vec2 uv) {
        vec4 w = uInvViewProj * vec4(uv * 2.0 - 1.0, texture2D(tDepth, uv).x * 2.0 - 1.0, 1.0);
        vec3 p = w.xyz / w.w;
        for (int i = 0; i < ${GHOST_SELF_POINTS}; i++) {
          if (i >= uGhostSelfCount) break;
          vec3 a = uGhostSelf[i], b = uGhostSelf[i + 1 < uGhostSelfCount ? i + 1 : i];
          vec3 ab = b - a;
          float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
          if (length(p - a - ab * t) < uGhostSelfR) return true;
        }
        return false;
      }
      // Whether the surface at uv lies inside one of the placeholder's white areas.
      float marked(vec2 uv) {
        vec4 w = uInvViewProj * vec4(uv * 2.0 - 1.0, texture2D(tDepth, uv).x * 2.0 - 1.0, 1.0);
        vec2 p = w.xz / w.w;
        for (int i = 0; i < ${MARK_RECTS}; i++) {
          if (i >= uMarkCount) break;
          vec4 r = uMarkRects[i];
          if (p.x >= r.x && p.x <= r.z && p.y >= r.y && p.y <= r.w) return 1.0;
        }
        return 0.0;
      }
      // Foliage mode from the mask: 0 none, 1–3 (see inkFoliageMesh).
      float mode(vec2 uv) { return floor(texture2D(tMask, uv).r * 5.0 + 0.5); }
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
        vec4 sl = texture2D(tDiffuse, vUv - vec2(o.x, 0.0)), sr = texture2D(tDiffuse, vUv + vec2(o.x, 0.0));
        vec4 sd = texture2D(tDiffuse, vUv - vec2(0.0, o.y)), su = texture2D(tDiffuse, vUv + vec2(0.0, o.y));
        float cl = lum(sl.rgb), cr = lum(sr.rgb), cd = lum(sd.rgb), cu = lum(su.rgb);
        // Ghosts: fill under this pixel's scene lines, then their own outline over them (applied last).
        float gLine = 0.0; vec3 gInk = uInk;
        if (uGhost > 0.5) {
          float g0 = ghostLevel(col.a);
          if (g0 > 0.0 && !(g0 < 3.5 && uGhostSelfCount > 0 && ghostSelf(vUv))) {
            vec3 fill = g0 < 1.5 ? uGhostBus : g0 < 2.5 ? uGhostStreetcar : uGhostRail;
            float a = g0 < 3.5 ? 0.5 : g0 < 9.5 ? 0.56 - 0.06 * (g0 - 4.0) : 0.6 - 0.09 * (g0 - 10.0);
            // Night: the fill stays in its colour, lifted a little; the track window goes cream.
            vec3 nightFill = g0 > 9.5 ? uMarkInk : mix(fill, vec3(1.0), 0.18);
            col.rgb = mix(col.rgb, mix(fill, nightFill, uGhostNight), a);
            if (g0 < 9.5 && (ghostLevel(sl.a) != g0 || ghostLevel(sr.a) != g0 || ghostLevel(sd.a) != g0 || ghostLevel(su.a) != g0)) {
              gLine = 1.0;
              // Tunnel ghosts take the city's ink (cream at night); the x-ray its own colour.
              gInk = g0 < 3.5 ? mix(fill * 0.6, mix(fill, vec3(1.0), 0.45), uGhostNight) : mix(uInk, uMarkInk, uGhostNight);
            }
          }
        }
        float edgeC = smoothstep(0.035, 0.11, max(abs(cl - cr), abs(cu - cd)));
        // Fade lines out with distance so the far side doesn't fill with noise.
        float fade = 1.0 - smoothstep(1400.0, 4200.0, d);
        // Mostly silhouettes (depth); colour creases only faintly, so shapes stay clean inside.
        float line = clamp(max(edgeD, edgeC * 0.22), 0.0, 1.0) * fade * uStrength;
        vec3 ink = uInk;
        if (uMarkNight > 0.0 && uMarkCount > 0 && line > 0.0) {
          // The nearest of the five samples: a silhouette's line is cream on both of its sides.
          vec2 at = vUv; float near = d;
          if (dl < near) { near = dl; at = vUv - vec2(o.x, 0.0); }
          if (dr < near) { near = dr; at = vUv + vec2(o.x, 0.0); }
          if (dd < near) { near = dd; at = vUv - vec2(0.0, o.y); }
          if (du < near) { near = du; at = vUv + vec2(0.0, o.y); }
          ink = mix(uInk, uMarkInk, marked(at) * uMarkNight);
        }
        if (uFoliage < 0.5) { gl_FragColor = vec4(mix(mix(col.rgb, ink, line), gInk, gLine), 1.0); return; }
        float m = mode(vUv);
        float ml = mode(vUv - vec2(o.x, 0.0)), mr = mode(vUv + vec2(o.x, 0.0));
        float md = mode(vUv - vec2(0.0, o.y)), mu = mode(vUv + vec2(0.0, o.y));
        float fm = max(max(m, max(ml, mr)), max(md, mu));
        if (fm > 0.5) {
          // Foliage in the 3×3 cross: decide whether this is a crown silhouette or an interior line.
          bool inside = m > 0.5 && ml > 0.5 && mr > 0.5 && md > 0.5 && mu > 0.5;
          float keep;
          // Inside a crown, a large depth jump is one crown in front of another: keep that edge.
          if (inside) keep = max(fm > 2.5 ? 1.0 - smoothstep(uInteriorM * 0.4, uInteriorM, d) : 0.0, smoothstep(0.12, 0.25, jump));
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
          // Never ink a leaf pixel at a crown's outer edge: the line goes on the sky or ground
          // side only, one pixel wide, so the crown keeps its full colour to the edge.
          if (!inside && m > 0.5) line = 0.0;
          if (fm > 1.5) { ink = uFoliageInk; line *= 0.6; }
        }
        gl_FragColor = vec4(mix(mix(col.rgb, ink, line), gInk, gLine), 1.0);
      }`,
  };
}

/** Foliage ink modes (see the shader notes above). */
export type InkFoliageMode = 1 | 2 | 3;

const EMPTY_MASK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
EMPTY_MASK.needsUpdate = true;
const registry = new Map<THREE.Mesh, InkFoliageMode>();

/**
 * Register a foliage mesh (any species) so the ink pass outlines only its crown silhouette.
 * The mesh keeps its own material; FoliageMaskPass redraws it into the mask with the same
 * geometry, instancing, alpha test and clipping. Returns the unregister function; call it on
 * dispose.
 */
export function inkFoliageMesh(mesh: THREE.Mesh, mode: InkFoliageMode) {
  registry.set(mesh, mode);
  return () => { registry.delete(mesh); };
}

/** Registered foliage meshes (for tests and diagnostics). */
export const inkFoliageCount = () => registry.size;

function onStage(mesh: THREE.Object3D, scene: THREE.Object3D) {
  for (let o: THREE.Object3D | null = mesh; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === scene) return true;
  }
  return false;
}

/**
 * Draws registered foliage into the ink pass's mask, depth-tested against the scene so only the
 * visible leaf surface counts. Add it right after the RenderPass and before the ink pass.
 */
export class FoliageMaskPass extends Pass {
  readonly target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  private materials = new WeakMap<THREE.Material, Map<number, THREE.MeshBasicMaterial>>();
  private res = new THREE.Vector2();
  constructor(private scene: THREE.Scene, private camera: THREE.Camera, private ink: { uniforms: Record<string, THREE.IUniform> }) {
    super();
    this.needsSwap = false;
  }
  setSize(w: number, h: number) { this.target.setSize(w, h); this.res.set(w, h); }
  private maskMaterial(src: THREE.Material, mode: InkFoliageMode, depth: THREE.Texture) {
    let byMode = this.materials.get(src);
    if (!byMode) this.materials.set(src, byMode = new Map());
    let m = byMode.get(mode);
    if (!m) {
      const s = src as THREE.MeshBasicMaterial;
      m = new THREE.MeshBasicMaterial({ map: s.map ?? null, alphaTest: s.alphaTest, side: s.side });
      const uniforms = { tSceneDepth: { value: depth }, uRes: { value: this.res } };
      // A source material that hides leaves in its own shader (leaf drop, per-leaf thinning) hands
      // the same patch over as userData.maskShader, so the mask hides exactly what is not drawn.
      const patch = src.userData.maskShader as ((sh: THREE.WebGLProgramParametersWithUniforms) => void) | undefined;
      m.onBeforeCompile = sh => {
        patch?.(sh);
        Object.assign(sh.uniforms, uniforms);
        sh.fragmentShader = 'uniform sampler2D tSceneDepth;\nuniform vec2 uRes;\n' + sh.fragmentShader
          .replace('void main() {', 'void main() {\n  if (gl_FragCoord.z > texture2D(tSceneDepth, gl_FragCoord.xy / uRes).r + 0.00002) discard;')
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n  gl_FragColor = vec4(${(mode / 5).toFixed(2)}, 0.0, 0.0, 1.0);`);
      };
      m.customProgramCacheKey = () => 'foliageMask' + mode + (patch ? ':' + (src.userData.maskKey ?? 'patched') : '');
      m.userData.depth = uniforms.tSceneDepth;
      byMode.set(mode, m);
    }
    (m.userData.depth as THREE.IUniform).value = depth;
    m.clippingPlanes = src.clippingPlanes;
    return m;
  }
  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    const live = [...registry].filter(([mesh]) => onStage(mesh, this.scene));
    this.ink.uniforms.uFoliage.value = live.length ? 1 : 0;
    this.ink.uniforms.tMask.value = live.length ? this.target.texture : EMPTY_MASK;
    if (!live.length || !read.depthTexture) return;
    const autoClear = renderer.autoClear;
    const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    for (const [mesh, mode] of live) {
      const own = mesh.material as THREE.Material;
      mesh.material = this.maskMaterial(own, mode, read.depthTexture);
      const parent = mesh.parent, cast = mesh.castShadow;
      mesh.castShadow = false;
      // Render the mesh on its own; its world matrix is already current from the scene render.
      const auto = mesh.matrixWorldAutoUpdate;
      mesh.matrixWorldAutoUpdate = false;
      renderer.render(mesh, this.camera);
      mesh.matrixWorldAutoUpdate = auto;
      mesh.castShadow = cast;
      mesh.material = own;
      void parent;
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(clear, alpha);
    renderer.autoClear = autoClear;
  }
  dispose() { this.target.dispose(); }
}
