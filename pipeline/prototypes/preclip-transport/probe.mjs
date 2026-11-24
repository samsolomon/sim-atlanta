// Usage: node probe.mjs < baked.json
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { triangleHeight } from "../../../web/src/terrain/tread-height.ts";
import { gradeReport, gradeWarning } from "./grade.mjs";
const require = createRequire(
  new URL("../../../web/package.json", import.meta.url),
);
const {
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  DoubleSide,
  Raycaster,
  Vector3,
} = require("three");
const fixture = JSON.parse(readFileSync(0, "utf8"));
const surfaces = new Map(fixture.surfaces.map((s) => [s.id, s]));
const material = new MeshBasicMaterial({ side: DoubleSide });
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
for (const s of surfaces.values()) {
  s.meshes = s.pieces.map((vertices) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        vertices.flatMap((v) => v.slice(0, 3)),
        3,
      ),
    );
    return new Mesh(geometry, material);
  });
}
function sample(s, x, z, side = Number(z >= s.cutZ)) {
  x = Math.fround(x);
  z = Math.fround(z);
  const mesh = s.meshes[side];
  ray.ray.origin.set(x, 1000, z);
  const rendered = ray.intersectObject(mesh, false)[0]?.point.y;
  const p = mesh.geometry.getAttribute("position");
  let wheel;
  for (let i = 0; i < p.count; i += 3) {
    const h = triangleHeight(p, i, x, z);
    if (h !== null) wheel = Math.max(wheel ?? -Infinity, h);
  }
  return { rendered, wheel };
}
function check(s, x, z, side) {
  const { rendered, wheel } = sample(s, x, z, side);
  assert.ok(
    Number.isFinite(rendered) && Number.isFinite(wheel),
    `missing ${s.id} at ${x},${z}`,
  );
  assert.ok(
    Math.abs(rendered - wheel) < 0.0001,
    `wheel off the drawn surface on ${s.id}`,
  );
  return wheel;
}
function center(row) {
  return row[0].map((v, j) => (v + row[1][j]) / 2);
}
const owner = (id) => surfaces.get("osm:way:" + id);
const results = [];
for (const id of [1450813223, 1450813225, 1450813220, 9235148]) {
  const s = owner(id),
    z = s.cutZ;
  const edges = s.pieces.map((piece) =>
    piece.filter((v) => v[2] === z).map((v) => v[0]),
  );
  const spans = edges.map((xs) => [Math.min(...xs), Math.max(...xs)]);
  const [left, right] = spans[0];
  assert.ok(
    Math.max(...spans[1].map((v, j) => Math.abs(v - spans[0][j]))) < 1e-7,
  );
  const rows = s.rows.map(center);
  const j = rows.findIndex(
    (v, i) => i && (v[2] - z) * (rows[i - 1][2] - z) <= 0,
  );
  const a = rows[j - 1],
    b = rows[j],
    dx = b[0] - a[0],
    dz = b[2] - a[2],
    len = Math.hypot(dx, dz);
  const width = ((right - left) * Math.abs(dz)) / len;
  assert.ok(Math.abs(width - s.width) < 0.01, `width ${id}`);
  let step = 0,
    gradeChange = 0,
    missing = 0,
    probes = 0;
  for (let m = 0; m <= 40; m++) {
    // Sample the entire usable width, 1 mm inside the outer edges for ray precision.
    const x = left + 0.001 + ((right - left - 0.002) * m) / 40;
    step = Math.max(step, Math.abs(check(s, x, z, 0) - check(s, x, z, 1)));
  }
  for (const offset of [
    0,
    -0.8,
    0.8,
    -s.width / 2 + 0.01,
    s.width / 2 - 0.01,
  ]) {
    const x = (left + right) / 2 + (offset * len) / Math.abs(dz);
    const neighbours = fixture.relations
      .filter((r) => r.kind === "continuation" && r.ways.includes(id))
      .flatMap((r) => r.ways.filter((n) => n !== id))
      .map(owner);
    const heights = [];
    for (let i = -8; i <= 8; i++) {
      const d = i * 0.025,
        xx = x + (d * dx) / len,
        zz = z + (d * dz) / len;
      const p =
        [s, ...neighbours]
          .map((surface) => sample(surface, xx, zz))
          .find(
            (p) => Number.isFinite(p.rendered) && Number.isFinite(p.wheel),
          ) ?? {};
      probes++;
      if (!Number.isFinite(p.wheel) || !Number.isFinite(p.rendered)) {
        missing++;
        console.error(id, offset, d, p);
      }
      heights.push(p.wheel);
    }
    const gradeL = (heights[8] - heights[0]) / 0.2,
      gradeR = (heights[16] - heights[8]) / 0.2;
    gradeChange = Math.max(gradeChange, Math.abs(gradeL - gradeR));
  }
  assert.equal(missing, 0);
  assert.ok(step < 0.0002);
  assert.ok(gradeChange < 0.01, `grade change ${id}: ${gradeChange}`);
  results.push({
    id,
    probes,
    missing,
    seamStepM: step,
    gradeChangePp: 100 * gradeChange,
    usableWidthM: width,
  });
}
for (const r of fixture.relations) {
  const [x, z] = r.point;
  if (r.upper) {
    const clearance =
      check(owner(r.upper), x, z) - r.depth - check(owner(r.lower), x, z);
    assert.ok(
      clearance >= r.required - 0.001,
      `clearance ${r.upper} ${clearance}`,
    );
    let minimum = Infinity,
      overlapSamples = 0;
    const upper = owner(r.upper),
      lower = owner(r.lower);
    for (let j = 1; j < upper.rows.length; j++) {
      for (const f of [0, 0.5, 1])
        for (let k = 0; k <= 12; k++) {
          const g = 0.001 + (0.998 * k) / 12;
          const xy = [0, 2].map((dim) => {
            const interp = (row) =>
              row[0][dim] + g * (row[1][dim] - row[0][dim]);
            return (
              interp(upper.rows[j - 1]) * (1 - f) + interp(upper.rows[j]) * f
            );
          });
          const low = sample(lower, ...xy).rendered,
            high = sample(upper, ...xy).rendered;
          if (Number.isFinite(low) && Number.isFinite(high)) {
            minimum = Math.min(minimum, high - r.depth - low);
            overlapSamples++;
          }
        }
    }
    assert.ok(overlapSamples > 0 && minimum >= r.required - 0.001);
    results.push({
      upper: r.upper,
      lower: r.lower,
      modeledSoffitClearanceM: clearance,
      minimumSampleM: minimum,
      overlapSamples,
      marginM: minimum - r.required,
    });
  } else if (r.kind === "pedestrian-connection") {
    const joins = (axis) => axis.some(([px, pz]) => px === x && pz === z);
    assert.ok(joins(r.sidewalkAxis) && joins(r.crossingAxis));
    assert.equal(r.physicalSidewalkWidth, null);
  } else if (r.kind === "continuation" || r.kind === "same-grade") {
    // Source endpoint lies on boundary triangles. Use the native wheel tolerance.
    const heights = r.ways.map((id) => sample(owner(id), x, z).wheel);
    assert.ok(heights.every(Number.isFinite));
    assert.ok(Math.max(...heights) - Math.min(...heights) < 0.0002);
    results.push({
      node: r.node,
      kind: r.kind,
      stepM: Math.max(...heights) - Math.min(...heights),
    });
  }
}
assert.equal(
  fixture.relations.filter((r) => r.kind === "rail-over-road").length,
  8,
);
assert.equal(
  fixture.relations.filter((r) => r.kind === "pedestrian-connection").length,
  2,
);
// Independently captured points are validation inputs only. They retain the old
// painted alignments, which can be offset from the pilot source axis.
const observations = readFileSync(
  new URL("./reference.csv", import.meta.url),
  "utf8",
)
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [id, tier, station, track, x, z, wheel] = line.split(",");
    return {
      id: Number(id),
      tier,
      station: Number(station),
      track,
      x: Number(x),
      z: Number(z),
      old: wheel === "" ? null : Number(wheel),
    };
  });
