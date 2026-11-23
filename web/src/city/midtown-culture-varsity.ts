import { DoubleSide, Mesh, MeshLambertMaterial } from "three";
import { localLandmarkShell } from "./landmark-shell";
import type { VBuilding } from "../vignette/world";
import fixture from "./fixtures/midtown-culture/varsity.json";
import { Builder, type P2 } from "../vignette/geom";

export const varsityId = fixture.id;

/**
 * The Varsity at North Avenue and Spring Street. Local u runs east and v runs
 * south from the middle of the North Avenue façade, so the street is at +v.
 */
export function createVarsity(
  buildings: VBuilding[],
  site: VBuilding,
  base: number | null,
  groundAt: (x: number, z: number) => number | null,
) {
  if (site.id !== varsityId || base === null || site.rings.length !== 1)
    return null;
  const [x, z] = fixture.origin,
    grade = groundAt(x, z + 2);
  if (grade === null) return null;
  const shell = localLandmarkShell(
    buildings,
    site,
    "The Varsity",
    [x, z],
    [1, 0],
    fixture.probes.map(([u, v]) => [u, v] as P2),
    base - grade - 0.3,
    grade,
  );
  if (!shell) return null;
  /** Local ground height above the façade datum. */
  const local = (u: number, v: number) => {
    const g = groundAt(x + u, z + v);
    return g === null ? null : g - grade;
  };
  const { body, lights, prism } = shell,
    neon = new Builder(),
    cream = "#e9dcc1",
    tile = "#d8c9ab",
    maroon = "#7d2a2b",
    red = "#c0302c",
    steel = "#c9ccc8",
    glass = "#3c4a50";
  // The mapped front runs v -0.4…-0.3; details stand proud of its outer line.
  const front = -0.3,
    west = -14.2,
    east = 14.5,
    top = 5.4;
  prism(shell.ring, shell.base, top, cream, "#aaa196");

  // North Avenue front: maroon base band, tile courses, a maroon parapet with a
  // gentle wave, and a short return on each side.
  body.box(
    east - west,
    0.95,
    0.16,
    (east + west) / 2,
    0.47,
    front + 0.08,
    maroon,
  );
  for (const y of [1.85, 2.8, 3.75, 4.7])
    body.box(east - west, 0.05, 0.1, (east + west) / 2, y, front + 0.06, tile);
  for (let u = west; u < east - 0.01; u += 1) {
    const w = Math.min(1, east - u),
      crest = 7.05 + 0.3 * Math.sin((u - west) * 0.42);
    body.box(
      w,
      crest - top + 0.05,
      0.36,
      u + w / 2,
      (top + crest) / 2,
      front - 0.1,
      maroon,
    );
  }
  for (const side of [west, east])
    body.box(
      0.36,
      1.7,
      8,
      side + (side < 0 ? 0.1 : -0.1),
      top + 0.85,
      front - 4,
      maroon,
    );
  // Storefront glazing east of the entry; it is lit at night.
  for (const [a, b] of [
    [0.6, 4],
    [4.6, 8],
    [8.6, 13.6],
  ]) {
    body.box(
      b - a + 0.24,
      2.9,
      0.12,
      (a + b) / 2,
      2.4,
      front + 0.06,
      "#5b5f60",
    );
    lights.box(b - a, 2.66, 0.14, (a + b) / 2, 2.4, front + 0.08, glass);
  }
  // Entry: glass-block surround, doors, and the porthole to its west.
  body.box(1.5, 3.1, 0.14, -3.3, 2.0, front + 0.08, "#cfd9d6");
  lights.box(2.1, 2.5, 0.14, -1.3, 1.7, front + 0.08, glass);
  for (const u of [-12.6, -11.2])
    body.box(1.1, 1.7, 0.14, u, 2.3, front + 0.08, "#cfd9d6");
  const port: [number, number] = [-6.6, 2.35];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      b = ((i + 1) / 12) * Math.PI * 2;
    const ring = (r: number, t: number) => [
      port[0] + r * Math.cos(t),
      port[1] + r * Math.sin(t),
      front + 0.12,
    ];
    body.quad(ring(0.62, a), ring(0.8, a), ring(0.8, b), ring(0.62, b), steel);
    lights.tri(
      [port[0], port[1], front + 0.1],
      ring(0.64, a),
      ring(0.64, b),
      glass,
    );
  }
  // Marquee over the entry, edged in red neon.
  body.box(6.4, 0.62, 2.9, -2.1, 3.9, front + 1.45, red);
  body.box(6.5, 0.14, 3, -2.1, 3.53, front + 1.5, steel);
  neon.box(6.6, 0.22, 0.3, -2.1, 3.95, front + 2.95, red);
  for (const u of [-5.35, 1.15])
    neon.box(0.3, 0.22, 2.9, u, 3.95, front + 1.45, red);
  // The tapered blade: a cream face with seven red letter blocks, a red frame,
  // chaser bulbs on the edges, and an angled top.
  const bladeU = -2.6,
    bladeV = front + 0.2,
    foot = 4.2,
    crown = 15.2;
  for (let i = 0; i < 11; i++) {
    const y0 = foot + ((crown - foot) * i) / 11,
      y1 = foot + ((crown - foot) * (i + 1)) / 11,
      w = 2.3 - (0.6 * (i + 0.5)) / 11;
    body.box(w, y1 - y0, 1.1, bladeU, (y0 + y1) / 2, bladeV, red);
    body.box(w - 0.5, y1 - y0, 1.16, bladeU, (y0 + y1) / 2, bladeV, cream);
    for (const s of [-1, 1])
      lights.box(
        0.22,
        (y1 - y0) * 0.7,
        1.2,
        bladeU + s * (w / 2 - 0.13),
        (y0 + y1) / 2,
        bladeV,
        "#f4e3b0",
      );
  }
  for (let i = 0; i < 7; i++) {
    const y = crown - 1.4 - i * 1.32;
    neon.box(0.9, 0.95, 1.22, bladeU, y, bladeV, red);
  }
  // Angled cap rising to the east.
  const capL = bladeU - 0.85,
    capR = bladeU + 0.85;
  for (const dv of [-0.55, 0.55])
    body.tri(
      [capL, crown, bladeV + dv],
      [capR, crown + 1.1, bladeV + dv],
      [capR, crown, bladeV + dv],
      red,
    );
  body.quad(
    [capL, crown, bladeV - 0.55],
    [capR, crown + 1.1, bladeV - 0.55],
    [capR, crown + 1.1, bladeV + 0.55],
    [capL, crown, bladeV + 0.55],
    red,
  );
  body.quad(
    [capR, crown, bladeV - 0.55],
    [capR, crown + 1.1, bladeV - 0.55],
    [capR, crown + 1.1, bladeV + 0.55],
    [capR, crown, bladeV + 0.55],
    red,
  );
  // Flags along the roof behind the parapet; their colours are illustrative.
  const flags = ["#2f5fae", "#c43a32", "#3f9d8b", "#e0c340", "#4f8f3a"];
  flags.forEach((color, i) => {
    const u = -11 + i * 5.6,
      v = -6 - (i % 2) * 6;
    body.box(0.09, 6, 0.09, u, top + 3, v, "#d9d9d4");
    body.quad(
      [u, top + 5.9, v],
      [u + 1.3, top + 5.55, v],
      [u + 1.3, top + 4.85, v],
      [u, top + 5.0, v],
      color,
    );
  });

  /** The mapped side wall's u at depth v, from the ring edge nearest `side`. */
  const wallAt = (side: number, v: number) => {
    const ring = shell.ring;
    for (let i = 0; i < ring.length; i++) {
      const [a, b] = [ring[i], ring[(i + 1) % ring.length]];
      if (Math.abs(a[0] - side) > 1.5 || Math.abs(b[0] - side) > 1.5) continue;
      if ((v - a[1]) * (v - b[1]) > 0 || a[1] === b[1]) continue;
      return a[0] + ((b[0] - a[0]) * (v - a[1])) / (b[1] - a[1]);
    }
    return side;
  };
  // Accordion-panelled side walls: alternating tones with maroon triangles.
  for (const side of [west, east]) {
    const out = side < 0 ? -0.06 : 0.06;
    let k = 0;
    for (let v = -9; v > -49; v -= 1.2, k++) {
      const g = local(side, v - 0.6);
      if (g === null) continue;
      const wall =
        Math.max(Math.abs(wallAt(side, v)), Math.abs(wallAt(side, v - 1.2))) *
        Math.sign(side);
      const lo = g - 0.05,
        hi = top - 0.1,
        uu = wall + out,
        ut = wall + 1.6 * out;
      body.quad(
        [uu, lo, v],
        [uu, hi, v],
        [uu, hi, v - 1.2],
        [uu, lo, v - 1.2],
        k % 2 ? cream : tile,
      );
      body.tri([ut, hi, v], [ut, hi, v - 1.2], [ut, hi - 0.7, v - 0.6], maroon);
      body.tri(
        [ut, g + 0.4, v],
        [ut, g + 0.4, v - 1.2],
        [ut, g + 1.1, v - 0.6],
        maroon,
      );
    }
  }

  // Curb-service canopy west of the building, following the lot's fall.
  const [cu0, cu1, cv0, cv1] = fixture.canopy;
  const south = local((cu0 + cu1) / 2, cv0),
    north = local((cu0 + cu1) / 2, cv1);
  if (south !== null && north !== null) canopy(south, north);
  function canopy(south: number, north: number) {
    const deck = (v: number) =>
      south + ((north - south) * (v - cv0)) / (cv1 - cv0) + 4.1;
    const span = (
      u0: number,
      u1: number,
      v0: number,
      v1: number,
      dy: number,
      color: string,
      into: Builder,
    ) =>
      into.quad(
        [u0, deck(v0) + dy, v0],
        [u1, deck(v0) + dy, v0],
        [u1, deck(v1) + dy, v1],
        [u0, deck(v1) + dy, v1],
        color,
      );
    span(cu0, cu1, cv0, cv1, 0, steel, body);
    span(cu0, cu1, cv0, cv1, -0.8, "#e7e3da", body);
    span(cu0 + 2.6, cu1 - 2.6, cv0 - 0.5, cv1 + 0.5, -0.82, "#fff6df", lights);
    const edge = (
      a: [number, number],
      b: [number, number],
      lo: number,
      hi: number,
      color: string,
      into: Builder,
    ) =>
      into.quad(
        [a[0], deck(a[1]) + lo, a[1]],
        [a[0], deck(a[1]) + hi, a[1]],
        [b[0], deck(b[1]) + hi, b[1]],
        [b[0], deck(b[1]) + lo, b[1]],
        color,
      );
    const corners: [number, number][] = [
      [cu0, cv0],
      [cu1, cv0],
      [cu1, cv1],
      [cu0, cv1],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i],
        b = corners[(i + 1) % 4];
      edge(a, b, -0.8, 0, steel, body);
      // Two neon bands stand slightly proud of the fascia.
      const push = (p: [number, number]): [number, number] => [
        p[0] + (p[0] === cu0 ? -0.08 : 0.08),
        p[1] + (p[1] === cv0 ? 0.08 : -0.08),
      ];
      edge(push(a), push(b), -0.74, -0.44, red, neon);
      edge(push(a), push(b), -0.34, -0.04, red, neon);
    }
    const bays = Math.round((cv0 - cv1 - 2) / 5.4);
    for (let i = 0; i <= bays; i++)
      for (const u of [cu0 + 0.5, cu1 - 0.5]) {
        const v = cv0 - 1 - ((cv0 - cv1 - 2) * i) / bays,
          g = local(u, v);
        if (g === null) continue;
        body.box(
          0.34,
          deck(v) - 0.8 - g + 0.2,
          0.34,
          u,
          (deck(v) - 0.8 + g - 0.2) / 2,
          v,
          red,
        );
      }
  }

  // The tall "V" pole sign at the lot's North Avenue corner. It faces the
  // Connector, turned an estimated 25° toward North Avenue.
  const [su, sv] = fixture.sign,
    sg = local(su, sv);
  if (sg !== null) {
    const turn = (25 * Math.PI) / 180,
      lu = Math.sin(turn),
      lv = Math.cos(turn),
      nu = -Math.cos(turn),
      nv = Math.sin(turn);
    /** A point `a` along the face, `y` up, and `d` out of the face. */
    const at = (a: number, y: number, d: number) => [
      su + a * lu + d * nu,
      y,
      sv + a * lv + d * nv,
    ];
    const plate = (
      a0: number,
      y0: number,
      a1: number,
      y1: number,
      w: number,
      d: number,
      color: string,
      into: Builder,
    ) => {
      const n = Math.hypot(a1 - a0, y1 - y0),
        pa = (-(y1 - y0) / n) * (w / 2),
        py = ((a1 - a0) / n) * (w / 2);
      for (const dd of [-d, d])
        into.quad(
          at(a0 - pa, y0 - py, dd),
          at(a1 - pa, y1 - py, dd),
          at(a1 + pa, y1 + py, dd),
          at(a0 + pa, y0 + py, dd),
          color,
        );
    };
    body.box(0.55, 9.6, 0.55, su, sg + 4.6, sv, "#9a9c98");
    plate(0, sg + 8.9, -2.2, sg + 13.7, 1.2, 0.3, red, neon);
    plate(0, sg + 8.9, 2.2, sg + 13.7, 1.2, 0.3, red, neon);
    plate(-2.3, sg + 11.4, 2.3, sg + 11.4, 0.95, 0.36, "#f1ece0", body);
    for (let i = 0; i < 7; i++)
      plate(
        -1.85 + i * 0.6,
        sg + 11.4,
        -1.5 + i * 0.6,
        sg + 11.4,
        0.55,
        0.4,
        red,
        neon,
      );
  }

  const result = shell.finish("#ffd9a0", 0.7);
  const glow = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: "#ff3424",
    emissiveIntensity: 0,
  });
  const tubes = new Mesh(neon.geometry(), glow);
  tubes.castShadow = tubes.receiveShadow = true;
  result.group.add(tubes);
  return {
    ...result,
    setNight(night: number) {
      result.setNight(night);
      glow.emissiveIntensity = night * 1.1;
    },
  };
}
