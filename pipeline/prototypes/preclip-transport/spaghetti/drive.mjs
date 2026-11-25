// Feed baked JSON on stdin. Run analytical checks against the clipped float32 draw buffers.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { triangleHeight } from "../../../../web/src/terrain/tread-height.ts";
import { gradeReport } from "../grade.mjs";
const req = createRequire(
  new URL("../../../../web/package.json", import.meta.url),
);
const { Float32BufferAttribute, Ray, Vector3 } = req("three");
const fixture = JSON.parse(readFileSync(0, "utf8"));
const read = (name) =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const route = fixture.surfaces[0],
  ray = new Ray(new Vector3(), new Vector3(0, -1, 0));
const vec = [new Vector3(), new Vector3(), new Vector3()],
  target = new Vector3();
const cell = (x) => Math.floor(x / 12);
for (const surface of fixture.surfaces)
  surface.tiles = surface.pieces.map((piece) => {
    const pos = new Float32BufferAttribute(
        piece.flatMap((p) => p.slice(0, 3)),
        3,
      ),
      cells = new Map();
    for (let i = 0; i < pos.count; i += 3) {
      const xs = [0, 1, 2].map((j) => cell(pos.getX(i + j))),
        zs = [0, 1, 2].map((j) => cell(pos.getZ(i + j)));
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
        for (let z = Math.min(...zs); z <= Math.max(...zs); z++) {
          const key = x + "," + z;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(i);
        }
    }
    return { pos, cells };
  });
function contact(surface, x, z, side = Number(z >= fixture.cut)) {
  x = Math.fround(x);
  z = Math.fround(z);
  const { pos, cells } = surface.tiles[side];
  ray.origin.set(x, 1000, z);
  for (const i of cells.get(cell(x) + "," + cell(z)) ?? []) {
    const h = triangleHeight(pos, i, x, z);
    if (h === null) continue;
    vec.forEach((v, j) => v.fromBufferAttribute(pos, i + j));
    if (ray.intersectTriangle(...vec, false, target))
      return { wheel: h, drawn: target.y };
  }
  return null;
}
function pose(s) {
  const rows = route.centers;
  let hi = rows.length - 1,
    lo = 0;
  while (hi - lo > 1) {
    const mid = (hi + lo) >> 1;
    if (rows[mid][3] <= s) lo = mid;
    else hi = mid;
  }
  const a = rows[lo],
    b = rows[hi],
    f = (s - a[3]) / (b[3] - a[3]);
  const [x, y, z, , width] = a.map((v, j) => v + f * (b[j] - v)),
    dx = b[0] - a[0],
    dz = b[2] - a[2],
    len = Math.hypot(dx, dz);
  return { x, y, z, width, tx: dx / len, tz: dz / len };
}
let wheels = 0,
  maxContact = 0,
  minMargin = Infinity;
const owners = new Set();
for (let s = 2; s < route.centers.at(-1)[3] - 2; s += 0.5) {
  const p = pose(s);
  owners.add(fixture.routeIds[fixture.ends.findIndex((v) => v >= s)]);
  // Follow the leftmost travel lane, 1.775 m from its edge. Two axles, 1.6 m track.
  for (const wheelOffset of [-0.8, 0.8])
    for (const longitudinal of [-1.4, 1.4]) {
      const offset = -p.width / 2 + 1.775 + wheelOffset;
      const x = p.x + p.tx * longitudinal - p.tz * offset,
        z = p.z + p.tz * longitudinal + p.tx * offset;
      const hit = contact(route, x, z);
      assert.ok(hit, "missing station " + s);
      maxContact = Math.max(maxContact, Math.abs(hit.drawn - hit.wheel));
      wheels++;
      minMargin = Math.min(minMargin, p.width / 2 - Math.abs(offset));
    }
}
assert.equal(owners.size, 9);
assert.ok(maxContact < 0.0001);
let seam = 0;
const xx = route.pieces[0].filter((p) => p[2] === fixture.cut).map((p) => p[0]);
for (let i = 0; i <= 40; i++) {
  const x =
    Math.min(...xx) +
    0.002 +
    ((Math.max(...xx) - Math.min(...xx) - 0.004) * i) / 40;
  const a = contact(route, x, fixture.cut, 0),
    b = contact(route, x, fixture.cut, 1);
  assert.ok(a && b);
  seam = Math.max(seam, Math.abs(a.wheel - b.wheel));
}
const cutStation = fixture.crossings.find(
  (c) => c.crossingWay === 41050323,
).station;
const cutPose = pose(cutStation),
  drawnWidth = (Math.max(...xx) - Math.min(...xx)) * Math.abs(cutPose.tz);
assert.ok(Math.abs(drawnWidth - cutPose.width) < 0.02);
const order = fixture.crossings.map((c, i) => {
  const [east, south] = c.crossXZ;
  const a = contact(route, -south, east),
    b = contact(fixture.surfaces[i + 1], -south, east);
  assert.ok(a && b);
  const delta = a.wheel - b.wheel;
  assert.equal(
    delta > 0,
    c.routeWay === c.upper,
    "wrong order at " + c.station,
  );
  return {
    stationM: c.station,
    crossingWay: c.crossingWay,
    routeMinusOtherM: +delta.toFixed(3),
  };
});
assert.ok(seam < 0.0001);
assert.ok(order.some((c) => c.routeMinusOtherM < 0));
const observed = read("reserved-returns.json"),
  residual = [];
for (const [, s, groups] of observed) {
  const id = fixture.routeIds[fixture.ends.findIndex((v) => v >= s)];
  const cls = [41108082, 41107890, 883783875].includes(id) ? 17 : 2;
  const obs = groups.filter(
    ([c, n, , spread]) => c === cls && n >= 4 && spread <= 1.2,
  );
  if (obs.length === 1) residual.push({ s, d: pose(s).y - obs[0][2] });
}
residual.sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
const nbi = read("acceptance.json").inventory.find((v) =>
  v.STRUCTURE_NUMBER_008.endsWith("2760"),
);
console.log(
  JSON.stringify(
    {
      distanceM: route.centers.at(-1)[3],
      wheels,
      wayCount: owners.size,
      maxContactM: maxContact,
      seamStepM: seam,
      drawnWidthAtCutM: drawnWidth,
      nominalWheelEdgeMarginM: minMargin,
      grade: gradeReport({ ...route, sourceClass: "motorway_link" }),
      order,
      heldOut: {
        stations: observed.length,
        comparable: residual.length,
        medianAbsM: Math.abs(residual[residual.length >> 1].d),
        p95AbsM: Math.abs(residual[Math.floor(0.95 * residual.length)].d),
        worst: residual.at(-1),
      },
      inventory: {
        mappedBridgeLengthM: fixture.ends[3] - fixture.ends[0],
        reportedStructureLengthM: +nbi.STRUCTURE_LEN_MT_049,
        modeledTravelWidthAtCutM: pose(
          fixture.crossings.find((c) => c.crossingWay === 41050323).station,
        ).width,
        reportedRoadwayWidthM: +nbi.ROADWAY_WIDTH_MT_051,
      },
    },
    null,
    2,
  ),
);
