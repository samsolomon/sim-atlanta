import { Line, segDist, type P2 } from '../vignette/geom';
import type { TerrainCity } from './transport-data';

export const westsideName = 'Westside Beltline Connector';
export const pathWidth = 3.2;
export const pathConcrete = '#e6e2d6';

// A mapped bridge feature can contain both approach paint and a shorter deck.
// The existing split runs carry geometry but no names. Match the original
// named line so the opposite sidewalk and actual vehicle spans keep their width.
export function westsidePaths(city: TerrainCity) {
  const named = city.roads.filter(r => r.name === westsideName && r.cls === 'footway' && r.sub !== 'crosswalk' && !r.tunnel);
  const paths = new Set<{ pts: P2[] }>(named);
  for (const source of named.filter(r => r.bridge)) {
    const segments = source.pts.slice(1).map((end, i) => [source.pts[i], end]);
    for (const run of city.terrainTransport?.roads ?? []) {
      if (run.cls === 'footway' && run.sub !== 'crosswalk' && run.pts.length >= 2 &&
        run.pts.every(([x, z]) => segments.some(([a, b]) => segDist(x, z, a, b) < .1))) paths.add(run);
    }
  }
  return paths;
}

// On Ivan Allen west of the bridge, a planted curb strip separates the
// south-side path from traffic. Draw it before crossing ramps and road paint.
export function paintMangumVerge(ctx: CanvasRenderingContext2D, pts: P2[]) {
  if (pts.length < 2 || !pts.every(([x, z]) => x <= -648 && z < -1040 && z > -1110)) return;
  const line = new Line(pts);
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = line.at(line.cum[i]);
    const side = Math.sign(p.dx);
    const x = p.x + side * p.nx * 2.9, z = p.z + side * p.nz * 2.9;
    if (i === 0) ctx.moveTo(x, z);
    else ctx.lineTo(x, z);
  }
  ctx.strokeStyle = '#96a279';
  ctx.lineWidth = 3.2;
  ctx.stroke();
}

export function paintPathPanels(ctx: CanvasRenderingContext2D, pts: P2[], texelM: number) {
  const line = new Line(pts);
  ctx.beginPath();
  for (let s = 3.2; s < line.length - .5; s += 3.2) {
    const p = line.at(s);
    ctx.moveTo(p.x - p.nx * pathWidth / 2, p.z - p.nz * pathWidth / 2);
    ctx.lineTo(p.x + p.nx * pathWidth / 2, p.z + p.nz * pathWidth / 2);
  }
  // Soften these thin control joints as the board texture coarsens.
  ctx.lineWidth = .16;
  ctx.strokeStyle = texelM > .6 ? '#d0ccc0' : '#c5c1b5';
  ctx.stroke();
}
