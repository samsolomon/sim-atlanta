import * as THREE from "three";
import { createSurfaceTransport } from "../../src/terrain/transport";
import { triangleHeight } from "../../src/terrain/tread-height";
import { RoadTraffic, slotsFor } from "../../src/city/road-traffic";
import { Line } from "../../src/vignette/geom";
import { PAL } from "../../src/vignette/world";

if (!import.meta.env.DEV) throw Error("Development fixture");
const data = await (await fetch("./bake.json")).json();
const route = data.surfaces[0];
const scene = new THREE.Scene();
scene.background = new THREE.Color("#d5e4e8");
scene.add(new THREE.HemisphereLight(0xffffff, 0xb7c6be, 1.65));
const sun = new THREE.DirectionalLight(0xffeed3, 2);
sun.position.set(-80, 160, 110);
scene.add(sun);
const render = new THREE.WebGLRenderer({
  canvas: document.querySelector("canvas"),
  antialias: true,
  preserveDrawingBuffer: true,
});
render.setSize(960, 540, false);
const camera = new THREE.PerspectiveCamera(52, 960 / 540, 0.2, 1500);
const bounds = { minX: -3000, maxX: 3000, minZ: -3000, maxZ: 3000 };
const city = { bounds, roads: [], buildings: [], rail: [] };
// Obtain City's actual deck material from a normal SurfaceTransport batch. Only
// the accepted fixture's trimmed triangle buffers enter the visible scene.
const materialSource = createSurfaceTransport(
  {
    ...city,
    terrainTransport: {
      version: 1,
      roads: [
        {
          kind: "bridge",
          cls: "primary",
          pts: [
            [2200, 2200],
            [2220, 2200],
          ],
          deckNavd88M: [300, 300],
        },
      ],
      rail: [],
    },
  },
  {
    manifest: { vertical: { sceneZeroNavd88M: 0 }, stepM: 5 },
    sample: () => 280,
  },
  () => 280,
);
const roadMaterial = materialSource.group
  .getObjectByName("Decks and embedded rails")
  .material.clone();
materialSource.dispose();
const pavement = new THREE.Group(),
  paint = new THREE.Group();
const crossGroups = new Map(),
  routeTiles = [];
const makeMesh = (vertices, color) => {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const rgb = new THREE.Color(color),
    colors = new Float32Array(vertices.length);
  for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, roadMaterial);
};
const roadOwners = data.routeIds.map((id) => ({
  id,
  cls: "motorway",
  name: String(id),
  bridge: true,
  tunnel: false,
}));
function indexAt(s) {
  return Math.min(
    roadOwners.length - 1,
    data.ends.filter((end) => end <= s).length,
  );
}
for (const surface of data.surfaces) {
  const group = new THREE.Group();
  pavement.add(group);
  crossGroups.set(surface.id, group);
  for (const piece of surface.pieces) {
    const mesh = makeMesh(
      piece.flatMap((v) => v.slice(0, 3)),
      PAL.asphaltHwy,
    );
    group.add(mesh);
    if (surface === route)
      routeTiles.push({ pos: mesh.geometry.attributes.position, piece });
  }
  // Use City's white/yellow marking palette and connector paint height (3 cm above asphalt).
  const stripes = [];
  for (let i = 1; i < surface.rows.length; i++) {
    const a = surface.rows[i - 1],
      b = surface.rows[i],
      w = surface.centers[i][4];
    const stripe = (row, d) =>
      row[0]
        .slice(0, 3)
        .map((v, j) => v + (row[1][j] - v) * d + (j === 1 ? 0.03 : 0));
    const lanes = Math.max(1, Math.round(w / 3.55));
    for (let n = 0; n <= lanes; n++) {
      if (n > 0 && n < lanes && Math.floor(a[0][3] / 5) % 2 !== 0) continue;
      const f = THREE.MathUtils.clamp(n / lanes, 0.15 / w, 1 - 0.15 / w),
        l = f - 0.09 / w,
        r = f + 0.09 / w;
      stripes.push(
        ...[
          stripe(a, l),
          stripe(a, r),
          stripe(b, r),
          stripe(a, l),
          stripe(b, r),
          stripe(b, l),
        ].flat(),
      );
    }
  }
  const markings = makeMesh(stripes, PAL.lineWhite);
  paint.add(markings);
  group.userData.markings = markings;
}
scene.add(pavement, paint);
const positions = route.rows.map(([a, b]) => {
  const f = 1.775 / Math.hypot(a[0] - b[0], a[2] - b[2]);
  return [a[0] + (b[0] - a[0]) * f, a[2] + (b[2] - a[2]) * f];
});
const line = new Line(positions);
const stations = route.centers.map((row) => row[3]);
function chainage(s) {
  let lo = 0,
    hi = stations.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (stations[mid] <= s) lo = mid;
    else hi = mid;
  }
  const f = (s - stations[lo]) / (stations[hi] - stations[lo]);
  return THREE.MathUtils.lerp(line.cum[lo], line.cum[hi], f);
}
function roadHeight(x, z, owner) {
  const { pos, piece } = routeTiles[Number(z >= data.cut)],
    k = roadOwners.indexOf(owner);
  if (k < 0) return null;
  for (let i = 0; i < pos.count; i += 3) {
    const a = piece[i][3],
      b = piece[i + 1][3],
      c = piece[i + 2][3];
    if (
      Math.max(a, b, c) < (data.ends[k - 1] ?? 0) - 0.001 ||
      Math.min(a, b, c) > data.ends[k] + 0.001
    )
      continue;
    const h = triangleHeight(pos, i, x, z);
    if (h !== null) return h;
  }
  return null;
}
const course = {
  line,
  roads: stations.map((s) => roadOwners[indexAt(s)]),
  speedMps: 25,
  dailyFlow: 1000,
  truckShare: 0,
};
const hourly = { weekday: Array(24).fill(1), weekend: Array(24).fill(1) };
const seed = 1,
  phase = slotsFor([course], 1, 1, seed, "low")[0].phase;
