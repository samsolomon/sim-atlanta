(() => {
  // Drawn track polylines from the temporary __railDev registry, sampled every 0.5 m; offset
  // alignments (CityTracks) yield both tracks at ±offset, using the same normals as trains.ts.
  const seen = new Set(), polys = [];
  for (const e of globalThis.__railDev ?? []) {
    if (seen.has(e.line)) continue;
    seen.add(e.line);
    for (const off of e.offset ? [e.offset, -e.offset] : [0]) {
      const pts = [];
      for (let s = 0; s <= e.line.length; s += 0.5) { const p = e.line.at(s); pts.push([p.x - p.nx * off, p.z - p.nz * off]); }
      const p = e.line.at(e.line.length); pts.push([p.x - p.nx * off, p.z - p.nz * off]);
      polys.push({ kind: e.kind, pts });
    }
  }
  const CELL = 20, grid = new Map();
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  polys.forEach((poly, pi) => {
    for (let i = 1; i < poly.pts.length; i++) {
      const [ax, az] = poly.pts[i - 1], [bx, bz] = poly.pts[i];
      const k = key((ax + bx) / 2, (az + bz) / 2);
      let list = grid.get(k); if (!list) grid.set(k, (list = []));
      list.push([pi, ax, az, bx, bz, i === 1, i === poly.pts.length - 1]);
    }
  });
  function near(x, z, only, family) {
    let best = Infinity, bestPi = -1, atEnd = false;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      for (const [pi, ax, az, bx, bz, first, last] of grid.get(`${cx + i},${cz + j}`) ?? []) {
        if (only !== undefined && pi !== only) continue;
        if (family !== undefined && (['streetcar', 'crescent'].includes(polys[pi].kind) ? polys[pi].kind : 'cq400') !== family) continue;
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-12;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
        if (d < best) { best = d; bestPi = pi; atEnd = (first && t === 0) || (last && t === 1); }
      }
    }
    return { d: best, pi: bestPi, atEnd };
  }
  const dims = new WeakMap();
  const size = (g) => {
    let v = dims.get(g);
    if (!v) { g.computeBoundingBox(); const b = g.boundingBox; v = { w: Math.max(-b.min.x, b.max.x), L: b.max.z - b.min.z }; dims.set(g, v); }
    return v;
  };
  const best = new Map();
  const stats = { frames: 0, cars: 0, unmatched: 0, kinds: {} };
  let meshes = [], lastScan = 0;
  const d = globalThis.__cityDev;
  function frame() {
    if (globalThis.__swingStop) return;
    const now = performance.now();
    if (now - lastScan > 1000) {
      lastScan = now; meshes = [];
      d.scene.traverse((o) => { if (o.isMesh && o.userData.trainId) meshes.push(o); });
    }
    stats.frames++;
    const t = globalThis.__clock.now().getTime();
    for (const m of meshes) {
      let vis = true; for (let p = m; p; p = p.parent) if (!p.visible) { vis = false; break; }
      if (!vis) continue;
      const id = String(m.userData.trainId);
      const kind = /^amtrak/i.test(id) ? 'crescent' : !/^marta/i.test(id) ? null : m.userData.lengthM ? 'streetcar' : 'cq400';
      stats.kinds[id.split(':').slice(0, 2).join(':')] = (stats.kinds[id.split(':').slice(0, 2).join(':')] ?? 0) + 1;
      if (!kind) continue;
      stats.cars++;
      const { w, L } = size(m.geometry);
      const len = m.userData.lengthM ?? L;
      const x = m.position.x, z = m.position.z;
      const f = { x: 0, z: 1 };
      // local +z through the mesh's own rotation (cars sit in their group's frame, like the lines)
      const q = m.quaternion, fx = 2 * (q.x * q.z + q.w * q.y), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
      const fl = Math.hypot(fx, fz) || 1; f.x = fx / fl; f.z = fz / fl;
      const c = near(x, z, undefined, kind);
      if (c.pi < 0 || c.d > (kind === 'streetcar' ? 3 : 1)) { stats.unmatched++; stats['un_' + kind] = (stats['un_' + kind] ?? 0) + 1; if (kind === 'streetcar') stats.scd = Math.min(stats.scd ?? 99, c.d); continue; }
      stats['ok_' + kind] = (stats['ok_' + kind] ?? 0) + 1;
      let worst = 0;
      for (const along of [-len / 2, 0, len / 2]) for (const side of [-w, w]) {
        const px = x + f.x * along - f.z * side, pz = z + f.z * along + f.x * side;
        const r = near(px, pz, c.pi);
        if (r.atEnd) { stats.pastEnd = (stats.pastEnd ?? 0) + 1; continue; }
        worst = Math.max(worst, r.d - w);
      }
      const k = key(x, z) + ':' + kind;
      const prev = best.get(k);
      if (!prev || worst > prev.swing) best.set(k, { swing: +worst.toFixed(3), kind, line: polys[c.pi].kind, x: +x.toFixed(1), z: +z.toFixed(1), d0: +c.d.toFixed(2), t, id });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  globalThis.__swingReport = () => ({ stats, polys: polys.map((p) => p.kind).reduce((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {}), cells: [...best.values()].sort((a, b) => b.swing - a.swing) });
  return { polys: polys.length, kinds: [...new Set(polys.map((p) => p.kind))] };
})()
