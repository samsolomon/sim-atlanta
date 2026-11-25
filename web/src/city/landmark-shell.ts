import { StaticLandmarkMaterial } from '../materials/landmark-batch';
import { DoubleSide, Group, Mesh, MeshLambertMaterial, ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { VBuilding } from '../vignette/world';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import { applySurfaces, FLAT, surfaceDefaults, SurfacePainter, type Surface } from '../materials';

/** `?perf&lampshadow=off` restores unshadowed lit panes, for A/B runs from one build. */
const lampShadowsOff = (() => {
  const p = new URLSearchParams(globalThis.location?.search ?? '');
  const perf = p.get('perf');
  return perf !== null && perf !== '0' && perf !== 'off' && p.get('lampshadow') === 'off';
})();

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
  const grades = site.rings[0].map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const base = Math.min(...grades) - 0.35;
  return localLandmarkShell(buildings, site, name, origin, axis, probes, base, -grid.manifest.vertical.sceneZeroNavd88M);
}

/** Heights can also be measured from a local street entrance on the rendered terrain. */
export function localLandmarkShell(
  buildings: VBuilding[], site: VBuilding, name: string, origin: P2, axis: P2,
  probes: P2[], base: number, originY: number,
) {
  const angle = Math.atan2(axis[1], axis[0]),
    c = Math.cos(angle),
    s = Math.sin(angle);
  const ring: P2[] = site.rings[0].map(([x, z]) => [
    (x - origin[0]) * c + (z - origin[1]) * s,
    -(x - origin[0]) * s + (z - origin[1]) * c,
  ]);
  if (!probes.every(([x, z]) => pointInRing(x, z, ring))) return null;
  const body = new Builder(),
    lights = new Builder(),
    random = rng(1976),
    painter = new SurfacePainter(body),
    lightPainter = new SurfacePainter(lights);
  /** Draws with a library material: everything `draw` adds to the body gets `surface`. */
  function paint<T>(surface: Surface, draw: () => T): T {
    return painter.paint(surface, draw);
  }
  /** `materials` optionally paints the walls and the roof with library surfaces. */
  function prism(plan: P2[], lo: number, hi: number, wall: string, roof: string, materials: { wall?: Surface; roof?: Surface } = {}) {
    const walls = () => {
      for (let i = 0; i < plan.length; i++) {
        const [x, z] = plan[i],
          [a, b] = plan[(i + 1) % plan.length];
        body.quad([x, lo, z], [x, hi, z], [a, hi, b], [a, lo, b], wall);
      }
    };
    const top = () => {
      for (const [a, b, c] of ShapeUtils.triangulateShape(
        plan.map(([x, z]) => new Vector2(x, z)),
        [],
      )) {
        const point = (i: number) => [plan[i][0], hi, plan[i][1]];
        body.tri(point(a), point(c), point(b), roof);
      }
    };
    if (materials.wall) paint(materials.wall, walls);
    else walls();
    if (materials.roof) paint(materials.roof, top);
    else top();
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
    /** The panes' library surface. FLAT by default, so panes stay plain inside a painted wall. */
    glass: Surface = FLAT,
    /** Light one smaller room within a pane that spans several real bays. */
    litInset?: { width: number; height: number },
  ) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    const count = Math.max(1, Math.round(len / bay)),
      pitch = (hi - lo) / rows;
    const point = (t: number, y: number) => [a[0] + t * dx + (0.07 * dz) / len, y, a[1] + t * dz - (0.07 * dx) / len];
    const pane = (left: number, right: number, bottom: number, upper: number, glow: boolean, color: string) => {
      const batch = glow ? lights : body;
      (glow ? lightPainter : painter).paint(glass, () => batch.quad(
        point(left, bottom), point(left, upper), point(right, upper), point(right, bottom), color,
      ));
    };
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < count; i++) {
        const l = (i + (1 - fill) / 2) / count,
          r = (i + (1 + fill) / 2) / count;
        const y = lo + (j + (1 - verticalFill) / 2) * pitch,
          top = y + verticalFill * pitch;
        const lit = random() < occupancy;
        const color = colors[Math.floor(random() * colors.length)];
        if (lit && litInset) {
          const left = l + (r - l) * (1 - litInset.width) / 2;
          const right = r - (left - l);
          const bottom = y + (top - y) * (1 - litInset.height) / 2;
          const upper = top - (bottom - y);
          pane(l, left, y, top, false, color);
          pane(right, r, y, top, false, color);
          pane(left, right, y, bottom, false, color);
          pane(left, right, upper, top, false, color);
          pane(left, right, bottom, upper, true, color);
        } else pane(l, r, y, top, lit, color);
      }
  }
  function finish(lightColor = '#f2d5a5', nightIntensity = 0.64) {
    const group = new Group();
    group.name = name;
    group.position.set(origin[0], originY, origin[1]);
    group.rotation.y = -angle;
    const shell = new Mesh(body.geometry(), new StaticLandmarkMaterial());
    // Only painted meshes change program; the rest stay exactly as they were.
    if (painter.painted && surfaceDefaults.enabled) {
      shell.geometry.setAttribute('aSurface', painter.attribute());
      applySurfaces(shell.material);
    }
    shell.castShadow = shell.receiveShadow = true;
    group.add(shell);
    // A building with no lit panes (none photographed at night, or lit through its own material)
    // gets no lamps mesh: an empty one still costs a draw every frame.
    const lampGeometry = lights.geometry();
    let lamps: Mesh<typeof lampGeometry, MeshLambertMaterial> | null = null;
    if (lampGeometry.getAttribute('position')?.count) {
      lamps = new Mesh(
        lampGeometry,
        new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: lightColor, emissiveIntensity: 0 }),
      );
      if (lightPainter.painted && surfaceDefaults.enabled) {
        lamps.geometry.setAttribute('aSurface', lightPainter.attribute());
        applySurfaces(lamps.material);
      }
      // Lit panes shade like the panes and walls around them (a neighbour's shadow by day), and
      // share the body's batch class, so by day they draw with it.
      lamps.castShadow = shell.castShadow && !lampShadowsOff;
      lamps.receiveShadow = shell.receiveShadow && !lampShadowsOff;
      group.add(lamps);
    } else lampGeometry.dispose();
    return {
      group,
      buildings: buildings.filter((b) => b !== site),
      setNight(night: number) {
        if (lamps) lamps.material.emissiveIntensity = night * nightIntensity;
      },
    };
  }
  return { base, ring, body, lights, prism, facade, paint, finish };
}
