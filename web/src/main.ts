import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { crossingCard, freightCard, trainCard } from './map/card';
import { addStaticLayers, trainsSource } from './map/layers';
import { addTrainLayer, trainFeatures } from './map/trains';
import type { CrossingProps, Meta, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './model/types';
import { Schedule } from './sched/engine';
import { LiveMarta } from './live/marta';
import { clock } from './core/clock';
import { TrainSource } from './core/trains';
import type { Diorama } from './scene3d/view';

const DATA = '/data/ga';
const get = <T>(f: string): Promise<T> => fetch(`${DATA}/${f}`).then((r) => r.json());

const params = new URLSearchParams(location.search);

// Start the map (basemap tiles) immediately; freight and crossings are handed to
// MapLibre as URLs so they load and parse on its worker threads, off the main thread.
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [-84.39, 33.76],
  zoom: 10.3,
  maxBounds: [
    [-88.6, 28.4],
    [-77.8, 37.0],
  ],
  attributionControl: { compact: true, customAttribution: 'Unofficial · Rail data: MARTA, Amtrak GTFS; FRA; BTS NARN' },
  hash: true,
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false } }), 'top-right');

// ---- card -------------------------------------------------------------------
const card = document.getElementById('card')!;
let selectedTrain: string | null = null;
function showCard(html: string) {
  card.innerHTML = `<button class="close" type="button" aria-label="Close">×</button>${html}`;
  card.hidden = false;
  card.querySelector('.close')!.addEventListener('click', hideCard);
}
function hideCard() {
  card.hidden = true;
  selectedTrain = null;
}
document.addEventListener('keydown', (e) => e.key === 'Escape' && hideCard());

function renderTrainCard() {
  if (!selectedTrain) return;
  const t = source.find(selectedTrain);
  if (!t) return showCard('<h2>That train has finished its trip</h2><p class="sub">Tap another train.</p>');
  showCard(
    trainCard(t, schedule.routes.get(t.routeId), t.nextStop ? schedule.stops.get(t.nextStop) : undefined, schedule.vehicleTypes.get(t.vehicleType)),
  );
}

const [rf, tf, vts, meta] = await Promise.all([
  get<RoutesFile>('routes.json'),
  get<TimetableFile>('timetable.json'),
  get<VehicleType[]>('vehicle-types.json'),
  get<Meta>('meta.json'),
]);
const schedule = new Schedule(rf, tf, vts);
if (import.meta.env.DEV) Object.assign(window, { __map: map, __schedule: schedule });
// Live MARTA rail replaces its timetable trains, but only when the clock shows the
// real present: a time-shifted or sped-up view stays on the timetable.
const live = new LiveMarta(schedule);
const source = new TrainSource(schedule, live);
const liveStatus = document.getElementById('live-status')!;
function updateLiveStatus() {
  const on = source.liveActive;
  liveStatus.className = on ? 'live-status on' : 'live-status';
  liveStatus.textContent = on
    ? `MARTA rail live · ${live.count} trains`
    : !clock.isRealTime()
      ? 'Timetable view (time-shifted)'
      : live.error
        ? 'MARTA live unavailable · showing timetable'
        : 'Connecting to MARTA live…';
}
live.onUpdate = updateLiveStatus;
live.start();

