import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { VBuilding } from '../vignette/world';
import { GroundGrid } from '../terrain/grid';
import { create1075Peachtree, peachtree1075Id, simplify } from './1075-peachtree';

// The staged fragments of osm:way:234935278, split at z = -3300 between the two tiles.
const upper = {"id":"osm:way:234935278","h":156.7,"floors":37,"rings":[[[848.01,-3315.5],[849.29,-3339.28],[848.13,-3339.37],[848.47,-3345.98],[849.62,-3345.95],[850.48,-3362.08],[850.71,-3366.75],[846.15,-3366.98],[842.01,-3367.2],[804.13,-3369.2],[804.15,-3370.26],[802.39,-3370.2],[801.16,-3369.8],[799.96,-3369.03],[798.83,-3367.73],[798.25,-3366.41],[798.04,-3364.8],[799.03,-3364.76],[798.24,-3344.04],[793.74,-3342.2],[789.91,-3340.23],[784.79,-3336.89],[780.38,-3333.19],[782.71,-3331],[757.19,-3300],[847.21,-3300]]],"parts":[{"id":"osm:way:1434982572","rings":[[[793.74,-3342.2],[789.91,-3340.23],[784.79,-3336.89],[780.38,-3333.19],[782.71,-3331],[786.46,-3327.49],[787.34,-3326.67],[796.44,-3318.13],[842.66,-3315.78],[845.55,-3315.64],[846.28,-3336.27],[842.88,-3338.69],[838.9,-3341.02],[834.12,-3343.25],[827.93,-3345.28],[821.68,-3346.49],[815.32,-3346.92],[810.22,-3346.68],[803.8,-3345.64],[798.24,-3344.04]]],"h":156.7,"tier":"inferred"},{"id":"osm:way:1434982552","rings":[[[842.66,-3315.78],[841.85,-3300],[847.21,-3300],[848.01,-3315.5],[845.55,-3315.64]]],"h":45.4,"tier":"inferred"},{"id":"osm:way:1434982573","rings":[[[772.94,-3300],[785.91,-3300],[787.34,-3326.67],[786.46,-3327.49],[773.41,-3312.21]]],"h":33,"tier":"inferred"},{"id":"osm:way:234935282","rings":[[[841.85,-3300],[842.66,-3315.78],[796.44,-3318.13],[787.34,-3326.67],[785.91,-3300]]],"h":18.8,"tier":"reported"},{"id":"osm:way:1434982574","rings":[[[772.94,-3300],[773.41,-3312.21],[786.46,-3327.49],[782.71,-3331],[757.19,-3300]]],"h":16.5,"tier":"inferred"},{"id":"osm:way:1434982571","rings":[[[850.48,-3362.08],[850.71,-3366.75],[846.15,-3366.98],[845.92,-3362.31]]],"h":12.4,"tier":"inferred"},{"id":"osm:way:1434982570","rings":[[[799.67,-3367.18],[800.58,-3368.21],[801.58,-3368.84],[802.89,-3369.22],[804.13,-3369.2],[804.15,-3370.26],[802.39,-3370.2],[801.16,-3369.8],[799.96,-3369.03],[798.83,-3367.73],[798.25,-3366.41],[798.04,-3364.8],[799.03,-3364.76],[799.16,-3365.93]]],"h":8,"tier":"illustrative"},{"id":"podium","rings":[[[849.29,-3339.28],[848.13,-3339.37],[848.47,-3345.98],[849.62,-3345.95],[850.48,-3362.08],[845.92,-3362.31],[846.15,-3366.98],[842.01,-3367.2],[804.13,-3369.2],[802.89,-3369.22],[801.58,-3368.84],[800.58,-3368.21],[799.67,-3367.18],[799.16,-3365.93],[799.03,-3364.76],[798.24,-3344.04],[803.8,-3345.64],[810.22,-3346.68],[815.32,-3346.92],[821.68,-3346.49],[827.93,-3345.28],[834.12,-3343.25],[838.9,-3341.02],[842.88,-3338.69],[846.28,-3336.27],[845.55,-3315.64],[848.01,-3315.5]]],"h":18.8,"tier":"inferred"}],"cls":"yes"} as VBuilding;
const central = {"id":"osm:way:234935278","h":156.7,"floors":37,"rings":[[[752.62,-3294.45],[769.54,-3283.36],[780.42,-3276.24],[785.44,-3273.29],[786.33,-3274.6],[799.88,-3265.84],[797.51,-3262.03],[798.4,-3261.47],[793.79,-3254.07],[793.67,-3251.03],[793.55,-3247.99],[807.07,-3247.97],[807.11,-3250.22],[816.01,-3249.69],[844.33,-3247.99],[845.73,-3271.14],[847.21,-3300],[757.19,-3300]]],"parts":[{"id":"osm:way:1434982552","rings":[[[845.73,-3271.14],[847.21,-3300],[841.85,-3300],[840.39,-3271.41]]],"h":45.4,"tier":"inferred"},{"id":"osm:way:1434982573","rings":[[[769.54,-3283.36],[780.42,-3276.24],[784.97,-3282.49],[785.91,-3300],[772.94,-3300],[772.29,-3283.4]]],"h":33,"tier":"inferred"},{"id":"osm:way:234935282","rings":[[[780.42,-3276.24],[785.44,-3273.29],[786.33,-3274.6],[799.88,-3265.84],[797.51,-3262.03],[798.4,-3261.47],[793.79,-3254.07],[793.67,-3251.03],[793.55,-3247.99],[807.07,-3247.97],[807.11,-3250.22],[816.01,-3249.69],[844.33,-3247.99],[845.73,-3271.14],[840.39,-3271.41],[841.85,-3300],[785.91,-3300],[784.97,-3282.49]]],"h":18.8,"tier":"reported"},{"id":"osm:way:1434982574","rings":[[[769.54,-3283.36],[772.29,-3283.4],[772.94,-3300],[757.19,-3300],[752.62,-3294.45]]],"h":16.5,"tier":"inferred"}],"cls":"yes"} as VBuilding;
// Flat ground at 292 m NAVD88 with the scene zero used in Midtown.
const grid = new GroundGrid(
  {
    version: 1, rows: 2, cols: 2, stepM: 1000,
    bounds: { minX: 0, maxX: 1000, minZ: -4000, maxZ: -3000 },
    encoding: 'signed int16 little-endian',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 },
    scaleM: 0.1, offsetM: 0, noData: -32768, sha256: '',
  },
  new Int16Array(4).fill(2920).buffer,
);

