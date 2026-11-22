import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { DEFAULT_PALETTE, PALETTES, applyPalette, dioramaBaseStyle, paletteFor, type Palette } from './map/basestyle';
import { SkyLayer } from './map/sky-layer';
import { atmosphere, type Atmosphere, type AtmosphereOverride } from './core/atmosphere';
import { createShell, type View } from './ui/shell';
import { lonLatToScene, sceneToLonLat } from './core/places';
import { mapMetresPerPixel, mapZoomForScale } from './core/camera';
import { busCard, cityFreightCard, crossingCard, freightCard, trainCard } from './map/card';
import { MODE_COLOR, addStaticLayers, trainsSource } from './map/layers';
import { addTrainLayer, trainFeatures } from './map/trains';
import type { LiveBus, CrossingProps, Meta, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './model/types';
import { Schedule } from './sched/engine';
import { LiveBuses } from './live/buses';
import { LiveMarta } from './live/marta';
import { clock } from './core/clock';
import { TrainSource } from './core/trains';
import type { CityView } from './city/city';
import { BLUE, TrainFollow } from './city/train-follow';

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
  pixelRatio: Math.min(devicePixelRatio, 2), // phones report ~2.8: 2× looks the same and draws half the pixels
});

// ---- card -------------------------------------------------------------------
const card = document.getElementById('card')!;
const cardContent = document.getElementById('card-content')!;
card.querySelector('.close')!.addEventListener('click', hideCard);
const follow = params.get('follow') === '1' ? new TrainFollow() : undefined;
const followPanel = document.getElementById('train-follow')!;
const followAction = followPanel.querySelector<HTMLButtonElement>('[data-follow]')!;
const recenter = followPanel.querySelector<HTMLButtonElement>('[data-recenter]')!;
const followStatus = followPanel.querySelector<HTMLElement>('.follow-status')!;
function updateFollowPanel() {
  if (!follow) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const note = {
    idle: '', drawn: 'Following train',
    covered: reduced ? 'Train under cover' : 'Under cover · following the route above ground',
    unseen: reduced ? 'Train out of view' : 'Train out of view · following the route above ground',
    lost: 'Follow ended · trip unavailable', outside: 'Follow ended · train left downtown',
  }[follow.phase];
  const text = reduced && follow.active ? [note, 'Camera stays still until you recenter.'].filter(Boolean).join(' · ') : note;
  if (followStatus.textContent !== text) followStatus.textContent = text;
  followStatus.hidden = !text;
  followAction.hidden = follow.phase === 'lost' || follow.phase === 'outside';
  const action = follow.active ? 'Stop following' : 'Follow train';
  if (followAction.textContent !== action) followAction.textContent = action;
  recenter.hidden = !(reduced && follow.active);
}
followAction.addEventListener('click', () => {
  if (!follow || !selectedTrain || !diorama) return;
  if (follow.active) follow.stop();
  else {
    const train = source.find(selectedTrain);
    if (train) follow.start(train);
  }
  updateFollowPanel();
});
recenter.addEventListener('click', () => follow?.recenter());
let lastCardHTML = '';
let selectedBus: string | null = null;
let selectedTrain: string | null = null;
function showCard(html: string, canFollow = false) {
  followPanel.hidden = !canFollow;
  if (canFollow) updateFollowPanel();
  if (lastCardHTML !== html) cardContent.innerHTML = lastCardHTML = html;
  card.hidden = false;
}
function hideCard() {
  follow?.stop();
  followPanel.hidden = true;
  card.hidden = true;
  selectedBus = null;
  selectedTrain = null;
}
document.addEventListener('keydown', (e) => e.key === 'Escape' && hideCard());

function renderTrainCard() {
  if (!selectedTrain) return;
  const t = source.find(selectedTrain);
  if (!t) {
    if (follow?.phase === 'lost') return showCard('<h2>Train no longer available</h2><p class="sub">Tap another train.</p>', true);
    return showCard('<h2>That train has finished its trip</h2><p class="sub">Tap another train.</p>');
  }
  showCard(
    trainCard(t, schedule.routes.get(t.routeId), t.nextStop ? schedule.stops.get(t.nextStop) : undefined, schedule.vehicleTypes.get(t.vehicleType),
      view3d.hidden ? undefined : 'Stadler CQ400'),
    !!follow && !view3d.hidden && t.routeId === BLUE,
  );
}

function renderBusCard() {
  const bus = clock.isRealTime() && buses.current().find(b => b.id === selectedBus);
  if (bus) showCard(busCard(bus, buses.observationNow(), view3d.hidden ? undefined : 'New Flyer Xcelsior XN40'));
  else hideCard();
}

