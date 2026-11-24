import type { Underpass } from './underpass';
import { ansleyCrossing, ansleyStreet, clipCarriageways, paintPradoIslands, paverSurface } from './ansley-street-edge';
import * as THREE from 'three';
import { Line, segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { PAL } from '../vignette/world';
import type { TerrainQuality } from './surface';
import { dividedIvanAllen, roadWidth, type TerrainCity } from './transport-data';
import { paintMangumVerge, paintPathPanels, pathConcrete, pathWidth, westsidePaths } from './westside-path';
import { paintJunctionApproaches } from './junction-decks';
import { paintStreetBridgeApproaches } from './street-bridges';
import { isConnectorCity, paintConnector, surveyedRoad } from './connector-paint';
import { paintActiveOval } from '../city/active-oval';
import { paintWinnPark } from '../city/winn-park';

const landColors: Record<string, string> = {
  grass: '#b7c298', park: '#adbe90', meadow: '#a5b46e', wood: '#94aa82', garden: '#94ad78',
  brownfield: '#a99a7c', construction: '#b49a76', pedestrian: '#d6cdbd', plaza: '#d6cdbd',
  loading_apron: '#b2a89a', track: '#b98c77', pitch: '#78a467', playground: '#bba486', parking: '#76787c', fountain: '#91b4bc',
  water: '#739a9c', swimming_pool: '#73c7cb',
};
const landOrder = Object.keys(landColors);
const paths = new Set(['footway', 'pedestrian', 'steps', 'cycleway', 'path']);
const streets = new Set(['residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk']);
type PaintRoad = { name?: string | null; cls: string; sub?: string | null; pts: P2[] };

function trace(ctx: CanvasRenderingContext2D, pts: P2[]) {
  pts.forEach(([x, z], i) => i === 0 ? ctx.moveTo(x, z) : ctx.lineTo(x, z));
}

// Same illustrative 2.6 × 5.4 m stalls and 6.5 m aisles as the flat City's lots.
// The clip includes interior holes and keeps the paint inside the mapped pavement.
function stripeLot(ctx: CanvasRenderingContext2D, ring: P2[], lineWidth: number) {
  if (ring.length < 3) return;
  let longest = 0, angle = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = dx * dx + dz * dz;
    if (length > longest) { longest = length; angle = Math.atan2(dz, dx); }
  }
  const c = Math.cos(angle), s = Math.sin(angle);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, z] of ring) {
    const u = x*c + z*s, v = z*c - x*s;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u);
    v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  ctx.save();
  ctx.clip('evenodd');
  ctx.rotate(angle);
  ctx.beginPath();
  for (let v = v0 + 2; v + 5.4 <= v1; v += 17.3) {
    for (let u = u0 + 2; u < u1 - 1; u += 2.6) {
      ctx.moveTo(u, v); ctx.lineTo(u, v + 5.4);
      if (v + 17.3 <= v1) { ctx.moveTo(u, v + 11.9); ctx.lineTo(u, v + 17.3); }
    }
  }
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = '#cdc9bb';
  ctx.stroke();
  ctx.restore();
}

/**
 * Ground-map texel density per tier. Low (phones) paints about 1.4 m texels: at the
 * default full-board view a screen pixel covers ~4 m, so it reads the same as 1 m
 * texels, and it halves the rectangle's ground maps on the GPU (ground-map.test.ts
 * pins the budget). High keeps ~0.5 m texels for close views.
 */
export const GROUND_PX_PER_M: Record<TerrainQuality, number> = { low: 0.724, high: 4096 / 2000 };

/** Canvas size of a board's ground map at a tier. */
export function groundMapSize(bounds: TerrainCity['bounds'], quality: TerrainQuality) {
  const px = GROUND_PX_PER_M[quality];
  return { width: Math.max(1, Math.ceil((bounds.maxX - bounds.minX) * px)), height: Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) * px)) };
}