const traffic = new RoadTraffic(
  { city, hourly, quality: "low", roadHeight },
  [course],
  1,
  seed,
  "ramp check",
);
scene.add(traffic.group);
function place(s, overhead = false) {
  const at = chainage(s);
  traffic.update(Date.UTC(2026, 0, 1) + ((at - phase) * 1000) / 25, 0);
  if (traffic.visibleCars !== 1) throw Error("Car missing at " + s);
  const p = line.at(at),
    y = roadHeight(p.x, p.z, roadOwners[indexAt(s)]);
  if (y === null) throw Error("Carrier missing at " + s);
  camera.up.set(0, 1, 0);
  if (overhead) {
    camera.position.set(p.x, y + 28, p.z);
    camera.up.set(p.dx, 0, p.dz);
    camera.lookAt(p.x, y, p.z);
  } else {
    camera.position.set(p.x - 9 * p.dx, y + 3.2, p.z - 9 * p.dz);
    camera.lookAt(p.x + 3 * p.dx, y + 1.15, p.z + 3 * p.dz);
  }
  render.render(scene, camera);
  document.querySelector("output").textContent =
    s.toFixed(3) + " m · " + roadOwners[indexAt(s)].id;
  return {
    s,
    overhead,
    camera: camera.position.toArray(),
    direction: camera.getWorldDirection(new THREE.Vector3()).toArray(),
  };
}
// Difference two actual-material frames with identical roads, toggling only the car.
// The isolated silhouette is the denominator; depth-test the same camera again
// without paint and without the specific upper deck to identify the occluder.
const target = new THREE.WebGLRenderTarget(960, 540, { depthBuffer: true });
function pixels() {
  render.setRenderTarget(target);
  render.render(scene, camera);
  const bytes = new Uint8Array(960 * 540 * 4);
  render.readRenderTargetPixels(target, 0, 0, 960, 540, bytes);
  render.setRenderTarget(null);
  return bytes;
}
function count() {
  traffic.group.visible = false;
  const clear = pixels();
  traffic.group.visible = true;
  const car = pixels();
  let n = 0;
  for (let i = 0; i < car.length; i += 4)
    if (
      car[i] !== clear[i] ||
      car[i + 1] !== clear[i + 1] ||
      car[i + 2] !== clear[i + 2]
    )
      n++;
  return n;
}
function check(s, overhead = false) {
  const pose = place(s, overhead),
    visible = count();
  paint.visible = false;
  const withoutPaint = count();
  paint.visible = true;
  const upper = crossGroups.get("41051928");
  upper.visible = upper.userData.markings.visible = false;
  const withoutUpper = count();
  upper.visible = upper.userData.markings.visible = true;
  pavement.visible = paint.visible = false;
  const isolated = count();
  pavement.visible = paint.visible = true;
  place(s, overhead);
  return { ...pose, visible, withoutPaint, withoutUpper, isolated };
}
window.rampFixture = { place, check };
place(Number(new URLSearchParams(location.search).get("s") ?? 899));
