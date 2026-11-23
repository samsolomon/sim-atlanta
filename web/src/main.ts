import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initialView } from './core/initial-view';
import { showRailOverview } from './map/overview';
import { DEFAULT_PALETTE, PALETTES, applyPalette, dioramaBaseStyle, paletteFor, type Palette } from './map/basestyle';
import { SkyLayer } from './map/sky-layer';
import { atmosphere, type Atmosphere, type AtmosphereOverride } from './core/atmosphere';
import { createShell, type ShellOptions, type View } from './ui/shell';
import { uiNext } from './ui/flag';
import { lonLatToScene, sceneToLonLat } from './core/places';
import { mapMetresPerPixel, mapZoomForScale, parseCityCamera } from './core/camera';
import { busCard, chip, cityFreightCard, crossingCard, freightCard, trainCard, type DrawnAt } from './map/card';
import { MODE_COLOR, addStaticLayers, trainsSource } from './map/layers';
import { addTrainLayer, trainFeatures } from './map/trains';
import type { LiveBus, CrossingProps, Meta, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './model/types';
import { Schedule } from './sched/engine';
import { LiveBuses } from './live/buses';
import { LiveMarta } from './live/marta';
import { clock } from './core/clock';
import { TrainSource } from './core/trains';
import type { CityView } from './city/city';
import { VehicleFollow } from './city/vehicle-follow';

const DATA = '/data/ga';
const get = <T>(f: string): Promise<T> => fetch(`${DATA}/${f}`).then((r) => r.json());

const params = new URLSearchParams(location.search);

const landing = initialView(location.search, location.hash);
let map: maplibregl.Map | null = null;
const mapCentre: [number, number] = [-84.39, 33.76];

function openMap() {
  if (map) return map;
  const container = document.getElementById('map')!;
  container.replaceChildren();
  try {
    map = new maplibregl.Map({
      container, center: mapCentre, zoom: 10.3, maxBounds: [[-88.6, 28.4], [-77.8, 37.0]],
      attributionControl: { compact: true, customAttribution: 'Unofficial · Rail data: MARTA, Amtrak GTFS; FRA; BTS NARN' },
      hash: true, keyboard: false, pixelRatio: Math.min(devicePixelRatio, 2),
    });
  } catch {
    // MapLibre and City both need WebGL. Keep a geographic rail map on the page
    // even when the device cannot allocate a context for either renderer.
    showRailOverview(container, rf);
    return null;
  }
  const instance = map;
  if (import.meta.env.DEV) Object.assign(window, { __map: instance });
  instance.once('load', () => addMapLayers(instance));
  void dioramaBaseStyle(paletteFor(atmosphere(clock.now(), null))).then(style => instance.setStyle(style));
  return instance;
}

// ---- card -------------------------------------------------------------------
const card = document.getElementById('card')!;
const cardContent = document.getElementById('card-content')!;
card.querySelector('.close')!.addEventListener('click', hideCard);
// Follow is on for every selectable vehicle in City. ?follow=0 turns it off; ?follow=<route id>
// (for example marta:route:RED) follows the nearest train on that route once City opens, and
// ?follow=marta:bus:<vehicle> follows that live bus at the real clock.
const followParam = params.get('follow');
const follow = followParam === '0' ? undefined : new VehicleFollow();
let followRoute = followParam?.includes(':route:') ? followParam : null;
let followBus = followParam?.startsWith('marta:bus:') ? followParam : null;
let followLinkAt: number | undefined;
let followLinkOpened: number | undefined;
const followPanel = document.getElementById('train-follow')!;
const followAction = followPanel.querySelector<HTMLButtonElement>('[data-follow]')!;
const recenter = followPanel.querySelector<HTMLButtonElement>('[data-recenter]')!;
const followStatus = followPanel.querySelector<HTMLElement>('.follow-status')!;
let lastStatusHTML = '';
function updateFollowPanel() {
  if (!follow) return;
  card.classList.toggle('following-trip', follow.active);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noun = selectedBus ? 'bus' : 'train';
  const Noun = noun[0].toUpperCase() + noun.slice(1);
  const note = {
    idle: '', drawn: `Following ${noun}`,
    underground: reduced ? 'Underground · mapped tunnel' : 'Underground · mapped tunnel · following its alignment above ground',
    covered: reduced ? `${Noun} under cover` : 'Under cover · following the route above ground',
    unseen: reduced ? `${Noun} out of view` : `${Noun} out of view · following its position above ground`,
    lost: noun !== 'bus' ? 'Follow ended · trip unavailable'
      : clock.isRealTime() ? 'Follow ended · bus stopped reporting' : 'Follow ended · live buses show only at the present time',
    outside: `Follow ended · ${noun} left the board`,
  }[follow.phase];
  const text = reduced && follow.active ? [note, 'Camera stays still until you recenter.'].filter(Boolean).join(' · ') : note;
  // The position's own tier stays beside the status while following, also in the compact card.
  // The chip is the position's tier, labelled as such: it does not vouch for the tunnel or cover note.
  const html = text ? `${text}${follow.active && follow.tier ? ' · position ' + chip(follow.tier) : ''}` : '';
  if (lastStatusHTML !== html) followStatus.innerHTML = lastStatusHTML = html;
  followStatus.hidden = !text;
  followAction.hidden = follow.phase === 'lost' || follow.phase === 'outside';
  const action = follow.active ? 'Stop following' : `Follow ${noun}`;
  if (followAction.textContent !== action) followAction.textContent = action;
  recenter.hidden = !(reduced && follow.active);
}
followAction.addEventListener('click', () => {
  if (!follow || !diorama) return;
  if (follow.active) follow.stop();
  else if (selectedTrain) {
    const train = source.find(selectedTrain);
    if (train) follow.start({ kind: 'train', id: train.id, pathId: train.pathId, tier: train.s.tier });
  } else if (selectedBus) {
    const bus = clock.isRealTime() && buses.current().find(b => b.id === selectedBus);
    if (bus) follow.start({ kind: 'bus', id: bus.id, tier: bus.position.tier });
  }
  updateFollowPanel();
});
recenter.addEventListener('click', () => follow?.recenter());
let lastCardHTML = '';
let selectedBus: string | null = null;
let selectedTrain: string | null = null;
let selectedDrawn: DrawnAt = {};
function showCard(html: string, canFollow = false) {
  followPanel.hidden = !canFollow;
  if (canFollow) updateFollowPanel();
  else card.classList.remove('following-trip');
  if (lastCardHTML !== html) cardContent.innerHTML = lastCardHTML = html;
  card.hidden = false;
  // A different selection (not a refresh of the same one) tells the A2c panel to bring it forward.
  const key = selectedTrain ?? selectedBus ?? html;
  if (key !== shownKey) {
    shownKey = key;
    card.dispatchEvent(new Event('a2-select'));
  }
}
let shownKey = '';
function hideCard() {
  shownKey = '';
  follow?.stop();
  card.classList.remove('following-trip');
  followPanel.hidden = true;
  card.hidden = true;
  selectedBus = null;
  selectedTrain = null;
  selectedDrawn = {};
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
      !view3d.hidden, uiNext(location.search), selectedDrawn),
    !!follow && !view3d.hidden,
  );
}

