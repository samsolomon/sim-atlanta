import * as THREE from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const FOOTPRINT = '16cab934-34dc-4dca-8eb2-3ce9dc57d877';
// Fitted to the round portion of OSM building part 192939493, excluding the elevator.
const X = 279.5, Z = -614.9, RADIUS = 19.6;
const PODIUM = 26;
const TOP = 219.7;
const CROWN = 210;
const BAYS = 64, FLOORS = 64, PIXELS = 4;

/** A fixed miniature of reflective panes. Mipmaps average out the floor bands at skyline scale. */
function facade() {
  const width = BAYS * PIXELS, height = FLOORS * PIXELS;
  const day = new Uint8Array(width * height * 4);
  const night = new Uint8Array(day.length);
  const random = rng(1976);
  for (let bay = 0; bay < BAYS; bay++) {
    const angle = 2 * Math.PI * bay / BAYS;
    const sky = 0.42 + 0.31 * Math.cos(angle * 2 - 0.9) + 0.2 * Math.cos(angle * 3 + 0.55);
    const reflectedRoof = 6 + Math.floor(12 * (1 + Math.sin(Math.floor(bay / 3) * 2.1)));
    for (let floor = 0; floor < FLOORS; floor++) {
      const crown = floor >= FLOORS - 3;
      const reflected = floor < reflectedRoof;
      const glow = random() < (crown ? 0.73 : 0.22) ? 0.56 + 0.4 * random() : 0;
      const shade = (crown ? 0.51 : 1) * (reflected ? 0.71 : 1) * (0.95 + random() * 0.08);
      for (let row = 0; row < PIXELS; row++) {
        for (let col = 0; col < PIXELS; col++) {
          const i = 4 * ((floor * PIXELS + row) * width + bay * PIXELS + col);
          const tone = shade * (row === 0 ? 0.79 : col === 0 ? 0.9 : 1);
          day[i] = (59 + 118 * sky) * tone;
          day[i + 1] = (81 + 107 * sky) * tone;
          day[i + 2] = (103 + 103 * sky) * tone;
          const lit = (row && col ? glow : 0);
          night[i] = 245 * lit; night[i + 1] = 201 * lit; night[i + 2] = 143 * lit;
          day[i + 3] = night[i + 3] = 255;
        }
      }
    }
  }
  function texture(bytes: Uint8Array<ArrayBuffer>) {
    const t = new THREE.DataTexture(bytes, width, height);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  const map = texture(day), emissiveMap = texture(night);
  const glass = new THREE.MeshPhongMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0,
    specular: 0x687889, shininess: 38 });
  glass.addEventListener('dispose', () => { map.dispose(); emissiveMap.dispose(); });
  return glass;
}

function podium(b: Builder, ring: P2[], bottom: number) {
  for (let i = 0; i < ring.length; i++) {
    const [x, z] = ring[i], [nx, nz] = ring[(i + 1) % ring.length];
    const wall = (low: number, high: number, color: string) =>
      b.quad([x, low, z], [nx, low, nz], [nx, high, nz], [x, high, z], color);
    wall(bottom, 4, '#aea595');
    for (let floor = 0; floor < 6; floor++) {
      const low = 4 + floor * (PODIUM - 4) / 6;
      wall(low, low + 1.4, '#485b64');
      wall(low + 1.4, 4 + (floor + 1) * (PODIUM - 4) / 6, '#c1bbae');
    }
  }
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  for (const tri of THREE.ShapeUtils.triangulateShape(contour, [])) {
    const [a, c, d] = tri.map(i => [ring[i][0], PODIUM, ring[i][1]]);
    b.tri(a, d, c, '#b5afa3');
  }
  // Raised skylights on the long Peachtree Street wing; dimensions estimated from Portman's section.
  for (let x = 313; x <= 341; x += 7) {
    const y = PODIUM + 0.12;
    b.quad([x-3,y,-626], [x,y+2.5,-626], [x,y+2.5,-605], [x-3,y,-605], '#899ca2');
    b.quad([x,y+2.5,-626], [x+3,y,-626], [x+3,y,-605], [x,y+2.5,-605], '#aab6b6');
    b.tri([x-3,y,-605], [x,y+2.5,-605], [x+3,y,-605], '#777f80');
    b.tri([x-3,y,-626], [x+3,y,-626], [x,y+2.5,-626], '#777f80');
  }
}

export function createWestin(buildings: VBuilding[], groundAt: (x: number, z: number) => number | null) {
  const base = buildings.find(b => b.id === FOOTPRINT);
  const ring = base?.rings[0];
  if (!ring || !pointInRing(X, Z, ring)) return null;
  const ground = groundAt(X, Z);
  if (ground == null || !Number.isFinite(ground)) return null;
  let bottom = ground;
  for (const [x, z] of ring) {
    const level = groundAt(x, z);
    if (level == null || !Number.isFinite(level)) return null;
    bottom = Math.min(bottom, level);
  }
  const b = new Builder();
  podium(b, ring, bottom - ground - 1);
  function drum(x: number, z: number, radius: number, low: number, high: number, segments: number, color: string) {
    const geometry = new THREE.CylinderGeometry(radius, radius, high - low, segments);
    geometry.translate(x, (low + high) / 2, z);
    b.addGeometry(geometry, color);
  }
  drum(X, Z, RADIUS + 0.22, PODIUM, PODIUM + 1.0, 64, '#a3a5a2');
  for (const ledge of [CROWN, 213.2, 216.3]) drum(X, Z, RADIUS + 0.18, ledge, ledge + 0.35, 64, '#677480');
  drum(X, Z, RADIUS + 0.24, TOP - 0.85, TOP, 64, '#b6b9b6');
  drum(X, Z, 14, TOP, TOP + 0.35, 48, '#858d91');
  // The small northeast lobe on the mapped part is the external elevator shaft.
  drum(296.65, -627.2, 3.6, PODIUM, TOP - 0.35, 24, '#708596');
  drum(296.65, -627.2, 3.72, TOP - 0.35, TOP + 0.25, 24, '#bbbfbd');
  const trim = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const glass = facade();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS, RADIUS, TOP - PODIUM, 64, 1, true), glass);
  shaft.name = 'Westin guest tower and Sun Dial';
  shaft.position.set(X, (TOP + PODIUM) / 2, Z);
  shaft.castShadow = trim.castShadow = trim.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'Westin Peachtree Plaza';
  group.position.y = ground;
  group.add(trim, shaft);
  return { group, buildings: buildings.filter(b => b !== base),
    setNight(dark: number) { glass.emissiveIntensity = Math.min(1, Math.max(0, dark)); },
  };
}
