// Apply the owner's three shared call-site edits to temporary copies for Orca QA.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../../..');
const web = join(root, 'web'), tmp = mkdtempSync(join(tmpdir(), 'five-points-'));
const shared = ['web/src/city/city.ts', 'web/src/city/trains.ts', 'web/src/terrain/transport.ts'];
const verify = process.argv.includes('--verify');
try {
  if (verify) {
    // Compile the actual patched source and run its tests without editing the owner's checkout.
    mkdirSync(join(tmp,'web'));
    for (const entry of readdirSync(web)) {
      if (['dist','node_modules','public'].includes(entry)) continue;
      cpSync(join(web,entry),join(tmp,'web',entry),{recursive:true});
    }
    for (const path of ['web/node_modules','web/public','pipeline']) symlinkSync(join(root,path),join(tmp,path));
    cpSync(join(here,'attached-test.ts'),join(tmp,'web/src/city/east-cut-attached.test.ts'));
  }
  for (const file of shared) {
    mkdirSync(dirname(join(tmp, file)), {recursive:true});
    cpSync(join(root, file), join(tmp, file));
  }
  const patch = join(here, 'attach.patch');
  const applied = spawnSync('git', ['apply','--reverse','--check',patch], {cwd:tmp}).status === 0;
  if (!applied) execFileSync('git', ['apply', patch], { cwd: tmp });
  if (verify) {
    for (const [bin,...args] of [['tsc','--noEmit'],['vitest','run','src/city'],['vite','build']]) {
      execFileSync(join(web,'node_modules/.bin',bin),args,{cwd:join(tmp,'web'),stdio:'inherit'});
    }
  } else {
  const changes = new Map(shared.map(file => [join(root, file), readFileSync(join(tmp, file), 'utf8')]));
  process.chdir(web);
  const require = createRequire(join(web, 'package.json'));
  const { createServer } = await import(pathToFileURL(require.resolve('vite')));
  const server = await createServer({ root: web, cacheDir: join(web, 'node_modules/.vite-mapped-rail'),
    server: { host: '127.0.0.1', port: Number(process.env.EAST_CUT_PORT ?? 5372), strictPort: true },
    optimizeDeps: { include: ['three', 'three/addons/controls/OrbitControls.js'] },
    plugins: [{ name:'mapped-rail-branch-qa', enforce:'pre', transform(source, id) {
      if (id.endsWith('/src/main.ts')) return source.replace('let cityTilt = 57;', 'let cityTilt = 26;');
      const attached = changes.get(id);
      if (!attached) return;
      if (!id.endsWith('/city/city.ts')) return attached;
      return attached.replace('const cut = prepareEastCut(rf, manifest,', `
        const cutManifest = new URLSearchParams(location.search).get('railQA') === 'missing-ER' ? structuredClone(manifest) : manifest;
        if (cutManifest !== manifest) delete cutManifest.rail.paths['marta:path:155177'];
        const cut = prepareEastCut(rf, cutManifest,`).replace('  const cx = (b.minX', `
        const qa = new URLSearchParams(location.search).get('railQA');
        const [trackName, mouth] = (qa || '').split('-');
        const fixture = [...cut?.paths.entries() || []].find(([, p]) => p.name === trackName);
        const stockAtMouth = fixture && ['west','east'].includes(mouth) ? (() => {
          const [pathId, p] = fixture;
          const atEntry = (p.name === 'ER') === (mouth === 'west');
          const s = atEntry ? p.entry : p.exit;
          const point = p.line.at(mouth === 'west' ? 0 : p.line.length);
          return { id:'qa', pathId, routeId:p.routeId, s:{value:s}, lengthM:{value:22.9*5},
            lon:manifest.origin.lon + point.x / (111195 * Math.cos(manifest.origin.lat * Math.PI/180)),
            lat:manifest.origin.lat - point.z/111195, heading:p.name==='ER'?132:312 };
        })() : null;
        if (stockAtMouth) {
          const label = document.createElement('output');
          label.textContent = 'Five-car test consist · ' + trackName + ' · ' + mouth + ' mouth';
          label.style.cssText = 'position:fixed;right:12px;bottom:36px;padding:8px 12px;background:#182027;color:white;z-index:1000;font:14px system-ui';
          container.appendChild(label);
        }
        window.mappedRailQA = { paths:[...cut?.paths || []].map(([id,p]) => [id,p.name,p.entry,p.exit]),
          freight: transport?.freightTreads.filter(run => run.length && run[0].s>850 && run[0].s<965)
            .map(run => [run[0].s,run.at(-1).s]), fixture:stockAtMouth };
        const cx = (b.minX`).replace('trains.update(options.trains(), atm.dark);',
          'trains.update(stockAtMouth ? [stockAtMouth] : options.trains(), atm.dark); window.mappedRailQA.cars = trains.surfaceCars;');
    } }] });
  await server.listen();
  server.printUrls();
  }
} finally {
  rmSync(tmp, {recursive:true, force:true});
}
