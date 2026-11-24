import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import { COVERS, GroundCover } from '../landscape/ground-cover';
import { FURNITURE, type FurnitureKind } from '../landscape/furniture';
import { flowerBed, hedge, landscapeMesh, ornamentals, retainingEdge, seatWall, stairRun, terraces, type Ground, type Quality } from '../landscape/primitives';

export const LANDSCAPE_KINDS = {
  bed: 'Flower bed',
  hedge: 'Hedges and shrubs',
  terraces: 'Stepped terraces',
  walls: 'Retaining edge, seat wall and stairs',
  ornamentals: 'Specimen ornamentals',
  ground: 'Ground covers',
  furniture: 'Park furniture',
  yard: 'Front yard',
  park: 'Park edge',
  garden: 'Garden on a slope',
} as const;
export type LandscapeKind = keyof typeof LANDSCAPE_KINDS;

export const LANDSCAPE_NOTES: Record<LandscapeKind, string> = {
  bed: 'Left: the default bed, dark-brown soil behind a spade edge. Right: the formal variant, rich black soil behind a stone curb, for landmark gardens and formal beds. ',
  hedge: 'A clipped box hedge that follows the grade, beside a loose row of shrubs. ',
  terraces: 'Level lawns stepping down a 2.4 m slope, each held by capped retaining edges, with a planted strip on each level. ',
  walls: 'A retaining edge that holds the higher grade, a level seat wall and a stair run with cheek walls up the slope. ',
  ornamentals: 'Small clusters of multi-stem shrubs and grasses for specimen planting; trees stay with the tree-species module. ',
  furniture: 'Left to right: bench, litter bin, drinking fountain, charcoal grill, picnic table and map kiosk, as in Piedmont Park. Sizes are estimated from photographs. ',
  ground: 'Seven draped ground materials in one draw, left to right: lawn turf, meadow grass, worn earth, mulch, pine straw, leaf litter and manicured turf. Light and calm by design. ',
  yard: 'A house lot: lawn turf, a worn-earth front walk, a foundation bed and pine straw under ornamentals, behind a clipped hedge. ',
  park: 'A park edge: lawn turf, a meadow strip, an earth path and leaf litter under a shrub group. ',
  garden: 'All of them together on one slope: the kind of lawn edge a landmark sits in. ',
};

// The test plot: a lower and an upper lawn joined by a 2.4 m bank (about 22°) across z = −3…3, with a slight cross-fall.
const slope = (x: number, z: number): number => {
  const t = Math.max(0, Math.min(1, (3 - z) / 6));
  return .4 + 2.4 * t * t * (3 - 2 * t) + x * .01;
};

function plot(b: Builder, kind: LandscapeKind, doy: number, quality: Quality) {
  const bed: P2[] = [[-7, 8], [-2, 7.5], [0, 10.5], [-5, 12]];
  if (kind === 'bed' || kind === 'garden') flowerBed(b, bed, slope, { doy, quality });
  // The formal variant beside the brown default: rich black soil, a stone curb, fewer blooms.
  if (kind === 'bed') flowerBed(b, [[2, 8], [7, 7.5], [9, 10.5], [4, 12]], slope, { doy, quality, soil: 'rich-black', edge: 'stone', flowers: .5, seed: 'formal' });
  if (kind === 'hedge' || kind === 'garden') {
    hedge(b, [[-12, 10], [-12, -10]], slope, { quality });
    hedge(b, [[-9, 10], [-9, -10]], slope, { clipped: false, quality, height: 1.3 });
  }
  if (kind === 'terraces') terraces(b, [-2, -9], [-2, 9], 8, 4, slope, { doy, quality });
  if (kind === 'garden') terraces(b, [6, -8], [6, 8], 6, 3, slope, { doy, quality });
  if (kind === 'walls' || kind === 'garden') {
    // A retaining edge at the bank's toe, a seat wall on the lower lawn and stairs up the bank.
    retainingEdge(b, [[-7, 3], [1, 3]], slope, { quality });
    seatWall(b, [[-7, 6.5], [-1, 6.5]], slope, { quality });
    stairRun(b, [12, 4.5], [12, -4.5], 2.4, slope);
  }
  if (kind === 'furniture') (Object.keys(FURNITURE) as FurnitureKind[]).forEach((k, i) => FURNITURE[k](b, [-10 + i * 4, 9], slope, Math.PI / 2));
  if (kind === 'yard') {
    flowerBed(b, [[-10, 4.6], [-2, 4.6], [-2, 6.2], [-10, 6.2]], slope, { doy, quality, seed: 'yard-bed' });
    hedge(b, [[-12, 15.6], [-1.4, 15.6]], slope, { quality, height: .9, width: .7 });
    hedge(b, [[1.4, 15.6], [12, 15.6]], slope, { quality, height: .9, width: .7 });
    ornamentals(b, [6, 7.5], 1.4, slope, { doy, quality, seed: 'yard', count: 4 });
  }
  if (kind === 'park') {
    hedge(b, [[5, 12], [11, 14]], slope, { clipped: false, quality, height: 1.2 });
    ornamentals(b, [-8, -6], 2, slope, { doy, quality, seed: 'park' });
  }
  if (kind === 'ornamentals' || kind === 'garden') {
    ornamentals(b, [-3, -8], 2.2, slope, { doy, quality, seed: 'a' });
    ornamentals(b, [2, 9], 1.6, slope, { doy, quality, seed: 'b', count: 5 });
  }
}

