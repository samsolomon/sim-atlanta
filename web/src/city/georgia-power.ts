import * as THREE from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import { clipRing, type VBuilding } from '../vignette/world';
import { mirroredGlass } from './mirrored-glass';
import { skylineReflection } from './skyline-reflection';

const hqId = '0831390e-07dd-4e8b-8eff-1e70d35e1c55',
  annexId = '98ea45a8-aec5-4eab-b1b1-77a136c99a38';
const podium = 306.1,
  annexDeck = 301.7,
  roof = 395.0;
const west = 926.3,
  east = 982.4,
  north = -1078.3,
  south = -1038.7;
const floors = 24,
  step = 0.381;
const towerAnchors: P2[] = [
  [925.79, -1079.09],
  [982.46, -1078.69],
  [982.17, -1038.78],
  [902.36, -1028.28],
  [950.46, -968.28],
];
const annexAnchors: P2[] = [
  [982.17, -1038.78],
  [997.69, -1038.4],
  [997.82, -1077.45],
  [982.45, -1077.5],
];

function surveyedSite(buildings: VBuilding[], id: string, anchors: P2[], grid: GroundGrid) {
  const source = buildings.find((b) => b.id === id);
  if (!source || source.rings.length !== 1) return null;
  const ring = source.rings[0];
  if (!anchors.every(([x, z]) => ring.some(([a, b]) => Math.hypot(x - a, z - b) < 1.5))) return null;
  // The fragment clipping plane and terrain skirt are exactly at maxX. Give
  // the exposed brick cut face 5 cm of clearance to avoid coplanar flicker.
  const bounds = grid.manifest.bounds;
  const plan = clipRing(ring, { ...bounds, maxX: bounds.maxX - 0.05 });
  if (plan.length < 3) return null;
  const grades = plan.map(([x, z]) => grid.sample(x, z));
  if (!grades.every((h): h is number => h !== null && Number.isFinite(h))) return null;
  return { source, plan, base: Math.min(...grades) - 0.45 };
}

function lowRoof(shell: Builder, plan: P2[], base: number, deck: number, wall: string, cap: string, seamX?: number) {
  const at = ([x, z]: P2, y: number) => [x, y, z];
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i],
      b = plan[(i + 1) % plan.length];
    if (a[0] === seamX && b[0] === seamX) continue;
    shell.quad(at(a, base), at(b, base), at(b, deck), at(a, deck), wall);
    shell.quad(at(a, deck), at(b, deck), at(b, deck + 0.28), at(a, deck + 0.28), cap);
  }
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
    plan.map(([x, z]) => new THREE.Vector2(x, z)),
    [],
  ))
    shell.tri(at(plan[a], deck), at(plan[c], deck), at(plan[b], deck), cap);
}

// A dark spandrel, narrow mullions and an illustrative selection of occupied offices.
// The repeating tile modulates the same skyline material as the Westin and Truist Plaza.
function paneTextures() {
  const size = 128,
    color = new Uint8Array(size * size * 4),
    glow = new Uint8Array(color.length),
    random = rng(241);
  for (let row = 0; row < 16; row++)
    for (let bay = 0; bay < 16; bay++) {
      const brightness = Math.round(180 + 35 * random());
      const light = random() < 0.13 ? 0.4 + 0.6 * random() : 0;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const i = 4 * ((row * 8 + y) * size + bay * 8 + x);
          const pane = y >= 2 && y < 7 && x !== 0;
          color.set(pane ? [brightness, brightness + 4, brightness + 5, 255] : [118, 125, 128, 255], i);
          glow.set(pane ? [243 * light, 213 * light, 170 * light, 255] : [0, 0, 0, 255], i);
        }
    }
  return [color, glow].map((data) => {
    const t = new THREE.DataTexture(data, size, size);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  });
}

function rooftopLetters(group: THREE.Group) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Georgia Power', 256, 33, 500);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  material.addEventListener('dispose', () => texture.dispose());
  const plane = new THREE.PlaneGeometry(28, 3.5);
  for (const front of [true, false]) {
    const sign = new THREE.Mesh(plane, material);
    sign.position.set(front ? 968.0 : 941.0, 393.25, front ? south + 0.08 : north - 0.08);
    sign.rotation.y = front ? 0 : Math.PI;
    group.add(sign);
  }
}