function renderBusCard() {
  const bus = clock.isRealTime() && buses.current().find(b => b.id === selectedBus);
  if (bus) showCard(busCard(bus, buses.observationNow(), view3d.hidden ? undefined : 'New Flyer Xcelsior XN40'), !!follow && !view3d.hidden);
  else if (follow?.phase === 'lost' || follow?.phase === 'outside') showCard('<h2>Bus no longer shown</h2><p class="sub">Tap another vehicle.</p>', true);
  else hideCard();
}

// A review link names a route, not a trip id, which changes with each timetable refresh.
function followFromLink() {
  if (followBus && follow && diorama && clock.isRealTime()) {
    const bus = buses.current().find(b => b.id === followBus);
    if (bus) {
      followBus = null;
      selectedBus = bus.id;
      selectedTrain = null;
      selectedDrawn = {};
      follow.start({ kind: 'bus', id: bus.id, tier: bus.position.tier });
      renderBusCard();
    }
  }
  if (!followRoute || !follow || !diorama) return;
  // At the real clock, wait for live rail: a timetable trip picked first would be replaced.
  // If live rail never arrives (overnight, or a slow first poll), fall back to the timetable after 15 s.
  followLinkOpened ??= performance.now();
  if (clock.isRealTime() && !source.liveActive && !live.error && performance.now() - followLinkOpened < 15_000) return;
  // Measure from the linked camera: while its area loads, City holds the view at the nearest loaded edge.
  const target = parseCityCamera(params.get('cam')) || diorama.target();
  let best: { id: string; d: number; x: number; z: number } | null = null;
  for (const t of source.current) {
    if (t.routeId !== followRoute || !Number.isFinite(t.lon) || !Number.isFinite(t.lat)) continue;
    const [x, z] = lonLatToScene(CITY_ORIGIN, t.lon, t.lat);
    if (!diorama.onBoard(x, z, true)) continue;
    const d = Math.hypot(x - target.x, z - target.z);
    if (!best || d < best.d) best = { id: t.id, d, x, z };
  }
  // Wait for that train's area to mount, so follow does not end at a loading edge.
  // If it never mounts, the follow starts anyway and ends at the edge as usual.
  if (best) followLinkAt ??= performance.now();
  if (best && !diorama.onBoard(best.x, best.z) && performance.now() - followLinkAt! < 20_000) return;
  const train = best && source.find(best.id);
  if (!train) return;
  followRoute = null;
  selectedTrain = train.id;
  selectedDrawn = {};
  selectedBus = null;
  follow.start({ kind: 'train', id: train.id, pathId: train.pathId, tier: train.s.tier });
  renderTrainCard();
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
if (import.meta.env.DEV) Object.assign(window, { __schedule: schedule });
// Live MARTA rail replaces its timetable trains, but only when the clock shows the
// real present: a time-shifted or sped-up view stays on the timetable.
const live = new LiveMarta(schedule);
const source = new TrainSource(schedule, live);
if (import.meta.env.DEV) Object.assign(window, { __source: source, __follow: follow });
live.start();

let override: AtmosphereOverride | null = null;
let sceneConditions: AtmosphereOverride = {};
let paintMapAtmosphere: ((atm: Atmosphere) => void) | null = null;
const updateAtmosphere = () => {
  const w = clock.isRealTime() ? shell.weather() : null;
  const atm = atmosphere(clock.now(), w, { ...override, ...sceneConditions });
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
const sky = new SkyLayer();
function addMapLayers(map: maplibregl.Map) {
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
      selectedDrawn = {};
      return renderTrainCard();
    }
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [
      [e.point.x - 6, e.point.y - 6],
      [e.point.x + 6, e.point.y + 6],
    ];
    const f = directBus ?? map.queryRenderedFeatures(box, { layers: ['buses', 'crossings', 'freight-hit'] })[0];
    if (!f) return hideCard();
    selectedTrain = null;
    selectedDrawn = {};
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
}

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
let opening = landing === 'city';
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
  document.getElementById('city-people-attrib')!.hidden = true;
  document.getElementById('city-traffic-attrib')!.hidden = true;
  cityProgress.textContent = 'Loading buildings, streets and trees…';
  document.body.classList.add('in3d');
  shell.setNote(null);
  let areaNote: string | null = null;
  try {
    const { createCity } = await import('./city/city');
    const d = await createCity(document.getElementById('view3d-canvas')!, rf, undefined, {
      signal: abort.signal,
      beforeFrame: shell.advanceMovement,
      areaNote: text => { areaNote = text; shell.setNote(text); },
      mapGestures: uiNext(location.search),
      trains: () => source.update(),
      stopDistances: (pathId, stopId) => schedule.stopDistances(pathId, stopId),
      clockMs: () => clock.now().getTime(),
      // The Map's bus poll keeps running under City; City only reads the shared fixes.
      buses: () => (clock.isRealTime() ? buses.current() : null),
      follow,
      selectVehicle: hit => {
        follow?.stop();
        selectedTrain = hit?.kind === 'train' ? hit.id : null;
        selectedDrawn = hit?.kind === 'train' ? { inferredTrack: hit.inferredTrack, inferredBerth: hit.inferredBerth } : {};
        selectedBus = hit?.kind === 'bus' ? hit.id : null;
        if (selectedTrain) renderTrainCard();
        else if (selectedBus) renderBusCard();
        else if (hit?.kind === 'freight') showCard(cityFreightCard(hit.line, uiNext(location.search)));
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
    document.getElementById('city-people-attrib')!.hidden = !d.hasPeople;
    document.getElementById('city-traffic-attrib')!.hidden = !d.hasTraffic;
    document.getElementById('city-ground-source')!.textContent = d.measuredGround ? 'USGS terrain' : 'Flat board';
  } catch (err) {
    if (load !== cityLoad) return;
    console.error(err);
    view3d.hidden = true;
    document.body.classList.remove('in3d');
    shell.setView('map'); // closes City, which clears the note, so set the note after
    shell.setNote(map ? 'City view couldn’t load here, so this is the map' : 'Interactive graphics unavailable · MARTA rail overview');
    return;
  }
  if (lastAtm) diorama.setAtmosphere(lastAtm, clock.now());
  // Arriving from Map keeps its camera within the loaded City board.
  const cameraLink = opening && parseCityCamera(params.get('cam'));
  if (cameraLink) {
    diorama.lookAt(cameraLink.x, cameraLink.z, cameraLink);
  } else if (opening && params.get('board') === 'midtown' && params.get('site') === 'williams') {
    diorama.lookAt(95.5, -1701.8, { bearing: 0, tilt: 46, metresPerPixel: .32 });
  } else if (!opening && map) {
    // Read the current Map camera after loading: keyboard movement may have continued.
    const c = map.getCenter();
    const [mx, mz] = lonLatToScene(CITY_ORIGIN, c.lng, c.lat);
    diorama.lookAt(mx, mz, {
      bearing: map.getBearing(),
      metresPerPixel: mapMetresPerPixel(c.lat, map.getZoom()),
      tilt: cityTilt,
    });
    const target = diorama.target();
    if (!areaNote && Math.hypot(target.x - mx, target.z - mz) > 1) shell.setNote('Showing the nearest loaded City area');
  }
  opening = false;
  cityLoading.hidden = true;
  if (import.meta.env.DEV) Object.assign(window, { __diorama: diorama });
  setViewParam('city');
}

function closeCity() {
  document.getElementById('city-info')!.hidePopover?.();
  hideCard();
  cityLoad++;
  cityAbort?.abort();
  cityAbort = null;
  opening = false;
  cityLoading.hidden = true;
  const pose = diorama && { target: diorama.target(), camera: diorama.camera() };
  diorama?.dispose();
  diorama = null;
  const map = openMap();
  if (pose && map) {
    // Keep the same centre, direction and horizontal scale; only the tilt changes.
    const { target: t, camera } = pose;
    cityTilt = camera.tilt;
    const [lon, lat] = sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    map.jumpTo({ center: [lon, lat], bearing: camera.bearing, pitch: 0,
      zoom: mapZoomForScale(lat, camera.metresPerPixel) });
  }
  if (import.meta.env.DEV) Object.assign(window, { __diorama: null });
  view3d.hidden = true;
  if (lastAtm) paintMapAtmosphere?.(lastAtm);
  document.body.classList.remove('in3d');
  shell.setNote(null);
  setViewParam('map');
  map?.resize();
}

function setViewParam(v: View) {
  const u = new URL(location.href);
  u.searchParams.set('view', v);
  history.replaceState(null, '', u);
}

document.getElementById('early-map')!.hidden = true;
const shellOptions: ShellOptions = {
  view: 'map',
  onView: (v: View) => (v === 'city' ? void openCity() : closeCity()),
  center() {
    if (diorama) {
      const t = diorama.target();
      return sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    }
    const c = map?.getCenter();
    return c ? [c.lng, c.lat] : [CITY_ORIGIN.lon, CITY_ORIGIN.lat];
  },
  pan(dx, dy) {
    // The shell sends a content-drag offset; both cameras move in the opposite direction.
    if (diorama) diorama.pan(-dx, -dy);
    else map?.panBy([-dx, -dy], { duration: 0 });
  },
  zoom(dir) {
    if (diorama) return diorama.zoom(dir);
    map?.zoomTo(map.getZoom() + dir, { duration: 200 });
  },
  rotate(degrees) {
    diorama?.rotate(degrees);
  },
  onWeather: () => updateAtmosphere(),
  onSceneConditions(settings) {
    sceneConditions = settings;
    updateAtmosphere();
  },
  live: () => ({
    realTime: clock.isRealTime(),
    rail: source.liveActive ? 'live' : live.error ? 'down' : 'connecting',
    trains: live.count,
    cityFreight: diorama?.hasFreight ?? false,
    cityTraffic: diorama?.hasTraffic ?? false,
    buses: buses.unavailable ? null : buses.current().length,
  }),
  bearing: () => (diorama ? diorama.camera().bearing : map?.getBearing() ?? 0),
  north() {
    if (diorama) return diorama.rotate(diorama.camera().bearing);
    map?.easeTo({ bearing: 0, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300 });
  },
  onNow() {
    // Back to the present also drops a pinned ?t / ?speed, so a reload or a copied link stays live.
    const u = new URL(location.href);
    u.searchParams.delete('t');
    u.searchParams.delete('speed');
    history.replaceState(null, '', u);
    clock.reset();
    scrub.value = '0';
    setSpeed(1);
    updateAtmosphere();
  },
  onClock() {
    updateAtmosphere();
    updateClock(clock.now());
    if (selectedTrain) renderTrainCard();
    else if (selectedBus) renderBusCard();
  },
  metresPerPixel() {
    if (diorama) return diorama.camera().metresPerPixel;
    const c = map?.getCenter();
    return map && c ? mapMetresPerPixel(c.lat, map.getZoom()) : null;
  },
  sky: () => lastAtm,
};
// ?ui=next: the A2c interface (docs/ui-controls-brief.md), loaded only behind the flag.
const shell = uiNext(location.search)
  ? (await import('./ui/next/shell')).createShellNext(shellOptions)
  : createShell(shellOptions);
if (import.meta.env.DEV) Object.assign(window, { __shell: shell });

// City and its status card must keep time even while remote Map tiles are unavailable.
updateAtmosphere();
updateClock(clock.now());
shell.tick(clock.now());
setInterval(updateAtmosphere, 60_000);
setInterval(() => {
  const now = clock.now();
  updateClock(now);
  shell.tick(now);
  followFromLink();
  if (selectedTrain) renderTrainCard();
  else if (selectedBus) renderBusCard();
}, 500);

// Hidden time controls (kept for later): ?controls=1 shows them.
// Under ?ui=next, Time & weather in the subject card replaces it.
document.getElementById('timectl')!.hidden = params.get('controls') !== '1' || uiNext(location.search);

if (landing === 'city') shell.setView('city');
else if (!openMap()) shell.setNote('Interactive graphics unavailable · MARTA rail overview');
