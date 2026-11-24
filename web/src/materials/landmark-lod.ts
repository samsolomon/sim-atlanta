/**
 * The far version of a range of landmark triangles (non-indexed, in a shared buffer): facade
 * detail (window panes, mullions, sills: triangles under `minArea`) that sits on a larger wall
 * drops out, and the wall takes the detail's mean colour in proportion to the area it covered, so
 * the facade keeps its tone from afar. Detail that sits on no larger wall (a railing, a column, a
 * faceted curve) stays, so nothing opens a hole.
 *
 * Returns the triangles the far version keeps as they are, and the walls it redraws blended (with
 * their new vertex colours), or null when nothing would drop.
 */
export function farTriangles(P: ArrayLike<number>, C: ArrayLike<number>, k: number, t0: number, t1: number, minArea: number) {
  const n = t1 - t0;
  if (n < 2) return null;
  const area = new Float32Array(n), nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = (t0 + i) * 9;
    const ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2];
    const bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const len = Math.hypot(cx, cy, cz);
    area[i] = len / 2;
    if (len > 0) { nx[i] = cx / len; ny[i] = cy / len; nz[i] = cz / len; }
  }
  // Walls: large triangles, paired into faces when two in a row share a plane (Builder quads), so
  // both halves of a wall quad blend alike.
  const face = new Int32Array(n).fill(-1);
  const faceArea: number[] = [];
  for (let i = 0; i < n; i++) {
    if (area[i] < minArea) continue;
    const j = i - 1, o = (t0 + i) * 9, q = (t0 + j) * 9;
    if (j >= 0 && face[j] === faceArea.length - 1 && faceArea[face[j]] === area[j]
      && Math.abs(nx[i] * nx[j] + ny[i] * ny[j] + nz[i] * nz[j]) > 0.999
      && Math.abs((P[o] - P[q]) * nx[i] + (P[o + 1] - P[q + 1]) * ny[i] + (P[o + 2] - P[q + 2]) * nz[i]) < 0.01) {
      face[i] = face[j];
      faceArea[face[i]] += area[i];
    } else {
      face[i] = faceArea.length;
      faceArea.push(area[i]);
    }
  }
  if (!faceArea.length) return null;
  // Each face's triangles (one, or the two halves of a quad).
  const faceTris: number[][] = faceArea.map(() => []);
  for (let i = 0; i < n; i++) if (face[i] >= 0) faceTris[face[i]].push(i);
  /** Whether every corner of the triangle at offset o projects onto face f (plane of wall w). */
  const onFace = (o: number, f: number, w: number) => {
    for (let v = 0; v < 3; v++) {
      const x = P[o + v * 3], y = P[o + v * 3 + 1], z = P[o + v * 3 + 2], q = (t0 + w) * 9;
      const d = (x - P[q]) * nx[w] + (y - P[q + 1]) * ny[w] + (z - P[q + 2]) * nz[w];
      if (!faceTris[f].some(t => inside(P, (t0 + t) * 9, x - d * nx[w], y - d * ny[w], z - d * nz[w]))) return false;
    }
    return true;
  };
  // A spatial hash of the walls, by bounding box.
  const G = 6;
  // Numeric cell keys; a collision only adds a candidate, which the plane test rejects.
  const key = (x: number, y: number, z: number) => (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  const grid = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (face[i] < 0) continue;
    const o = (t0 + i) * 9;
    // Padded by the 0.4 m a pane may stand off its wall, so a pane by a cell edge still finds it.
    const x0 = Math.floor((Math.min(P[o], P[o + 3], P[o + 6]) - 0.4) / G), x1 = Math.floor((Math.max(P[o], P[o + 3], P[o + 6]) + 0.4) / G);
    const y0 = Math.floor((Math.min(P[o + 1], P[o + 4], P[o + 7]) - 0.4) / G), y1 = Math.floor((Math.max(P[o + 1], P[o + 4], P[o + 7]) + 0.4) / G);
    const z0 = Math.floor((Math.min(P[o + 2], P[o + 5], P[o + 8]) - 0.4) / G), z1 = Math.floor((Math.max(P[o + 2], P[o + 5], P[o + 8]) + 0.4) / G);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const k = key(x, y, z), list = grid.get(k);
      if (list) list.push(i);
      else grid.set(k, [i]);
    }
  }
  const hosted = new Uint8Array(n);
  const hostFace = new Int32Array(n).fill(-1), offset = new Float32Array(n);
  let dropped = 0;
  for (let i = 0; i < n; i++) {
    if (face[i] >= 0) continue;
    const o = (t0 + i) * 9;
    const px = (P[o] + P[o + 3] + P[o + 6]) / 3, py = (P[o + 1] + P[o + 4] + P[o + 7]) / 3, pz = (P[o + 2] + P[o + 5] + P[o + 8]) / 3;
    const cands = grid.get(key(Math.floor(px / G), Math.floor(py / G), Math.floor(pz / G)));
    if (!cands) continue;
    // The nearest wall behind it: with back-to-back or nested walls, the first within reach may be
    // a hidden one.
    let best = -1, bestD = Infinity;
    for (const w of cands) {
      // Either winding: Builder walls and panes do not agree on it.
      if (Math.abs(nx[i] * nx[w] + ny[i] * ny[w] + nz[i] * nz[w]) < 0.9) continue;
      const q = (t0 + w) * 9;
      const d = (px - P[q]) * nx[w] + (py - P[q + 1]) * ny[w] + (pz - P[q + 2]) * nz[w];
      // On the wall's plane: panes sit ~7 cm proud of it, recessed glass a little behind.
      if (Math.abs(d) > 0.4 || Math.abs(d) >= bestD) continue;
      if (!inside(P, q, px - d * nx[w], py - d * ny[w], pz - d * nz[w])) continue;
      // All of it must sit on the wall: detail that overhangs the wall's edge has nothing behind
      // that part, and dropping it would open a hole.
      if (!onFace(o, face[w], w)) continue;
      best = w;
      bestD = Math.abs(d);
    }
    if (best < 0) continue;
    hosted[i] = 1;
    hostFace[i] = face[best];
    offset[i] = bestD;
    dropped++;
  }
  // What each piece of detail shows: frames and panes overlap, so only the share of a triangle that
  // no detail further out covers counts (sampled at its centroid and three points toward its corners).
  const front = new Map<number, number[]>();
  const D = 2;
  for (let i = 0; i < n; i++) {
    if (!hosted[i]) continue;
    const o = (t0 + i) * 9;
    const x0 = Math.floor(Math.min(P[o], P[o + 3], P[o + 6]) / D), x1 = Math.floor(Math.max(P[o], P[o + 3], P[o + 6]) / D);
    const y0 = Math.floor(Math.min(P[o + 1], P[o + 4], P[o + 7]) / D), y1 = Math.floor(Math.max(P[o + 1], P[o + 4], P[o + 7]) / D);
    const z0 = Math.floor(Math.min(P[o + 2], P[o + 5], P[o + 8]) / D), z1 = Math.floor(Math.max(P[o + 2], P[o + 5], P[o + 8]) / D);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const k2 = key(x, y, z), list = front.get(k2);
      if (list) list.push(i);
      else front.set(k2, [i]);
    }
  }
  const cover = new Float64Array(faceArea.length), sum = new Float64Array(faceArea.length * 3);
  for (let i = 0; i < n; i++) {
    if (!hosted[i]) continue;
    const o = (t0 + i) * 9, f = hostFace[i];
    const cx = (P[o] + P[o + 3] + P[o + 6]) / 3, cy = (P[o + 1] + P[o + 4] + P[o + 7]) / 3, cz = (P[o + 2] + P[o + 5] + P[o + 8]) / 3;
    let open = 0;
    for (let s = 0; s < 4; s++) {
      const px = s ? (cx + P[o + (s - 1) * 3]) / 2 : cx, py = s ? (cy + P[o + (s - 1) * 3 + 1]) / 2 : cy, pz = s ? (cz + P[o + (s - 1) * 3 + 2]) / 2 : cz;
      let covered = false;
      for (const j of front.get(key(Math.floor(px / D), Math.floor(py / D), Math.floor(pz / D))) ?? []) {
        if (j === i || hostFace[j] !== f || offset[j] <= offset[i] + 0.005) continue;
        const q = (t0 + j) * 9;
        const d = (px - P[q]) * nx[j] + (py - P[q + 1]) * ny[j] + (pz - P[q + 2]) * nz[j];
        if (inside(P, q, px - d * nx[j], py - d * ny[j], pz - d * nz[j])) { covered = true; break; }
      }
      if (!covered) open++;
    }
    const seen = area[i] * open / 4;
    if (!seen) continue;
    cover[f] += seen;
    const c0 = (t0 + i) * 3 * k;
    for (let c = 0; c < 3; c++) sum[f * 3 + c] += seen * (C[c0 + c] + C[c0 + k + c] + C[c0 + 2 * k + c]) / 3;
  }
  if (!dropped) return null;
  const kept: number[] = [], walls: { t: number; color: Float32Array }[] = [];
  for (let i = 0; i < n; i++) {
    if (hosted[i]) continue;
    const f = face[i];
    if (f < 0 || !cover[f]) { kept.push(t0 + i); continue; }
    const w = Math.min(1, cover[f] / faceArea[f]), color = new Float32Array(3 * k), c0 = (t0 + i) * 3 * k;
    for (let v = 0; v < 3; v++) for (let c = 0; c < k; c++) {
      const src = C[c0 + v * k + c];
      color[v * k + c] = c < 3 ? src * (1 - w) + (sum[f * 3 + c] / cover[f]) * w : src;
    }
    walls.push({ t: t0 + i, color });
  }
  return { kept, walls, dropped };
}

/** Whether point p lies within triangle q (by barycentric sign), with a small margin. */
function inside(P: ArrayLike<number>, q: number, px: number, py: number, pz: number) {
  const ax = P[q], ay = P[q + 1], az = P[q + 2];
  const v0x = P[q + 6] - ax, v0y = P[q + 7] - ay, v0z = P[q + 8] - az;
  const v1x = P[q + 3] - ax, v1y = P[q + 4] - ay, v1z = P[q + 5] - az;
  const v2x = px - ax, v2y = py - ay, v2z = pz - az;
  const d00 = v0x * v0x + v0y * v0y + v0z * v0z, d01 = v0x * v1x + v0y * v1y + v0z * v1z, d11 = v1x * v1x + v1y * v1y + v1z * v1z;
  const d20 = v2x * v0x + v2y * v0y + v2z * v0z, d21 = v2x * v1x + v2y * v1y + v2z * v1z;
  const den = d00 * d11 - d01 * d01;
  if (den <= 0) return false;
  const v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
  return v >= -0.01 && w >= -0.01 && v + w <= 1.01;
}
