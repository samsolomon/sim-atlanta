import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import { flowerBed, hedge, landscapeMesh, ornamentals, retainingEdge, seatWall, stairRun, terraces, type Ground, type Quality } from '../landscape/primitives';

export const LANDSCAPE_KINDS = {
  bed: 'Flower bed',
  hedge: 'Hedges and shrubs',
  terraces: 'Stepped terraces',
  walls: 'Retaining edge, seat wall and stairs',
  ornamentals: 'Specimen ornamentals',
  garden: 'Garden on a slope',
} as const;
export type LandscapeKind = keyof typeof LANDSCAPE_KINDS;

export const LANDSCAPE_NOTES: Record<LandscapeKind, string> = {
  bed: 'A curbed bed with mulch draped on the ground and a low fill of flower clumps in the season’s colours. ',
  hedge: 'A clipped box hedge that follows the grade, beside a loose row of shrubs. ',
  terraces: 'Level lawns stepping down a 2.4 m slope, each held by capped retaining edges, with a planted strip on each level. ',
  walls: 'A retaining edge that holds the higher grade, a level seat wall and a stair run with cheek walls up the slope. ',
  ornamentals: 'Small clusters of multi-stem shrubs and grasses for specimen planting; trees stay with the tree-species module. ',
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
  if (kind === 'ornamentals' || kind === 'garden') {
    ornamentals(b, [-3, -8], 2.2, slope, { doy, quality, seed: 'a' });
    ornamentals(b, [2, 9], 1.6, slope, { doy, quality, seed: 'b', count: 5 });
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
  // Count both tiers for the report.
  const other = new Builder();
  plot(other, kind, doy, quality === 'high' ? 'low' : 'high');
  const triangles = { [quality]: built.triangles, [quality === 'high' ? 'low' : 'high']: other.pos.length / 9 } as Record<Quality, number>;
  return {
    group, draws: built.draws, triangles,
    dispose() { built.dispose(); ground.dispose(); turf.material.dispose(); },
  };
}
