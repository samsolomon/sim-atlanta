import { deeringBranch, deeringDonor, deeringThrough, deeringSection, deeringStations } from '../../../pipeline/prototypes/highway-four/deering';
import midtownWays from '../city/fixtures/midtown-connector/ways.json';
import downtownWays from '../../../pipeline/prototypes/connector-footprint/ways.json';
import { Line, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { surveyedEdges } from './connector-survey';
import { connectorLanes, type ConnectorDirection } from './connector-lanes';

type Kind = 'ground' | 'bridge' | 'tunnel';
type Way = { version: number; lanes: number; link: boolean; kind: Kind; hov: boolean; pts: P2[] };
export interface Ribbon extends Way {
  id: number;
  key: string;
  line: Line;
  /** Directed mainline metres at this ribbon's first node, relative to Georgia State. */
  station0?: number;
  rows: Section[];
  direction: ConnectorDirection;
}
export interface Section {
  s: number;
  inner: P2;
  outer: P2;
}
type End = { ribbon: Ribbon; start: boolean; offset: number };
type Joint = { incoming: End[]; outgoing: End[] };
export const mix = (a: P2, b: P2, f: number): P2 => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
export const stripePoint = (row: Section, fraction: number) => mix(row.inner, row.outer, fraction);
const rawWays = { ...downtownWays, ...midtownWays };
const joints = new Map<string, Joint>();
const sourceEnds = new Set(
  Object.values(rawWays).flatMap((w) => [w.pts[0].join(','), w.pts.at(-1)!.join(',')]),
);
export const ribbons: Ribbon[] = [];
/** Ways OSM tags as tunnels that are really open freeway under a wide street deck: the
 * Fifth Street park deck (51 m, lidar) over the Connector. Drawn and driven as ground; the deck
 * is Fifth Street's own profiled run (landbridges.json). */
const UNDER_LAND_BRIDGE = new Set(['560940890', '560940891']);
for (const [id, raw] of Object.entries(rawWays)) {
  const way = UNDER_LAND_BRIDGE.has(id) ? { ...(raw as Way), kind: 'ground' as Kind } : raw as Way;
  let first = 0;
  for (let i = 1; i < way.pts.length; i++) {
    if (i < way.pts.length - 1 && !sourceEnds.has(way.pts[i].join(','))) continue;
    const pts = way.pts.slice(first, i + 1);
    // The SB managed entrance joins an internal OSM node at Edgewood. The
    // five general lanes and its contiguous HOV lane continue to the right entrance.
    const lanes = (Number(id) === 38945231 && first > 0) || Number(id) === 1450888995 ? 6 : way.lanes;
    const ribbon: Ribbon = {
      ...way,
      id: Number(id),
      key: id + '/' + first,
      lanes,
      pts,
      line: new Line(pts),
      rows: [],
      direction: pts.at(-1)![1] < pts[0][1] ? 'northbound' : 'southbound',
    };
    ribbons.push(ribbon);
    for (const start of [true, false]) {
      const key = (start ? pts[0] : pts.at(-1)!).join(',');
      const joint = joints.get(key) ?? { incoming: [], outgoing: [] };
      (start ? joint.outgoing : joint.incoming).push({ ribbon, start, offset: 0 });
      joints.set(key, joint);
    }
    first = i;
  }
}

// Each Georgia State crossing supplies a fixed origin even as boards or source
// ways are added upstream. Links retain their own distance from the ramp start.
for (const id of [119686423, 316454382]) {
  const origin = ribbons.find(r => r.id === id)!;
  origin.station0 = 0;
  for (const forward of [true, false]) {
    let r = origin;
    while (true) {
      const endpoint = forward ? r.pts.at(-1)! : r.pts[0];
      const joint = joints.get(endpoint.join(','))!;
      const mains = (forward ? joint.outgoing : joint.incoming).filter(e => !e.ribbon.link);
      if (mains.length !== 1) break;
      const next = mains[0].ribbon;
      if (next.station0 !== undefined) break;
      next.station0 = forward ? r.station0! + r.line.length : r.station0! - next.line.length;
      r = next;
    }
  }
}

function frame(r: Ribbon, s: number) {
  const a = r.line.at(s - 2),
    b = r.line.at(s + 2),
    p = r.line.at(s);
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: p.x, z: p.z, rx: (a.z - b.z) / length, rz: (b.x - a.x) / length };
}

