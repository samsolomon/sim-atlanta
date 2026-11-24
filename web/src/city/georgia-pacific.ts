import { StaticLandmarkMaterial } from '../materials/landmark-batch';
import * as THREE from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const towerId = '15576641-5f10-4b9b-b977-994a51489be1';
const northId = '84f5c9e9-115a-4d7c-ba20-332260a2b85e';

// Each row gives the three eastern edges, from south to north, in City's local metres.
// OSM ways 479134200–204 share a diagonal western front. Lidar supplies the roof levels.
const tiers = [
  { edges: [443.5, 452.9, 462.3], top: 66.7 },
  { edges: [434.3, 443.7, 453.0], top: 110.7 },
  { edges: [425.5, 434.4, 443.9], top: 154.6 },
  { edges: [416.9, 425.6, 434.6], top: 199.2 },
  { edges: [407.5, 417.0, 425.5], top: 212.5 },
];

const shoulderTops = [205.8, 200.4, 205.8]; // Above the low eastern frontage, south to north.

function outline([south, middle, north]: number[]): P2[] {
  return [
    [395.87, -412.92],
    [375.96, -375.87],
    [south, -375.55],
    [south, -387.8],
    [middle, -387.8],
    [middle, -399.73],
    [north, -399.73],
    [north, -412.7],
  ];
}

// Sample the terrace wash into one vertex-colored overlay. The close reference
// shows broad lit stone on either side of one recessed grille across the tower.
function lightRiser(
  lights: Builder,
  point: (u: number, height: number, offset: number) => number[],
  width: number, foot: number, top: number, strip: number, tier: number,
) {
  const middle = strip === 1, crown = tier === tiers.length - 1;
  const tint = new THREE.Color(crown && !middle ? '#ffe4b9' : '#fff7e3');
  // The sloping covers meet the short crown faces above the last terrace.
  const start = crown ? shoulderTops[strip] : foot;
  const levels = [0, 0.07, 0.24, 0.5, 0.78, 1];
  function vertex(u: number, v: number) {
    const y = start + v * (top - start);
    lights.pos.push(...point(u * width, y, 0.18));
    // Two overlapping pools broaden with height, losing intensity up the wall.
    const spread = 0.14 + v * 0.28;
    const pool = (source: number) => Math.exp(-(((u - source) / spread) ** 2));
    const wash = 0.20 + 0.64 * (1 - v) + (pool(0.26) + pool(0.74)) * Math.exp(-4 * v);
    // Spill is weakest over the middle louvers. The crown has its own bright center.
    const edgeSpill = Math.abs(2 * u - 1) ** 4;
    let gain = middle ? 0.06 + 0.22 * edgeSpill : 1;
    if (crown) gain = middle ? 1.15 : 0.62;
    else if (tier === 0 && strip !== 2) gain *= 0.55;
    const brightness = wash * gain;
    lights.col.push(tint.r * brightness, tint.g * brightness, tint.b * brightness);
  }
  for (let row = 1; row < levels.length; row++) {
    const low = levels[row - 1], high = levels[row];
    for (let col = 0; col < 8; col++) {
      const left = col / 8, right = (col + 1) / 8;
      vertex(left, low);
      vertex(right, low);
      vertex(right, high);
      vertex(left, low);
      vertex(right, high);
      vertex(left, high);
    }
  }
}

