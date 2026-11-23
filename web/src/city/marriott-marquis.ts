import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, hashStr, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = 'f36a8d1a-981d-4229-bfcf-f2635e5ab028';
const halfLength = 42.4,
  halfDepth = 16.1,
  deck = 326.1,
  roof = 466.9;
const stone = '#dbd6cd',
  edge = '#e9e3d9',
  reveal = '#8f918e';
const glass = ['#50616a', '#45545d', '#596970', '#4d585d'];

// The long faces bow around the atrium below the rectangular upper shaft.
// Sections sampled at the middle of the broad elevation, metres NAVD88.
const sections = [
  [deck, 18.8],
  [344, 15],
  [370, 12.3],
  [386, 9.3],
  [402, 6.5],
  [420, 3.7],
  [437, 1.3],
  [451, 0],
  [roof, 0],
];
function bow(y: number) {
  for (let i = 1; i < sections.length; i++) {
    const [h, d] = sections[i],
      [prev, depth] = sections[i - 1];
    if (y <= h) return depth + ((d - depth) * (y - prev)) / (h - prev);
  }
  return 0;
}

// Local x points along the roof ridge. The block is rotated about 0.7° in plan.
function pos(u: number, y: number, v: number) {
  return [624.4 + u - 0.012 * v, y, -854.5 + v + 0.012 * u];
}
function facade(u: number, y: number, side: number, outset = 0) {
  const curve = 1 - (u / halfLength) ** 2;
  return pos(u, y, side * (halfDepth + curve * bow(y) + outset));
}