const onReady = (fn: () => void) => (map.loaded() ? fn() : map.once('load', fn));
onReady(() => {
  // Put our layers under the basemap's labels so place names stay readable.
  const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  const addLayer = map.addLayer.bind(map);
  map.addLayer = ((layer: Parameters<typeof addLayer>[0], before?: string) => addLayer(layer, before ?? firstLabel)) as typeof map.addLayer;
  addStaticLayers(map, rf, `${DATA}/freight.geojson`, `${DATA}/crossings.geojson`);
  map.addLayer = addLayer;
  addTrainLayer(map);

    // Train icons ignore placement (so they can overlap), which also keeps them out of
  // MapLibre's hit-testing; find the nearest train on screen ourselves.
  const nearestTrain = (pt: maplibregl.Point, maxPx = 22) => {
    let best: { id: string; d: number } | null = null;
    for (const t of source.current) {
      const p = map.project([t.lon, t.lat]);
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d <= maxPx && (!best || d < best.d)) best = { id: t.id, d };
    }
    return best?.id ?? null;
  };
  map.on('mousemove', (e) => {
    const hit =
      nearestTrain(e.point) !== null ||
      map.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['crossings', 'freight-hit'] }).length > 0;
    map.getCanvas().style.cursor = hit ? 'pointer' : '';
  });
  map.on('click', (e) => {
    const train = nearestTrain(e.point);
    if (train) {
      selectedTrain = train;
      return renderTrainCard();
    }
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [
      [e.point.x - 6, e.point.y - 6],
      [e.point.x + 6, e.point.y + 6],
    ];
    const f = map.queryRenderedFeatures(box, { layers: ['crossings', 'freight-hit'] })[0];
    if (!f) return hideCard();
    selectedTrain = null;
    if (f.layer.id === 'crossings') {
      showCard(crossingCard(f.properties as unknown as CrossingProps));
    } else {
      const p = { ...f.properties } as Record<string, unknown>;
      p.rights = typeof p.rights === 'string' ? JSON.parse(p.rights) : (p.rights ?? []);
      showCard(freightCard(p as unknown as TrackArcProps));
    }
  });

  // ---- animation loop: ~30 Hz is plenty for trains moving a few px/sec --------
  let last = 0;
  let lastCard = 0;
  const frame = (ts: number) => {
    if (ts - last > 33) {
      last = ts;
      const now = clock.now();
      const trains = source.update(now);
      if (diorama) diorama.update(trains);
      else trainsSource(map)?.setData(trainFeatures(trains, schedule.routes));
      updateClock(now);
      if (selectedTrain && ts - lastCard > 1000) {
        lastCard = ts;
        renderTrainCard();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});

// ---- controls ---------------------------------------------------------------
const clockEl = document.getElementById('clock') as HTMLTimeElement;
const clockNote = document.getElementById('clock-note')!;
const scrub = document.getElementById('scrub') as HTMLInputElement;
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: meta.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' });

function updateClock(now: Date) {
  updateLiveStatus();
  clockEl.textContent = timeFmt.format(now);
  clockEl.dateTime = now.toISOString();
  const shifted = !clock.isRealTime();
  clockNote.textContent = shifted ? 'time-shifted' : 'now';
  clockEl.parentElement!.classList.toggle('shifted', shifted);
}

scrub.addEventListener('input', () => {
  clock.offsetMin = Number(scrub.value);
});
document.getElementById('now')!.addEventListener('click', () => {
  clock.reset();
  scrub.value = '0';
  setSpeed(1);
});
const speedButtons = [...document.querySelectorAll<HTMLButtonElement>('.speed button')];
function setSpeed(s: number) {
  clock.rebase();
  clock.speed = s;
  speedButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)));
}
speedButtons.forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
setSpeed(clock.speed);

// ---- 3D diorama (downtown) -----------------------------------------------------
// Three.js loads only when the 3D view opens. ?view=3d opens it directly (the URL hash
// belongs to MapLibre's map position).
let diorama: Diorama | null = null;
const view3d = document.getElementById('view3d')!;
const toggle3d = document.getElementById('toggle3d') as HTMLButtonElement;

async function open3d() {
  if (diorama) return;
  toggle3d.disabled = true;
  toggle3d.textContent = 'Loading 3D…';
  view3d.hidden = false;
  document.body.classList.add('in3d');
  const { createDiorama } = await import('./scene3d/view');
  diorama = await createDiorama(document.getElementById('view3d-canvas')!, rf, schedule);
  diorama.onPick = (id) => {
    if (!id) return hideCard();
    selectedTrain = id;
    renderTrainCard();
  };
  const cam = params.get('cam')?.split(',').map(Number); // x,z,zoom,azimuthDeg for repeatable shots
  if (cam?.length === 4 && cam.every(Number.isFinite)) diorama.setView({ x: cam[0], z: cam[1], zoom: cam[2], azimuth: cam[3] });
  if (import.meta.env.DEV) Object.assign(window, { __diorama: diorama });
  toggle3d.disabled = false;
  toggle3d.textContent = 'Back to map';
  setViewParam('3d');
}

function close3d() {
  diorama?.dispose();
  diorama = null;
  view3d.hidden = true;
  document.body.classList.remove('in3d');
  toggle3d.textContent = 'Explore downtown in 3D';
  setViewParam(null);
  map.resize();
}

function setViewParam(v: string | null) {
  const u = new URL(location.href);
  if (v) u.searchParams.set('view', v);
  else u.searchParams.delete('view');
  history.replaceState(null, '', u);
}

toggle3d.addEventListener('click', () => (diorama ? close3d() : void open3d()));
document.getElementById('rot-left')!.addEventListener('click', () => diorama?.rotate(-1));
document.getElementById('rot-right')!.addEventListener('click', () => diorama?.rotate(1));
document.addEventListener('keydown', (e) => {
  if (!diorama || e.target instanceof HTMLInputElement) return;
  if (e.key === 'q' || e.key === '[') diorama.rotate(-1);
  if (e.key === 'e' || e.key === ']') diorama.rotate(1);
  if (e.key === 'l') {
    const l = diorama.cycleLook();
    const u = new URL(location.href);
    u.searchParams.set('look', l.id);
    history.replaceState(null, '', u);
  }
});
if (params.get('view') === '3d') void open3d();
