// Source-directed road cross sections on the untouched and corrected City tread.
import { Matrix4, Vector3, InstancedMesh } from '../../../web/node_modules/three';
import { ConnectorTraffic } from '../../../web/src/city/connector-traffic';
import { alongOn } from '../../../web/src/terrain/connector-corridor';
import { Line } from '../../../web/src/vignette/geom';
import { readFileSync } from 'node:fs';
import { brookwoodGrid } from '../../../web/src/city/brookwood';
import { midtownConnectorGround } from '../../../web/src/terrain/midtown-connector-ground';
import { auburnTransport } from '../../../web/src/city/sweet-auburn-transport';
import { midtownConnectorDecks } from '../../../web/src/terrain/midtown-connector-decks';
import { GroundSurface } from '../../../web/src/terrain/surface';
import { createSurfaceTransport } from '../../../web/src/terrain/transport';
import { matchRibbon, sectionAt, stripePoint, ribbons } from '../../../web/src/terrain/connector-corridor';
import { bridgeApproaches } from '../../../web/src/terrain/bridge-approaches';
import { seventeenthPortals } from '../../../web/src/city/seventeenth-street';
import { cityRoadHeight } from '../../../web/src/city/road-height';

import { pavementRays } from './ray';
import { northFreeway } from './carrier';

const north = process.argv.includes('--north');
const base = north
  ? 'pipeline/prototypes/north-row-transport/'
  : 'pipeline/prototypes/square-board/brookwood-station/';
