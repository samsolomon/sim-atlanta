import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import footprint from '../../../pipeline/prototypes/connector-footprint/sections.json';
import { connectorLanes, connectorPoint, type ConnectorDirection } from './connector-lanes';
import type { TerrainCity } from './transport-data';

const [a, b] = footprint.sections;
// At 60 m beyond A/B these offsets meet the existing 14 m mainline and 6.5 m link
// paint. South of A the two NB feeder lanes have a separate pavement edge.
// The outside two SB lanes include the shared option lane at the I-20 split.
const south = a.alongM - 60, north = b.alongM + 60;
const joins = {
  northbound: { main: [-18.6, -4.3], auxiliary: [-3.2, 3.4], north: [-3.7, 10.4] },
  southbound: { main: [-33.0, -42.6], auxiliary: [-42.6, -49.4], north: [-23.7, -37.9] },
};

function path(ctx: CanvasRenderingContext2D, points: P2[]) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const p of points.slice(1)) ctx.lineTo(...p);
}

// Interior geometry always comes from the same sampler used for vehicle positions.
// Only the unmeasured ends narrow to the generic City road strokes.
function carriageway(direction: ConnectorDirection) {
  const lower = connectorLanes(direction, a.alongM)!.edges;
  const upper = connectorLanes(direction, b.alongM)!.edges;
  const join = joins[direction], lanes = lower.length - 1;
  function stripe(index: number, auxiliary = false): P2[] {
    const group = auxiliary ? join.auxiliary : join.main;
    const fraction = auxiliary ? (index - 5) / 2 : index / 5;
    return [
      connectorPoint(south, group[0] + (group[1] - group[0]) * fraction),
      lower[index], upper[index],
      connectorPoint(north, join.north[0] + (join.north[1] - join.north[0]) * index / lanes),
    ];
  }
  return { stripe, lanes };
}

// Lamps and viaduct columns must clear both mainline and feeder lanes.
// The space between a diverging feeder and mainline is open.
const travelBands = (['southbound', 'northbound'] as const).flatMap(direction => {
  const { stripe, lanes } = carriageway(direction);
  return [[...stripe(0), ...stripe(5).reverse()], [...stripe(5, true), ...stripe(lanes, true).reverse()]];
});

export function inConnectorLanes(x: number, z: number, margin = 0) {
  return travelBands.some(ring => pointInRing(x, z, ring) || (margin > 0 && ring.some((a, i) =>
    segDist(x, z, a, ring[(i + 1) % ring.length]) < margin)));
}

/** Overlay on the existing downtown ground texture, once during the terrain bake. */
export function paintConnector(ctx: CanvasRenderingContext2D, data: TerrainCity, texelM: number) {
  if (!('name' in data) || data.name !== 'downtown') return;
  const start = connectorPoint(south, 0), end = connectorPoint(north, 0);
  const fade = (color: string) => {
    const gradient = ctx.createLinearGradient(...start, ...end);
    gradient.addColorStop(0, color + '00');
    gradient.addColorStop((a.alongM - south) / (north - south), color);
    gradient.addColorStop((b.alongM - south) / (north - south), color);
    gradient.addColorStop(1, color + '00');
    return gradient;
  };
  ctx.save();
  const asphalt = fade(PAL.asphaltHwy), white = fade(PAL.lineWhite), yellow = fade('#dfba6d');
  const shoulder = fade('#616168'), divider = fade('#a9a394');
  function fillBand(left: P2[], right: P2[], color: CanvasGradient) {
    path(ctx, [...left, ...right.slice().reverse()]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  for (const direction of ['southbound', 'northbound'] as const) {
    const { stripe, lanes } = carriageway(direction);
    const inside = stripe(0), outside = stripe(lanes, true);
    const sign = footprint.directions[direction].travelSign;
    const insideShoulder = [...inside], outsideShoulder = [...outside];
    for (const [i, section] of [a, b].entries()) {
      const median = (section.northbound.insideM + section.southbound.insideM) / 2;
      // Leave a narrow separator between the two inside shoulders.
      insideShoulder[i + 1] = connectorPoint(section.alongM, median + sign * .35);
      outsideShoulder[i + 1] = connectorPoint(section.alongM, section[direction].outsideM + sign * 3);
    }
    if (direction === 'southbound') {
      // The detached MLK exit passes closest between the two measured sections.
      const middleShoulder = [-24, 30].map(s => {
        const outsideEdge = connectorLanes(direction, s)!.edges[lanes];
        return [outsideEdge[0] - footprint.acrossXZ[0], outsideEdge[1] - footprint.acrossXZ[1]] as P2;
      });
      outsideShoulder.splice(2, 0, ...middleShoulder);
      const medianEdge = insideShoulder.map(([x, z], i): P2 =>
        i === 1 || i === 2 ? [x + .7 * footprint.acrossXZ[0], z + .7 * footprint.acrossXZ[1]] : [x, z]);
      fillBand(insideShoulder, medianEdge, divider);
    }
    fillBand(insideShoulder, inside, shoulder);
    fillBand(outside, outsideShoulder, shoulder);
    fillBand(inside, stripe(5), asphalt);
    fillBand(stripe(5, true), outside, asphalt);

    for (let i = 0; i <= lanes; i++) {
      const edge = i === 0 || i === lanes;
      ctx.lineWidth = Math.max(edge ? .35 : .24, texelM * (edge ? .85 : .65));
      ctx.strokeStyle = i === 0 ? yellow : white;
      ctx.setLineDash(edge ? [] : [3, 9]);
      path(ctx, stripe(i, i >= 5));
      ctx.stroke();
    }
  }
  ctx.restore();
}
