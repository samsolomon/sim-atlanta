/**
 * What R16 adds when it joins the board: the buildings shared across its southern seam and the
 * structures that span it. It re-cuts the ground under them, so City and the geometry tests run
 * the same steps in the same order.
 */
import { Group } from 'three';
import type { TerrainQuality } from '../terrain/surface';
import type { TrafficArea } from '../square-board/sections';
import { freewaySides } from './i85-ramp-study';
import { mountSeamBuildings } from './north-seam-neighborhood';
import { norcrossNorthRails } from './norcross-north-study';
import { extensions, studyRails } from './north-profile-study';
import { maysonSupports } from './mayson-supports';
import { mountMayson } from './mayson-study';

export function mountNorthRow(north: TrafficArea, station: TrafficArea, quality: TerrainQuality) {
  const disposeBuildings = mountSeamBuildings(north, station, quality);
  const structures = new Group();
  const sides = freewaySides((x, z) => north.northTread?.(x, z) ?? station.northTread?.(x, z) ?? null);
  const rails = studyRails(north);
  const supports = maysonSupports(extensions, (x, z) => {
    const y = north.terrainAt(x, z);
    if (y === null) throw Error('Missing terrain under Mayson support');
    return y;
  });
  const norcross = norcrossNorthRails(north.groundAt, north.grid.manifest.vertical.sceneZeroNavd88M);
  structures.add(sides, supports, mountMayson(), rails, norcross.mesh);
  north.group.add(structures);
  return { structures, rails, freightRailhead: norcross.freightRailhead, disposeBuildings };
}
