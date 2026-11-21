import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { DEFAULT_PALETTE, PALETTES, applyPalette, dioramaBaseStyle, paletteFor, type Palette } from './map/basestyle';
import { SkyLayer } from './map/sky-layer';
import { atmosphere, type AtmosphereOverride } from './core/atmosphere';
import { createShell, type View } from './ui/shell';
import { lonLatToScene, sceneToLonLat } from './core/places';
import { busCard, crossingCard, freightCard, trainCard } from './map/card';
import { MODE_COLOR, addStaticLayers, trainsSource } from './map/layers';
import { addTrainLayer, trainFeatures } from './map/trains';
import type { LiveBus, CrossingProps, Meta, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './model/types';
import { Schedule } from './sched/engine';
import { LiveBuses } from './live/buses';
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
  style: await dioramaBaseStyle(paletteFor(atmosphere(clock.now(), null))), // start in the right light; weather follows
  center: [-84.39, 33.76],
  zoom: 10.3,
  maxBounds: [
    [-88.6, 28.4],
    [-77.8, 37.0],
  ],
  attributionControl: { compact: true, customAttribution: 'Unofficial · Rail data: MARTA, Amtrak GTFS; FRA; BTS NARN' },
  hash: true,
  keyboard: false, // the shell handles WASD / arrows / +/− for both views
});

