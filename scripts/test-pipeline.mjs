// Python checks for the building-part extraction and terrain transport baking, run by `pnpm test`.
// They need the repository .venv (see README). Without it they are skipped loudly.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const python = new URL('../.venv/bin/python', import.meta.url).pathname;
if (!existsSync(python)) {
  // Releases run with PIPELINE_TESTS=strict (`pnpm test:release`) and must never skip.
  if (process.env.PIPELINE_TESTS === 'strict') {
    console.error('\n✖ PIPELINE_TESTS=strict: no .venv, so the pipeline checks cannot run. Create it per README.\n');
    process.exit(1);
  }
  console.warn('\n⚠️  SKIPPED pipeline checks: no .venv. Create it per README to test building-part extraction.\n');
  process.exit(0);
}
const run = (args) => {
  const r = spawnSync(python, args, { stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, cwd: new URL('../pipeline/scripts/', import.meta.url).pathname });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(['-m', 'unittest', 'test_building_parts']);
// Freight centreline smoothing and surface-way baking (terrain_transport.py).
run(['-m', 'unittest', 'test_terrain_transport']);
// Every committed OSM board context must match what the extractor produces now.
run(['rebake_buildings.py', '--check']);
