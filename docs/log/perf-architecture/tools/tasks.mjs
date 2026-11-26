// Attribute each long task over a threshold to buckets and the City phase it falls in.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [file, min = '300'] = process.argv.slice(2);
const d = JSON.parse(readFileSync(file, 'utf8'));
const tasks = d.longTasks.filter(t => t[1] >= +min).sort((a, b) => a[0] - b[0]);
const phaseAt = ms => { let p = 'boot'; for (const x of d.phases) if (x.ms <= ms) p = x.name; return p; };
const landed = (a, b) => d.phases.filter(x => x.ms >= a && x.ms <= b + 50).map(x => x.name).join(', ');
for (const [s, dur] of tasks) {
  console.log(`\n### task at ${s} ms, ${dur} ms (after phase "${phaseAt(s)}"; phases landing in it: ${landed(s, s + dur) || 'none'})`);
  console.log(execFileSync('node', [new URL('./bucket2.mjs', import.meta.url).pathname, file, String(s), String(s + dur)]).toString().split('\n').slice(0, 8).join('\n'));
}