const manifest = JSON.parse(readFileSync(base + 'ground.json', 'utf8'));
const bytes = Uint8Array.from(readFileSync(base + 'ground.i16')).buffer;
const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest, bytes));
const original = midtownConnectorDecks(
  auburnTransport(JSON.parse(readFileSync(base + 'context.json', 'utf8'))),
);
const city = process.argv.includes('--after') ? northFreeway(original) : original;
const surface = new GroundSurface(grid, process.argv.includes('--high') ? 'high' : 'low', undefined, [
  { z: -5700, minX: -1000, maxX: 1800 },
  { z: -4900, minX: -1000, maxX: 1800 },
]);
const banks = bridgeApproaches(
  seventeenthPortals(city),
  323.8,
  surface.sampleScene.bind(surface),
  city.bounds,
  city.roads,
);
const transport = createSurfaceTransport(city, grid, banks.groundAt);
const height = cityRoadHeight(city, banks.groundAt, transport.deckAt);
const rows = [];
const ray = pavementRays(transport);
const wheelMode = process.argv.includes('--wheels');
for (const id of [484857196, 484857197, 1257642776, 369529900, 1409808969, 38981789, 1416312985, 484857195]) {
  const r = ribbons.find((r) => r.id === id)!;
  const road = city.roads.find(
    (w) =>
      w.cls === 'motorway' && w.pts.length > 1 && matchRibbon(w.pts[0], w.pts[1], w.sub === 'link') === r,
  );
  if (!road) {
    if (north) continue;
    throw Error('No source road ' + id);
  }
  for (let s = 1; s < r.line.length; s += 4) {
    const row = sectionAt(r, s);
    const plane = [0.01, 0.5, 0.99].map((f) => stripePoint(row, f));
    if (plane.some((p) => p[1] <= city.bounds.minZ + 0.05 || p[1] >= city.bounds.maxZ - 0.05)) continue;
    const heights = plane.map(([x, z]) => height(x, z, road));
    const width = Math.hypot(plane[2][0] - plane[0][0], plane[2][1] - plane[0][1]);
    if (wheelMode) {
      for (let lane = 0; lane < r.lanes; lane++) {
        for (const dz of [-1.3575, 1.4675])
          for (const side of [-1, 1]) {
            const dx = side * (dz < 0 ? 0.7925 : 0.79);
            const axle = sectionAt(r, s + dz);
            const [x, z] = stripePoint(axle, (lane + 0.5 + dx / 3.55) / r.lanes);
            const tread = height(x, z, { ...road, bridge: r.kind === 'bridge', pts: r.pts });
            const bare = banks.groundAt(x, z);
            rows.push({ id, s, lane, dx, dz, x, z, tread, bare, ray: ray(x, z) });
          }
      }
      continue;
    }
    const ground = plane.map(([x, z]) => banks.groundAt(x, z));
    rows.push({
      ground,
      id,
      s,
      xz: plane[1],
      height: heights,
      width,
      lanes: r.lanes,
      crossPct: (100 * (heights[2]! - heights[0]!)) / width,
    });
  }
}
if (process.argv.includes('--seam')) {
  const r = ribbons.find((r) => r.id === 369529900)!;
  const owner = { cls: 'motorway', name: 'Downtown Connector', bridge: false, tunnel: false, pts: r.pts };
  const out = [];
  for (let i = 0; i <= 20; i++) {
    const f = 0.01 + (i * 0.98) / 20;
    let lo = 0,
      hi = r.line.length;
    for (let j = 0; j < 48; j++) {
      const mid = (lo + hi) / 2;
      if (stripePoint(sectionAt(r, mid), f)[1] > -5700) lo = mid;
      else hi = mid;
    }
    const [x] = stripePoint(sectionAt(r, (lo + hi) / 2), f);
    const z = -5700 + (north ? -0.002 : 0.002);
    out.push({ f, x, z, tread: height(x, z, owner), ray: ray(x, z) });
  }
  console.log(JSON.stringify(out));
} else if (process.argv.includes('--neighbors')) {
  const out = [];
  for (const road of city.roads.filter((r) => r.name === 'Buford-Spring Connector')) {
    const line = new Line(road.pts);
    for (let s = 2; s < line.length; s += 5) {
      const p = line.at(s);
      if (p.x < 550 || p.x > 1050) continue;
      for (const offset of [-2, 0, 2]) {
        const x = p.x + offset * p.nx,
          z = p.z + offset * p.nz;
        if (z <= city.bounds.minZ || z >= city.bounds.maxZ) continue;
        out.push([x, z, height(x, z, road)]);
      }
    }
  }
  console.log(JSON.stringify(out));
} else if (process.argv.includes('--instances')) {
  const hourly = JSON.parse(readFileSync('web/public/data/scene/downtown/traffic.json', 'utf8')).hourly;
  const layer = new ConnectorTraffic({
    city,
    roadHeight: height,
    hourly,
    quality: process.argv.includes('--high') ? 'high' : 'low',
  });
  const start = Date.parse('2026-11-20T08:01:12-05:00');
  const samples = [];
  const matrix = new Matrix4();
  for (let second = 0; second < 16; second++) {
    layer.update(start + second * 1000, 0);
    const sedans = layer.group.children[0] as InstancedMesh;
    for (let i = 0; i < sedans.count; i++) {
      sedans.getMatrixAt(i, matrix);
      const p = new Vector3().setFromMatrixPosition(matrix);
      const road = ribbons.find(
        (r) => [369529900, 1416312985].includes(r.id) && alongOn(r, [p.x, p.z]).distance < 10.6,
      );
      if (!road) continue;
      const gaps = [];
      for (const dz of [-1.3575, 1.4675])
        for (const side of [-1, 1]) {
          const tire = new Vector3(side * (dz < 0 ? 0.7925 : 0.79), 0, dz).applyMatrix4(matrix);
          const top = ray(tire.x, tire.z);
          gaps.push(top === null ? null : tire.y - top);
        }
      samples.push({ second, id: road.id, position: p.toArray(), gaps });
    }
  }
  console.log(JSON.stringify(samples));
  layer.dispose();
} else console.log(JSON.stringify(rows));
if (north && process.argv.includes('--terminal')) {
  for (const link of [false, true]) {
    const road = city.roads.find(
      (w) => (w.sub === 'link') === link && Math.hypot(w.pts[0][0] - 982.478, w.pts[0][1] + 5830.414) < 0.02,
    )!;
    const axis = new Line(road.pts);
    for (const s of [0, 0.02, 5, 15, 25, 39.98, 40, 40.02, 50]) {
      const p = axis.at(s),
        vals = [-1, 0, 1].map((f) => {
          const x = p.x + p.nx * f * (link ? 1.5 : 6),
            z = p.z + p.nz * f * (link ? 1.5 : 6);
          return [height(x, z, road), banks.groundAt(x, z)];
        });
      console.error(link ? 'exit' : 'through', s, JSON.stringify(vals));
    }
  }
}