function typical(r: Ribbon, s: number): Section {
  const { x, z, rx, rz } = frame(r, s),
    half = (r.lanes * 3.55) / 2;
  return { s, inner: [x - rx * half, z - rz * half], outer: [x + rx * half, z + rz * half] };
}

// At a branching node the OSM centrelines share a point even when the
// physical carriageways are already side by side. Intersect the local normal
// with the surveyed median-side edge before assigning any of the lane slots.
const picksFor = (direction: ConnectorDirection) =>
  surveyedEdges.filter((p) => {
    const r = ribbons.find((w) => w.id === p.way);
    return r && !r.link && r.direction === direction;
  });
const mainEdges = { northbound: picksFor('northbound'), southbound: picksFor('southbound') };
function jointBoundary(r: Ribbon, s: number, picks: P2[]) {
  const f = frame(r, s);
  const along = (p: P2) => (p[0] - f.x) * f.rz - (p[1] - f.z) * f.rx;
  const near = picks
    .filter((p) => Math.hypot(p[0] - f.x, p[1] - f.z) < 210)
    .sort((a, b) => along(a) - along(b));
  const i = near.findIndex((p) => along(p) >= 0);
  if (i <= 0) return undefined;
  const a = near[i - 1],
    b = near[i],
    u = along(a),
    v = along(b);
  return mix(a, b, -u / (v - u || 1));
}
function junctionSection(trunk: End, ends: End[]) {
  const r = trunk.ribbon,
    s = trunk.start ? 0 : r.line.length,
    row = typical(r, s);
  const f = frame(r, s),
    width = r.lanes * 3.55;
  if (!r.link) {
    // Across a median-side HOV split the outside edge continues straight.
    const outside = ends.some((e) => e.ribbon.hov);
    const picks = mainEdges[r.direction].map((p) => (outside ? p.outer : p.inner));
    const edge = jointBoundary(r, s, picks);
    if (!edge) return row;
    const inner: P2 = outside ? [edge[0] - f.rx * width, edge[1] - f.rz * width] : edge;
    return { s, inner, outer: [inner[0] + f.rx * width, inner[1] + f.rz * width] as P2 };
  }
  // Short consecutive ramp ways can have separate bridge tags along one physical
  // lane. Carry the stripe across those metadata boundaries without recentering.
  const family = new Set<number>();
  function walk(e: End, remaining: number) {
    if (family.has(e.ribbon.id) || remaining <= 0 || !e.ribbon.link || e.ribbon.lanes !== r.lanes)
      return;
    family.add(e.ribbon.id);
    const end = (e.start ? e.ribbon.pts.at(-1)! : e.ribbon.pts[0]).join(',');
    const j = joints.get(end)!;
    if (j.incoming.length === 1 && j.outgoing.length === 1)
      walk((e.start ? j.outgoing : j.incoming)[0], remaining - e.ribbon.line.length);
  }
  ends.forEach((e) => walk(e, 220));
  const observations = surveyedEdges.filter((p) => family.has(p.way));
  const inner = jointBoundary(
      r,
      s,
      observations.map((p) => p.inner),
    ),
    outer = jointBoundary(
      r,
      s,
      observations.map((p) => p.outer),
    );
  return inner && outer ? { s, inner, outer } : row;
}
const pins = new Map<Ribbon, Section[]>(ribbons.map((r) => [r, []]));
export interface LaneEnd {
  ribbon: Ribbon;
  lane: number;
}
export const laneKey = ({ ribbon, lane }: LaneEnd) => ribbon.key + '/' + lane;
export const successors = new Map<string, LaneEnd[]>();
for (const joint of joints.values()) {
  const all = [...joint.incoming, ...joint.outgoing];
  // The widest mainline supplies the common stripe grid. Outer slip lanes share
  // their exit choice at the nose. Median-side HOV ramps take the inside slot.
  const trunk = all.reduce((a, b) =>
    (a.ribbon.link === b.ribbon.link ? a.ribbon.lanes >= b.ribbon.lanes : !a.ribbon.link) ? a : b,
  );
  const total = trunk.ribbon.lanes;
  const basis = junctionSection(trunk, all);
  for (const side of [joint.incoming, joint.outgoing]) {
    const ordered = side.slice().sort((a, b) => {
      const f = frame(trunk.ribbon, trunk.start ? 0 : trunk.ribbon.line.length);
      const sideOf = (e: End) => {
        const s = e.start ? 16 : e.ribbon.line.length - 16,
          p = e.ribbon.line.at(s);
        return (p.x - f.x) * f.rx + (p.z - f.z) * f.rz;
      };
      return sideOf(a) - sideOf(b);
    });
    let assigned = 0;
    for (const e of ordered) {
      const leftRamp = e.ribbon.hov;
      const medianBranch = side.some((o) => o !== e && o.ribbon.hov);
      e.offset =
        e === trunk
          ? 0
          : e.ribbon.link && !leftRamp
            ? total - e.ribbon.lanes
            : !e.ribbon.link && medianBranch
              ? Math.min(1, total - e.ribbon.lanes)
              : 0;
      if (trunk.ribbon.link || side.filter(branch => !branch.ribbon.link).length > 1) e.offset = Math.min(assigned, total - e.ribbon.lanes);
      if (trunk.ribbon.id === deeringDonor && !trunk.start && e.start) {
        if (e.ribbon.id === deeringBranch) e.offset = 0;
        if (e.ribbon.id === deeringThrough) e.offset = 2;
      }
      assigned += e.ribbon.lanes;
      const s = e.start ? 0 : e.ribbon.line.length;
      pins.get(e.ribbon)!.push({
        s,
        inner: stripePoint(basis, e.offset / total),
        outer: stripePoint(basis, (e.offset + e.ribbon.lanes) / total),
      });
      if (e.ribbon.link && !trunk.ribbon.link) e.ribbon.direction = trunk.ribbon.direction;
    }
  }
  for (const from of joint.incoming)
    for (let i = 0; i < from.ribbon.lanes; i++) {
      const to: LaneEnd[] = [];
      for (const end of joint.outgoing) {
        const lane = from.offset + i - end.offset;
        if (lane >= 0 && lane < end.ribbon.lanes) to.push({ ribbon: end.ribbon, lane });
      }
      successors.set(laneKey({ ribbon: from.ribbon, lane: i }), to);
    }
}

