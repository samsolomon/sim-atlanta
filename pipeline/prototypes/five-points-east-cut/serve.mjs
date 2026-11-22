// Development-only camera, diagnostics and portal fixtures for the production City renderer.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../../../web');
process.chdir(web);
const require = createRequire(resolve(web, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const server = await createServer({
  root: web, cacheDir: resolve(web, 'node_modules/.vite-east-cut-study'),
  server: { host: '127.0.0.1', port: Number(process.env.EAST_CUT_PORT ?? 5370), strictPort: true },
  optimizeDeps: { include: ['three', 'three/addons/controls/OrbitControls.js'] },
  plugins: [{ name: 'five-points-east-cut-study', enforce: 'pre', transform(code, id) {
    if (id.endsWith('/src/main.ts')) return code.replace('let cityTilt = 57;', 'let cityTilt = 26;');
    if (!id.endsWith('/src/city/city.ts')) return;
    const qaModule = JSON.stringify('/@fs' + resolve(here, 'preview.js'));
    return 'import { metrics as studyMetrics } from ' + qaModule + ';\n' + code
      .replace('const cut = prepareEastCut(rf, manifest,', `
        const query = new URLSearchParams(location.search);
        const legacy = query.get('cut') === 'current' || query.get('railQA') === 'missing-ER';
        const cutManifest = legacy ? structuredClone(manifest) : manifest;
        if (legacy && cutManifest.rail) delete cutManifest.rail.paths['marta:path:155177'];
        const cut = prepareEastCut(rf, cutManifest,`)
      .replace('  const cx = (b.minX', `
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
        if (grid && transport) window.eastCutStudy = studyMetrics(marta, transport, grid);
        window.mappedRailQA = { paths:[...cut?.paths || []].map(([id,p]) => [id,p.name,p.entry,p.exit]),
          freight: transport?.freightTreads.filter(run => run.length && run[0].s>850 && run[0].s<965)
            .map(run => [run[0].s,run.at(-1).s]), fixture:stockAtMouth };
        const cx = (b.minX`).replace('trains.update(options.trains(), atm.dark);',
          'trains.update(stockAtMouth ? [stockAtMouth] : options.trains(), atm.dark); window.mappedRailQA.cars = trains.surfaceCars;');
  } }],
});
await server.listen();
server.printUrls();