// ---- card -------------------------------------------------------------------
const card = document.getElementById('card')!;
let selectedBus: string | null = null;
let selectedTrain: string | null = null;
function showCard(html: string) {
  card.innerHTML = `<button class="close" type="button" aria-label="Close">×</button>${html}`;
  card.hidden = false;
  card.querySelector('.close')!.addEventListener('click', hideCard);
}
function hideCard() {
  card.hidden = true;
  selectedBus = null;
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
const buses = new LiveBuses();
const schedule = new Schedule(rf, tf, vts);
if (import.meta.env.DEV) Object.assign(window, { __map: map, __schedule: schedule });
// Live MARTA rail replaces its timetable trains, but only when the clock shows the
// real present: a time-shifted or sped-up view stays on the timetable.
const live = new LiveMarta(schedule);
const source = new TrainSource(schedule, live);
live.start();

let updateAtmosphere = () => {}; // set once the map has loaded
const onReady = (fn: () => void) => (map.loaded() ? fn() : map.once('load', fn));
onReady(() => {
  // Keep the attribution folded to its (i) button so it doesn't run under the view switch.
  document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  // Put our layers under the basemap's labels so place names stay readable.
  const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  const addLayer = map.addLayer.bind(map);
  map.addLayer = ((layer: Parameters<typeof addLayer>[0], before?: string) => addLayer(layer, before ?? firstLabel)) as typeof map.addLayer;
  addStaticLayers(map, rf, `${DATA}/freight.geojson`, `${DATA}/crossings.geojson`);
  map.addLayer = addLayer;
  map.addSource('buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'buses', type: 'circle', source: 'buses',
    paint: {
      'circle-color': MODE_COLOR.bus, 'circle-stroke-color': '#fbf9f4', 'circle-stroke-width': 1,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 14, 5],
    },
  });
  addTrainLayer(map);
  // ---- atmosphere: time of day + Atlanta's weather → basemap palette, sky layer, glass theme.
  // ?palette=<preset> pins a static palette; ?tune opens the playground.
  const sky = new SkyLayer();
  map.addLayer(sky, 'freight-unknown'); // above the basemap's fills, below our rail and labels
  let override: AtmosphereOverride | null = null;
  let pinned: Palette | null = PALETTES[params.get('palette') ?? ''] ?? null;
  let onScreen: Palette = PALETTES[DEFAULT_PALETTE];
  updateAtmosphere = () => {
    const w = clock.isRealTime() ? shell.weather() : null; // live weather only at the present
    const atm = atmosphere(clock.now(), w, override ?? {});
    sky.set(atm);
    onScreen = pinned ?? paletteFor(atm);
    applyPalette(map, onScreen);
    shell.setTheme(atm.dark > 0.55 ? 'dark' : 'light');
  };
  updateAtmosphere();
  setInterval(updateAtmosphere, 60_000);
  map.on('moveend', () => sky.atm && sky.set(sky.atm)); // weather strength depends on zoom and place
  if (params.has('tune'))
    void import('./map/tune').then(({ mountTuner }) =>
      mountTuner({
        setOverride(o) {
          override = o;
          updateAtmosphere();
        },
        setPalette(p) {
          pinned = p;
          updateAtmosphere();
        },
        current: () => onScreen,
      }),
    );
  let visibleBuses = new Map<string, LiveBus>();
  let lastBusTick = -Infinity;
  let busesEnabled: boolean | undefined;
  function updateBuses(ts: number) {
    const enabled = clock.isRealTime() && !document.hidden; // keep polling under City too, for the status card
    if (enabled === busesEnabled && (!enabled || ts - lastBusTick < 1000)) return;
    busesEnabled = enabled;
    lastBusTick = ts;
    if (enabled) void buses.poll();
    const fresh = enabled ? buses.current() : [];
    if (fresh.length !== visibleBuses.size || fresh.some(b => visibleBuses.get(b.id) !== b)) {
      visibleBuses = new Map(fresh.map(b => [b.id, b]));
      map.getSource<maplibregl.GeoJSONSource>('buses')!.setData({
        type: 'FeatureCollection',
        features: fresh.map(({ id, position: { value } }) => ({
          type: 'Feature', properties: { id }, geometry: { type: 'Point', coordinates: [value.lon, value.lat] },
        })),
      });
    }
    if (selectedBus) {
      const bus = visibleBuses.get(selectedBus);
      if (bus) showCard(busCard(bus, buses.observationNow()));
      else hideCard();
    }
  }

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
      map.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['buses', 'crossings', 'freight-hit'] }).length > 0;
    map.getCanvas().style.cursor = hit ? 'pointer' : '';
  });
  map.on('click', (e) => {
    const directBus = map.queryRenderedFeatures(e.point, { layers: ['buses'] })[0];
    const train = directBus ? nearestTrain(e.point, 5) : nearestTrain(e.point);
    selectedBus = null;
    if (train) {
      selectedTrain = train;
      return renderTrainCard();
    }
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [
      [e.point.x - 6, e.point.y - 6],
      [e.point.x + 6, e.point.y + 6],
    ];
    const f = directBus ?? map.queryRenderedFeatures(box, { layers: ['buses', 'crossings', 'freight-hit'] })[0];
    if (!f) return hideCard();
    selectedTrain = null;
    if (f.layer.id === 'buses') {
      const bus = visibleBuses.get(f.properties.id);
      if (!bus || !clock.isRealTime()) return hideCard();
      selectedBus = bus.id;
      showCard(busCard(bus, buses.observationNow()));
    } else if (f.layer.id === 'crossings') {
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
      updateBuses(ts);
      const now = clock.now();
      const trains = source.update(now);
      if (diorama) diorama.update(trains);
      else trainsSource(map)?.setData(trainFeatures(trains, schedule.routes));
      updateClock(now);
      shell.tick(now);
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
  if (clock.speed !== 1 && s === 1) clock.pinned = true;
  clock.rebase();
  clock.speed = s;
  speedButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)));
}
speedButtons.forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
setSpeed(clock.speed);

// ---- views: Map (MapLibre) and City (3D, loaded on demand) -------------------------------
// ?view=city opens City directly (?view=3d still works). The URL hash belongs to MapLibre.
// Until the diorama-style City lands, City is the downtown 3D from scene3d/.
let diorama: Diorama | null = null;
const view3d = document.getElementById('view3d')!;
const CITY_ORIGIN = { lon: -84.3916, lat: 33.7539 }; // Five Points, scene3d's origin
const CITY_BOUNDS = { minX: -1331, maxX: 1350, minZ: -2124, maxZ: 1546 };