export function alongOn(r: Pick<Ribbon, "pts" | "line">, p: P2) {
  let best = Infinity,
    along = 0;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1],
      b = r.pts[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1];
    const f = Math.max(
      0,
      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)),
    );
    const d = Math.hypot(a[0] + dx * f - p[0], a[1] + dz * f - p[1]);
    if (d < best) {
      best = d;
      along = r.line.cum[i - 1] + f * (r.line.cum[i] - r.line.cum[i - 1]);
    }
  }
  return { s: along, distance: best };
}

// At Georgia State a mapped junction lies *within* the measured span. Each
// approach owns its actual subset of that cross-section, including the SB choice.
const underRail: Record<number, [number, number]> = {
  949112684: [0, 5],
  39160892: [5, 7],
  119686423: [0, 7],
  316454382: [0, 7],
  119686426: [0, 6],
  9236888: [5, 7],
};
const railStation = (p: P2) => (p[0] - 760) * 0.8 - (p[1] - 545) * 0.6;
function measured(r: Ribbon, s: number, station: number) {
  const [first, last] = underRail[r.id],
    lanes = connectorLanes(r.direction, Math.max(-76, Math.min(77, station)))!;
  return { s, inner: lanes.edges[first], outer: lanes.edges[last] };
}

// Survey cross-sections are inserted on the source polyline, preserving every
// original bend. Interpolate the lateral correction rather than cutting a chord
// across a curve between two widely spaced measurements.
for (const pick of surveyedEdges) {
  const midpoint = mix(pick.inner, pick.outer, 0.5);
  const r = ribbons
    .filter((w) => w.id === pick.way)
    .sort((a, b) => alongOn(a, midpoint).distance - alongOn(b, midpoint).distance)[0];
  if (!r) continue;
  const s = alongOn(r, mix(pick.inner, pick.outer, 0.5)).s;
  if (s > 0.1 && s < r.line.length - 0.1) pins.get(r)!.push({ s, inner: pick.inner, outer: pick.outer });
}
const index = new PlacementIndex<Ribbon>();
for (const r of ribbons) {
  const anchors = pins.get(r)!;
  if (underRail[r.id]) {
    for (let i = 1; i < r.pts.length; i++) {
      const a = railStation(r.pts[i - 1]),
        b = railStation(r.pts[i]);
      for (const station of [-76, 77]) {
        const f = (station - a) / (b - a);
        if (f > 0 && f < 1) {
          const s = r.line.cum[i - 1] + f * (r.line.cum[i] - r.line.cum[i - 1]);
          anchors.push(measured(r, s, station));
        }
      }
    }
  }
  anchors.sort((a, b) => a.s - b.s);
  const stations = new Set([...r.line.cum, ...anchors.map((a) => a.s), ...deeringStations(r.id).filter(s=>s>0 && s<r.line.length)]);
  for (const p of anchors)
    for (const delta of [-50, 50]) {
      const s = p.s + delta;
      if (s > 0 && s < r.line.length && anchors.every((a) => Math.abs(s - a.s) >= 49.99)) {
        stations.add(s);
      }
    }
  // Paint, structural treads and lane centre paths share these sections.
  // Continue the eight-metre sampling grid through source way boundaries.
  const start = r.station0 ?? 0;
  for (let station = (Math.floor(start / 8) + 1) * 8; station < start + r.line.length; station += 8)
    stations.add(station - start);
  for (const s of [...stations].sort((a, b) => a - b)) {
    const row = typical(r, s),
      p = r.line.at(s),
      station = railStation([p.x, p.z]);
    if (underRail[r.id] && station >= -76 - 1e-6 && station <= 77 + 1e-6) {
      r.rows.push(measured(r, s, station));
      continue;
    }
    const right = anchors.find((a) => a.s >= s) ?? anchors.at(-1)!;
    const left = anchors[anchors.indexOf(right) - (right.s > s ? 1 : 0)] ?? anchors[0];
    const gap = right.s - left.s;
    const t = gap ? (s - left.s) / gap : 0;
    for (const [anchor, weight] of [
      [left, 1 - t],
      [right, t],
    ] as const) {
      // Long unsurveyed gaps return to the local OSM alignment. Close observed
      // sections carry their correction continuously through the bend.
      const w = gap > (r.link ? 140 : 300) ? Math.max(0, 1 - Math.abs(anchor.s - s) / 50) : weight;
      if (!w) continue;
      const base = typical(r, anchor.s);
      for (const k of ['inner', 'outer'] as const)
        for (const j of [0, 1]) row[k][j] += (anchor[k][j] - base[k][j]) * w;
    }
    r.rows.push(deeringSection(r.id,row));
  }
  index.add(r, r.pts, 32);
}