function towerFacade(shell: Builder, group: THREE.Group, buildings: VBuilding[], grid: GroundGrid, base: number) {
  const panes = new Builder(),
    uv: number[] = [];
  const pitch = (roof - base) / floors;
  function wall(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) {
    panes.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], 'white');
    const u = (x0 + z0) / 30,
      u1 = u + Math.hypot(x1 - x0, z1 - z0) / 30;
    const v = (y0 - base) / (pitch * 16),
      v1 = (y1 - base) / (pitch * 16);
    uv.push(u, v, u1, v, u1, v1, u, v, u1, v1, u, v1);
  }
  const split = east - 10.8;
  // Looking from the south, the narrow eastern strip stays plumb. The broad panel beside
  // it advances south floor by floor, leaving the dark side of the reveal visible.
  wall(east, north, west, north, base, roof);
  wall(east, south, east, north, base, roof);
  wall(split, south, east, south, base, roof);
  for (let f = 0; f < floors; f++) {
    const y = base + f * pitch,
      top = y + pitch,
      z = south - (floors - 1 - f) * step;
    wall(west, north, west, z, y, top);
    wall(west, z, split, z, y, top);
    if (f < floors - 1) {
      wall(split, z, split, south, y, top);
      shell.quad([west, top, z], [split, top, z], [split, top, z + step], [west, top, z + step], '#383c3d');
      // Silver sunscreen tubes seen as thin horizontal highlights across the solar face.
      shell.box(split - west, 0.28, 0.38, (west + split) / 2, top - 0.45, z + 0.2, '#c0c2ba');
    }
  }
  shell.box(east - west, 0.2, south - north, (west + east) / 2, roof - 0.1, (south + north) / 2, '#857e72');
  for (const [x, z, w, d] of [
    [932, -1063, 4.5, 3],
    [950, -1066, 2.4, 2],
    [978, -1046, 2.8, 2.2],
  ])
    shell.box(w, 1.0, d, x, roof + 0.5, z, '#ada99d');
  const zero = grid.manifest.vertical.sceneZeroNavd88M,
    probeY = 352 - zero;
  const reflection = skylineReflection(buildings, 954, -1057, probeY, (x, z) => {
    const h = grid.sample(x, z);
    return h === null ? null : h - zero;
  });
  const [map, emissiveMap] = paneTextures(),
    daylight = { value: 1 };
  const glass = mirroredGlass({ skyline: reflection, probeY, daylight, map, emissiveMap, tint: '#8b9796' });
  glass.side = THREE.DoubleSide;
  glass.addEventListener('dispose', () => {
    reflection.dispose();
    map.dispose();
    emissiveMap.dispose();
  });
  const geo = panes.geometry();
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, glass);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  rooftopLetters(group);
  return (night: number) => {
    daylight.value = 1 - night;
    glass.emissiveIntensity = 1.3 * night;
  };
}

export function createGeorgiaPower(buildings: VBuilding[], grid: GroundGrid) {
  const main = surveyedSite(buildings, hqId, towerAnchors, grid);
  const annex = surveyedSite(buildings, annexId, annexAnchors, grid);
  // The shaft and rooftop details must all fit on the surveyed podium inside this board.
  const mainFits =
    main &&
    [
      [west + 1, north + 1],
      [east - 1, north + 1],
      [east - 1, south - 1],
      [west + 1, south - 1],
      [990, -984],
      [956, -1006],
    ].every(([x, z]) => pointInRing(x, z, main.plan));
  if (!mainFits && !annex) return null;
  const group = new THREE.Group(),
    shell = new Builder();
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  group.name = 'Georgia Power headquarters';
  const remaining = buildings.filter((b) => !(mainFits && b === main.source) && b !== annex?.source);
  let nightLights: ((night: number) => void) | undefined;
  if (mainFits) {
    // The low wing wraps around the shaft to its west and south. Cut its roof at
    // the tower foot so the glass on the north face reaches the entrance grade.
    const bounds = grid.manifest.bounds;
    const westWing = clipRing(main.plan, { ...bounds, maxX: west });
    const southWing = clipRing(main.plan, { ...bounds, minX: west, minZ: south - (floors - 1) * step });
    for (const wing of [westWing, southWing]) lowRoof(shell, wing, main.base, podium, '#925f4b', '#aba99d', west);
    // Segmented sloping skylight along the foot of the solar face.
    for (let bay = 0; bay < 22; bay++) {
      const x = 928 + bay * 1.95;
      shell.quad(
        [x, podium + 2.4, -1043.6],
        [x, podium + 0.32, -1038.8],
        [x + 1.85, podium + 0.32, -1038.8],
        [x + 1.85, podium + 2.4, -1043.6],
        '#647578',
      );
    }
    for (const [x, z, w, d] of [
      [908, -1014, 3, 6.5],
      [933, -1006, 2.3, 2.9],
      [950, -984, 2.2, 2.6],
      [986, -1035, 2.7, 4.2],
    ])
      shell.box(w, 1.1, d, x, podium + 0.55, z, '#c2c1b7');
    // Small panel fields on the rounded low roof, estimated from overhead imagery.
    for (const [x, z, cols, rows] of [
      [958, -1004, 6, 3],
      [972, -1002, 5, 2],
      [988, -1003, 4, 2],
      [965, -990, 4, 2],
      [983, -990, 6, 2],
    ]) {
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const a = x + col * 1.6,
            b = z + row * 2.15;
          shell.quad(
            [a, podium + 0.7, b],
            [a, podium + 0.35, b + 1.95],
            [a + 1.5, podium + 0.35, b + 1.95],
            [a + 1.5, podium + 0.7, b],
            '#52616a',
          );
        }
    }
    nightLights = towerFacade(shell, group, remaining, grid, main.base);
  }
  if (annex) {
    lowRoof(shell, annex.plan, annex.base, annexDeck, '#9b8871', '#d9d8cc');
    shell.box(4.2, 1.5, 3.2, 990, annexDeck + 0.75, -1050, '#adada4');
  }
  const base = new THREE.Mesh(
    shell.geometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  );
  base.castShadow = base.receiveShadow = true;
  group.add(base);
  return {
    group,
    buildings: remaining,
    setNight(night: number) {
      nightLights?.(night);
    },
  };
}
