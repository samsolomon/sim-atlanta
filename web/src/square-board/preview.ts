import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConnectorTraffic } from '../city/connector-traffic';
import { cityRoadHeight } from '../city/road-height';
import { clock } from '../core/clock';
import type { TrafficData } from '../vignette/traffic';
import { loadEast } from '../city/king-memorial-board';
import { loadNorth } from '../city/sweet-auburn-board';
import { buildEastRail, extendRail, type CorridorPack } from '../city/east-rail';
import { terrainAlignment, terrainOpenings } from '../city/terrain-rail';
import type { SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { createDowntownTerrain } from '../terrain/model';
import { inConnectorLanes } from '../terrain/connector-paint';
import { createSurfaceTransport } from '../terrain/transport';
import type { TerrainCity } from '../terrain/transport-data';
import { alignment } from '../vignette/alignment';
import { World } from '../vignette/world';
import { addSection, bounds, connect, gridAt, joins, response, type TrafficArea, type Board, type Direction } from './sections';

const status = document.querySelector<HTMLElement>('[role="status"]')!;
const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-view]');
const quality = new URLSearchParams(location.search).get('q') === 'low' ? 'low' : 'high';
const controller = new AbortController();
const signal = controller.signal;
const data = '/data', west = data + '/scene/downtown';
const json = <T>(path: string): Promise<T> => response(path, signal).then(r => r.json());
const poses = {
  overview: [400, -200, -520, 4250, 1850],
  north: [980, -1330, -310, 740, 690],
  south: [1050, 780, -330, 610, 610],
  king: [1270, 505, 155, 290, 390],
} as const;
type View = keyof typeof poses;