const [rf, tf, vts, meta] = await Promise.all([
  get<RoutesFile>('routes.json'),
  get<TimetableFile>('timetable.json'),
  get<VehicleType[]>('vehicle-types.json'),
  get<Meta>('meta.json'),
]);
const buses = new LiveBuses();
// The shared bus heartbeat runs independently of the basemap, so City still gets live buses when
// map tiles are slow or blocked. LiveBuses throttles to one request per 30 s (and one in flight),
// so the Map's own per-frame poll below adds no extra requests.
buses.heartbeat(() => clock.isRealTime() && !document.hidden);
const schedule = new Schedule(rf, tf, vts);
if (import.meta.env.DEV) Object.assign(window, { __map: map, __schedule: schedule });
// Live MARTA rail replaces its timetable trains, but only when the clock shows the
// real present: a time-shifted or sped-up view stays on the timetable.
const live = new LiveMarta(schedule);
const source = new TrainSource(schedule, live);
live.start();

let override: AtmosphereOverride | null = null;
let paintMapAtmosphere: ((atm: Atmosphere) => void) | null = null;
const updateAtmosphere = () => {
  const w = clock.isRealTime() ? shell.weather() : null;
  const atm = atmosphere(clock.now(), w, override ?? {});
  atmRealTime = clock.isRealTime();
  atmAt = clock.now().getTime();
  lastAtm = atm;
  diorama?.setAtmosphere(atm, clock.now());
  shell.setTheme(atm.dark > 0.55 ? 'dark' : 'light');
  if (view3d.hidden) paintMapAtmosphere?.(atm);
};
let atmRealTime = true; // the clock state the atmosphere was last computed for
let atmAt = 0; // the simulated time it was computed for
// Fog: a real blur toward the edges (like the diorama's tilt-shift) with a cloudy haze in it;
// the centre stays sharp. A DOM layer over the map, under the glass. Map view only.
const fogEl = Object.assign(document.createElement('div'), { id: 'fog' });
document.body.append(fogEl);
function setFog(f: number, dark: number) {
  fogEl.style.setProperty('--fog', f.toFixed(3));
  fogEl.style.setProperty('--fog-rgb', dark > 0.55 ? '40, 47, 58' : '244, 245, 244');
  fogEl.hidden = f < 0.02;
}
// Always after this module finishes evaluating, so `shell` (declared below) exists even if the
// map loaded while the data files were downloading.
const onReady = (fn: () => void) => (map.loaded() ? queueMicrotask(fn) : map.once('load', fn));
const sky = new SkyLayer();
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
  map.addLayer(sky, 'freight-unknown'); // above the basemap's fills, below our rail and labels
  let pinned: Palette | null = PALETTES[params.get('palette') ?? ''] ?? null;
  let onScreen: Palette = PALETTES[DEFAULT_PALETTE];
  let lastWx = 1;
  // Atlanta's weather only applies near Atlanta and zoomed in: scale it into the palette and fog
  // by the same strength the sky layer uses.
  const paintFor = (atm: Atmosphere) => {
    const wx = (lastWx = sky.weatherStrength());
    const local = { ...atm, cloud: atm.cloud * wx, rain: atm.rain * wx, snow: atm.snow * wx, fog: atm.fog * wx };
    setFog(local.fog, atm.dark);
    onScreen = pinned ?? paletteFor(local);
    applyPalette(map, onScreen);
  };
  paintMapAtmosphere = (atm) => {
    sky.set(atm);
    paintFor(atm);
  };
  updateAtmosphere();
  map.on('moveend', () => {
    if (!view3d.hidden || !sky.atm) return; // weather strength depends on zoom and place
    sky.set(sky.atm);
    if (Math.abs(sky.weatherStrength() - lastWx) > 0.05) paintFor(sky.atm);
    else setFog(sky.atm.fog * sky.weatherStrength(), sky.atm.dark);
  });
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
      renderBusCard();
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
  const frame = (ts: number) => {
    if (ts - last > 33) {
      last = ts;
      updateBuses(ts);
      if (!diorama) trainsSource(map)?.setData(trainFeatures(source.update(), schedule.routes));
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
  // Live weather belongs only to the real present: recompute as soon as the clock leaves or returns.
  // A sped-up or scrubbed clock moves the sun too: recompute every 5 simulated minutes.
  if (clock.isRealTime() !== atmRealTime || Math.abs(now.getTime() - atmAt) > 5 * 60_000) updateAtmosphere();
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
// City is the downtown diorama (city/city.ts), in the same atmosphere as the Map.
let diorama: CityView | null = null;
let lastAtm: Atmosphere | null = null;
const view3d = document.getElementById('view3d')!;
const CITY_ORIGIN = { lon: -84.3916, lat: 33.7539 }; // Five Points, the pipeline origin
const cityLoading = document.getElementById('city-loading')!;
const cityProgress = document.getElementById('city-progress')!;
let cityAbort: AbortController | null = null;

let cityLoad = 0; // bumped whenever City opens or closes, so a load that finishes late is dropped
let cityTilt = 57; // retain the user's City tilt while Map remains flat
let opening = params.get('view') === 'city' || params.get('view') === '3d';
async function openCity() {
  if (diorama) return;
  hideCard();
  const load = ++cityLoad;
  cityAbort?.abort();
  const abort = cityAbort = new AbortController();
  view3d.hidden = false;
  sky.stopAnimation();
  cityLoading.hidden = false;
  document.getElementById('city-freight-attrib')!.hidden = true;
  document.getElementById('city-traffic-attrib')!.hidden = true;
  cityProgress.textContent = 'Loading buildings, streets and trees…';
  document.body.classList.add('in3d');
  shell.setNote(null);
  try {
    const { createCity } = await import('./city/city');
    const d = await createCity(document.getElementById('view3d-canvas')!, rf, undefined, {
      signal: abort.signal,
      beforeFrame: shell.advanceMovement,
      trains: () => source.update(),
      clockMs: () => clock.now().getTime(),
      // The Map's bus poll keeps running under City; City only reads the shared fixes.
      buses: () => (clock.isRealTime() ? buses.current() : null),
      follow,
      selectVehicle: hit => {
        follow?.stop();
        selectedTrain = hit?.kind === 'train' ? hit.id : null;
        selectedBus = hit?.kind === 'bus' ? hit.id : null;
        if (selectedTrain) renderTrainCard();
        else if (selectedBus) renderBusCard();
        else if (hit?.kind === 'freight') showCard(cityFreightCard());
        else hideCard();
      },
      progress: (label) => { if (load === cityLoad) cityProgress.textContent = label; },
    });
    if (load !== cityLoad) {
      d.dispose(); // the user went back to Map (or reopened City) while this was loading
      return;
    }
    diorama = d;
    if (import.meta.env.DEV) Object.assign(window, { __city: d });
    document.getElementById('city-freight-attrib')!.hidden = !d.hasFreight;
    document.getElementById('city-traffic-attrib')!.hidden = !d.hasTraffic;
    document.getElementById('city-ground-source')!.textContent = d.measuredGround ? 'USGS terrain' : 'Flat board';
  } catch (err) {
    if (load !== cityLoad) return;
    console.error(err);
    view3d.hidden = true;
    document.body.classList.remove('in3d');
    shell.setView('map'); // closes City, which clears the note, so set the note after
    shell.setNote('City view couldn’t load here, so this is the map');
    return;
  }
  if (lastAtm) diorama.setAtmosphere(lastAtm, clock.now());
  // Opening on City frames downtown; arriving from the Map keeps the place you were looking at.
  if (!opening) {
    // Read the current Map camera after loading: keyboard movement may have continued.
    const c = map.getCenter();
    const [mx, mz] = lonLatToScene(CITY_ORIGIN, c.lng, c.lat);
    diorama.lookAt(mx, mz, {
      bearing: map.getBearing(),
      metresPerPixel: mapMetresPerPixel(c.lat, map.getZoom()),
      tilt: cityTilt,
    });
    const target = diorama.target();
    shell.setNote(Math.hypot(target.x - mx, target.z - mz) > 1 ? 'City view covers downtown for now' : null);
  }
  opening = false;
  cityLoading.hidden = true;
  if (import.meta.env.DEV) Object.assign(window, { __diorama: diorama });
  setViewParam('city');
}

function closeCity() {
  hideCard();
  cityLoad++;
  cityAbort?.abort();
  cityAbort = null;
  opening = false;
  cityLoading.hidden = true;
  if (diorama) {
    // Keep the same centre, direction and horizontal scale; only the tilt changes.
    const t = diorama.target();
    const camera = diorama.camera();
    cityTilt = camera.tilt;
    const [lon, lat] = sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    map.jumpTo({ center: [lon, lat], bearing: camera.bearing, pitch: 0,
      zoom: mapZoomForScale(lat, camera.metresPerPixel) });
  }
  diorama?.dispose();
  diorama = null;
  if (import.meta.env.DEV) Object.assign(window, { __diorama: null });
  view3d.hidden = true;
  if (lastAtm) paintMapAtmosphere?.(lastAtm);
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
    // The shell sends a content-drag offset; both cameras move in the opposite direction.
    if (diorama) diorama.pan(-dx, -dy);
    else map.panBy([-dx, -dy], { duration: 0 });
  },
  zoom(dir) {
    if (diorama) return diorama.zoom(dir);
    map.zoomTo(map.getZoom() + dir, { duration: 200 });
  },
  rotate(degrees) {
    diorama?.rotate(degrees);
  },
  onWeather: () => updateAtmosphere(),
  live: () => ({
    realTime: clock.isRealTime(),
    rail: source.liveActive ? 'live' : live.error ? 'down' : 'connecting',
    trains: live.count,
    cityFreight: diorama?.hasFreight ?? false,
    cityTraffic: diorama?.hasTraffic ?? false,
    buses: buses.unavailable ? null : buses.current().length,
  }),
});

// City and its status card must keep time even while remote Map tiles are unavailable.
updateAtmosphere();
updateClock(clock.now());
shell.tick(clock.now());
setInterval(updateAtmosphere, 60_000);
setInterval(() => {
  const now = clock.now();
  updateClock(now);
  shell.tick(now);
  if (selectedTrain) renderTrainCard();
  else if (selectedBus) renderBusCard();
}, 500);

// Hidden time controls (kept for later): ?controls=1 shows them.
document.getElementById('timectl')!.hidden = params.get('controls') !== '1';

const startView = params.get('view');
if (startView === 'city' || startView === '3d') shell.setView('city');
