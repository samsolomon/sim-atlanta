import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { triangleHeight } from "../../../web/src/terrain/tread-height.ts";
const require = createRequire(
  new URL("../../../web/package.json", import.meta.url),
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
const data = JSON.parse(
  readFileSync(new URL("./mayson.json", import.meta.url)),
);
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
const surfaces = new Map(),
  checks = [];
for (const s of data.surfaces) {
  s.meshes = s.tiles.map((faces) => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(
        faces.flat(1).flatMap((v) => v.slice(0, 3)),
        3,
      ),
    );
    return new Mesh(g, new MeshBasicMaterial({ side: DoubleSide }));
  });
  surfaces.set(s.way, s);
}
function height(s, x, z, tile = Number(x >= data.cutX)) {
  const mesh = s.meshes[tile];
  x = Math.fround(x);
  z = Math.fround(z);
  ray.ray.origin.set(x, 500, z);
  const hit = ray.intersectObject(mesh)[0];
  if (!hit) return null;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const h = triangleHeight(p, i, x, z);
    if (h === null) continue;
    assert.ok(Math.abs(h - hit.point.y) < 0.0001);
    return h;
  }
  throw Error("wheel misses drawn triangle");
}
for (const s of surfaces.values()) {
  const road = [9270932, 429349499].includes(s.way),
    halfTrack = road ? 0.8 : 0.55,
    wheelbase = road ? 2.8 : 2;
  const mid = s.rows.map(([a, b]) => a.map((v, i) => (v + b[i]) / 2));
  function pose(t) {
    const i = mid.findIndex((p) => p[3] >= t),
      a = mid[Math.max(0, i - 1)],
      b = mid[i],
      f = (t - a[3]) / (b[3] - a[3]);
    const dx = b[0] - a[0],
      dz = b[2] - a[2],
      l = Math.hypot(dx, dz);
    return [a[0] + f * dx, a[2] + f * dz, dx / l, dz / l];
  }
  let n = 0,
    peak = 0,
    maxChange = 0,
    prev;
  for (let t = mid[0][3] + 2; t < mid.at(-1)[3] - 2; t += 0.5) {
    const [x, z, dx, dz] = pose(t);
    for (const a of [-wheelbase / 2, wheelbase / 2])
      for (const d of [-halfTrack, halfTrack]) {
        assert.notEqual(
          height(s, x + dx * a - dz * d, z + dz * a + dx * d),
          null,
          "lost wheel " + s.way + " " + t,
        );
        n++;
      }
    const h = height(s, x, z);
    if (prev) {
      const g = 200 * (h - prev.h);
      peak = Math.max(peak, Math.abs(g));
      if (prev.g != null) maxChange = Math.max(maxChange, Math.abs(g - prev.g));
      prev = { h, g };
    } else prev = { h };
  }
  const zs = s.tiles[0]
    .flat(1)
    .filter((v) => Math.abs(v[0] - data.cutX) < 1e-7)
    .map((v) => v[2]);
  let seam = null;
  if (zs.length) {
    seam = 0;
    for (let j = 0; j <= 20; j++) {
      const z =
        Math.min(...zs) +
        0.003 +
        ((Math.max(...zs) - Math.min(...zs) - 0.006) * j) / 20;
      const a = height(s, data.cutX, z, 0),
        b = height(s, data.cutX, z, 1);
      assert.ok(a !== null && b !== null);
      seam = Math.max(seam, Math.abs(a - b));
    }
    assert.ok(seam < 0.0001);
  }
  checks.push({
    way: s.way,
    wheelSamples: n,
    missing: 0,
    widthM: s.widthM,
    peakGradePct: peak,
    maxChangePpOverHalfMetre: maxChange,
    seamM: seam,
  });
}
const contacts = data.crossings.map(({ a, b, xz }) => {
  const endpoint = a === 144485857;
  function localHeight(id) {
    const s = surfaces.get(id);
    if (!endpoint) return height(s, ...xz);
    const mid = s.rows.map(([p, q]) => p.map((v, j) => (v + q[j]) / 2));
    const ends = [mid[0], mid.at(-1)],
      i = Math.hypot(ends[0][0] - xz[0], ends[0][2] - xz[1]) < 0.01 ? 0 : 1;
    const p = ends[i],
      q = i ? mid.at(-2) : mid[1],
      l = Math.hypot(q[0] - p[0], q[2] - p[2]);
    assert.ok(Math.hypot(p[0] - xz[0], p[2] - xz[1]) < 0.01);
    return height(
      s,
      p[0] + (0.02 * (q[0] - p[0])) / l,
      p[2] + (0.02 * (q[2] - p[2])) / l,
    );
  }
  const upper = localHeight(a),
    low = localHeight(b);
  assert.ok(upper !== null && low !== null);
  const delta = upper - low;
  if (endpoint) assert.ok(Math.abs(delta) < 0.01);
  else assert.ok(delta > 0);
  return {
    a,
    b,
    xz,
    endpointInsetM: endpoint ? 0.02 : 0,
    topProxyNavd88: upper + 323.8,
    roadNavd88: low + 323.8,
    treadDifferenceM: delta,
    physicalClearanceM: null,
    heldOutUpperDifferenceM: endpoint
      ? null
      : upper + 323.8 - surfaces.get(a).heldOutUpperMedianNavd88M,
  };
});
console.log(JSON.stringify({ checks, contacts }, null, 2));
