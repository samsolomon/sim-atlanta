// node --experimental-strip-types cadence.mts <dir-of-poll-*.json>
// Real feed cadence, and how long a moving train sits still: main's 8 s glide vs the 40 s playback.
import { readdirSync, readFileSync } from 'node:fs';
import { appendReservedFix, playback, RESERVE_DELAY_MS, type Knot } from '../../web/src/live/motion.ts';
const dir = process.argv[2];
const polls = readdirSync(dir).filter(f => /^poll-\d+\.json$/.test(f)).sort().map(f => ({ t: Number(f.slice(5, -5)) * 1000, body: JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) }));
const hav = (a: any, b: any) => { const R = 6371000, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const byTrain = new Map<string, { t: number; at: number | null; lat: number; lon: number }[]>();
for (const p of polls) for (const tr of p.body.trains ?? []) { if (!byTrain.has(tr.id)) byTrain.set(tr.id, []); byTrain.get(tr.id)!.push({ t: p.t, at: tr.at, lat: tr.lat, lon: tr.lon }); }
const gaps: number[] = []; let repeats = 0, samples = 0;
let mainStill = 0, newStill = 0, mainMovingTime = 0, newMovingTime = 0;
for (const [, seq] of byTrain) {
  // Distinct fixes in arrival order (what ingest keeps), with along-route distance as cumulative straight-line metres.
  const fixes: { t: number; at: number; s: number }[] = [];
  let s = 0, last: any = null;
  for (const o of seq) {
    samples++;
    if (o.at == null) continue;
    if (last && o.at <= last.at) { repeats++; continue; }
    if (last) { gaps.push((o.at - last.at) / 1000); s += hav(last, o); }
    fixes.push({ t: o.t, at: o.at, s }); last = o;
  }
  if (fixes.length < 4) continue;
  // Simulate both on a 0.25 s clock from the 2nd fix to the last fix's arrival; count time a train is still while its fixes say it moved.
  const knots: Knot[] = []; let gFrom = fixes[0].s, gTo = fixes[0].s, gStart = fixes[0].t;
  const glide = (now: number) => gFrom + (gTo - gFrom) * Math.min(1, Math.max(0, (now - gStart) / 8000));
  let fi = 0, prevMain = NaN, prevNew = NaN;
  for (let now = fixes[0].t; now <= fixes.at(-1)!.t; now += 250) {
    while (fi < fixes.length && fixes[fi].t <= now) { const f = fixes[fi]; gFrom = glide(now); gTo = f.s; gStart = now; appendReservedFix(knots, f.s, f.t); fi++; }
    const m = glide(now), n = playback(knots, now, RESERVE_DELAY_MS);
    // "Moving" = this interval's fixes (by arrival) differ by > 40 m.
    // Each model is judged on what it is showing. Main glides from fix k-1 to fix k (k = newest
    // received). Playback at now-40 s shows the segment between the fixes received around then.
    const k = fi - 1;
    const mainMoving = k >= 1 && fixes[k].s - fixes[k - 1].s > 40;
    const T = now - RESERVE_DELAY_MS;
    let j = -1; for (let x = 0; x < fixes.length; x++) if (fixes[x].t <= T) j = x;
    const newMoving = j >= 0 && j + 1 < fixes.length && fixes[j + 1].s - fixes[j].s > 40;
    if (now > fixes[0].t + RESERVE_DELAY_MS + 30000) {
      if (mainMoving) { mainMovingTime += 0.25; if (m === prevMain) mainStill += 0.25; }
      if (newMoving) { newMovingTime += 0.25; if (n === prevNew) newStill += 0.25; }
    }
    prevMain = m; prevNew = n;
  }
}
gaps.sort((a, b) => a - b);
const q = (p: number) => gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))];
console.log(JSON.stringify({ polls: polls.length, trains: byTrain.size, observations: samples, repeatedOrOlderFix: repeats,
  fixGapS: { n: gaps.length, p10: q(.1), median: q(.5), p90: q(.9), max: gaps.at(-1) },
  movingS: { main: Math.round(mainMovingTime), playback: Math.round(newMovingTime) }, stillWhileMoving: { mainGlide8s: +(mainStill / mainMovingTime).toFixed(3), playback40s: +(newStill / newMovingTime).toFixed(3) } }, null, 1));
