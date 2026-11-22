import type { RoutesFile } from '../model/types';
import { lonLatToScene } from '../core/places';
import { MODE_COLOR } from './layers';

// Both interactive views need WebGL. This geographic overview uses the same GTFS
// shapes as Map, so a device without graphics acceleration still shows the railway.
export function showRailOverview(container: HTMLElement, routes: RoutesFile) {
  const figure = document.createElement('figure');
  figure.className = 'rail-overview';
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'MARTA heavy rail routes through Five Points in downtown Atlanta');
  const origin = { lon: -84.3916, lat: 33.7539 };
  const heavy = new Set(routes.routes.filter(r => r.mode === 'heavy_rail').map(r => r.id));
  for (const path of routes.paths.filter(p => heavy.has(p.routeId))) {
    const line = document.createElementNS(ns, 'polyline');
    const points: string[] = [];
    for (let i = 0; i < path.coords.length; i += 2) {
      const [x, y] = lonLatToScene(origin, path.coords[i], path.coords[i + 1]);
      points.push(Math.round(x) + ',' + Math.round(y));
    }
    line.setAttribute('points', points.join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', MODE_COLOR.heavy_rail);
    line.setAttribute('stroke-width', '230');
    svg.append(line);
  }
  const labels = new Map([
    ['FIVE POINTS STATION', 'Five Points'], ['AIRPORT STATION', 'Airport'],
    ['NORTH SPRINGS STATION', 'North Springs'], ['DORAVILLE STATION', 'Doraville'],
    ['INDIAN CREEK STATION', 'Indian Creek'], ['HAMILTON E HOLMES STATION', 'H. E. Holmes'],
    ['BANKHEAD STATION', 'Bankhead'],
  ]);
  for (const stop of routes.stops) {
    const name = labels.get(stop.name);
    if (!name) continue;
    labels.delete(stop.name);
    const [x, y] = lonLatToScene(origin, stop.lon, stop.lat);
    const label = document.createElementNS(ns, 'text');
    const west = name === 'H. E. Holmes' || name === 'Bankhead';
    label.setAttribute('text-anchor', west ? 'end' : 'start');
    label.setAttribute('x', String(x + (west ? -350 : 350)));
    label.setAttribute('y', String(y - 400));
    label.textContent = name;
    svg.append(label);
  }
  const caption = document.createElement('figcaption');
  caption.textContent = 'MARTA heavy rail · Published routes';
  figure.append(svg, caption);
  container.replaceChildren(figure);
  const bounds = svg.getBBox();
  svg.setAttribute('viewBox', [bounds.x - 850, bounds.y - 850, bounds.width + 1700, bounds.height + 1700].join(' '));
}
