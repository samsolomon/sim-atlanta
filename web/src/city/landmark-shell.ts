import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';

/** A footprint in its street frame, with roof heights in NAVD88 metres. */
export function landmarkShell(
  buildings: VBuilding[],
  grid: GroundGrid,
  id: string,
  name: string,
  origin: P2,
  axis: P2,
  probes: P2[],
) {
  const site = buildings.find((b) => b.id === id);
  if (!site || site.rings.length !== 1) return null;
  const angle = Math.atan2(axis[1], axis[0]),
    c = Math.cos(angle),
    s = Math.sin(angle);
  const ring: P2[] = site.rings[0].map(([x, z]) => [
    (x - origin[0]) * c + (z - origin[1]) * s,
    -(x - origin[0]) * s + (z - origin[1]) * c,
  ]);
  if (!probes.every(([x, z]) => pointInRing(x, z, ring))) return null;
  const grades = site.rings[0].map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...grades) - 0.35;
  const body = new Builder(),
    lights = new Builder(),
    random = rng(1976);
  function prism(plan: P2[], lo: number, hi: number, wall: string, roof: string) {
    for (let i = 0; i < plan.length; i++) {
      const [x, z] = plan[i],
        [a, b] = plan[(i + 1) % plan.length];
      body.quad([x, lo, z], [x, hi, z], [a, hi, b], [a, lo, b], wall);
    }
    for (const [a, b, c] of ShapeUtils.triangulateShape(
      plan.map(([x, z]) => new Vector2(x, z)),
      [],
    )) {
      const point = (i: number) => [plan[i][0], hi, plan[i][1]];
      body.tri(point(a), point(c), point(b), roof);
    }
  }
  /** Faces are directed with the building on the left in the (u,v) plan. */
  function facade(
    a: P2,
    b: P2,
    lo: number,
    hi: number,
    rows: number,
    bay: number,
    fill: number,
    verticalFill: number,
    colors: readonly string[],
    occupancy: number,
  ) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const count = Math.max(1, Math.round(len / bay)),
      pitch = (hi - lo) / rows;
    const point = (t: number, y: number) => [a[0] + t * dx + (0.07 * dz) / len, y, a[1] + t * dz - (0.07 * dx) / len];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < count; i++) {
        const l = (i + (1 - fill) / 2) / count,
          r = (i + (1 + fill) / 2) / count;
        const y = lo + (j + (1 - verticalFill) / 2) * pitch,
          top = y + verticalFill * pitch;
        const batch = random() < occupancy ? lights : body;
        batch.quad(
          point(l, y),
          point(l, top),
          point(r, top),
          point(r, y),
          colors[Math.floor(random() * colors.length)],
        );
      }
  }
  function finish(lightColor = '#f2d5a5') {
    const group = new Group();
    group.name = name;
    group.position.set(origin[0], -grid.manifest.vertical.sceneZeroNavd88M, origin[1]);
    group.rotation.y = -angle;
    const shell = new Mesh(body.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
    shell.castShadow = shell.receiveShadow = true;
    group.add(shell);
    const lamps = new Mesh(
      lights.geometry(),
      new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: lightColor, emissiveIntensity: 0 }),
    );
    group.add(lamps);
    return {
      group,
      buildings: buildings.filter((b) => b !== site),
      setNight(night: number) {
        lamps.material.emissiveIntensity = night * 0.64;
      },
    };
  }
  return { base, ring, body, lights, prism, facade, finish };
}