let cityLoad = 0; // bumped whenever City opens or closes, so a load that finishes late is dropped
async function openCity() {
  if (diorama) return;
  const load = ++cityLoad;
  view3d.hidden = false;
  document.body.classList.add('in3d');
  // Open where the map was looking, clamped into the area City covers.
  const c = map.getCenter();
  const [mx, mz] = lonLatToScene(CITY_ORIGIN, c.lng, c.lat);
  const x = Math.min(CITY_BOUNDS.maxX, Math.max(CITY_BOUNDS.minX, mx));
  const z = Math.min(CITY_BOUNDS.maxZ, Math.max(CITY_BOUNDS.minZ, mz));
  shell.setNote(Math.hypot(x - mx, z - mz) > 200 ? 'City view covers downtown for now' : null);
  try {
    const { createDiorama } = await import('./scene3d/view');
    const d = await createDiorama(document.getElementById('view3d-canvas')!, rf, schedule);
    if (load !== cityLoad) {
      d.dispose(); // the user went back to Map (or reopened City) while this was loading
      return;
    }
    diorama = d;
  } catch (err) {
    if (load !== cityLoad) return;
    console.error(err);
    view3d.hidden = true;
    document.body.classList.remove('in3d');
    shell.setView('map'); // closes City, which clears the note, so set the note after
    shell.setNote('City view couldn’t load here, so this is the map');
    return;
  }
  diorama.onPick = (id) => {
    if (!id) return hideCard();
    selectedTrain = id;
    renderTrainCard();
  };
  diorama.lookAt(x, z);
  const cam = params.get('cam')?.split(',').map(Number); // x,z,zoom,azimuthDeg for repeatable shots
  if (cam?.length === 4 && cam.every(Number.isFinite)) diorama.setView({ x: cam[0], z: cam[1], zoom: cam[2], azimuth: cam[3] });
  if (import.meta.env.DEV) Object.assign(window, { __diorama: diorama });
  setViewParam('city');
}

function closeCity() {
  cityLoad++;
  if (diorama) {
    // Hand the place back to the map.
    const t = diorama.target();
    const [lon, lat] = sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    map.jumpTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 13.5) });
  }
  diorama?.dispose();
  diorama = null;
  if (import.meta.env.DEV) Object.assign(window, { __diorama: null });
  view3d.hidden = true;
  document.body.classList.remove('in3d');
  shell.setNote(null);
  setViewParam(null);
  map.resize();
}

function setViewParam(v: string | null) {
  const u = new URL(location.href);
  if (v) u.searchParams.set('view', v);
  else u.searchParams.delete('view');
  history.replaceState(null, '', u);
}

const shell = createShell({
  view: 'map',
  onView: (v: View) => (v === 'city' ? void openCity() : closeCity()),
  center() {
    if (diorama) {
      const t = diorama.target();
      return sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    }
    const c = map.getCenter();
    return [c.lng, c.lat];
  },
  pan(dx, dy) {
    if (diorama) diorama.pan(dx, dy);
    else map.panBy([-dx, -dy], { duration: 0 });
  },
  zoom(dir) {
    if (diorama) return; // City zoom stays on wheel/pinch for now
    map.zoomTo(map.getZoom() + dir, { duration: 200 });
  },
  rotate(dir) {
    diorama?.rotate(dir);
  },
  onWeather: () => updateAtmosphere(),
  live: () => ({
    realTime: clock.isRealTime(),
    rail: source.liveActive ? 'live' : live.error ? 'down' : 'connecting',
    trains: live.count,
    buses: buses.unavailable ? null : buses.current().length,
  }),
});

// Hidden time controls (kept for later): ?controls=1 shows them.
document.getElementById('timectl')!.hidden = params.get('controls') !== '1';

document.addEventListener('keydown', (e) => {
  if (!diorama || e.target instanceof HTMLInputElement) return;
  if (e.key === 'l') {
    const l = diorama.cycleLook();
    const u = new URL(location.href);
    u.searchParams.set('look', l.id);
    history.replaceState(null, '', u);
  }
});
const startView = params.get('view');
if (startView === 'city' || startView === '3d') shell.setView('city');