/** The board carries ground detail, so slopes, voids and rail openings share its geometry. */
export function groundMap(data: TerrainCity, quality: TerrainQuality, underpass?: Underpass) {
  const canvas = document.createElement('canvas');
  Object.assign(canvas, groundMapSize(data.bounds, quality));
  const ctx = canvas.getContext('2d')!;
  const b = data.bounds;
  ctx.scale(canvas.width / (b.maxX - b.minX), canvas.height / (b.maxZ - b.minZ));
  ctx.translate(-b.minX, -b.minZ);
  ctx.fillStyle = '#b5bd97';
  ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  // Keep the illustrative stripes legible on coarse maps without allocating a second
  // texture or changing the 2.6 m parking spacing. Widths follow the texel up to the
  // old low-tier 0.98 m; the 1.38 m low tier keeps those proportions and antialiases,
  // rather than painting lots and crossings as blotches of white.
  const texelM = (b.maxX - b.minX) / canvas.width;
  const markTexel = Math.min(texelM, .98);
  const stallLine = Math.max(.33, .8 * markTexel);
  const zebraPattern = [Math.max(.65, 1.45 * markTexel), Math.max(.75, 1.25 * markTexel)];
  const covers = (data.ground ?? []).filter(g => g.kind in landColors)
    .sort((a,b) => landOrder.indexOf(a.kind) - landOrder.indexOf(b.kind));
  for (const g of covers) {
    ctx.beginPath();
    for (const ring of g.rings) { trace(ctx, ring); ctx.closePath(); }
    ctx.fillStyle = landColors[g.kind];
    ctx.fill('evenodd');
    if (g.kind === 'parking' && g.rings.length) stripeLot(ctx, g.rings[0], stallLine);
    if (g.kind === 'swimming_pool') { ctx.lineWidth = .45; ctx.strokeStyle = '#dbd9c9'; ctx.stroke(); }
    if (g.kind === 'pitch') { ctx.lineWidth = .45; ctx.strokeStyle = '#e9e7db'; ctx.stroke(); }
  }
  paintActiveOval(ctx, data.bounds);
  paintWinnPark(ctx, data);

  // The ballast shoulder is paint on the same ground triangles as the bank.
  // It narrows into the existing 4.2 m track ribbons at both ends.
  const railCover = underpass?.spans.find(span => span.type === 'rail-ballast');
  if (underpass && railCover) {
    for (const run of data.terrainTransport?.rail ?? []) {
      const line = new Line(run.pts);
      let previous: P2[] | undefined;
      for (let d = 0; line.length; d = Math.min(d+3,line.length)) {
        const p = line.at(d), [s,t] = underpass.local(p.x,p.z);
        const station = s - (railCover.bankSkew ?? 0)*t;
        const within = station >= railCover.start && station <= railCover.end && Math.abs(t)<55;
        const half = 2.05 + 1.55*Math.max(0,Math.min(1,(55-Math.abs(t))/15));
        const row: P2[] = [[p.x-p.nx*half,p.z-p.nz*half],[p.x+p.nx*half,p.z+p.nz*half]];
        if(within && previous){
          ctx.beginPath();trace(ctx,[previous[0],previous[1],row[1],row[0]]);
          ctx.closePath();ctx.fillStyle=PAL.ballastFreight;ctx.fill();
        }
        previous=within ? row : undefined;
        if(d===line.length)break;
      }
    }
  }

  const roads: PaintRoad[] = [...data.roads.filter(r => !r.bridge && !r.tunnel),
    ...(data.terrainTransport?.roads.filter(r => r.kind === 'ground') ?? [])].filter(r => !isConnectorCity(data) || !surveyedRoad(r));
  const priority = (r: PaintRoad) => paths.has(r.cls) ? 0 : r.cls === 'service' ? 1 : 2;
  roads.sort((a, b) => priority(a) - priority(b));
  // A separately mapped sidewalk can continue above an OSM tunnel endpoint.
  // Follow the lower-road direction through the surveyed spans; a transverse
  // upper-street sidewalk still belongs on the board.
  const lowerSpans = underpass && [underpass.spans[0].start, underpass.spans.at(-1)!.end];
  const underpassWays = new Set<PaintRoad>();
  let hideRing: P2[] = [];
  if (underpass && lowerSpans) {
    const [start,end] = lowerSpans;
    const stations = [start,...underpass.breaks.filter(s => s>start && s<end),end];
    const half = underpass.halfWidth + 8;
    hideRing = [...stations.map(s => underpass.point(s,-half)),...stations.reverse().map(s => underpass.point(s,half))];
    for (const road of roads) {
      if (road.name === underpass.roadName) { underpassWays.add(road); continue; }
      if (road.sub !== 'sidewalk') continue;
      const points = road.pts.map(([x,z]) => underpass.local(x,z));
      const follows = points.some(([s,t],i) => {
        if (!i) return false;
        const [u,v] = points[i-1], ds=s-u;
        if (Math.abs(ds) < Math.max(4,3*Math.abs(t-v))) return false;
        const left=Math.max(start,Math.min(s,u)),right=Math.min(end,Math.max(s,u));
        if (right<=left) return false;
        const offset=v+(t-v)*((left+right)/2-u)/ds;
        return Math.abs(offset) < underpass.halfWidth + 2;
      });
      if (follows) underpassWays.add(road);
    }
  }
  function stroke(r: PaintRoad, width: number, color: string | CanvasPattern) {
    const hidden = underpassWays.has(r);
    if (hidden) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.minX,b.minZ,b.maxX-b.minX,b.maxZ-b.minZ);
      trace(ctx,hideRing);
      ctx.closePath();
      ctx.clip('evenodd');
    }
    ctx.beginPath(); trace(ctx, r.pts);
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
    if (hidden) ctx.restore();
  }
  // Sidewalks go down first so a casing can't cut across the next intersection.
  for (const r of roads) if (streets.has(r.cls)) stroke(r, roadWidth(r) + 5, PAL.sidewalk);
  const localStreets = roads.filter(r => r.cls === 'residential' && ansleyStreet(r));
  const pavers = localStreets.length ? paverSurface(quality === 'high') : PAL.sidewalk;
  for (const r of localStreets) {
    const width = roadWidth(r);
    stroke(r, width+5, pavers);
    stroke(r, width+1.9, '#819272');
    stroke(r, width+.6, '#aba99f');
  }
  const sidepaths = westsidePaths(data);
  for (const r of roads) if (sidepaths.has(r)) paintMangumVerge(ctx, r.pts);
  const crosswalks = roads.filter(r => r.sub === 'crosswalk');
  const crossings = roads.filter(ansleyCrossing);
  for (const r of roads) {
    if (r.sub === 'crosswalk' || ansleyCrossing(r)) continue;
    if (sidepaths.has(r)) {
      stroke(r, pathWidth, pathConcrete);
      paintPathPanels(ctx, r.pts, texelM);
      continue;
    }
    const w = roadWidth(r);
    stroke(r, w, r.sub === 'sidewalk' && ansleyStreet(r) ? pavers : paths.has(r.cls) ? PAL.sidewalk : r.cls === 'motorway' ? PAL.asphaltHwy : PAL.asphalt);
  }
  for (const r of roads) {
    if (r.cls === 'motorway' && r.sub !== 'link') {
      ctx.setLineDash([4, 8]); stroke(r, .55, PAL.lineWhite); ctx.setLineDash([]);
    } else if (dividedIvanAllen(r)) {
      ctx.setLineDash([3, 6]); stroke(r, .24, PAL.lineWhite); ctx.setLineDash([]);
    } else if (streets.has(r.cls) && r.cls !== 'residential' && roadWidth(r) >= 9) {
      // Wide residential streets (Ansley's circles) carry no centreline.
      stroke(r, .4, '#d8bd79');
    }
  }
  paintStreetBridgeApproaches(ctx, data);
  paintJunctionApproaches(ctx, data);
  paintConnector(ctx, data, texelM);
  ctx.setLineDash(zebraPattern);
  for (const r of crosswalks) stroke(r, 2.8, PAL.lineWhite);
  ctx.setLineDash([]);

  paintPradoIslands(ctx, data.bounds);
  if (crossings.length) {
    ctx.save();
    clipCarriageways(ctx, roads.filter(r => streets.has(r.cls) || r.cls === 'living_street')
      .map(r => ({pts:r.pts, width:roadWidth(r)})));
    ctx.setLineDash([Math.max(.72,markTexel),Math.max(.78,markTexel)]);
    for (const r of crossings) stroke(r, 3.1, '#e3dfcf');
    ctx.restore();
  }

  // Supplement mapped crossing ways with point-only zebras snapped to at-grade streets.
  if (data.points?.crossing?.length) {
    type Segment = { a: P2; b: P2; road: PaintRoad };
    const index = new PlacementIndex<Segment>(24);
    for (const r of roads) {
      if (!streets.has(r.cls) && r.sub !== 'crosswalk' && !ansleyCrossing(r)) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const a = r.pts[i - 1], b = r.pts[i];
        index.add({ a, b, road: r }, [a, b], 3);
      }
    }
    ctx.setLineDash(zebraPattern);
    for (const [x, z] of data.points.crossing) {
      let best: Segment | undefined, dist = 3;
      for (const seg of index.at(x, z)) {
        const d = segDist(x, z, seg.a, seg.b);
        if ((seg.road.sub === 'crosswalk' || ansleyCrossing(seg.road)) && d <= 3) { best = undefined; break; }
        if (d < dist) { best = seg; dist = d; }
      }
      if (!best) continue;
      const dx = best.b[0] - best.a[0], dz = best.b[1] - best.a[1], len = Math.hypot(dx, dz);
      if (!len) continue;
      const half = roadWidth(best.road) / (2 * len);
      ctx.beginPath();
      ctx.moveTo(x + dz * half, z - dx * half); ctx.lineTo(x - dz * half, z + dx * half);
      ctx.strokeStyle = PAL.lineWhite; ctx.lineWidth = 2.8; ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