export function createGeorgiaPacific(buildings: VBuilding[], groundAt: (x: number, z: number) => number | null) {
  const tower = buildings.find((b) => b.id === towerId);
  if (
    !tower ||
    tower.rings.length !== 1 ||
    ![
      [382, -378],
      [441, -379],
      [450, -393],
      [459, -405],
    ].every(([x, z]) => pointInRing(x, z, tower.rings[0]))
  )
    return null;
  const datum = groundAt(500, -370); // Low eastern street frontage of the complex.
  const grades = tower.rings[0].map(([x, z]) => groundAt(x, z));
  if (datum === null || !Number.isFinite(datum) || grades.some((h) => h === null || !Number.isFinite(h)))
    return null;

  const stone = new Builder(),
    lights = new Builder(),
    eastLights = new Builder();
  const random = rng(133);
  const glass = ['#48545b', '#535c61', '#444f55', '#5b6064'];
  // Rings run clockwise in x/z. Left of each edge points out of the building.
  function facade(a: P2, b: P2, bottom: number, top: number, edge: number, tier: number) {
    const crown = tier === tiers.length - 1;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / length,
      uz = (b[1] - a[1]) / length;
    const point = (u: number, y: number, offset: number) => [
      a[0] + ux * u - uz * offset,
      y,
      a[1] + uz * u + ux * offset,
    ];
    function panel(
      builder: Builder,
      u0: number,
      u1: number,
      y0: number,
      y1: number,
      offset: number,
      color: string,
    ) {
      builder.quad(
        point(u0, y0, offset),
        point(u1, y0, offset),
        point(u1, y1, offset),
        point(u0, y1, offset),
        color,
      );
    }
    // On the east, three blank-ended granite blades frame dark horizontal slots.
    const east = uz < -0.99;
    panel(stone, 0, length, bottom, top, 0, east ? '#ad887d' : '#c79f94');
    if (east) {
      const left = length * 0.22,
        right = length * 0.78;
      panel(stone, left, right, bottom, top - 0.9, 0.05, '#48434a');
      for (let y = 4 * Math.ceil((bottom + 0.25) / 4); y < top - 1.2; y += 2) {
        panel(stone, left, right, y, y + 0.36, 0.12, '#887771');
        if (edge === 4 && !crown) {
          // A little reflected light catches each horizontal louver above the recess.
          panel(eastLights, left, right, y, y + 0.36, 0.20, '#807b6c');
        }
      }
      // Outline edges 2, 4 and 6 run down the eastern strips in south-to-north order.
      lightRiser(eastLights, point, length, bottom, top, edge / 2 - 1, tier);
    } else {
      // Project onto the street grid so window columns continue above the setbacks.
      const phase = (((a[0] * ux + a[1] * uz) % 3) + 3) % 3;
      for (let y = 7 + 4 * Math.ceil((bottom - 6.35) / 4); y + 2.18 <= top - (crown ? 3.7 : 0.7); y += 4) {
        for (let u = 3 - phase; u < length - 1.22; u += 3) {
          if (u < 1.22) continue;
          panel(stone, u - 1.06, u + 1.06, y - 0.14, y + 2.18, 0.055, '#967c74');
          const pane = random() < 0.19 ? lights : stone;
          panel(pane, u - 0.92, u + 0.92, y + 0.09, y + 2.01, 0.13, glass[Math.floor(random() * glass.length)]);
        }
      }
    }
    panel(stone, 0, length, top - 0.4, top, 0.03, '#cdb0a4');
  }
  function roof(ring: P2[], height: number, color: string) {
    const faces = THREE.ShapeUtils.triangulateShape(
      ring.map(([x, z]) => new THREE.Vector2(x, z)),
      [],
    );
    for (const face of faces) {
      const [a, b, c] = face.map((i) => [ring[i][0], height, ring[i][1]]);
      stone.tri(c, b, a, color);
    }
  }
  let base = Math.min(...grades.map(Number)) - datum - 0.6;
  for (const [index, tier] of tiers.entries()) {
    const ring = outline(tier.edges),
      crown = index === tiers.length - 1;
    for (let i = 0; i < ring.length; i++) facade(ring[i], ring[(i + 1) % ring.length], base, tier.top, i, index);
    if (crown) {
      // A pale membrane behind the granite parapet. Miter the inside corners of its rim.
      const deck = tier.top - 1.8;
      roof(ring, deck, '#cdc9bd');
      const inward = ring.map(([x, z], i) => {
        const end = ring[(i + 1) % ring.length],
          length = Math.hypot(end[0] - x, end[1] - z);
        return [(end[1] - z) / length, (x - end[0]) / length];
      });
      const inset = ring.map(([x, z], i): P2 => {
        const a = inward[(i + ring.length - 1) % ring.length],
          b = inward[i];
        const offset = 0.54 / (1 + a[0] * b[0] + a[1] * b[1]);
        return [x + (a[0] + b[0]) * offset, z + (a[1] + b[1]) * offset];
      });
      for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length,
          [x, z] = ring[i],
          [X, Z] = ring[j],
          [u, v] = inset[i],
          [U, V] = inset[j];
        stone.quad([x, tier.top, z], [X, tier.top, Z], [U, tier.top, V], [u, tier.top, v], '#d2b9ac');
        stone.quad([u, deck, v], [u, tier.top, v], [U, tier.top, V], [U, deck, V], '#baaaa1');
      }
      for (const [x, z, w, l] of [
        [398, -382, 3.7, 2.7],
        [409, -394, 2.5, 2.2],
        [418, -404, 3.5, 3.2],
      ]) {
        stone.box(w, 1.2, l, x, deck + 0.6, z, '#a29e94');
        stone.box(w * 0.74, 0.36, l * 0.76, x, deck + 1.38, z, '#8a8983');
      }
    } else roof(ring, tier.top, '#b8aaa1');
    base = tier.top;
  }
  // Sloping covers on the narrow shoulders immediately below the main roof.
  const depths = [-375.55, -387.8, -399.73, -412.7];
  for (let i = 0; i < 3; i++) {
    const x0 = tiers[4].edges[i],
      x1 = tiers[3].edges[i],
      z0 = depths[i],
      z1 = depths[i + 1];
    const hi = shoulderTops[i],
      lo = 199.3;
    stone.quad([x0, hi, z0], [x1, lo, z0], [x1, lo, z1], [x0, hi, z1], '#958d86');
    stone.tri([x0, hi, z0], [x0, lo, z0], [x1, lo, z0], '#bfa095');
    stone.tri([x0, hi, z1], [x1, lo, z1], [x0, lo, z1], '#b49990');
  }

  const group = new THREE.Group();
  group.name = 'Georgia-Pacific Tower';
  group.position.y = datum;
  const granite = new THREE.Mesh(
    stone.geometry(),
    new StaticLandmarkMaterial(),
  );
  granite.castShadow = granite.receiveShadow = true;
  group.add(granite);
  const windows = new THREE.MeshLambertMaterial({
    vertexColors: true, emissive: '#ffd59d', emissiveIntensity: 0,
  });
  const officeLights = new THREE.Mesh(lights.geometry(), windows);
  officeLights.receiveShadow = true;
  group.add(officeLights);
  const accent = new THREE.MeshBasicMaterial({
    vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
  });
  const floodlights = new THREE.Mesh(eastLights.geometry(), accent);
  floodlights.name = 'Eastern terrace uplights';
  floodlights.visible = false;
  group.add(floodlights);
  // This separate footprint abuts the parking deck. The 207 m bake puts a second
  // tower through the photographed northern skyline. Keep the mapped low volume;
  // its precise roof level is unresolved. Respect a later survey or footprint change.
  const remaining = buildings
    .filter((b) => b !== tower)
    .map((b) => {
      if (
        b.id === northId &&
        b.h === 207 &&
        b.rings.length === 1 &&
        pointInRing(409, -432, b.rings[0]) &&
        pointInRing(409, -417, b.rings[0])
      )
        return { ...b, h: 10 };
      return b;
    });
  return {
    buildings: remaining,
    group,
    setNight(night: number) {
      windows.emissiveIntensity = 0.8 * night;
      accent.opacity = night;
      floodlights.visible = night > 0.01;
    },
  };
}