async function main() {
  const [grid, ctx, trees, manifest, routes, pack, profile] = await Promise.all([
    gridAt(west, signal), json<TerrainCity>(west + '/vignette.json'),
    json<{ trees: [number, number, number, number][] }>(west + '/trees.json'),
    json<SceneManifest>(west + '/scene.json'), json<RoutesFile>(data + '/ga/routes.json'),
    json<CorridorPack>(data + '/scene/king-memorial/corridor.json'),
    json<Pick<TrafficData, 'hourly'>>(west + '/traffic.json').catch(() => undefined),
  ]);
  const canvas = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas')!, antialias: quality === 'high' });
  canvas.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e3dfd1');
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 12000);
  const orbit = new OrbitControls(camera, canvas.domElement);
  orbit.minDistance = 35; orbit.maxDistance = 6500; orbit.maxPolarAngle = Math.PI * .48;
  const sun = new THREE.DirectionalLight('#fff4db', 2);
  sun.position.set(-850, 1500, 900);
  scene.add(sun, new THREE.HemisphereLight('#fff9ee', '#b2a798', 1.6));
  const areas = new Map<Board, TrafficArea>();
  const cleanups: (() => void)[] = [];
  let traffic: ConnectorTraffic | undefined;
  function draw() {
    traffic?.update(clock.now().getTime(), 0); // The coverage study uses daylight lighting.
    canvas.render(scene, camera);
  }
  function refreshTraffic() {
    const hourly = profile?.hourly;
    if (!Array.isArray(hourly?.weekday) || !Array.isArray(hourly?.weekend)) return;
    const [downtown, ...neighbors] = [...areas.values()].map(area => area.connectorBoard);
    const next = new ConnectorTraffic({ ...downtown, neighbors, hourly, quality });
    traffic?.dispose();
    traffic = next;
    scene.add(traffic.group);
    const active = traffic.group.children.length > 0;
    document.getElementById('traffic-tier')!.hidden = !active;
    canvas.setAnimationLoop(active && clock.speed !== 0 ? draw : null);
  }
  function resize() {
    canvas.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); draw();
  }
  function hide(e: PageTransitionEvent) {
    if (!e.persisted) { controller.abort(); dispose(); }
  }
  function dispose() {
    removeEventListener('pagehide', hide);
    canvas.setAnimationLoop(null);
    traffic?.dispose();
    for (const area of areas.values()) area.dispose();
    areas.clear();
    for (const clean of cleanups) clean();
    orbit.dispose(); canvas.dispose();
    removeEventListener('resize', resize);
  }
  // The page may be frozen and restored through the browser's back/forward cache.
  addEventListener('pagehide', hide);
  function mount(id: Board, area: TrafficArea) {
    try { connect(areas, new Map([[id, area]])); }
    catch (error) { area.dispose(); throw error; }
  }
  try {
    const pid = 'marta:path:155177';
    const track = terrainAlignment(alignment(routes, manifest, bounds.downtown, pid), pid, manifest, grid);
    const downtown = createDowntownTerrain(grid, ctx, trees.trees, { quality, join: joins('downtown'), bottomY: -48, openings: terrainOpenings([track]) });
    let transport: ReturnType<typeof createSurfaceTransport>;
    try { transport = createSurfaceTransport(ctx, grid, downtown.groundAt); }
    catch (error) { downtown.dispose(); throw error; }
    areas.set('downtown', {
      ...downtown, connectorBoard: { city: ctx, roadHeight: cityRoadHeight(ctx, downtown.groundAt, transport.deckAt) },
    });
    scene.add(transport.group); cleanups.push(() => transport.dispose());
    const king = await loadEast(data, grid, quality, downtown.bottomY, signal, joins('king').slice(1));
    mount('king', king);
    const auburn = await loadNorth(data, grid, king.grid, quality, downtown.bottomY, signal, joins('auburn').slice(2));
    mount('auburn', auburn);
    for (const area of areas.values()) scene.add(area.group);
    refreshTraffic();
    class RailWorld extends World { override ground(x: number, z: number) { return downtown.groundAt(x, z) ?? 0; } }
    const railWorld = new RailWorld(ctx, null, { terrain: 'flat', clumps: 3, lightMapMax: 256 });
    railWorld.buildMarta(track, (x, z) => transport.clearOfFreight(x, z) && !inConnectorLanes(x, z, 1.8)); scene.add(railWorld.group); cleanups.push(() => railWorld.dispose());
    const rail = buildEastRail(extendRail(manifest, routes), routes, pack, king.groundAt, grid.manifest.vertical.sceneZeroNavd88M);
    scene.add(rail.mesh); cleanups.push(() => rail.dispose());
  } catch (error) { dispose(); throw error; }

  let selected: View = 'overview';
  const loading = new Map<Direction, Promise<void>>();
  function frame(view: View) {
    const [x, z, dx, dy, dz] = poses[view];
    const height = [...areas.values()].map(a => a.grid.sample(x, z)).find(h => h != null);
    const y = height == null ? 0 : height - grid.manifest.vertical.sceneZeroNavd88M;
    orbit.target.set(x, y, z); camera.position.set(x + dx, y + dy, z + dz); orbit.update(); draw();
    const loaded = (['north', 'south'] as const).filter(d => areas.has(`${d}-band`));
    status.textContent = `${quality === 'high' ? 'High' : 'Low'} detail · ${['Downtown, King Memorial and Sweet Auburn', ...loaded].join(' + ')}`;
  }
  async function focus(view: View) {
    selected = view;
    if ((view === 'north' || view === 'south') && !areas.has(`${view}-band`)) {
      status.textContent = 'Loading ' + view + ' terrain and streets…';
      let request = loading.get(view);
      if (!request) {
        request = addSection(view, areas, quality, signal).then(added => {
          for (const area of added.values()) scene.add(area.group);
          refreshTraffic();
          draw();
        }).finally(() => loading.delete(view));
        loading.set(view, request);
      }
      try { await request; } catch (err) {
        if (selected === view && !signal.aborted) status.textContent = `Could not load ${view}. Select it again to retry. ${String(err)}`;
        return;
      }
    }
    if (selected === view && !signal.aborted) frame(view);
  }
  for (const b of buttons) {
    b.disabled = false;
    b.onclick = () => void focus(b.dataset.view as View);
  }
  addEventListener('resize', resize);
  orbit.addEventListener('change', draw);
  resize(); frame('overview');
}
main().catch(err => { if (!signal.aborted) status.textContent = 'Coverage preview unavailable. ' + String(err); });
