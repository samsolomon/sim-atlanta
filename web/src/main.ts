import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { crossingCard, freightCard, trainCard } from './map/card';
import { addStaticLayers, trainsSource } from './map/layers';
import { addTrainLayer, trainFeatures } from './map/trains';
import type { CrossingProps, Meta, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './model/types';
import { Schedule } from './sched/engine';
import { LiveMarta } from './live/marta';

const DATA = '/data/ga';
const get = <T>(f: string): Promise<T> => fetch(`${DATA}/${f}`).then((r) => r.json());

// ---- simulated clock ------------------------------------------------------
// ?t=2026-11-20T14:00:00-05:00 pins the start time; ?speed=30 plays faster.
const params = new URLSearchParams(location.search);
const clock = {
  baseSim: params.get('t') ? new Date(params.get('t')!).getTime() : Date.now(),
  baseReal: performance.now(),
  speed: Number(params.get('speed') ?? 1),
  offsetMin: 0,
  now() {
    return new Date(this.baseSim + (performance.now() - this.baseReal) * this.speed + this.offsetMin * 60_000);
  },
  rebase() {
    this.baseSim = this.now().getTime() - this.offsetMin * 60_000;
    this.baseReal = performance.now();
  },
};

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
  attributionControl: { compact: true, customAttribution: 'Rail data: MARTA, Amtrak GTFS; FRA; BTS NARN' },
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
  const t = currentTrains.find((x) => x.id === selectedTrain);
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
let currentTrains: ReturnType<Schedule['trainsAt']> = [];

// Live MARTA rail replaces its timetable trains, but only when the clock shows the
// real present: a time-shifted or sped-up view stays on the timetable.
const live = new LiveMarta(schedule);
const liveStatus = document.getElementById('live-status')!;
const isRealTime = () => clock.offsetMin === 0 && clock.speed === 1 && !params.has('t');
const isMartaRail = (routeId: string) => schedule.routes.get(routeId)?.mode === 'heavy_rail' && routeId.startsWith('marta:');
function trainsNow(now: Date) {
  const scheduled = schedule.trainsAt(now);
  if (!isRealTime() || !live.available) return scheduled;
  return scheduled.filter((t) => !isMartaRail(t.routeId)).concat(live.trains());
}
function updateLiveStatus() {
  const on = isRealTime() && live.available;
  liveStatus.className = on ? 'live-status on' : 'live-status';
  liveStatus.textContent = on
    ? `MARTA rail live · ${live.count} trains`
    : !isRealTime()
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
    for (const t of currentTrains) {
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
      currentTrains = trainsNow(now);
      trainsSource(map)?.setData(trainFeatures(currentTrains, schedule.routes));
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
  const shifted = clock.offsetMin !== 0 || clock.speed !== 1 || params.has('t');
  clockNote.textContent = shifted ? 'time-shifted' : 'now';
  clockEl.parentElement!.classList.toggle('shifted', shifted);
}

scrub.addEventListener('input', () => {
  clock.offsetMin = Number(scrub.value);
});
document.getElementById('now')!.addEventListener('click', () => {
  params.delete('t');
  clock.baseSim = Date.now();
  clock.baseReal = performance.now();
  clock.offsetMin = 0;
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
