import type { VRoad } from '../vignette/world';
import lit from './fixtures/midtown-night.json';

/** Midtown's lit arterials, in the downtown street-light style. Other streets stay dark
 * so the grid reads at night without lighting every residential block. */
const ARTERIALS = /^(?:(?:West )?Peachtree (?:Street|Road)|Spring Street|Juniper Street|Piedmont Avenue|(?:10th|14th|17th) Street|North Avenue)\b/;

export function isMidtownArterial(road: VRoad) {
  // Lamps on a deck belong to the structure, and a tunnel has none on the surface.
  return !road.bridge && !road.tunnel && !!road.name && ARTERIALS.test(road.name);
}

/** Street lamps on the arterials, plus pedestrian lamps on the OSM paths tagged lit=yes
 * and at mapped highway=street_lamp nodes. Lamp spacing and heights are illustrative. */
export const midtownLights = {
  include: isMidtownArterial,
  paths: lit.paths as [number, number][][],
  lamps: lit.lamps as [number, number][],
};