export function sectionAt(r: Ribbon, s: number): Section {
  const rows = r.rows;
  let lo = 0,
    hi = rows.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (rows[m].s <= s) lo = m;
    else hi = m;
  }
  const a = rows[lo],
    b = rows[hi],
    t = Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s || 1)));
  return { s, inner: mix(a.inner, b.inner, t), outer: mix(a.outer, b.outer, t) };
}

const mainline = (direction: ConnectorDirection) => ribbons
  .filter((r): r is Ribbon & { station0: number } => r.direction === direction && r.station0 !== undefined)
  .sort((a, b) => b.station0 - a.station0);
const carriageways = { northbound: mainline('northbound'), southbound: mainline('southbound') };

/** Half-open mainline interval in metres of travel from that direction's
 * Georgia State origin. At a source junction the downstream ribbon owns s. */
export function connectorSectionAtStation(direction: ConnectorDirection, stationM: number) {
  const ways = carriageways[direction];
  if (stationM >= ways[0].station0 + ways[0].line.length) return undefined;
  const ribbon = ways.find(r => stationM >= r.station0);
  if (ribbon) return { ribbon, section: sectionAt(ribbon, stationM - ribbon.station0) };
}

/** Match the carrying axis and travel direction, including separately mapped HOV lanes. */
export function matchRibbon(a: P2, b: P2, link: boolean, kind?: Kind) {
  const mid = mix(a, b, 0.5),
    dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  let best = 2.5,
    found: Ribbon | undefined;
  for (const r of index.at(...mid)) {
    if (r.link !== link || (kind && r.kind !== kind)) continue;
    const near = alongOn(r, mid),
      p = r.line.at(near.s);
    if (near.distance >= best || dx * p.dx + dz * p.dz < 0.94 * length) continue;
    found = r;
    best = near.distance;
  }
  return found;
}