for (const id of [1450813223, 1450813225, 1450813220, 9235148])
  for (const tier of new Set(
    observations.filter((r) => r.id === id).map((r) => r.tier),
  )) {
    const s = owner(id),
      records = observations.filter((r) => r.id === id && r.tier === tier);
    const carriers = [
      s,
      ...fixture.relations
        .filter((r) => r.kind === "continuation" && r.ways.includes(id))
        .flatMap((r) => r.ways.filter((n) => n !== id))
        .map(owner),
    ];
    const group = new Map(),
      errors = [];
    let oldMissing = 0,
      newMissing = 0,
      nearestStep = 0,
      maxGradeChange = 0,
      gradeTracks = 0;
    for (const r of records) {
      const h = carriers
        .map((surface) => sample(surface, r.x, r.z).wheel)
        .find(Number.isFinite);
      if (r.old === null) oldMissing++;
      if (!Number.isFinite(h)) newMissing++;
      if (r.old !== null && Number.isFinite(h)) errors.push(h - r.old);
      if (!group.has(r.track)) group.set(r.track, []);
      group.get(r.track).push(r);
    }
    for (const rows of group.values()) {
      rows.sort((a, b) => a.station - b.station);
      const left = rows
        .filter((r) => r.station < s.cutZ && r.old !== null)
        .at(-1);
      const right = rows.find((r) => r.station > s.cutZ && r.old !== null);
      const at = rows.find((r) => Math.abs(r.station - s.cutZ) < 1e-7);
      if (left && right)
        nearestStep = Math.max(nearestStep, Math.abs(right.old - left.old));
      if (left && right && at?.old != null) {
        const slope = (a, b) =>
          (b.old - a.old) / Math.hypot(b.x - a.x, b.z - a.z);
        const jump = Math.abs(slope(left, at) - slope(at, right));
        if (Number.isFinite(jump)) {
          maxGradeChange = Math.max(maxGradeChange, jump);
          gradeTracks++;
        }
      }
    }
    const at = records.filter((r) => Math.abs(r.station - s.cutZ) < 1e-7);
    const valid = at.filter((r) => r.old !== null);
    const span = (points) =>
      Math.max(
        0,
        ...points.flatMap((a) =>
          points.map((b) => Math.hypot(a.x - b.x, a.z - b.z)),
        ),
      );
    results.push({
      reference: id,
      tier,
      samples: records.length,
      oldMissing,
      newMissingAtOldXY: newMissing,
      maxAbsDifferenceAtCommonXYM: Math.max(...errors.map(Math.abs)),
      minSignedM: Math.min(...errors),
      maxSignedM: Math.max(...errors),
      nearestValidHeightDifferenceM: nearestStep,
      oldGradeChangePp: gradeTracks ? 100 * maxGradeChange : null,
      oldValidGradeTracks: gradeTracks,
      oldSampledEnvelopeM: span(at),
      oldValidProbeSpanAtCutM: span(valid),
      validTracksAtCut: valid.length,
    });
  }
assert.equal(
  gradeWarning("freeway", 65, "rolling", 5),
  "above contextual reference",
);
assert.equal(
  gradeWarning("urban arterial", 30, "rolling", 8),
  "within contextual reference",
);
for (const s of surfaces.values())
  results.push({
    profile: s.id,
    ...gradeReport(s),
    approachExcessM: s.outerApproachExcessM,
    approachWarning:
      s.outerApproachExcessM > 0.01
        ? "insufficient modeled approach length"
        : undefined,
    order: s.orderStatus,
  });
console.log(JSON.stringify(results, null, 2));
