import { deeringEdgeStart, deeringThrough, exitMain, exitRamp } from '../../../pipeline/prototypes/highway-four/deering';
import { pointInRing, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { PAL } from '../vignette/world';
import type { TerrainCity } from './transport-data';
import {
  alongOn,
  matchRibbon,
  mix,
  ribbons,
  sectionAt,
  stripePoint,
  type Ribbon,
  type Section,
} from './connector-corridor';
import { connectorLanes, connectorPoint } from './connector-lanes';

const bands = new PlacementIndex<{ ring: P2[]; ribbon: Ribbon; minX: number; maxX: number; minZ: number; maxZ: number }>();
for (const r of ribbons) {
  for (let i = 1; i < r.rows.length; i++) {
    const a = r.rows[i - 1],
      b = r.rows[i];
    const ring = [a.inner, b.inner, b.outer, a.outer];
    const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
    bands.add({ ring, ribbon: r, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }, ring, 4);
  }
}
/** Whether (x, z) lies on a rendered Connector lane. `except` ignores a deck's own ribbons,
 * so a flyover can ask only about the lanes that pass beneath it. */
export function inConnectorLanes(x: number, z: number, margin = 0, except?: ReadonlySet<Ribbon>) {
  // A cell holds many lane quads; a point farther than the margin from a quad's box is
  // neither inside it nor that near an edge.
  const reach = Math.max(margin, 0) + 1e-6;
  return bands
    .at(x, z)
    .some(
      ({ ring, ribbon, minX, maxX, minZ, maxZ }) =>
        x >= minX - reach && x <= maxX + reach && z >= minZ - reach && z <= maxZ + reach &&
        !except?.has(ribbon) &&
        (pointInRing(x, z, ring) ||
          (margin > 0 && ring.some((a, i) => segDist(x, z, a, ring[(i + 1) % 4]) < margin))),
    );
}

function path(ctx: CanvasRenderingContext2D, pts: P2[]) {
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (const p of pts.slice(1)) ctx.lineTo(...p);
}

export function isConnectorCity(city: TerrainCity) {
  return (
    'name' in city &&
    [
      'downtown',
      'king-memorial',
      'sweet-auburn',
      'north-band',
      'midtown-south',
      'midtown-central',
      'midtown-upper',
      'brookwood-south',
      'brookwood-station',
      'north-corner',
      'south-band',
      'south-corner',
    ].includes(String(city.name))
  );
}

type Road = { cls: string; sub?: string | null; pts: P2[] };
export function surveyedRoad(road: Road) {
  return (
    road.cls === 'motorway' &&
    road.pts.length > 1 &&
    !!matchRibbon(road.pts[0], road.pts[1], road.sub === 'link')
  );
}

// Dedicated mesh owners draw the two bridge chains. On the private r16 row only
// these adjacent ground ways use the same signed sections as ConnectorTraffic.
const eastGround = new Set([369529886, 187141934, 38981774, 1020867018, 38983363, 306143022, 9238434, 38981773]);

export function eastGroundRoad(city: TerrainCity, road: Road) {
  return 'name' in city && city.name === 'r16' && road.cls === 'motorway' && road.pts.length > 1 &&
    eastGround.has(matchRibbon(road.pts[0], road.pts[1], road.sub==='link')?.id ?? -1);
}

function groundStrips(city: TerrainCity) {
  const covered = new Map<Ribbon, [number, number][]>();
  for (const part of city.terrainTransport?.roads ?? []) {
    if (part.kind !== 'bridge' || part.cls !== 'motorway') continue;
    for (let i = 1; i < part.pts.length; i++) {
      const a = part.pts[i - 1],
        b = part.pts[i];
      const r = matchRibbon(a, b, part.sub === 'link');
      if (!r || r.kind !== 'ground') continue;
      const ranges = covered.get(r) ?? [];
      ranges.push([alongOn(r, a).s, alongOn(r, b).s]);
      covered.set(r, ranges);
    }
  }
  const box = city.bounds,
    strips: { r: Ribbon; rows: Section[] }[] = [];
  for (const r of ribbons) {
    if (
      r.kind !== 'ground' ||
      !r.rows.some(
        (row) =>
          row.inner[0] > box.minX - 38 &&
          row.inner[0] < box.maxX + 38 &&
          row.inner[1] > box.minZ - 38 &&
          row.inner[1] < box.maxZ + 38,
      )
    )
      continue;
    const intervals = covered.get(r);
    if (!intervals) {
      strips.push({ r, rows: r.rows });
      continue;
    }
    const add = (a: number, b: number) => {
      if (b - a > 0.05)
        strips.push({
          r,
          rows: [sectionAt(r, a), ...r.rows.filter((p) => p.s > a && p.s < b), sectionAt(r, b)],
        });
    };
    let end = 0;
    for (const [a, b] of intervals.sort((a, b) => a[0] - b[0])) {
      add(end, a);
      end = Math.max(end, b);
    }
    add(end, r.line.length);
  }
  return strips;
}

// The narrow concrete median follows both inside stripes. Where the carriageways
// separate at Freedom Parkway the paved shoulders end and the median stays open.
const oppositeEdge = new PlacementIndex<[P2, P2]>();
for (const r of ribbons)
  if (!r.link && r.direction === 'southbound' && r.kind === 'ground') {
    for (let i = 1; i < r.rows.length; i++) {
      const seg: [P2, P2] = [r.rows[i - 1].inner, r.rows[i].inner];
      oppositeEdge.add(seg, seg, 12);
    }
  }
function medianAt(p: P2) {
  let nearest: P2 | undefined,
    distance = 10;
  for (const [a, b] of oppositeEdge.at(...p)) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)),
    );
    const q = mix(a, b, t),
      d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < distance) {
      distance = d;
      nearest = q;
    }
  }
  return nearest;
}

