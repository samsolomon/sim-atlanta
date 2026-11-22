import * as THREE from 'three';
import { segDist, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { PAL } from '../vignette/world';
import type { TerrainQuality } from './surface';
import { roadWidth, type TerrainCity } from './transport-data';
import { paintConnector } from './connector-paint';

const landColors: Record<string, string> = {
  grass: '#b7c298', park: '#adbe90', meadow: '#a5b46e', wood: '#94aa82', garden: '#94ad78',
  brownfield: '#a99a7c', construction: '#b49a76', pedestrian: '#d6cdbd', plaza: '#d6cdbd',
  track: '#b98c77', pitch: '#78a467', playground: '#bba486', parking: '#76787c', fountain: '#91b4bc',
};
const landOrder = Object.keys(landColors);
const paths = new Set(['footway', 'pedestrian', 'steps', 'cycleway', 'path']);
const streets = new Set(['residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk']);
type PaintRoad = { cls: string; sub?: string | null; pts: P2[] };

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

/** The board carries ground detail, so slopes, voids and rail openings share its geometry. */
export function groundMap(data: TerrainCity, quality: TerrainQuality) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = quality === 'low' ? 2048 : 4096;
  const ctx = canvas.getContext('2d')!;
  const b = data.bounds;
  ctx.scale(canvas.width / (b.maxX - b.minX), canvas.height / (b.maxZ - b.minZ));
  ctx.translate(-b.minX, -b.minZ);
  ctx.fillStyle = '#b5bd97';
  ctx.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  // At low detail a texel spans 0.98 m. Keep the illustrative stripes legible
  // without allocating a second texture or changing the 2.6 m parking spacing.
  const texelM = (b.maxX - b.minX) / canvas.width;
  const stallLine = Math.max(.33, .8 * texelM);
  const zebraPattern = [Math.max(.65, 1.45 * texelM), Math.max(.75, 1.25 * texelM)];
  const covers = (data.ground ?? []).filter(g => g.kind in landColors)
    .sort((a,b) => landOrder.indexOf(a.kind) - landOrder.indexOf(b.kind));
  for (const g of covers) {
    ctx.beginPath();
    for (const ring of g.rings) { trace(ctx, ring); ctx.closePath(); }
    ctx.fillStyle = landColors[g.kind];
    ctx.fill('evenodd');
    if (g.kind === 'parking' && g.rings.length) stripeLot(ctx, g.rings[0], stallLine);
    if (g.kind === 'pitch') { ctx.lineWidth = .45; ctx.strokeStyle = '#e9e7db'; ctx.stroke(); }
  }

  const roads: PaintRoad[] = [...data.roads.filter(r => !r.bridge && !r.tunnel),
    ...(data.terrainTransport?.roads.filter(r => r.kind === 'ground') ?? [])];
  const priority = (r: PaintRoad) => paths.has(r.cls) ? 0 : r.cls === 'service' ? 1 : 2;
  roads.sort((a, b) => priority(a) - priority(b));
  function stroke(r: PaintRoad, width: number, color: string) {
    ctx.beginPath(); trace(ctx, r.pts);
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  }
  // Sidewalks go down first so a casing can't cut across the next intersection.
  for (const r of roads) if (streets.has(r.cls)) stroke(r, roadWidth(r) + 5, PAL.sidewalk);
  const crosswalks = roads.filter(r => r.sub === 'crosswalk');
  for (const r of roads) {
    if (r.sub === 'crosswalk') continue;
    const w = roadWidth(r);
    stroke(r, w, paths.has(r.cls) ? PAL.sidewalk : r.cls === 'motorway' ? PAL.asphaltHwy : PAL.asphalt);
  }
  for (const r of roads) {
    if (r.cls === 'motorway' && r.sub !== 'link') {
      ctx.setLineDash([4, 8]); stroke(r, .55, PAL.lineWhite); ctx.setLineDash([]);
    } else if (streets.has(r.cls) && roadWidth(r) >= 9) {
      stroke(r, .4, '#d8bd79');
    }
  }
  paintConnector(ctx, data, texelM);
  ctx.setLineDash(zebraPattern);
  for (const r of crosswalks) stroke(r, 2.8, PAL.lineWhite);
  ctx.setLineDash([]);

  // Supplement mapped crossing ways with point-only zebras snapped to at-grade streets.
  if (data.points?.crossing?.length) {
    type Segment = { a: P2; b: P2; road: PaintRoad };
    const index = new PlacementIndex<Segment>(24);
    for (const r of roads) {
      if (!streets.has(r.cls) && r.sub !== 'crosswalk') continue;
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
        if (seg.road.sub === 'crosswalk' && d <= 3) { best = undefined; break; }
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
