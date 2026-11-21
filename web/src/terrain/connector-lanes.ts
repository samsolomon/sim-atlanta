import footprint from '../../../pipeline/prototypes/connector-footprint/sections.json';
import type { P2 } from '../vignette/geom';

export type ConnectorDirection = keyof typeof footprint.directions;

const [a, b] = footprint.sections;

/** City (x east, z south), in metres. Along increases with northbound travel. */
export function connectorPoint(alongM: number, acrossM: number): P2 {
  const { originXZ, alongXZ, acrossXZ } = footprint;
  return [
    originXZ[0] + alongM * alongXZ[0] + acrossM * acrossXZ[0],
    originXZ[1] + alongM * alongXZ[1] + acrossM * acrossXZ[1],
  ];
}

/** Modelled stripe positions at a station between the two measured cross-sections.
 * Both arrays run from the median to the outside edge, including auxiliary lanes.
 * The lane centres use equal subdivisions of the observed travel width.
 */
export function connectorLanes(direction: ConnectorDirection, alongM: number) {
  if (!Number.isFinite(alongM) || alongM < a.alongM || alongM > b.alongM) return null;
  const t = (alongM - a.alongM) / (b.alongM - a.alongM);
  const start = a[direction], end = b[direction];
  const inside = start.insideM + t * (end.insideM - start.insideM);
  const outside = start.outsideM + t * (end.outsideM - start.outsideM);
  const { travelSign, lanes } = footprint.directions[direction];
  const pitch = (outside - inside) / lanes;
  return {
    travelSign,
    edges: Array.from({ length: lanes + 1 }, (_, i) => connectorPoint(alongM, inside + pitch * i)),
    centres: Array.from({ length: lanes }, (_, i) => connectorPoint(alongM, inside + pitch * (i + .5))),
  };
}