export function connectorMedians(city: TerrainCity, strips = groundStrips(city)) {
  const runs: Section[][] = [];
  if (!isConnectorCity(city)) return runs;
  for (const {r,rows} of strips) {
    if (r.link || r.direction !== 'northbound') continue;
    let run: Section[] | undefined;
    for (const row of rows) {
      const opposite = medianAt(row.inner);
      const middle = opposite && mix(row.inner,opposite,.5);
      // The median may carry an independently mapped exit or entrance.
      if (!opposite || !middle || inConnectorLanes(...middle,.6)) { run=undefined; continue; }
      if (!run) { run=[]; runs.push(run); }
      run.push({s:row.s,inner:row.inner,outer:opposite});
    }
  }
  return runs.filter(rows=>rows.length>1);
}

export function paintConnector(ctx: CanvasRenderingContext2D, city: TerrainCity, texelM: number) {
  const east = 'name' in city && city.name === 'r16';
  if (!isConnectorCity(city) && !east) return;
  const box = city.bounds;
  const visible = groundStrips(city).filter(({r}) => !east || eastGround.has(r.id));
  function fill(rows: Section[], left: number, right: number, color: string) {
    path(ctx, [
      ...rows.map((r) => stripePoint(r, left)),
      ...rows.map((r) => stripePoint(r, right)).reverse(),
    ]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  const exitOrigin = ribbons.find(r => r.id === deeringThrough)!.line.length;
  function stroke(rows: Section[], i: number, n: number, edge: boolean, color: string, phase = 0) {
    path(
      ctx,
      rows.map((r) => stripePoint(r, i / n)),
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(edge ? 0.35 : 0.24, texelM * (edge ? 0.85 : 0.65));
    ctx.setLineDash(edge ? [] : [3, 9]);
    ctx.lineDashOffset = phase + (east || phase ? rows[0].s : 0);
    ctx.stroke();
  }
  ctx.save();
  // Paint shoulders first so a joining pavement always owns its travel surface.
  for (const rows of connectorMedians(city, visible)) {
    fill(rows,0,1,'#66666c');
    fill(rows,.44,.56,'#aaa596');
  }
  for (const { r, rows } of visible) {
    const w = 3.55 * r.lanes;
    fill(rows, -(r.link ? 0.6 : 2.2) / w, 1 + (r.link ? 0.8 : 2.8) / w, '#66666c');
  }
  for (const { rows } of visible) fill(rows, 0, 1, PAL.asphaltHwy);
  for (const { r, rows } of visible)
    for (let i = 0; i <= r.lanes; i++) {
      const start = deeringEdgeStart(r.id,i,r.lanes);
      const painted = start ? rows.filter(row=>row.s>=start) : rows;
      if (painted.length<2) continue;
      stroke(painted, i, r.lanes, i === 0 || i === r.lanes, i === 0 && !r.link ? '#dfba6d' : PAL.lineWhite,
        r.id === exitMain || r.id === exitRamp ? exitOrigin : 0);
    }
  // Through the rail crossing two branches temporarily occupy adjoining lanes.
  // Redraw this measured continuous surface and the narrow concrete divider over
  // the overlapping link shoulders. Its eight stripes are shared with traffic.
  if (box.minX < 850 && box.maxX > 650 && box.minZ < 610 && box.maxZ > 460) {
    for (const dir of ['southbound', 'northbound'] as const) {
      const rows = [-76, 77].map((s) => {
        const edges = connectorLanes(dir, s)!.edges;
        return { s, inner: edges[0], outer: edges[7] };
      });
      fill(rows, 0, 1, PAL.asphaltHwy);
      for (let i = 0; i <= 7; i++)
        stroke(rows, i, 7, i === 0 || i === 7, i === 0 ? '#dfba6d' : PAL.lineWhite);
    }
    const median = [
      [-76, -13.2],
      [77, -6.2],
    ].map(([s, u]) => ({
      s,
      inner: connectorPoint(s, u - 0.35),
      outer: connectorPoint(s, u + 0.35),
    }));
    fill(median, 0, 1, '#a9a394');
  }
  ctx.restore();
}
