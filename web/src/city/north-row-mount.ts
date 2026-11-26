/**
 * What R16 adds when it joins the board: the buildings shared across its southern seam and the
 * structures that span it. It re-cuts the ground under them, so it runs as the last steps of the
 * row's build, before the row connects; City and the geometry tests share it.
 */
import { Group } from 'three';
import type { Build } from '../core/slice';
import type { TerrainQuality } from '../terrain/surface';
import type { TrafficArea } from '../square-board/sections';
import { freewaySides } from './i85-ramp-study';
import { mountSeamBuildingsSteps } from './north-seam-neighborhood';
import { norcrossNorthRails } from './norcross-north-study';
import { extensions, studyRailsSteps } from './north-profile-study';
import { maysonSupports } from './mayson-supports';
import { mountMayson } from './mayson-study';

export type NorthRowMount = ReturnType<typeof mountNorthRowSteps> extends Build<infer T> ? T : never;

export function* mountNorthRowSteps(north: TrafficArea, station: TrafficArea, quality: TerrainQuality) {
  const seam = yield* mountSeamBuildingsSteps(north, station, quality);
  const structures = new Group();
  const sides = freewaySides((x, z) => north.northTread?.(x, z) ?? station.northTread?.(x, z) ?? null);
  yield 'freeway sides';
  const rails = yield* studyRailsSteps(north);
  const supports = maysonSupports(extensions, (x, z) => {
    const y = north.terrainAt(x, z);
    if (y === null) throw Error('Missing terrain under Mayson support');
    return y;
  });
  yield 'rail supports';
  const norcross = norcrossNorthRails(north.groundAt, north.grid.manifest.vertical.sceneZeroNavd88M);
  structures.add(sides, supports, mountMayson(), rails, norcross.mesh);
  north.group.add(structures);
  return { structures, rails, freightRailhead: norcross.freightRailhead, commit: seam.commit, disposeBuildings: seam.dispose };
}
