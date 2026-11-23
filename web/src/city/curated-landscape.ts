import * as THREE from 'three';
import curated from './fixtures/curated-landscape.json';
import { Builder, hashStr, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

/**
 * Overture footprints that aerial evidence shows are landscape, not buildings.
 * Each entry names the retaining wall line; a terrace also gets a planted bed.
 * Wall position is reported (footprint edge and aerials), heights are inferred
 * from the rendered 3DEP ground, and planting is illustrative.
 */
type Entry = { id: string; kind: 'wall' | 'terrace'; wall: P2[]; evidence: string[]; note: string };
const entries = new Map((curated as Entry[]).map(e => [e.id, e]));
export const curatedIds = new Set(entries.keys());

const STONE = '#9b958a', CAP = '#b9b3a6', BED = '#5f7a45', SHRUB = '#4b6a38', BED_DARK = '#3f5a33';
const PARAPET = 0.35, THICK = 0.4, FOOT = 0.3;

export function createCuratedLandscape(buildings: VBuilding[], site: VBuilding, _base: number | null,
  groundAt: (x: number, z: number) => number | null) {
  const entry = entries.get(site.id);
  const ring = site.rings[0] as P2[] | undefined;
  if (!entry || !ring || ring.length < 3) return null;
  const b = new Builder();
  const ground = (x: number, z: number) => groundAt(x, z);
  // Planted bed: 1 m cells inside the footprint, draped on the rendered ground.
  if (entry.kind === 'terrace') {
    const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
    for (let x = Math.floor(Math.min(...xs)); x < Math.max(...xs); x++) {
      for (let z = Math.floor(Math.min(...zs)); z < Math.max(...zs); z++) {
        if (!pointInRing(x + .5, z + .5, ring)) continue;
        const c = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]].map(([u, v]) => [u, (ground(u, v) ?? NaN) + .06, v]);
        if (c.some(p => !Number.isFinite(p[1]))) continue;
        b.quad(c[0], c[3], c[2], c[1], BED);
      }
    }
    // Low shrub clumps, scattered with a stable seed per footprint.
    const r = rng(hashStr(site.id));
    for (let x = Math.ceil(Math.min(...xs)) + 1.5; x < Math.max(...xs) - 1; x += 3.5) {
      for (let z = Math.ceil(Math.min(...zs)) + 1.5; z < Math.max(...zs) - 1; z += 3) {
        if (r() < .3) continue;
        const px = x + (r() - .5) * 2.4, pz = z + (r() - .5) * 2, size = .7 + r() * .9, y = ground(px, pz);
        if (y === null || !pointInRing(px, pz, ring)) continue;
        b.box(size, size * .65, size, px, y + size * .3, pz, r() < .5 ? SHRUB : BED_DARK);
      }
    }
  }
  // Retaining wall: the face drops from the sidewalk grade to the bed beside it.
  for (let i = 1; i < entry.wall.length; i++) {
    const [a, c] = [entry.wall[i - 1], entry.wall[i]];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]), steps = Math.max(1, Math.ceil(len / 2));
    if (len < 1e-6) continue;
    const nx = -(c[1] - a[1]) / len, nz = (c[0] - a[0]) / len;
    const side = pointInRing(a[0] + (c[0] - a[0]) / 2 + nx * 2, a[1] + (c[1] - a[1]) / 2 + nz * 2, ring) ? 1 : -1;
    const ix = nx * side * THICK, iz = nz * side * THICK;
    let prev: number[][] | null = null;
    for (let k = 0; k <= steps; k++) {
      const x = a[0] + (c[0] - a[0]) * k / steps, z = a[1] + (c[1] - a[1]) * k / steps;
      const top = Math.max(ground(x - ix, z - iz) ?? -Infinity, ground(x, z) ?? -Infinity) + PARAPET;
      const bed = Math.min(ground(x + ix * 4, z + iz * 4) ?? Infinity, ground(x, z) ?? Infinity) - FOOT;
      if (!Number.isFinite(top) || !Number.isFinite(bed)) { prev = null; continue; }
      const cur = [[x, bed, z], [x, top, z], [x + ix, top, z + iz], [x + ix, bed, z + iz]];
      if (prev) {
        b.quad(prev[0], cur[0], cur[1], prev[1], STONE);
        b.quad(prev[3], prev[2], cur[2], cur[3], STONE);
        b.quad(prev[1], cur[1], cur[2], prev[2], CAP);
      }
      prev = cur;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'curated:' + site.id;
  group.add(mesh);
  return {
    buildings: buildings.filter(other => other.id !== site.id),
    group,
    setNight(_night: number) {},
    dispose() { geometry.dispose(); mesh.material.dispose(); },
  };
}
