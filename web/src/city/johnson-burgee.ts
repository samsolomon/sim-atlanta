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
/** Pixels for a granite atlas, cached by its options: deterministic (seeded), so a rebuild of the
 * same building (a re-mounted area, the other tier) reuses them. */
const atlasCache = new Map<string, { day: Uint8Array<ArrayBuffer>; night: Uint8Array<ArrayBuffer> }>();
export function atlasPixels(o: GraniteAtlasOptions) {
  const key = JSON.stringify(o);
  const hit = atlasCache.get(key);
  if (hit) return hit;
  const w = o.bays.length * o.bayWidth, h = o.floors * o.floorHeight;
  const day = new Uint8Array(w * h * 4), night = new Uint8Array(day.length);
  const random = rng(o.seed);
  const [gr, gg, gb] = o.granite, [fr, fg, fb] = o.frame;
  // Channels are written directly: a fresh array per pixel cost ~17 ms for One Atlantic Center.
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
        if (!pane) { day[i] = gr; day[i+1] = gg; day[i+2] = gb; }
        else if (mullion) { day[i] = fr; day[i+1] = fg; day[i+2] = fb; }
        else { day[i] = shade; day[i+1] = shade + 13; day[i+2] = shade + 22; }
        day[i+3] = 255;
        const glow = pane && !mullion ? lit : 0;
        night[i] = 255*glow; night[i+1] = 195*glow; night[i+2] = 123*glow; night[i+3] = 255;
      }
    }
  });
  const out = { day, night };
  atlasCache.set(key, out);
  return out;
}

export function graniteWindowAtlas(o: GraniteAtlasOptions) {
  const w = o.bays.length * o.bayWidth, h = o.floors * o.floorHeight;
  const { day, night } = atlasPixels(o);
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

// The ashlar coursing moved to the material library; these re-exports keep its importers unchanged.
export { ashlarCoursing, withStonePosition } from '../materials/stone';