export function createMarriottMarquis(buildings: VBuilding[], grid: GroundGrid) {
  const hotel = buildings.find((b) => b.id === id);
  if (!hotel || hotel.rings.length !== 1) return null;
  const lot = hotel.rings[0];
  if (
    ![
      [535, -850],
      [601, -907],
      [660, -802],
      [622, -856],
    ].every(([x, z]) => pointInRing(x, z, lot))
  )
    return null;
  const grades = lot.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const bottom = Math.min(...grades) - 0.5;
  const solid = new Builder(),
    rooms = new Builder();
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    lot.map(([x, z]) => new Vector2(x, z)),
    []
  )) {
    const top = (i: number) => [lot[i][0], deck, lot[i][1]];
    solid.tri(top(a), top(c), top(b), '#b9b7b1');
  }
  for (let i = 0; i < lot.length; i++) {
    const [x, z] = lot[i],
      [ex, ez] = lot[(i + 1) % lot.length];
    if (Math.max(x, ex) < 528) {
      // Open entrance drive under the west edge of the continuous terrace.
      solid.quad([x, deck - 1.1, z], [ex, deck - 1.1, ez], [ex, deck, ez], [x, deck, z], stone);
      solid.quad([x + 12, bottom, z], [ex + 12, bottom, ez], [ex + 12, deck, ez], [x + 12, deck, z], '#566468');
      for (const [px, pz] of [
        [x, z],
        [ex, ez],
      ]) {
        solid.quad([px, bottom, pz], [px + 12, bottom, pz], [px + 12, deck, pz], [px, deck, pz], reveal);
      }
    } else {
      solid.quad([x, bottom, z], [ex, bottom, ez], [ex, deck, ez], [x, deck, z], stone);
    }
  }
  // Baker Street ballroom roof sits eight metres above the entrance terrace.
  solid.box(86.8, 8.2, 27.4, 631, deck + 4.1, -902.5, '#c9c7c0');
  // The porte-cochère and its piers face west, between Marquis One and Two.
  solid.box(44, 1.2, 19.8, 547.3, 325.5, -855.2, '#ddd9cc');
  for (const z of [-845.8, -864.6]) {
    for (const x of [526, 535])
      solid.box(1.05, deck - bottom - 0.65, 1.05, x, (bottom + deck - 0.65) / 2, z, stone);
  }

  const bays = 22,
    pitch = (2 * halfLength) / bays,
    floors = 44,
    rise = (roof - 3.0 - deck) / floors;
  for (const side of [-1, 1]) {
    for (let col = 0; col < bays; col++) {
      const l = -halfLength + col * pitch,
        r = l + pitch,
        mid = (l + r) / 2;
      for (let floor = 0; floor < floors; floor++) {
        const low = deck + floor * rise,
          high = low + rise;
        const pt = (u: number, y: number, off = 0) => facade(u, y, side, off);
        solid.quad(pt(l, low), pt(r, low), pt(r, high), pt(l, high), stone);
        // Solid, staggered infill around the great lower hall tapers out toward the ends.
        const infill = Math.max(0, 1 - (mid / 35) ** 2 - ((low - 358) / 25) ** 2);
        const pane = hashStr(side + '/' + col + '/' + floor) % 8 === 0 ? rooms : solid;
        const left = l + 0.25 + 2.45 * infill;
        pane.quad(
          pt(left, low + 0.48, 0.06),
          pt(r - 0.26, low + 0.48, 0.06),
          pt(r - 0.26, high - 0.17, 0.06),
          pt(left, high - 0.17, 0.06),
          glass[(col + Math.floor(floor / 8)) % 4]
        );
        if (infill > 0) {
          solid.quad(
            pt(l + 0.2, low + 0.4, 0.56),
            pt(left, low + 0.48, 0.07),
            pt(left, high - 0.17, 0.07),
            pt(l + 0.2, high, 0.56),
            stone
          );
        }
        // Piers in front of the glazing cast a continuous vertical shadow.
        solid.quad(pt(l, low), pt(l, low, 0.64), pt(l, high, 0.64), pt(l, high), reveal);
        solid.quad(pt(l, low, 0.64), pt(l + 0.22, low, 0.64), pt(l + 0.22, high, 0.64), pt(l, high, 0.64), edge);
      }
      solid.quad(
        facade(l, roof - 3, side),
        facade(r, roof - 3, side),
        facade(r, roof, side),
        facade(l, roof, side),
        stone
      );
    }
  }
  for (const u of [-halfLength, halfLength]) {
    // The ends are blind concrete wings with two dark glazing slots running the full height.
    const at = (v: number, y: number) => pos(u, y, v);
    for (const [l, r, color] of [
      [-halfDepth, -4.9, stone],
      [-4.9, -2.65, glass[0]],
      [-2.65, 2.65, '#c7c5be'],
      [2.65, 4.9, glass[0]],
      [4.9, halfDepth, stone],
    ] as const) {
      solid.quad(at(l, deck), at(r, deck), at(r, roof), at(l, roof), color);
    }
  }
  const top = (u: number, v: number) => pos(u, roof, v);
  solid.quad(
    top(-halfLength, -halfDepth),
    top(halfLength, -halfDepth),
    top(halfLength, halfDepth),
    top(-halfLength, halfDepth),
    '#b7b5b0'
  );
  for (const side of [-1, 1]) {
    // The atrium is roofed by a low pitched skylight running along the spine.
    for (let i = 0; i < 30; i++) {
      const a = -39 + i * 2.62,
        b = a + 2.62;
      solid.quad(
        pos(a, roof + 0.22, side * 8),
        pos(b, roof + 0.22, side * 8),
        pos(b, 469.15, 0),
        pos(a, 469.15, 0),
        i % 2 ? '#9aa8a8' : '#aab5b1'
      );
    }
  }
  solid.box(17.8, 2.95, 17.9, 638.5, roof + 1.475, -854.5, '#bcbcb6');
  solid.box(2.2, 1.55, 2, 643.2, 470.62, -854, '#a2aaa5');
  const group = new Group();
  group.name = 'Atlanta Marriott Marquis';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const hotelMesh = new Mesh(solid.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  hotelMesh.castShadow = hotelMesh.receiveShadow = true;
  const occupied = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#e3cba0',
    emissiveIntensity: 0,
  });
  group.add(hotelMesh, new Mesh(rooms.geometry(), occupied));
  return {
    group,
    buildings: buildings.filter((b) => b !== hotel),
    setNight(night: number) {
      occupied.emissiveIntensity = 0.58 * night;
    },
  };
}
