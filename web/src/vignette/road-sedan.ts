import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const bodyPaint = '#ffffff',
  glass = '#344855',
  wind = '#465d69',
  dark = '#20272a',
  red = '#914143',
  lens = '#d9d9c7';
type Face = { points: number[][]; color: string };

/** Instanced road mesh from the July 2017 AXVH70 sedan study. Stations are metres, +z faces forward. */
export function roadSedanGeometry() {
  const faces: Face[] = [];
  function panel(points: number[][], color: string, reverse = false) {
    faces.push({ points: reverse ? points.slice().reverse() : points, color });
  }
  function wheel(x: number, r: number, z: number, side: number) {
    const disc = (d: number, radius: number) =>
      Array.from({ length: 8 }, (_, i) => [
        x + side * d,
        r + radius * Math.cos((i * Math.PI) / 4),
        z + radius * Math.sin((i * Math.PI) / 4),
      ]);
    const back = disc(-0.1075, r),
      outer = disc(0.1075, r);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      panel([outer[i], outer[j], back[j], back[i]], '#292a2b', side > 0);
    }
    panel(outer, '#292a2b', side < 0);
    panel(disc(0.1195, r * 0.55), '#939b9d', side < 0);
  }
  const bumper = 2.4425,
    end = bumper - 0.023;
  // AXVH70 G Leather Package profile, in longitudinal stations from rear bumper to nose.
  const rearAxle = -bumper + 1.085,
    frontAxle = rearAxle + 2.825;
  const r = 0.335,
    arch = 0.365;
  // z, half width at shoulder, deck/hood centre height, sill height.
  const body = [
    [-end, 0.65, 0.96, 0.36],
    [-2.32, 0.79, 1.035, 0.255],
    [-2.13, 0.875, 1.045, 0.22],
    [-1.81, 0.912, 1.075, 0.205],
    [-1.28, 0.92, 1.065, 0.2],
    [-0.67, 0.9, 1.005, 0.195],
    [0.05, 0.898, 0.97, 0.195],
    [0.93, 0.906, 0.951, 0.2],
    [1.13, 0.92, 0.947, 0.2],
    [1.66, 0.916, 0.92, 0.205],
    [2.0, 0.873, 0.86, 0.21],
    [2.24, 0.805, 0.802, 0.22],
    [end, 0.61, 0.73, 0.255],
  ];
  function sample(stations: number[][], z: number) {
    const i = stations.findIndex((row) => row[0] >= z);
    if (i <= 0) return stations[i === 0 ? 0 : stations.length - 1];
    const a = stations[i - 1],
      b = stations[i],
      t = (z - a[0]) / (b[0] - a[0]);
    return a.map((v, j) => v + t * (b[j] - v));
  }
  const axles = [rearAxle, frontAxle],
    segments = 5;
  const zs = body.map((row) => row[0]);
  for (const axle of axles)
    for (let j = 0; j <= segments; j++) zs.push(axle - arch * Math.cos((j * Math.PI) / segments));
  const sections = zs
    .sort((a, b) => a - b)
    .map((z) => {
      const [, w, top, sill] = sample(body, z);
      let low = sill;
      for (const axle of axles)
        if (Math.abs(z - axle) <= arch + 0.000001)
          low = Math.max(low, r + Math.sqrt(Math.max(0, arch ** 2 - (z - axle) ** 2)));
      const points = [
        [0, low],
        [w * 0.955, low],
        [w * 0.974, Math.max(low + 0.012, sill + 0.11)],
        [w, Math.max(low + 0.022, top - 0.19)],
        [w * 0.973, top - 0.115],
        [w * 0.81, top - 0.04],
        [w * 0.46, top + 0.005],
        [0, top],
      ];
      return [
        ...points,
        ...points
          .slice(1, -1)
          .reverse()
          .map(([x, y]) => [-x, y]),
      ].map(([x, y]) => [x, y, z]);
    });
  panel(sections[0].slice().reverse(), bodyPaint);
  for (let i = 1; i < sections.length; i++)
    for (let j = 0; j < sections[i].length; j++) {
      const k = (j + 1) % sections[i].length;
      panel([sections[i - 1][j], sections[i - 1][k], sections[i][k], sections[i][j]], bodyPaint);
    }
  panel(sections.at(-1)!, bodyPaint);
  for (const axle of axles)
    for (const side of [-1, 1]) {
      for (let i = 0; i < segments; i++) {
        const at = (j: number, x: number) => [
          side * x,
          r + arch * Math.sin((j * Math.PI) / segments),
          axle - arch * Math.cos((j * Math.PI) / segments),
        ];
        panel([at(i, 0.88), at(i + 1, 0.88), at(i + 1, 0.64), at(i, 0.64)], dark, side < 0);
      }
      wheel(side * (axle === frontAxle ? 0.79 : 0.7925), r, axle, side);
    }
  // Continuous roof crown across the car, with long rear glass narrowing onto the raised deck.
  // z, belt height, crown height, glass-base half width, roof-edge half width
  const canopy = [
    [-1.89, 1.065, 1.079, 0.67, 0.52],
    [-1.54, 1.065, 1.198, 0.82, 0.635],
    [-1.15, 1.038, 1.34, 0.855, 0.66],
    [-0.92, 1.017, 1.402, 0.858, 0.68],
    [-0.61, 0.993, 1.437, 0.857, 0.698],
    [-0.28, 0.974, 1.445, 0.854, 0.71],
    [0.03, 0.956, 1.437, 0.852, 0.72],
    [0.28, 0.947, 1.414, 0.843, 0.73],
    [0.47, 0.941, 1.372, 0.837, 0.735],
    [0.71, 0.938, 1.283, 0.833, 0.75],
    [1.1, 0.941, 1.067, 0.821, 0.775],
    [1.3, 0.942, 0.951, 0.8, 0.775],
  ];
  function roofPoint(v: number[], side: number, f: number) {
    const [z, base, h, , w] = v;
    return [side * w * f, h - (h - base) * 0.112 * f * f, z];
  }
  for (let i = 1; i < canopy.length; i++) {
    const a = canopy[i - 1],
      b = canopy[i],
      paneColor = i <= 3 || i >= 9 ? wind : bodyPaint;
    for (const side of [-1, 1]) {
      for (const [l, r] of [
        [0, 0.56],
        [0.56, 1],
      ])
        panel(
          [roofPoint(a, side, l), roofPoint(a, side, r), roofPoint(b, side, r), roofPoint(b, side, l)],
          paneColor,
          side > 0,
        );
      const point = (v: number[], t: number) => [
        side * (v[3] + (v[4] - v[3]) * t),
        v[1] + (roofPoint(v, side, 1)[1] - v[1]) * t,
        v[0],
      ];
      panel([point(a, 0), point(a, 1), point(b, 1), point(b, 0)], bodyPaint, side < 0);
    }
  }
  // The side glass follows the roof without a mullion at every modelling station.
  for (const [lo, hi] of [
    [-1.29, -0.915],
    [-0.892, -0.205],
    [-0.105, 1.04],
  ]) {
    const stops = [lo, ...canopy.map((c) => c[0]).filter((z) => z > lo && z < hi), hi];
    for (let i = 1; i < stops.length; i++)
      for (const side of [-1, 1]) {
        const glassPoint = (z: number, t: number) => {
          const v = sample(canopy, z),
            top = roofPoint(v, side, 1)[1];
          const taper = Math.min(1, (z + 1.34) / 0.36, (1.12 - z) / 0.3);
          const f = 0.12 + t * 0.84 * taper;
          return [side * (v[3] + (v[4] - v[3]) * f + 0.004), v[1] + (top - v[1]) * f, z];
        };
        const a = stops[i - 1],
          b = stops[i];
        panel([glassPoint(a, 0), glassPoint(a, 1), glassPoint(b, 1), glassPoint(b, 0)], glass, side < 0);
      }
  }
  // Map the lens pockets and fascia onto the formed bumper corners. Ray/triangle
  // interpolation follows the same triangulation used to pack these faces for Three.
  const hull = faces.slice(0, 2 + (sections.length - 1) * sections[0].length);
  function surfaceZ(x: number, y: number, dir: number) {
    let furthest = -Infinity;
    for (const { points } of hull)
      for (let i = 1; i < points.length - 1; i++) {
        const [a, b, c] = [points[0], points[i], points[i + 1]];
        const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
        if (Math.abs(den) < 1e-9) continue;
        const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den;
        const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den;
        if (u >= -1e-6 && v >= -1e-6 && u + v <= 1.000001)
          furthest = Math.max(furthest, dir * (u * a[2] + v * b[2] + (1 - u - v) * c[2]));
      }
    if (!Number.isFinite(furthest)) throw Error('Fascia outside shell');
    return dir * (furthest + 0.018);
  }
  // Cut the lens from the actual rear-facing bumper facets. Connecting just the
  // four projected corner points cuts through a convex shoulder between stations.
  function rearLens(side: number) {
    const outline = [
      [0.23, 0.886],
      [0.58, 0.9],
      [0.765, 0.91],
      [0.856, 0.904],
      [0.891, 0.913],
      [0.891, 0.928],
      [0.856, 0.952],
      [0.765, 0.973],
      [0.58, 0.976],
      [0.23, 0.936],
    ];
    function clip(points: number[][], distance: (p: number[]) => number) {
      const clipped = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length],
          da = distance(a),
          db = distance(b);
        if (da >= 0) clipped.push(a);
        if (da < 0 !== db < 0) clipped.push(a.map((v, j) => v + ((b[j] - v) * da) / (da - db)));
      }
      return clipped;
    }
    for (const { points } of hull) {
      if (points.some((p) => p[2] > -1.5)) continue;
      for (let i = 1; i + 1 < points.length; i++) {
        const [a, b, c] = [points[0], points[i], points[i + 1]];
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= -1e-9) continue;
        for (let j = 0; j < 4; j++) {
          let polygon = [a, b, c];
          const quad = [outline[j], outline[j + 1], outline[8 - j], outline[9 - j]];
          for (let k = 0; k < 4 && polygon.length; k++) {
            const [x, y] = quad[k],
              [u, v] = quad[(k + 1) % 4];
            polygon = clip(polygon, (p) => (u - x) * (p[1] - y) - (v - y) * (side * p[0] - x));
          }
          if (polygon.length >= 3)
            panel(
              polygon.map(([x, y, z]) => [x * 1.003, y + 0.001, z - 0.004]),
              red,
            );
        }
      }
    }
  }
  for (const side of [-1, 1]) {
    // Each row gives a lateral station and the lower/upper edges in elevation.
    const band = (rows: number[][], dir: number, color: string, offset = 0) => {
      const point = (x: number, y: number) => [side * x, y, surfaceZ(side * x, y, dir) + dir * offset];
      for (let i = 1; i < rows.length; i++) {
        const [a, b] = [rows[i - 1], rows[i]];
        panel([point(a[0], a[1]), point(b[0], b[1]), point(b[0], b[2]), point(a[0], a[2])], color, side !== dir);
      }
    };
    band(
      [
        [0.27, 0.65, 0.674],
        [0.42, 0.66, 0.72],
        [0.56, 0.677, 0.735],
        [0.66, 0.7, 0.754],
        [0.755, 0.732, 0.777],
        [0.812, 0.764, 0.802],
      ],
      1,
      lens,
    );
    rearLens(side);
    band(
      [
        [0, 0.31, 0.614],
        [0.27, 0.313, 0.625],
        [0.45, 0.32, 0.611],
        [0.57, 0.337, 0.552],
        [0.64, 0.35, 0.404],
      ],
      1,
      dark,
    );
    band(
      [
        [0, 0.69, 0.801],
        [0.21, 0.693, 0.805],
        [0.3, 0.717, 0.815],
      ],
      -1,
      '#84949a',
    );
    band(
      [
        [0, 0.844, 0.858],
        [0.29, 0.845, 0.859],
        [0.52, 0.868, 0.881],
        [0.6, 0.882, 0.891],
      ],
      -1,
      '#687980',
    );
  }
  const positions: number[] = [],
    colors: number[] = [],
    kinds: number[] = [];
  const tint = new THREE.Color();
  for (const { points, color } of faces) {
    const paintedTrim = color === '#84949a' || color === '#687980';
    const kind =
      color === bodyPaint || paintedTrim
        ? 0
        : color === lens
          ? 1
          : color === red
            ? 2
            : color === glass || color === wind
              ? 3
              : 4;
    tint.set(color === '#84949a' ? '#dce1e1' : color === '#687980' ? '#b6bfc0' : color);
    for (let i = 1; i + 1 < points.length; i++)
      for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(...p);
        colors.push(tint.r, tint.g, tint.b);
        kinds.push(kind);
      }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 1));
  geometry.computeVertexNormals();
  return mergeVertices(geometry);
}
