import * as THREE from 'three';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { mirroredGlass } from './mirrored-glass';
import { skylineReflection } from './skyline-reflection';

const id = 'd589ba16-ac92-4a00-8386-1d8098172a80';
const x = 466.6,
  z = -978.8;
const pitch = 3.83,
  width = 49,
  podium = 12.8;
const silver = '#c4c6bf',
  roof = '#87969a';

function facadeMaps() {
  const w = 128,
    h = 128,
    day = new Uint8Array(w * h * 4),
    night = new Uint8Array(day.length);
  const random = rng(1992);
  for (let floor = 0; floor < 16; floor++)
    for (let bay = 0; bay < 16; bay++) {
      const lamp = random() < 0.21 ? 0.4 + 0.45 * random() : 0;
      const tint = 153 + 19 * random();
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 8; i++) {
          const pos = 4 * ((floor * 8 + j) * w + bay * 8 + i);
          const frame = j < 2 || i === 0;
          day.set(frame ? [207, 211, 207, 255] : [tint, tint + 17, tint + 28, 255], pos);
          const l = frame ? 0 : lamp;
          night.set([245 * l, 207 * l, 149 * l, 255], pos);
        }
    }
  return [day, night].map((bytes) => {
    const texture = new THREE.DataTexture(bytes, w, h);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  });
}