const triangles = (group: { children: unknown[] }) =>
  (group.children as Mesh[]).reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);

function top(group: Mesh['parent'], x: number, z: number) {
  group!.updateMatrixWorld(true);
  const hit = new Raycaster(new Vector3(x, 250, z), new Vector3(0, -1, 0)).intersectObject(group!, true)[0];
  return hit.point.y + 300;
}

it('sets both glass masses, the brim and the podium at their lidar heights', () => {
  const other: VBuilding = { id: 'neighbour', rings: [[[0, 0], [5, 0], [5, 5], [0, 5]]], floors: 2, h: 7 };
  const result = create1075Peachtree([other, upper], upper, grid)!;
  expect(upper.id).toBe(peachtree1075Id);
  expect(result.buildings).toEqual([other]);
  expect(top(result.group, 840, -3326)).toBeCloseTo(433.1, 1); // crown block roof, inside the brim ring
  expect(top(result.group, 815, -3315.6)).toBeCloseTo(445.2, 1); // the brim beyond the south glass
  expect(top(result.group, 845, -3358)).toBeCloseTo(434.5, 1); // north block parapet, not an 18.8 m podium
  expect(top(result.group, 820, -3308)).toBeCloseTo(332.4, 1); // the parking podium
  expect(top(result.group, 800.27, -3368.62)).toBeCloseTo(299.5, 1); // entrance canopy over its own street
  // Thinning the crown's traced curve must keep its north-east corner, or a slot opens beside
  // the north block's sliver along Juniper.
  const crown = upper.parts!.find(p => p.id === 'osm:way:1434982572')!.rings[0] as [number, number][];
  expect(simplify(crown, 3)).toContainEqual([845.55, -3315.64]);
});

it('stays inside the landmark budget and drops the empty lamp mesh on the podium tile', () => {
  const a = create1075Peachtree([upper], upper, grid)!;
  const b = create1075Peachtree([central], central, grid)!;
  expect(a.group.children).toHaveLength(2);
  expect(b.group.children).toHaveLength(1);
  expect(triangles(a.group) + triangles(b.group)).toBeLessThan(2400);
  expect(top(b.group, 820, -3280)).toBeCloseTo(332.4, 1);
});

it('keeps real corners when it thins a traced curve', () => {
  const ring: [number, number][] = [[0, 0], [10, 0], [10, 2.9], [10, 10], [5, 10.2], [4, 10.25], [0, 10]];
  const out = simplify(ring, 3);
  for (const corner of [[0, 0], [10, 0], [10, 10], [0, 10]]) expect(out).toContainEqual(corner);
  expect(out).not.toContainEqual([4, 10.25]);
});
