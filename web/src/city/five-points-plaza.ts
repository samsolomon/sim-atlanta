import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const plazaId = 'f215708b-6d11-484f-9146-451689895ec4';
const angle = Math.atan2(-22.27, 26.56),
  cos = Math.cos(angle),
  sin = Math.sin(angle);
const concrete = '#d3c5a7',
  edge = '#e5d9ba',
  soffit = '#ada28b',
  dark = '#42505a';

export function createFivePointsPlaza(buildings: VBuilding[], grid: GroundGrid) {
  const site = buildings.find((b) => b.id === plazaId);
  if (!site || site.rings.length !== 1) return null;
  const ring = site.rings[0].map(([x, z]): P2 => [
    (x - 18.29) * cos + (z + 131.77) * sin,
    -(x - 18.29) * sin + (z + 131.77) * cos,
  ]);
  if (
    ![
      [2, 2],
      [32, 22],
      [8, 29],
    ].every(([x, z]) => pointInRing(x, z, ring))
  )
    return null;
  const grades = site.rings[0].map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...grades) - 0.42,
    shell = new Builder(),
    lit = new Builder(),
    random = rng(1964);
  const rect = (l: number, t: number, r: number, b: number): P2[] => [
    [l, t],
    [r, t],
    [r, b],
    [l, b],
  ];
  function walls(bottom: P2[], top: P2[], lo: number, hi: number, color: string) {
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length;
      shell.quad(
        [bottom[i][0], lo, bottom[i][1]],
        [bottom[j][0], lo, bottom[j][1]],
        [top[j][0], hi, top[j][1]],
        [top[i][0], hi, top[i][1]],
        color,
      );
    }
  }
  function cap(plan: P2[], y: number, color: string) {
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      plan.map(([u, v]) => new Vector2(u, v)),
      [],
    )) {
      const pt = (i: number) => [plan[i][0], y, plan[i][1]];
      shell.tri(pt(a), pt(c), pt(b), color);
    }
  }
  function solid(plan: P2[], lo: number, hi: number, color: string, roof = color) {
    walls(plan, plan, lo, hi, color);
    cap(plan, hi, roof);
  }
  function rounded(inset: number): P2[] {
    const l = inset,
      t = inset,
      r = 34.65 - inset,
      b = 24.35 - inset,
      rad = 1.15 - inset * 0.3,
      plan: P2[] = [];
    for (const [x, z, start] of [
      [r - rad, t + rad, -90],
      [r - rad, b - rad, 0],
      [l + rad, b - rad, 90],
      [l + rad, t + rad, 180],
    ]) {
      for (let j = 0; j <= 3; j++) {
        const a = ((start + j * 30) * Math.PI) / 180;
        plan.push([x + rad * Math.cos(a), z + rad * Math.sin(a)]);
      }
    }
    return plan;
  }
  const glassPlan = rounded(1.02),
    rim = rounded(0),
    lip = rounded(0.26);
  const first = 328.45,
    roof = 387.82,
    pitch = (roof - first) / 16;
  solid(rect(2.1, 1.9, 32.5, 22.45), base, first, '#788786');
  solid(glassPlan, first, roof, dark);
  function windows(acrossU: boolean, face: number, l: number, r: number, y: number, side: number) {
    const n = Math.round((r - l) / 2.6),
      f = face + 0.055 * side;
    const pt = (s: number, h: number) => (acrossU ? [s, h, f] : [f, h, s]);
    for (let i = 0; i < n; i++) {
      const left = l + ((r - l) * i) / n + 0.07,
        right = l + ((r - l) * (i + 1)) / n - 0.07;
      const v = random(),
        batch = v < 0.1 ? lit : shell;
      batch.quad(pt(left, y), pt(right, y), pt(right, y + 2.06), pt(left, y + 2.06), v < 0.6 ? '#53616a' : '#43515a');
    }
  }
  function beam(y: number) {
    walls(lip, rim, y - 1.16, y - 0.87, soffit);
    walls(rim, rim, y - 0.87, y - 0.09, concrete);
    walls(rim, lip, y - 0.09, y, edge);
    cap(lip, y, concrete);
    // Close the underside so the projecting band reads from the sidewalk.
    cap(lip, y - 1.16, soffit);
  }
  for (let row = 0; row <= 16; row++) {
    const y = first + pitch * row;
    beam(y);
    if (row === 16) break;
    for (const [v, side] of [
      [1.02, -1],
      [23.33, 1],
    ])
      windows(true, v, 1.9, 32.75, y + 0.1, side);
    for (const [u, side] of [
      [1.02, -1],
      [33.63, 1],
    ])
      windows(false, u, 1.9, 22.4, y + 0.1, side);
  }
  // Six pentagonal columns merge into the radiused beam ends. The glass sits farther back.
  for (const v of [0.85, 23.5])
    for (const u of [1.9, 17.33, 32.75]) {
      const sign = v < 10 ? -1 : 1;
      const post = (half: number): P2[] => [
        [u - half, v - 0.57 * sign],
        [u + half, v - 0.57 * sign],
        [u + half, v + 0.62 * sign],
        [u, v + 1.13 * sign],
        [u - half, v + 0.62 * sign],
      ];
      const shaft = post(0.74);
      solid(shaft, base, roof, edge);
      for (let j = 1; j <= 16; j++) {
        const y = first + j * pitch;
        walls(shaft, post(1.39), y - 1.85, y - 0.48, concrete);
      }
    }
  // The street photographs show a continuous blank rounded spine on the rear,
  // above the sculpted perimeter and beside a smaller rectangular roof enclosure.
  const spine = ring.filter(([, v]) => v > 24.6);
  if (spine.length < 4) return null;
  solid(rect(6.0, 20.6, 17.3, 27.1), base, 391.3, '#bdb8a9', '#c7c3b4');
  solid(spine, base, 392.95, '#c2bcb0', '#b8b7aa');
  solid(rect(3.8, 3.1, 30.6, 21.1), roof, 392.3, '#b6b5a9', '#c8c6b9');
  const group = new Group();
  group.name = 'Five Points Plaza at 40 Marietta';
  group.rotation.y = -angle;
  group.position.set(18.29, -grid.manifest.vertical.sceneZeroNavd88M, -131.77);
  const body = new Mesh(shell.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const panes = new Mesh(
    lit.geometry(),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#ddc49a', emissiveIntensity: 0 }),
  );
  group.add(panes);
  return {
    group,
    buildings: buildings.filter((b) => b !== site),
    setNight(night: number) {
      panes.material.emissiveIntensity = 0.55 * night;
    },
  };
}
