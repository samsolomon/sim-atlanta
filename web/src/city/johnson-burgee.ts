import * as THREE from 'three';
import { rng } from '../vignette/geom';

// Johnson/Burgee's late towers in Atlanta, One Atlantic Center (1987) and
// 191 Peachtree (1990), share one facade language: flame-finished granite
// laid in coursed ashlar, light-framed multi-pane glass grouped over several
// floors between granite bands, and narrow punched openings. These helpers
// draw that treatment; each tower supplies its own colour, module and banding.

type RGB = readonly [number, number, number];

export interface GraniteBay {
  /** Mullion divisions across the opening. */
  panes: number;
  /** Opening width in atlas pixels. */
  width: number;
  /** Grouped bays carry glass over several floors between granite bands. */
  grouped: boolean;
}

export interface GraniteAtlasOptions {
  bays: readonly GraniteBay[];
  floors: number;
  /** Atlas pixels per bay and per floor. */
  bayWidth: number;
  floorHeight: number;
  granite: RGB;
  frame: RGB;
  /** Floors per group; the first floor of each group carries a granite band. */
  groupFloors: number;
  /** Band height on the first floor of each group, in pixels. */
  bandHeight: number;
  /** Sill height and head height of punched openings, in pixels. */
  punchedSill: number;
  punchedHead: number;
  occupancy: number;
  seed: number;
}

/** Day and night textures for a granite elevation, plus their material. */
export function graniteWindowAtlas(o: GraniteAtlasOptions) {
  const w = o.bays.length * o.bayWidth, h = o.floors * o.floorHeight;
  const day = new Uint8Array(w * h * 4), night = new Uint8Array(day.length);
  const random = rng(o.seed);
  o.bays.forEach(({panes, width, grouped}, bay) => {
    const left = (o.bayWidth - width) / 2;
    for (let floor = 0; floor < o.floors; floor++) {
      const lit = random() < o.occupancy ? .28 + .48 * random() : 0;
      const sill = grouped ? (floor % o.groupFloors === 0 ? o.bandHeight : 0) : o.punchedSill;
      const head = grouped ? o.floorHeight : o.punchedHead;
      for (let y = 0; y < o.floorHeight; y++) for (let x = 0; x < o.bayWidth; x++) {
        const dx = x - left;
        const pane = dx >= 0 && dx < width && y >= sill && y < head;
        const mullion = pane && ((dx % (width / panes)) < 1 || y === 0);
        const shade = 68 + 4 * (Math.floor(dx * panes / width) % 3);
        const i = 4 * ((floor * o.floorHeight + y) * w + bay * o.bayWidth + x);
        day.set(!pane ? o.granite : mullion ? o.frame : [shade, shade + 13, shade + 22], i);
        day[i+3] = 255;
        const glow = pane && !mullion ? lit : 0;
        night.set([255*glow, 195*glow, 123*glow, 255], i);
      }
    }
  });
  function texture(bytes: Uint8Array<ArrayBuffer>) {
    const t = new THREE.DataTexture(bytes, w, h);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  const map = texture(day), emissiveMap = texture(night);
  const material = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffffff,
    emissiveIntensity: 0, side: THREE.DoubleSide });
  material.addEventListener('dispose', () => { map.dispose(); emissiveMap.dispose(); });
  return material;
}

/**
 * GLSL that darkens running-bond ashlar joints on stone. It reads
 * `vStonePos` (model-space position) and only touches fragments that pass
 * `where`, so glass and metal stay smooth. Joints fade out once a course is
 * smaller than a pixel.
 */
export function ashlarCoursing(courseWidth: number, courseHeight: number, where: string, depth = .13) {
  return `
        vec2 tile = vec2((vStonePos.x + vStonePos.z) / ${courseWidth}, vStonePos.y / ${courseHeight});
        vec2 footprint = max(fwidth(tile), vec2(0.001));
        tile.x += 0.5 * mod(floor(tile.y), 2.0);
        vec2 edge = 0.5 - abs(fract(tile) - 0.5);
        vec2 seam = 1.0 - smoothstep(vec2(0.01), 0.035 + footprint, edge);
        seam *= 1.0 - smoothstep(vec2(0.12), vec2(0.65), footprint);
        if (${where}) {
          diffuseColor.rgb *= 1.0 - ${depth} * max(seam.x, seam.y);
        }`;
}

/** Declares `vStonePos` and inserts `fragment` after the base colour is known. */
export function withStonePosition(shader: { vertexShader: string; fragmentShader: string }, fragment: string) {
  shader.vertexShader = 'varying vec3 vStonePos;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>', '#include <begin_vertex>\n vStonePos = position;');
  shader.fragmentShader = 'varying vec3 vStonePos;\n' + shader.fragmentShader.replace(
    '#include <color_fragment>', `#include <color_fragment>${fragment}`);
}
