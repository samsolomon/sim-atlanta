import type { P2 } from '../../../web/src/vignette/geom';

type RoadsidePoint = (id: number, station: number, offset: number) => P2;

/** Private Brookwood station paint pass. Call before the normal Connector shoulders
 * with the same world-XZ canvas transform. Widths and the 2 m end blends are inferred. */
export function paintNorthboundWallShoulder(ctx: CanvasRenderingContext2D, point: RoadsidePoint) {
  const way = 28038801;
  // Include the carrying ribbon's 8 m section breaks for exact edge alignment.
  const stations = [833, 835, 840, 848, 856, 860, 862];
  const outside = stations.map(s => point(way, s, s === 833 || s === 862 ? 2.8 : 3.6));
  // Overlap the existing shoulder paint on the inside to avoid a canvas antialias seam.
  const inside = stations.map(s => point(way, s, 1.8)).reverse();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(...outside[0]);
  for (const p of [...outside.slice(1), ...inside]) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fillStyle = '#66666c';
  ctx.fill();
  ctx.restore();
}
