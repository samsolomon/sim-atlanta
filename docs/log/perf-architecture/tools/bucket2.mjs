import { readFileSync } from 'node:fs';
const [file, fromMs, toMs] = process.argv.slice(2);
const d = JSON.parse(readFileSync(file, 'utf8')); const { profile } = d;
const nodes = new Map(profile.nodes.map(n => [n.id, n])); const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const off = d.offsetMs ?? null; // profile µs/1000 - off = page ms
const G = /^(GroundSurface|carve|carveSteps|buildSteps|tessellateSteps|nearYields|seatLandingEdges|lower|farSurfaceSteps|farGeometrySteps|gradeSouthboundBoard|conformCutEdges|splitConvex|settleBelow|buildDowntownTerrain|createDowntownTerrain|footingTerrain|Object\.assign\.footingTerrain|bare|brookwoodGrid|gridAt|vertexNormalsSteps|computeVertexNormals|sampleScene|drape.*)$/;
const buckets = [
  ['transport decks/rails/parapets (excl. ground carve)', /^(buildSurfaceTransport|createSurfaceTransport|studyRails)$/],
  ['buildings (generic, landmarks, batches)', /^(buildingSteps|buildResidential|buildLandmarkBatches|batchLandmarks|createSkylineLandmark|buildSkylineLandmark)$/],
  ['yards / landscape / trees', /^(buildYards|yards|buildScenery|rollout.*|plant.*)$/],
  ['traffic / vehicles setup', /^(ConnectorTraffic|extendConnectorTraffic|.*Traffic)$/],
  ['render + shader compile', /^(WebGLRenderer\.render|WebGLRenderer\.compile|compileAsync|setProgram|getProgram)$/],
];
const tally = new Map(), other = new Map(); let total = 0;
let t = profile.startTime;
for (let i = 0; i < profile.samples.length; i++) {
  t += profile.timeDeltas[i]; const page = off !== null ? t / 1000 - off : null;
  if (fromMs && page !== null && (page < +fromMs || page > +toMs)) continue;
  const n = nodes.get(profile.samples[i]); const dt = (profile.timeDeltas[i + 1] ?? 1000) / 1000;
  const fn = n.callFrame.functionName; if (fn === '(idle)' || fn === '(program)') continue; total += dt;
  const chain = []; for (let c = n.id; c; c = parent.get(c)) chain.push(nodes.get(c).callFrame.functionName); chain.reverse();
  let b = fn === '(garbage collector)' ? 'GC' : chain.some(f => G.test(f)) ? 'ground: build, cut, carve, yields, normals' : null;
  if (!b) outer: for (const f of chain) for (const [name, re] of buckets) if (re.test(f)) { b = name; break outer; }
  if (!b) { b = 'other'; const k = chain.slice(1, 6).join(' > '); other.set(k, (other.get(k) ?? 0) + dt); }
  tally.set(b, (tally.get(b) ?? 0) + dt);
}
console.log('busy', Math.round(total)); for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1])) console.log(String(Math.round(v)).padStart(6), (100 * v / total).toFixed(0).padStart(3) + '%', k);
console.log('-- other, top call paths'); for (const [k, v] of [...other].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(String(Math.round(v)).padStart(6), k.slice(0, 200));
