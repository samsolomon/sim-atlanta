import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Face kit for road-vehicle meshes (road-semi.ts, road-pickup.ts). Metres, +z forward, y up.
 * Every face is turned to point away from an interior point: a loose panel names one, and a skin
 * uses the centroid of the rings either side. Hand-built faces then need no per-face winding flags.
 */
export type V = number[];
export type Face = { points: V[]; color: string };

const sub = (a: V, b: V) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const centroid = (pts: V[]) => [0, 1, 2].map((i) => pts.reduce((s, p) => s + p[i], 0) / pts.length);
/** Newell normal, unnormalised; zero for a degenerate face. */
function newell(pts: V[]) {
  const n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return n;
}

export function faceKit() {
  const faces: Face[] = [];
  function panel(points: V[], color: string, away: V) {
    const n = newell(points);
    if (Math.hypot(n[0], n[1], n[2]) < 1e-10) return;
    const d = sub(centroid(points), away);
    faces.push({ points: n[0] * d[0] + n[1] * d[1] + n[2] * d[2] < 0 ? points.slice().reverse() : points, color });
  }
  function skin(rings: V[][], color: string, closed = true) {
    const c = rings.map(centroid);
    if (closed) {
      panel(rings[0], color, c[1]);
      panel(rings[rings.length - 1], color, c[c.length - 2]);
    }
    for (let i = 1; i < rings.length; i++) {
      const mid = c[i - 1].map((v, j) => (v + c[i][j]) / 2);
      for (let j = 0; j < rings[i].length; j++) {
        const k = (j + 1) % rings[i].length;
        panel([rings[i - 1][j], rings[i - 1][k], rings[i][k], rings[i][j]], color, mid);
      }
    }
  }
  function box(x: number, y: number, z: number, w: number, h: number, l: number, color: string) {
    skin(
      [-1, 1].map((s) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + (a * w) / 2, y + (b * h) / 2, z + (s * l) / 2])),
      color,
    );
  }
  function round(x: number, y: number, z: number, axis: 'x' | 'y' | 'z', levels: number[][], color: string, n = 12) {
    skin(
      levels.map(([d, r]) =>
        Array.from({ length: n }, (_, j) => {
          const a = r * Math.cos((j * 2 * Math.PI) / n),
            b = r * Math.sin((j * 2 * Math.PI) / n);
          return axis === 'x' ? [x + d, y + a, z + b] : axis === 'y' ? [x + a, y + d, z + b] : [x + a, y + b, z + d];
        }),
      ),
      color,
    );
  }
  /** A flat lamp facing forward ('z'), backward ('-z') or away from the centre line ('x'). */
  function lamp(x: number, y: number, z: number, w: number, h: number, axis: 'x' | 'z' | '-z', color: string) {
    const pts = axis === 'x'
      ? [[x, y - h / 2, z - w / 2], [x, y - h / 2, z + w / 2], [x, y + h / 2, z + w / 2], [x, y + h / 2, z - w / 2]]
      : [[x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z]];
    panel(pts, color, axis === 'x' ? [0, y, z] : [x, y, axis === 'z' ? z - 1 : z + 1]);
  }
  return { faces, panel, skin, box, round, lamp };
}
export type FaceKit = ReturnType<typeof faceKit>;

/**
 * Pack faces into the vehicle kit's attributes (position, color, aKind), shifted by `dz` along the
 * length. `kindOf` maps a face colour to its kind; paint (kind 0) takes `paint`.
 */
export function packFaces(faces: Face[], kindOf: (color: string) => number, paint: string, dz = 0) {
  const positions: number[] = [],
    colors: number[] = [],
    kinds: number[] = [];
  const tint = new THREE.Color();
  for (const { points, color } of faces) {
    const kind = kindOf(color);
    tint.set(kind === 0 ? paint : color);
    for (let i = 1; i + 1 < points.length; i++)
      for (const p of [points[0], points[i], points[i + 1]]) {
        positions.push(p[0], p[1], p[2] + dz);
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