const sq = (x: number, z: number, w: number, d: number): P2[] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
function covers(c: GroundCover, kind: LandscapeKind, quality: Quality) {
  if (kind === 'ground') COVERS.forEach((cover, i) => c.patch(sq(-15 + i * 4.3, -2, 3.8, 12), slope, cover, { quality }));
  if (kind === 'yard') {
    c.patch(sq(-12, 4, 24, 12), slope, 'turf', { quality });
    c.patch(sq(-1, 4.5, 2, 11), slope, 'earth', { quality, lift: .03 });
    c.patch(sq(3, 6, 6, 3), slope, 'pine-straw', { quality, lift: .03 });
  }
  if (kind === 'park') {
    c.patch(sq(-16, 3, 32, 13), slope, 'turf', { quality });
    c.patch(sq(-16, -16, 32, 14), slope, 'meadow', { quality });
    c.patch([[-16, 8], [16, 6], [16, 8], [-16, 10]], slope, 'earth', { quality, lift: .03 });
    c.patch(sq(4, 11, 8, 4), slope, 'leaf-litter', { quality, lift: .03 });
  }
  if (kind === 'garden') {
    c.patch(sq(-16, -16, 32, 32), slope, 'turf', { quality });
    c.patch(sq(-16, -16, 32, 5), slope, 'meadow', { quality, lift: .03 });
    c.patch(sq(10.5, 4, 3, 2.5), slope, 'earth', { quality, lift: .03 });
    c.patch([[-5.4, -10], [-.8, -10.4], [-.4, -6], [-5, -5.6]], slope, 'pine-straw', { quality, lift: .03 });
    c.patch([[.4, 7.2], [3.6, 7.4], [3.4, 10.8], [.6, 10.6]], slope, 'pine-straw', { quality, lift: .03 });
    c.patch(sq(-13.5, -10, 6, 20), slope, 'leaf-litter', { quality, lift: .03 });
  }
}

export function createLandscapeScene(kind: LandscapeKind, doy: number, quality: Quality) {
  const group = new THREE.Group();
  // The sloped ground patch, so every primitive shows how it follows grade.
  const n = 30, ground = new THREE.PlaneGeometry(34, 34, n, n);
  ground.rotateX(-Math.PI / 2);
  const p = ground.getAttribute('position');
  for (let i = 0; i < p.count; i++) p.setY(i, slope(p.getX(i), p.getZ(i))!);
  ground.computeVertexNormals();
  const turf = new THREE.Mesh(ground, new THREE.MeshLambertMaterial({ color: '#9fb17a', flatShading: true }));
  turf.receiveShadow = true;
  group.add(turf);
  const b = new Builder();
  plot(b, kind, doy, quality);
  const built = landscapeMesh(b);
  group.add(built.mesh);
  const cover = new GroundCover();
  covers(cover, kind, quality);
  const coverMesh = cover.triangles ? cover.mesh({ quality }) : null;
  if (coverMesh) group.add(coverMesh.mesh);
  // Count both tiers for the report: primitives plus ground covers.
  const other = new Builder(), otherCover = new GroundCover(), otherTier = quality === 'high' ? 'low' : 'high';
  plot(other, kind, doy, otherTier);
  covers(otherCover, kind, otherTier);
  const triangles = { [quality]: built.triangles + cover.triangles, [otherTier]: other.pos.length / 9 + otherCover.triangles } as Record<Quality, number>;
  return {
    group, draws: (built.triangles ? built.draws : 0) + (coverMesh ? 1 : 0), triangles,
    dispose() { built.dispose(); coverMesh?.dispose(); ground.dispose(); turf.material.dispose(); },
  };
}
