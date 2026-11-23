import * as THREE from 'three';
import type { P2 } from '../vignette/geom';
import { drapeRing, g0, type Ground, type Quality } from './primitives';

/**
 * "Pocket nature" ground covers: a small set of draped ground materials with
 * a whisper of shader texture, light-valued, in the board ground's colour family. All covers share one material
 * and one mesh, so any number of patches costs a single draw. Fine detail
 * fades to its average once it is under a couple of pixels, so nothing shimmers.
 *
 *   const covers = new GroundCover();
 *   covers.patch(ring, groundAt, 'turf', { quality, holes: [mound, path] });
 *   group.add(covers.mesh().mesh);
 *
 * Materials and patterns are illustrative.
 */
// 'turf' is the everyday lawn; 'manicured' (faint mow stripes) is for formal landmark lawns,
// stadium fields and golf only. Indices are baked into the mesh, so new covers go last.
export const COVERS = ['turf', 'meadow', 'earth', 'mulch', 'pine-straw', 'leaf-litter', 'manicured'] as const;
export type Cover = typeof COVERS[number];

export class GroundCover {
  private pos: number[] = [];
  private kind: number[] = [];

  /** Drapes a patch 2 cm above the ground, exactly to the ring, subdivided to 1 m (2 m on low). */
  patch(ring: P2[], ground: Ground, cover: Cover, o: { quality?: Quality; lift?: number; holes?: P2[][] } = {}) {
    const k = COVERS.indexOf(cover), lift = o.lift ?? .02;
    // Off-board samples reuse the sampler's last valid height (never 0, which in City is 30 m off).
    const y = (x: number, z: number) => g0(ground, x, z) + lift;
    drapeRing(ring, o.quality === 'low' ? 2 : 1, y, (a, b, c) => { this.pos.push(...a, ...b, ...c); this.kind.push(k, k, k); }, o.holes);
  }

  get triangles() { return this.pos.length / 9; }

  /** One mesh for every patch: one draw. The low tier halves the texture variation. */
  mesh(o: { quality?: Quality } = {}) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geometry.setAttribute('aCover', new THREE.Float32BufferAttribute(this.kind, 1));
    geometry.computeVertexNormals();
    // Pulled toward the camera in depth, so a 2 cm drape never z-fights the terrain at distance.
    const material = new THREE.MeshLambertMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    material.onBeforeCompile = shader => {
      shader.uniforms.uDetail = { value: o.quality === 'low' ? .5 : 1 };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aCover;\nvarying float vCover;\nvarying vec3 vGround;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCover = aCover;\nvGround = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform float uDetail;
varying float vCover;
varying vec3 vGround;
float gh(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float gn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
{
  // Art direction (Sam, 2026-11-23): the ground is a quiet, light backdrop. Base colours sit in
  // the board's own family (grass #b7c298, park #adbe90, meadow #a5b46e); variation is a whisper,
  // fades with distance, and is halved on the low tier.
  vec2 p = vGround.xz;
  float px = length(fwidth(p));
  float near = (1. - smoothstep(.05, .3, px)) * uDetail;
  float fine = (1. - smoothstep(.03, .09, px)) * uDetail;
  float k = floor(vCover + .5);
  float soft = gn(p * .35) - .5, grain = gh(floor(p * 9.)) - .5;
  vec3 c; float a = .0, f = .0;
  if (k < .5)      { c = vec3(.70, .75, .58); a = .05; f = .025; }      // turf: tonal only, no stripes
  else if (k < 1.5) { c = mix(vec3(.66, .71, .48), vec3(.73, .72, .54), gn(p * .5)); a = .06; f = .03; } // meadow
  else if (k < 2.5) { c = vec3(.77, .70, .58); a = .05; f = .04; }      // worn earth
  else if (k < 3.5) { c = vec3(.53, .44, .37); a = .05; f = .06; }      // mulch
  else if (k < 4.5) { c = vec3(.79, .69, .55); a = .05; f = .05; }      // pine straw
  else if (k < 5.5) { c = vec3(.75, .67, .55); a = .06; f = .05; }      // leaf litter
  else             { c = vec3(.68, .74, .55); a = .04; f = .02;          // manicured: faint mow stripes
                     c *= 1. + .025 * near * (step(.5, fract(p.x / 2.4 + p.y * .05)) - .5) * 2.; }
  c *= 1. + a * near * soft * 2. + f * fine * grain * 2.;
  // The constants are sRGB, like the hex colours elsewhere; the lighting works in linear.
  diffuseColor.rgb = pow(c, vec3(2.2));
}`);
    };
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = 'ground-cover';
    return { mesh, triangles: this.triangles, draws: 1, dispose() { geometry.dispose(); material.dispose(); } };
  }
}
