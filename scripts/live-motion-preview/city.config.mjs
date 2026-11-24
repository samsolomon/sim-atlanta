// From web/, run vite --config ../scripts/live-motion-preview/city.config.mjs
// only in the preview checkout with staged City data.
import { readFileSync } from 'node:fs';
const data = name => JSON.parse(readFileSync(new URL('../../web/public/data/ga/' + name, import.meta.url)));
const routes = data('routes.json');
const station = 'marta:stop:908618';
const pattern = data('timetable.json').timetables.flatMap(table => table.patterns)
  .find(p => p.routeId === 'marta:route:BLUE' && p.headsign.includes('WESTBOUND') && p.stops.includes(station));
const path = routes.paths.find(p => p.id === pattern.pathId);
const platform = pattern.dist[pattern.stops.indexOf(station)];
const fixes = [-600, -400, -200, 0, 0, 200, 300].map(offset => {
  const s = platform + offset;
  const i = path.cum.findIndex(d => d >= s);
  const f = (s - path.cum[i-1]) / (path.cum[i] - path.cum[i-1]);
  const coordinate = axis => path.coords[2*i-2+axis] * (1-f) + path.coords[2*i+axis] * f;
  return { lon: coordinate(0), lat: coordinate(1) };
});

export default {
  plugins: [{
    name: 'local-synthetic-rail-preview',
    transformIndexHtml() {
      return [{ tag: 'script', injectTo: 'head-prepend', children: `
        const fixtureFixes = ${JSON.stringify(fixes)};
        const start = Date.now(), originalFetch = window.fetch.bind(window);
        window.fetch = (input, opts) => {
          const url = new URL(input instanceof Request ? input.url : input, location.href);
          if (url.pathname !== '/api/marta/rail') return originalFetch(input, opts);
          const fetched = Date.now(), i = Math.min(6, Math.floor((fetched-start)/30000));
          const train = {id:'marta:train:101', line:'BLUE', direction:'W', destination:'H E Holmes',
            at:start+i*30000-5000, ...fixtureFixes[i]};
          return Promise.resolve(Response.json({fetched, trains:[train]}));
        };
      ` }, { tag: 'aside', injectTo: 'body', attrs: {
        style: 'position:fixed;z-index:10000;top:0;left:50%;transform:translateX(-50%);background:#fff4be;color:#222;padding:4px 10px;font:14px system-ui;pointer-events:none'
      }, children: 'Synthetic replay · Train 101 · 30 s display delay' }];
    },
  }],
};