export function createTruistPlaza(buildings: VBuilding[], groundAt: (x: number, z: number) => number | null) {
  const source = buildings.find((b) => b.id === id),
    ring = source?.rings[0];
  if (
    !ring ||
    source?.rings.length !== 1 ||
    ![
      [-22, -22],
      [22, 22],
      [-22, 22],
      [22, -22],
      [35, 0],
      [0, 35],
    ].every(([u, v]) => pointInRing(x + u, z + v, ring))
  )
    return null;
  const ground = groundAt(x, z);
  const grades = ring.map(([u, v]) => groundAt(u, v));
  if (ground == null || !Number.isFinite(ground) || grades.some((y) => y == null || !Number.isFinite(y)))
    return null;
  const remaining = buildings.filter((b) => b !== source);
  const shell = new Builder(),
    glazing = new Builder(),
    edges = new Builder();
  const uv: number[] = [];
  const angle = 0.0165,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const plan = ring.map(([a, b]): P2 => [(a - x) * c + (b - z) * s, -(a - x) * s + (b - z) * c]);
  const point = ([a, b]: P2, y: number) => [a, y, b];
  function wall(builder: Builder, a: P2, b: P2, lo: number, hi: number, color: string) {
    builder.quad(point(a, lo), point(b, lo), point(b, hi), point(a, hi), color);
  }
  function glass(a: P2, b: P2, lo: number, hi: number) {
    wall(glazing, a, b, lo, hi, '#ffffff');
    const u = (a[0] + a[1]) / 48,
      end = u + Math.hypot(b[0] - a[0], b[1] - a[1]) / 48;
    const low = lo / (pitch * 16),
      high = hi / (pitch * 16);
    uv.push(u, low, end, low, end, high, u, low, end, high, u, high);
  }
  const bottom = Math.min(...(grades as number[])) - ground - 0.75;
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i],
      b = plan[(i + 1) % plan.length];
    wall(shell, a, b, bottom, 1.8, '#a89f93');
    wall(shell, a, b, 1.8, podium - 0.7, '#5b737b');
    wall(shell, a, b, podium - 0.7, podium, silver);
  }
  for (const [a, b, d] of THREE.ShapeUtils.triangulateShape(
    plan.map(([u, v]) => new THREE.Vector2(u, v)),
    [],
  ))
    shell.tri(point(plan[d], podium), point(plan[b], podium), point(plan[a], podium), roof);

  // Five office bays on each face. Recessed returns break the window bands and
  // run to different parapets under the crown, as in Portman's frontal photograph.
  const step = width / 5,
    half = width / 2;
  const parapets = [229, 225.2, 221.4, 225.2, 229];
  for (let side = 0; side < 4; side++) {
    const along = (u: number, v: number): P2 =>
      [
        [u, -v],
        [v, u],
        [-u, v],
        [-v, -u],
      ][side] as P2;
    for (let j = 0; j < 5; j++) {
      const left = -half + j * step,
        right = left + step,
        hi = parapets[j];
      const inner = half - 2.2,
        outer = half + (j % 2 === 1 ? 1.7 : 0);
      const a = along(left + 0.8, outer),
        b = along(right - 0.8, outer);
      const run: P2[] = [
        along(left, inner),
        along(left + 0.8, inner),
        a,
        b,
        along(right - 0.8, inner),
        along(right, inner),
      ];
      for (let k = 1; k < run.length; k++) glass(run[k - 1], run[k], podium, hi);
      for (let y = podium + pitch; y < hi - 1; y += pitch)
        wall(shell, along(left + 0.8, outer + 0.065), along(right - 0.8, outer + 0.065), y - 0.58, y, silver);
      for (const u of [left + 0.8, right - 0.8]) {
        wall(shell, along(u - 0.16, outer + 0.05), along(u + 0.16, outer + 0.05), podium, hi, silver);
      }
      wall(shell, a, b, hi - 0.65, hi + 0.1, silver);
      shell.quad(
        point(a, hi + 0.1),
        point(b, hi + 0.1),
        point(along(right - 0.8, inner - 1), hi + 0.1),
        point(along(left + 0.8, inner - 1), hi + 0.1),
        roof,
      );
    }
    // Close the small square corners between the returning glass faces.
    glass(along(half, half - 2.2), along(half, half), podium, 229);
    glass(along(half, half), along(half - 2.2, half), podium, 229);
  }

  // Exposed faces of contiguous crown volumes. Adjacent columns meet without
  // an internal stack of closed boxes. The 228.1 m occupied level is inside the outer shoulders.
  const tops = [
    [229, 231, 235, 231, 229],
    [231, 241, 247, 241, 231],
    [235, 247, 259, 247, 235],
    [231, 241, 247, 241, 231],
    [229, 231, 235, 231, 229],
  ];
  const unit = (width - 4.4) / 5;
  for (let j = 0; j < 5; j++)
    for (let i = 0; i < 5; i++) {
      const l = (i - 2.5) * unit,
        r = l + unit,
        n = (j - 2.5) * unit,
        f = n + unit,
        y = tops[j][i];
      const p: P2[] = [
        [l, n],
        [r, n],
        [r, f],
        [l, f],
      ];
      const low = [tops[j - 1]?.[i], tops[j][i + 1], tops[j + 1]?.[i], tops[j][i - 1]];
      shell.quad(point(p[3], y), point(p[2], y), point(p[1], y), point(p[0], y), '#678795');
      for (let k = 0; k < 4; k++) {
        const base = low[k] ?? parapets[k % 2 === 0 ? i : j] - 0.1;
        if (base >= y) continue;
        const a = p[k],
          b = p[(k + 1) % 4];
        wall(shell, a, b, base, y, '#40718a');
        // Thin luminous lips follow the exposed steps, leaving dark glass between.
        wall(edges, a, b, y + 0.02, y + 0.42, '#d6efeb');
        for (let h = Math.max(229, base) + 2; h < y - 0.5; h += 3.8)
          wall(shell, a.map((v) => v * 1.0008) as P2, b.map((v) => v * 1.0008) as P2, h, h + 0.13, '#899eaa');
      }
    }
  shell.box(7, 2.5, 7, 0, 260.25, 0, '#8d9fa2');
  const cap = new THREE.CylinderGeometry(1.8, 3.65, 2.8, 8);
  cap.translate(0, 262.9, 0);
  shell.addGeometry(cap, '#bbbeb8');
  const tip = new THREE.CylinderGeometry(0.18, 0.31, 10.7, 6);
  tip.translate(0, 269.65, 0);
  shell.addGeometry(tip, '#9aa4a3');

  const probeY = ground + 115,
    daylight = { value: 1 };
  const skyline = skylineReflection(remaining, x, z, probeY, groundAt);
  const [map, emissiveMap] = facadeMaps();
  const windows = mirroredGlass({ skyline, probeY, daylight, map, emissiveMap, tint: '#b1c2c9' });
  windows.side = THREE.DoubleSide;
  windows.addEventListener('dispose', () => {
    skyline.dispose();
    map.dispose();
    emissiveMap.dispose();
  });
  const geo = glazing.geometry();
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const group = new THREE.Group();
  group.name = 'Truist Plaza';
  group.position.set(x, ground, z);
  group.rotation.y = -angle;
  const metal = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const rim = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: '#c8e7ed',
    emissiveIntensity: 0,
  });
  for (const mesh of [
    new THREE.Mesh(shell.geometry(), metal),
    new THREE.Mesh(geo, windows),
    new THREE.Mesh(edges.geometry(), rim),
  ]) {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return {
    group,
    buildings: remaining,
    setNight(dark: number) {
      daylight.value = 1 - dark;
      windows.emissiveIntensity = 1.7 * dark;
      rim.emissiveIntensity = 2.5 * dark;
    },
  };
}
