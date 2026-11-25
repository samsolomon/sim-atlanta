import assert from 'node:assert/strict';
import { alongOn, sectionAt, stripePoint } from '../../../web/src/terrain/connector-corridor';
import { directedStripe, southbound } from './profile';
import { connectorTrafficRoutes } from '../../../web/src/city/connector-traffic-routes';
import type { TerrainCity } from '../../../web/src/terrain/transport-data';
import type { P2 } from '../../../web/src/vignette/geom';

const bounds = {minX:600,maxX:1600,minZ:-6300,maxZ:-5550};
const routes = connectorTrafficRoutes({bounds} as TerrainCity);
const [first, second] = southbound;
const distance = (a: P2, b: P2) => Math.hypot(a[0]-b[0], a[1]-b[1]);
const matched = routes.filter(route => route.roads.some(road => road.pts === first.ribbon.pts));
assert.equal(matched.length, 5);
let maxPathError = 0;
for (const {rows, ribbon} of southbound) {
  for (const row of rows) {
    for (let lane = 0; lane < 5; lane++) {
      const point = directedStripe(row, lane + .5, 5, 1);
      const route = matched.find(route => route.lane === lane)!;
      const nearest = alongOn({pts:route.line.pts, line:route.line}, point);
      maxPathError = Math.max(maxPathError, nearest.distance);
      assert.ok(distance(point, directedStripe(row, 4.5 - lane, 5, -1)) < 1e-9);
    }
    assert.ok(distance(row.inner, row.outer) > 17.7);
  }
  assert.equal(rows.at(-1)!.s, ribbon.line.length);
}
const cuts = [781, first.ribbon.line.length];
for(const ordinal of [-2.2/3.55, 0, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5+2.8/3.55]) {
  const before = directedStripe(first.rows.at(-1)!,ordinal,5,1);
  const after = directedStripe(second.rows[0],ordinal,5,1);
  assert.ok(distance(before,after)<1e-6);
}
const endPhase = first.start + first.ribbon.line.length;
assert.equal(endPhase, second.start);
assert.ok(maxPathError < .005);
console.log(JSON.stringify({ways:southbound.map(p=>p.ribbon.id),cuts,
  oldCutEdges:[0,1].map(f=>stripePoint(sectionAt(first.ribbon,781),f)),
  sectionCounts:southbound.map(p=>p.rows.length),maxPathErrorM:maxPathError,
  phaseAtJoinM:endPhase%12}));
