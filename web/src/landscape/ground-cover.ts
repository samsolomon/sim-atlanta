import * as THREE from 'three';
import type { P2 } from '../vignette/geom';
import { drapeRing, g0, type Ground, type Quality } from './primitives';

/**
 * "Pocket nature" ground covers: a small set of draped ground materials with
 * gentle shader texture instead of flat paint. All covers share one material
 * and one mesh, so any number of patches costs a single draw. Fine detail
 * fades to its average once it is under a couple of pixels, so nothing shimmers.
 *
 *   const covers = new GroundCover();
 *   covers.patch(ring, groundAt, 'turf', { quality, holes: [mound, path] });
 *   group.add(covers.mesh().mesh);
 *
 * Materials and patterns are illustrative.
 */
export const COVERS = ['turf', 'meadow', 'earth', 'mulch', 'pine-straw', 'leaf-litter'] as const;
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

  /** One mesh for every patch: one draw. */
  mesh() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geometry.setAttribute('aCover', new THREE.Float32BufferAttribute(this.kind, 1));
    geometry.computeVertexNormals();
    // Pulled toward the camera in depth, so a 2 cm drape never z-fights the terrain at distance.
    const material = new THREE.MeshLambertMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aCover;\nvarying float vCover;\nvarying vec3 vGround;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCover = aCover;\nvGround = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying float vCover;
varying vec3 vGround;
float gh(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float gn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 p = vGround.xz;
  float px = length(fwidth(p));
  float fine = 1. - smoothstep(.04, .12, px);   // crumbs, needles and blades fade with distance
  float k = floor(vCover + .5);
  vec3 c;
  if (k < .5) {        // mown turf: soft mow stripes and blade speckle
    c = vec3(.55, .63, .38) * (.95 + .07 * step(.5, fract(p.x / 2.2 + p.y * .06)));
    c *= mix(1., .9 + .2 * gh(floor(p * 12.)), fine);
  } else if (k < 1.5) { // longer meadow grass: clumpy, a little straw in it
    float m = gn(p * 1.4);
    c = mix(vec3(.46, .55, .28), vec3(.66, .64, .38), m * .7);
    c *= mix(1., .85 + .3 * gh(floor(p * 9.)), fine);
  } else if (k < 2.5) { // worn earth at path edges
    c = vec3(.6, .5, .37) * (.9 + .15 * gn(p * 2.)) * mix(1., .88 + .24 * gh(floor(p * 16.)), fine);
  } else if (k < 3.5) { // mulch: dark crumb
    c = vec3(.24, .17, .12) * mix(1., .7 + .6 * gh(floor(p * 18.)), fine);
  } else if (k < 4.5) { // pine straw: warm needles in streaks
    vec2 q = vec2(p.x * .7 + p.y * .7, -p.x * .7 + p.y * .7);
    c = vec3(.62, .38, .2) * mix(1., .78 + .44 * gh(floor(vec2(q.x * 2., q.y * 22.))), fine);
  } else {              // leaf litter: mixed warm leaves
    float h = gh(floor(p * 11.));
    c = h < .4 ? vec3(.52, .34, .2) : h < .75 ? vec3(.6, .47, .26) : vec3(.4, .3, .2);
    c = mix(vec3(.5, .38, .23), c, fine * .8) * (.92 + .12 * gn(p * 1.3));
  }
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
