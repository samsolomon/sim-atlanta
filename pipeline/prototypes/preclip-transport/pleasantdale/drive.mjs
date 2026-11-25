// Replay frozen requests against the emitted network. No routing by XY overlap.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { triangleHeight } from "../../../../web/src/terrain/tread-height.ts";
const require = createRequire(
  new URL("../../../../web/package.json", import.meta.url),
);
const {
  Mesh,
  MeshBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Raycaster,
  Vector3,
} = require("three");
const fixture = JSON.parse(readFileSync(0, "utf8")),
  read = (name) =>
    JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const control = read("acceptance.json");
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
for (const s of fixture.surfaces) {
  s.meshes = s.pieces.map((piece) => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(
        piece.flatMap((p) => p.slice(0, 3)),
        3,
      ),
    );
    return new Mesh(g, new MeshBasicMaterial({ side: DoubleSide }));
  });
}
function sample(owner, x, z) {
  const mesh = owner.meshes[Number(z >= owner.cutZ)],
    p = mesh.geometry.attributes.position;
  x = Math.fround(x);
  z = Math.fround(z);
  ray.ray.origin.set(x, 500, z);
  const hit = ray.intersectObject(mesh)[0];
  if (!hit) return null;
  const h = triangleHeight(p, hit.faceIndex * 3, x, z);
  assert.ok(Number.isFinite(h) && Math.abs(h - hit.point.y) < 0.0001);
  return h;
}
function segDist(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[2] - a[2],
    t = Math.min(
      1,
      Math.max(
        0,
        ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
  return Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
}
const surface = (way, lane) =>
  fixture.surfaces.find((v) => v.way === way && v.lane === lane);
function plan(from, lane, to) {
  if (from !== fixture.approach) return null;
  const connection = fixture.connections.find(
    ([i, d]) => i === lane && d === to,
  );
  return connection ? [surface(from, lane), surface(to, connection[2])] : null;
}
function pose(surf, s) {
  const rows = surf.rows;
  let i = 1;
  while (i < rows.length - 1 && rows[i][0][3] < s) i++;
  const [a, b] = [rows[i - 1], rows[i]].map((r) =>
    r[0].map((v, j) => (v + r[1][j]) / 2),
  );
  const f = (s - a[3]) / (b[3] - a[3]),
    len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  return [
    a[0] + f * (b[0] - a[0]),
    a[2] + f * (b[2] - a[2]),
    (b[0] - a[0]) / len,
    (b[2] - a[2]) / len,
  ];
}
assert.equal(fixture.intersections.length, control.negativeCrossings.length);
for (const expected of control.negativeCrossings) {
  const crossing = fixture.intersections.find(
    (c) => c.branch === expected.branch && c.deck === expected.deck,
  );
  assert.ok(crossing && Math.abs(crossing.station - expected.station) < 0.001);
  assert.deepEqual(crossing.sharedNodes, []);
  assert.equal(crossing.layer, "1");
}
const drives = [];
for (const [lane, to, receiving] of control.permitted) {
  const route = plan(control.approach, lane, to);
  assert.equal(route?.[1].lane, receiving);
  const join = route[0].rows.at(-1),
    start = route[1].rows[0];
  const seam = Math.max(
    ...join.map((p, i) =>
      Math.hypot(...p.slice(0, 3).map((v, j) => v - start[i][j])),
    ),
  );
  assert.ok(seam < 0.0001);
  const [jx, , jz] = join[0],
    edge = join[1];
  const downstream = (x, z) =>
    (edge[0] - jx) * (z - jz) - (edge[2] - jz) * (x - jx) < 0;
  let wheelSamples = 0,
    minEdge = Infinity;
  const decks = fixture.surfaces.filter((v) => v.lane === 0);
  const crossings = decks.map((d) => ({
    upper: d.way,
    approachSamples: 0,
    firstM: null,
    lastM: null,
    minTreadSeparationM: Infinity,
  }));
  for (let s = -58; s <= 203; s += 0.5) {
    const owner = s < 0 ? route[0] : route[1];
    const [cx, cz, dx, dz] = pose(owner, s < 0 ? s + 60 : s);
    for (const axle of [-1.4, 1.4])
      for (const lateral of [-0.8, 0.8]) {
        const x = cx + dx * axle - dz * lateral,
          z = cz + dz * axle + dx * lateral;
        const carrier = route[Number(downstream(x, z))],
          h = sample(carrier, x, z);
        assert.ok(h !== null, "lost wheel on " + carrier.way + " at " + s);
        wheelSamples++;
        for (let i = 1; i < carrier.rows.length; i++)
          for (const k of [0, 1])
            minEdge = Math.min(
              minEdge,
              segDist(x, z, carrier.rows[i - 1][k], carrier.rows[i][k]),
            );
      }
    for (const [i, deck] of decks.entries()) {
      const top = sample(deck, cx, cz);
      if (top === null) continue;
      const lower = sample(owner, cx, cz);
      assert.ok(lower !== null && top - lower > 0);
      const c = crossings[i];
      c.approachSamples++;
      c.firstM ??= s;
      c.lastM = s;
      c.minTreadSeparationM = Math.min(c.minTreadSeparationM, top - lower);
    }
  }
  assert.ok(minEdge > 0);
  for (const c of crossings) {
    assert.ok(c.approachSamples > 0);
    assert.equal(plan(to, receiving, c.upper), null);
    assert.equal(plan(c.upper, 1, to), null);
    assert.equal(plan(control.approach, lane, c.upper), null);
  }
  drives.push({
    lane,
    to,
    receiving,
    wheelSamples,
    missing: 0,
    minLaneEdgeMarginM: minEdge,
    jointStep3dM: seam,
    crossings,
  });
}
for (const [lane, to] of control.forbidden)
  assert.equal(plan(control.approach, lane, to), null);
assert.equal(fixture.connections.length, control.permitted.length);
const validation = [];
for (const [id, s, groups] of read("reserved-returns.json")) {
  const deck = fixture.surfaces.some((r) => r.way === id && r.lane === 0);
  const g = groups.filter(
    ([c, n, , spread]) => c === (deck ? 17 : 2) && n >= 4 && spread <= 1.2,
  );
  if (g.length !== 1) {
    validation.push({ id, s, deltaM: null });
    continue;
  }
  const profile = fixture.profiles[id],
    i = profile.findIndex(([at]) => at >= s);
  assert.ok(i > 0);
  const [[a, h], [b, k]] = profile.slice(i - 1, i + 1);
  validation.push({
    id,
    s,
    deltaM: h + ((k - h) * (s - a)) / (b - a) - g[0][2],
  });
}
console.log(
  JSON.stringify({ drives, forbidden: control.forbidden, validation }, null, 2),
);
