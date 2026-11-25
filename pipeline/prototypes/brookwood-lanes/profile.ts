// Sections are stored in source order. Ordinals increase from driver's left to right.
import { ribbons, sectionAt, stripePoint, type Ribbon, type Section } from '../../../web/src/terrain/connector-corridor';
import { PAL } from '../../../web/src/vignette/world';

export function directedStripe(row: Section, ordinal: number, lanes: number, direction: 1 | -1) {
  const fraction = ordinal / lanes;
  return stripePoint(row, direction === 1 ? fraction : 1 - fraction);
}

// The two SB ways have one forward, five-lane continuation. A lane center is
// ordinal + 0.5, the same fraction ConnectorTraffic uses along these rows.
function pavement(ribbon: Ribbon, start: number) {
  const stations = new Set(ribbon.rows.map(row => row.s));
  for (let s = Math.floor(start / 12) * 12 - start; s < ribbon.line.length; s += 12) {
    for (const edge of [s, s + 3]) {
      if (edge > 0 && edge < ribbon.line.length) stations.add(edge);
    }
  }
  return {
    ribbon, start,
    rows: [...stations].sort((a, b) => a - b).map(s => sectionAt(ribbon, s)),
  };
}

const upstream = ribbons.find(r => r.id === 38983384)!;
const downstream = ribbons.find(r => r.id === 1409808969)!;
export const southbound = [pavement(upstream, 0), pavement(downstream, upstream.line.length)];

export function paintSouthbound(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineCap = 'butt';
  for (const { ribbon, rows, start } of southbound) {
    const lanes = ribbon.lanes;
    const band = (left: number, right: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(...directedStripe(rows[0], left, lanes, 1));
      for (const row of rows.slice(1)) ctx.lineTo(...directedStripe(row, left, lanes, 1));
      for (let i = rows.length - 1; i >= 0; i--) ctx.lineTo(...directedStripe(rows[i], right, lanes, 1));
      ctx.closePath();
      ctx.fill();
    };
    band(-2.2 / 3.55, lanes + 2.8 / 3.55, '#66666c');
    band(0, lanes, PAL.asphaltHwy);
    for (let ordinal = 0; ordinal <= lanes; ordinal++) {
      const edge = ordinal === 0 || ordinal === lanes;
      ctx.strokeStyle = ordinal === 0 ? PAL.lineYellow : PAL.lineWhite;
      ctx.lineWidth = edge ? .28 : .24;
      ctx.beginPath();
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        if (!edge && (start + (a.s + b.s) / 2) % 12 >= 3) continue;
        ctx.moveTo(...directedStripe(a, ordinal, lanes, 1));
        ctx.lineTo(...directedStripe(b, ordinal, lanes, 1));
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
