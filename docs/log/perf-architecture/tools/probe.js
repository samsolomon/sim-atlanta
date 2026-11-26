(async () => {
  const lt = await new Promise(res => { const out = []; const po = new PerformanceObserver(l => { out.push(...l.getEntries()); }); try { po.observe({ type: 'longtask', buffered: true }); } catch (e) { res('unsupported'); return; } setTimeout(() => { po.disconnect(); res(out.map(e => [Math.round(e.startTime), Math.round(e.duration)])); }, 300); });
  const draws = await __perf.captureDraws();
  const shadow = await __perf.captureDraws({ shadow: true });
  const progs = __perf.programs();
  const owners = __perf.programOwners();
  const byProg = {};
  for (const o of owners) { (byProg[o.program] ??= []).push(o.path + ' :: ' + o.type + (o.name ? ' ' + o.name : '') + (o.visible ? '' : ' (hidden)')); }
  const marks = performance.getEntriesByType('mark').map(m => [m.name, Math.round(m.startTime)]);
  const sc = window.__cityScene;
  const seen = new Set(); const geo = {}; const texSeen = new Set(); const tex = {};
  const bytes = g => { let b = 0; for (const a of Object.values(g.attributes)) b += a.array?.byteLength ?? 0; if (g.index) b += g.index.array.byteLength; return b; };
  if (sc?.traverse) sc.traverse(o => {
    const names = []; for (let p = o; p && p !== sc; p = p.parent) if (p.name) names.push(p.name);
    names.reverse();
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const k = names.slice(0, 2).join(' / ') || `(unnamed ${o.type} ${mat?.name || mat?.type || ''})`;
    if (o.geometry && !seen.has(o.geometry.uuid)) { seen.add(o.geometry.uuid);
      let b = bytes(o.geometry); if (o.isInstancedMesh) b += o.instanceMatrix.array.byteLength + (o.instanceColor?.array.byteLength ?? 0);
      geo[k] = (geo[k] ?? 0) + b; }
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) for (const [slot, t] of Object.entries(m)) {
      if (!t || !t.isTexture || texSeen.has(t.uuid)) continue; texSeen.add(t.uuid);
      const img = t.image; const w = img?.width ?? 0, h = img?.height ?? 0, d = img?.depth ?? 1;
      const bpt = t.type === 1016 || t.type === 1015 ? 8 : 4; // rough: half/float vs ubyte
      const b = w * h * d * bpt * (t.generateMipmaps !== false && t.minFilter >= 1004 ? 4 / 3 : 1);
      const tk = names.slice(0, 1).join('') + ' :: ' + slot + ' ' + w + 'x' + h + (d > 1 ? 'x' + d : '');
      tex[tk] = (tex[tk] ?? 0) + b; }
  });
  const mb = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, b]) => [k, +(b / 1048576).toFixed(1)]);
  return { hasScene: !!sc?.traverse, longTasks: lt,
    draws: draws && { total: draws.total, byPass: draws.byPass, byCategory: draws.byCategory, top: draws.top.slice(0, 40) },
    shadow: shadow && { byPass: shadow.byPass },
    programs: progs.map(p => ({ id: p.id, name: p.name, used: p.used, key: p.key.slice(0, 400), owners: (byProg[p.id] ?? []).slice(0, 5), nOwners: (byProg[p.id] ?? []).length })),
    top: __perf.top(30), marks, geoTop: mb(geo), texTop: mb(tex) };
})()
