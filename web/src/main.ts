import { perf } from './core/perf';
import { prefetchCity } from './core/prefetch';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initialView } from './core/initial-view';
import { showRailOverview } from './map/overview';
import { DEFAULT_PALETTE, PALETTES, applyPalette, dioramaBaseStyle, paletteFor, paletteIsDark, type Palette } from './map/basestyle';
import { SkyLayer } from './map/sky-layer';
import { atmosphere, type Atmosphere, type AtmosphereOverride } from './core/atmosphere';
import type { ShellOptions, View } from './ui/shell-api';
import { createShellNext } from './ui/next/shell';
import { lonLatToScene, sceneToLonLat } from './core/places';
import { formatCityCamera, mapMetresPerPixel, mapZoomForScale, parseCityCamera } from './core/camera';
import { place as stationName, busCard, chip, cityFreightCard, crossingCard, freightCard, trainCard } from './map/card';
import { MODE_COLOR, addStaticLayers, trainsSource } from './map/layers';
import { addTrainLayer, trainFeatures } from './map/trains';
import type { LiveBus, CrossingProps, Meta, RoutesFile, TimetableFile, TrackArcProps, VehicleType } from './model/types';
import { Schedule } from './sched/engine';
import { LiveBuses } from './live/buses';
import { LiveMarta } from './live/marta';
import { clock } from './core/clock';
import { TrainSource } from './core/trains';
import { railStatus } from './ui/status';
import type { CityView } from './city/city';
import { VehicleFollow } from './city/vehicle-follow';
import { carries, followLabel, inCityArea, type Selection } from './core/carry';
import { mountGlassDebug, setGlassMode } from './ui/glass';

const DATA = '/data/ga';
const get = <T>(f: string): Promise<T> => fetch(`${DATA}/${f}`).then((r) => r.json());

const params = new URLSearchParams(location.search);

const landing = initialView(location.search, location.hash);
// A City landing starts City's code and first data now, alongside the timetable and the shell,
// instead of after them (phone load time; core/prefetch.ts).
if (landing === 'city') {
  void import('./city/city');
  prefetchCity(`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/data`);
}
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
  if (view3d.hidden) {
    // Map: the button opens City following this vehicle ("Follow in 3D"); nothing is followed here.
    card.classList.remove('following-trip');
    followStatus.hidden = true;
    recenter.hidden = true;
    const label = followLabel('map', false, selectedInCityArea());
    followAction.hidden = !label;
    followAction.removeAttribute('aria-disabled');
    if (label && followAction.textContent !== label) followAction.textContent = label;
    followPanel.hidden = !label;
    return;
  }
  card.classList.toggle('following-trip', follow.active);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noun = selectedBus ? 'bus' : 'train';
  const Noun = noun[0].toUpperCase() + noun.slice(1);
  const note = {
    idle: '', drawn: `Following ${noun}`,
    underground: reduced ? 'Underground · mapped tunnel' : 'Underground · mapped tunnel · following its alignment above ground',
    covered: reduced ? `${Noun} under cover` : 'Under cover · following the route above ground',
    unseen: reduced ? `${Noun} out of view` : `${Noun} out of view · following its position above ground`,
    lost: selectedFreight ? 'Follow ended · freight no longer drawn' : noun !== 'bus' ? 'Follow ended · trip unavailable'
      : clock.isRealTime() ? 'Follow ended · bus stopped reporting' : 'Follow ended · live buses show only at the present time',
    outside: `Follow ended · ${noun} left the board`,
  }[follow.phase];
  const text = reduced && follow.active ? [note, 'Camera stays still until you recenter.'].filter(Boolean).join(' · ') : note;
  // The position's own tier stays beside the status while following, also in the compact card.
  // The chip is the position's tier, labelled as such: it does not vouch for the tunnel or cover note.
  const matched = follow.active && follow.matched
    ? ` · matched to the nearest ${follow.tier === 'live' ? 'live' : 'timetable'} train ${chip('inferred')}` : '';
  const html = text ? `${text}${matched}${follow.active && follow.tier ? ' · position ' + chip(follow.tier) : ''}` : '';
  if (lastStatusHTML !== html) followStatus.innerHTML = lastStatusHTML = html;
  followStatus.hidden = !text;
  followAction.hidden = follow.phase === 'lost' || follow.phase === 'outside';
  // Before City has drawn the vehicle (Follow in 3D, City still loading), the follow is pending.
  const action = pendingFollow ? 'Opening City…' : followLabel('city', follow.active, true)!;
  if (followAction.textContent !== action) followAction.textContent = action;
  // aria-disabled, not disabled: a keyboard user's focus stays on the button while City opens.
  if (pendingFollow) followAction.setAttribute('aria-disabled', 'true');
  else followAction.removeAttribute('aria-disabled');
  recenter.hidden = !(reduced && follow.active);
}
followAction.addEventListener('click', () => {
  if (!follow || pendingFollow) return;
  // Map: open City; the selection carries and City starts following it once it can.
  if (view3d.hidden) {
    if (selectedTrain || selectedBus) shell.setView('city');
    return;
  }
  if (!diorama) return;
  if (follow.active) follow.stop();
  else if (selectedTrain) {
    const train = source.find(selectedTrain);
    if (train) follow.start({ kind: 'train', id: train.id, pathId: train.pathId, tier: train.s.tier });
  } else if (selectedBus) {
    const bus = clock.isRealTime() && buses.current().find(b => b.id === selectedBus);
    if (bus) follow.start({ kind: 'bus', id: bus.id, tier: bus.position.tier });
  } else if (selectedFreight) {
    follow.start({ kind: 'freight', id: selectedFreight, tier: 'illustrative' });
  }
  updateFollowPanel();
});
recenter.addEventListener('click', () => follow?.recenter());
let lastCardHTML = '';
let selectedBus: string | null = null;
let selectedTrain: string | null = null;
let selectedFreight: string | null = null;
/** The passage the open freight card describes; the same id draws a new train each slot. */
let freightCardKey = '';
function refreshFreightCard() {
  if (!selectedFreight || !diorama) return;
  const hit = diorama.freightPassage(selectedFreight);
  if (!hit) return;
  const key = `${hit.consist}|${hit.lead}`;
  if (key !== freightCardKey) { freightCardKey = key; showCard(cityFreightCard(hit), !!follow); }
}
let selectedMapFeature: { kind: 'crossing' | 'arc'; id: string } | undefined;
let keepSharedCamera = false;
function showCard(html: string, canFollow = false) {
  followPanel.hidden = !canFollow;
  if (canFollow) updateFollowPanel();
  else card.classList.remove('following-trip');
  if (lastCardHTML !== html) cardContent.innerHTML = lastCardHTML = html;
  card.hidden = false;
  // A different selection (not a refresh of the same one) tells the A2c panel to bring it forward.
  const key = selectedTrain ?? selectedBus ?? selectedFreight ?? html;
  if (key !== shownKey) {
    shownKey = key;
    card.dispatchEvent(new Event('a2-select'));
    if (!keepSharedCamera) requestAnimationFrame(focusSelection);
  }
}
let shownKey = '';
/** A2c: move the camera so a new selection sits in the middle of the open area beside the detail
 * panel (above it on phones). Follow, when it runs, drives the camera itself. */
function focusSelection() {
  if (follow?.active || pendingFollow) return;
  const at = selectedAt();
  if (!at) return;
  const phone = innerWidth <= 600;
  const panel = document.querySelector<HTMLElement>('.a2-panel');
  const r = panel?.getBoundingClientRect();
  // Desktop: the open area is left of the camera group, which rides 12 px from the panel's left
  // edge (8 px screen edge + panel + 12 px + 44 px group). offsetWidth ignores the panel's slide-in.
  const besidePanel = panel && panel.offsetWidth ? 8 + panel.offsetWidth + 12 + 44 : 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (diorama) {
    const [x, z] = lonLatToScene(CITY_ORIGIN, at.lon, at.lat);
    const c = diorama.camera();
    const br = (c.bearing * Math.PI) / 180;
    // Shift the view centre so the vehicle lands half the panel away from it: right of it on
    // desktop (the panel is on the right), below it on phones (the sheet is at the bottom).
    // Vertical screen pixels cover more ground in a tilted view (about 1/cos of the tilt).
    const tiltStretch = 1 / Math.max(0.35, Math.cos((c.tilt * Math.PI) / 180));
    const off = ((phone ? (r?.height ?? 0) + 16 : besidePanel) / 2) * c.metresPerPixel * (phone ? tiltStretch : 1);
    const [dx, dz] = phone ? [-Math.sin(br) * off, Math.cos(br) * off] : [Math.cos(br) * off, Math.sin(br) * off];
    diorama.glide(x + dx, z + dz);
  } else if (map) {
    // Offset the centre by projection rather than MapLibre's padding, which would persist as
    // camera state and skew the map's centre (and share links) after the panel closes.
    const half = (phone ? (r?.height ?? 0) + 16 : besidePanel) / 2;
    const p = map.project([at.lon, at.lat]);
    const centre = map.unproject([p.x + (phone ? 0 : half), p.y + (phone ? half : 0)]);
    map.easeTo({ center: centre, duration: reduced ? 0 : 450 });
  }
}
function hideCard() {
  shownKey = '';
  selectedMapFeature = undefined;
  pendingFollow = null;
  follow?.stop();
  card.classList.remove('following-trip');
  followPanel.hidden = true;
  card.hidden = true;
  selectedBus = null;
  selectedTrain = null;
  selectedFreight = null;
}
document.addEventListener('keydown', (e) => e.key === 'Escape' && hideCard());

/** The selection as the view switch sees it. */
function selection(): Selection {
  if (selectedTrain) return { kind: 'train', id: selectedTrain };
  if (selectedBus) return { kind: 'bus', id: selectedBus };
  if (selectedFreight) return { kind: 'freight', id: selectedFreight };
  return card.hidden ? null : { kind: 'other' };
}
/** Where the selected train or bus is now, or null. */
function selectedAt(): { lon: number; lat: number } | null {
  const t = selectedTrain ? source.find(selectedTrain) : null;
  if (t && Number.isFinite(t.lon) && Number.isFinite(t.lat)) return { lon: t.lon, lat: t.lat };
  const b = !t && selectedBus && clock.isRealTime() ? buses.current().find((x) => x.id === selectedBus) : null;
  return b ? b.position.value : null;
}
function selectedInCityArea() {
  const at = selectedAt();
  if (!at) return false;
  const [x, z] = lonLatToScene(CITY_ORIGIN, at.lon, at.lat);
  return inCityArea(x, z);
}
/** A vehicle carried into City, followed once City is up and its area has mounted. */
let pendingFollow: { kind: 'train' | 'bus'; id: string; since?: number } | null = null;
function startPendingFollow() {
  if (!pendingFollow || !follow || !diorama || !cityLoading.hidden) return;
  const p = pendingFollow;
  if (p.kind === 'train' ? selectedTrain !== p.id : selectedBus !== p.id) {
    pendingFollow = null; // the selection changed or closed while City loaded
    return;
  }
  const at = selectedAt();
  if (!at) {
    pendingFollow = null;
    return;
  }
  // As for a review link: wait (up to 20 s) for the vehicle's area to mount, so the follow does not
  // end at a loading edge.
  const [x, z] = lonLatToScene(CITY_ORIGIN, at.lon, at.lat);
  p.since ??= performance.now();
  if (!diorama.onBoard(x, z) && performance.now() - p.since < 20_000) return;
  pendingFollow = null;
  if (p.kind === 'train') {
    const t = source.find(p.id);
    if (t) follow.start({ kind: 'train', id: t.id, pathId: t.pathId, tier: t.s.tier });
    renderTrainCard();
  } else {
    const b = clock.isRealTime() && buses.current().find((x) => x.id === p.id);
    if (b) follow.start({ kind: 'bus', id: b.id, tier: b.position.tier });
    renderBusCard();
  }
}

function renderTrainCard() {
  if (!selectedTrain) return;
  // After a tier handoff the card describes the vehicle now followed (or the one whose follow
  // just ended). It is a continuation, not a new tap: keep the A2c panel where the user left it.
  // Drawn-track facts are recomputed below from the train City draws now.
  const lineage = follow?.active ? follow.lineage : follow?.endedLineage ?? [];
  const current = follow?.vehicle ?? follow?.ended;
  if (current?.kind === 'train' && current.id !== selectedTrain && lineage.includes(selectedTrain)) {
    selectedTrain = current.id;
    shownKey = current.id;
  }
  const t = source.find(selectedTrain);
  if (!t) {
    if (follow?.ended?.id === selectedTrain) return showCard('<h2>Train no longer available</h2><p class="sub">Tap another train.</p>', true);
    if (selectedTrain === params.get('train')) {
      if (selectedTrain.startsWith('marta:train:') && clock.isRealTime() && !live.firstPollComplete) {
        return showCard('<h2>Checking train location…</h2>');
      }
      return showCard('<h2>Train location unavailable</h2><p class="sub">This train has no position for the shared time.</p>');
    }
    return showCard('<h2>That train has finished its trip</h2><p class="sub">Tap another train.</p>');
  }
  showCard(
    trainCard(t, schedule.routes.get(t.routeId), t.nextStop ? schedule.stops.get(t.nextStop) : undefined, schedule.vehicleTypes.get(t.vehicleType),
      !view3d.hidden, (!view3d.hidden && diorama?.drawnAt(t.id)) || {}),
    !!follow,
  );
}

function renderBusCard() {
  const bus = clock.isRealTime() && buses.current().find(b => b.id === selectedBus);
  if (bus) showCard(busCard(bus, buses.observationNow(), view3d.hidden ? undefined : 'New Flyer Xcelsior XN40'), !!follow);
  else if (follow?.ended && follow.ended.id === selectedBus) showCard('<h2>Bus no longer shown</h2><p class="sub">Tap another vehicle.</p>', true);
  else if (selectedBus && selectedBus === params.get('bus')) {
    if (clock.isRealTime() && !buses.firstPollComplete) return showCard('<h2>Checking bus location…</h2>');
    showCard('<h2>Bus location unavailable</h2><p class="sub">This bus has no current position for the shared time.</p>');
  } else hideCard();
}

function cancelDeferredFollowLink() {
  followRoute = null;
  followBus = null;
}

// A review link names a route, not a trip id, which changes with each timetable refresh.
function followFromLink() {
  if (followBus && follow && diorama && clock.isRealTime()) {
    const bus = buses.current().find(b => b.id === followBus);
    if (bus) {
      followBus = null;
      selectedBus = bus.id;
      selectedTrain = null; selectedFreight = null;
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
  selectedBus = null; selectedFreight = null;
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
// The Map may still be waiting for tiles when the shared train's first live fix arrives.
live.onUpdate = () => {
  if (selectedTrain && selectedTrain === params.get('train')) source.update();
};
live.start();

let override: AtmosphereOverride | null = null;
let sceneConditions: AtmosphereOverride = {};
let paintMapAtmosphere: ((atm: Atmosphere) => void) | null = null;
/** The chrome's glass follows what sits behind it. City and Map follow the clock's darkness. Models
 * sits on the lab's studio, which is daylight unless its own Night switch is on, so there the switch
 * decides. (Reads the DOM, not labRoot, because this runs before that binding exists.) */
let clockTheme: 'dark' | 'light' = 'light';
/** The Map's own: night glass only once its painted ground is dark (paletteIsDark). */
let mapTheme: 'dark' | 'light' | null = null;
function applyTheme() {
  const lab = document.getElementById('lab-root');
  const inLab = !!lab && !lab.hidden;
  const labNight = lab?.querySelector('#night')?.getAttribute('aria-pressed') === 'true';
  const onMap = !!document.getElementById('view3d')?.hidden && !!mapTheme;
  shell.setTheme(inLab ? (labNight ? 'dark' : 'light') : onMap ? mapTheme! : clockTheme);
}
const updateAtmosphere = () => {
  const w = clock.isRealTime() ? shell.weather() : null;
  const atm = atmosphere(clock.now(), w, { ...override, ...sceneConditions });
  atmRealTime = clock.isRealTime();
  atmAt = clock.now().getTime();
  lastAtm = atm;
  diorama?.setAtmosphere(atm, clock.now());
  clockTheme = atm.dark > 0.55 ? 'dark' : 'light';
  applyTheme();
  if (view3d.hidden) paintMapAtmosphere?.(atm);
};
// ?perf only: move the clock and the scene's weather from a script, the same way the time slider and
// the weather menu do, so a harness can find shaders that first compile after ready.
if (perf.enabled) Object.assign(window, { __scene: (o: { offsetMin?: number; conditions?: AtmosphereOverride }) => {
  if (o.offsetMin !== undefined) clock.offsetMin = o.offsetMin;
  if (o.conditions) sceneConditions = o.conditions;
  updateAtmosphere();
} });
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
    mapTheme = paletteIsDark(onScreen) ? 'dark' : 'light';
    applyTheme();
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
  const showMapFeature = (kind: 'crossing' | 'arc', props: Record<string, unknown>) => {
    selectedMapFeature = { kind, id: String(props.id) };
    if (kind === 'crossing') return showCard(crossingCard(props as unknown as CrossingProps));
    const rights = typeof props.rights === 'string' ? JSON.parse(props.rights) : (props.rights ?? []);
    showCard(freightCard({ ...props, rights } as TrackArcProps));
  };
  if (landing === 'map' && (params.has('crossing') || params.has('arc'))) {
    const kind = params.has('crossing') ? 'crossing' : 'arc';
    const id = params.get(kind);
    const layer = map.getSource<maplibregl.GeoJSONSource>(kind === 'crossing' ? 'crossings' : 'freight');
    void layer?.getData().then(data => {
      if (!view3d.hidden || !card.hidden || data.type !== 'FeatureCollection') return;
      const feature = data.features.find(f => f.properties?.id === id);
      if (feature?.properties) showMapFeature(kind, feature.properties);
    }).catch(() => { /* The source can disappear if the view changes during loading. */ });
  }
  map.on('click', (e) => {
    selectedMapFeature = undefined;
    const directBus = map.queryRenderedFeatures(e.point, { layers: ['buses'] })[0];
    const train = directBus ? nearestTrain(e.point, 5) : nearestTrain(e.point);
    selectedBus = null; selectedFreight = null;
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
    selectedTrain = null; selectedFreight = null;
    if (f.layer.id === 'buses') {
      const bus = visibleBuses.get(f.properties.id);
      if (!bus || !clock.isRealTime()) return hideCard();
      selectedBus = bus.id;
      renderBusCard();
    } else showMapFeature(f.layer.id === 'crossings' ? 'crossing' : 'arc', f.properties);
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

// ---- clock -------------------------------------------------------------------
function updateClock(now: Date) {
  // Live weather belongs only to the real present: recompute as soon as the clock leaves or returns.
  // A sped-up or scrubbed clock moves the sun too: recompute every 5 simulated minutes.
  if (clock.isRealTime() !== atmRealTime || Math.abs(now.getTime() - atmAt) > 5 * 60_000) updateAtmosphere();
}

// ---- views: Map (MapLibre) and City (3D, loaded on demand) -------------------------------
// ?view=city opens City directly (?view=3d still works). The URL hash belongs to MapLibre.
// City is the downtown diorama (city/city.ts), in the same atmosphere as the Map.
let diorama: CityView | null = null;
let parkedCity: CityView | null = null;
let lastAtm: Atmosphere | null = null;
const view3d = document.getElementById('view3d')!;
/** The tier City is loading or showing, known as soon as openCity picks it. */
let cityQuality: 'low' | 'high' | null = null;
/** Low-tier City drops CSS backdrop-filter so the canvas is presented directly ("flat" glass). */
function applyGlassMode() {
  const cityShown = !view3d.hidden && document.body.classList.contains('in3d');
  if (!cityShown) setGlassMode('css');
  else if ((diorama?.quality ?? cityQuality) === 'low') setGlassMode('flat');
  else setGlassMode(document.body.classList.contains('city-over-map') ? 'css' : 'canvas');
}
new MutationObserver(applyGlassMode).observe(document.body, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(applyGlassMode).observe(view3d, { attributes: true, attributeFilter: ['hidden'] });
// Map ↔ City: the glass theme follows whichever scene is on screen.
new MutationObserver(applyTheme).observe(view3d, { attributes: true, attributeFilter: ['hidden'] });
if (params.has('glassdebug')) mountGlassDebug(document.getElementById('view3d-canvas')!);
const CITY_ORIGIN = { lon: -84.3916, lat: 33.7539 }; // Five Points, the pipeline origin
const cityLoading = document.getElementById('city-loading')!;
const cityProgress = document.getElementById('city-progress')!;
let cityAbort: AbortController | null = null;

let cityLoad = 0; // bumped whenever City opens or closes, so a load that finishes late is dropped
let cityTilt = 55; // retain the user's City tilt while Map remains flat
let opening = landing === 'city';
async function openCity() {
  if (parkedCity) {
    const city = parkedCity;
    parkedCity = null;
    if (city.resume()) {
      diorama = city;
      view3d.hidden = false;
      document.body.classList.add('in3d');
      if (keepPose) city.lookAt(keepPose.x, keepPose.z, keepPose);
      keepPose = null;
      if (lastAtm) city.setAtmosphere(lastAtm, clock.now());
      cityQuality = city.quality;
      applyGlassMode();
      watchAutoGraphics(city.quality, cityLoad);
      setViewParam('city');
      await applyGraphics();
      return;
    }
    city.dispose();
  }
  if (diorama) {
    if (mapExitActive) {
      cancelMapExit();
      await applyGraphics();
    }
    return;
  }
  perf.phase('city:open');
  // A selected train or bus carries into City, which follows it once it can (Follow in 3D);
  // anything else closes.
  const carried = selection();
  if (follow && carries(carried, 'city', clock.isRealTime()) && (carried?.kind === 'train' || carried?.kind === 'bus') && selectedInCityArea()) {
    follow.stop();
    // The vehicle chosen on the Map supersedes even a link target that has yet to arrive.
    cancelDeferredFollowLink();
    pendingFollow = { kind: carried.kind, id: carried.id };
    updateFollowPanel();
  } else hideCard();
  const carriedAt = pendingFollow ? selectedAt() : null;
  const load = ++cityLoad;
  cityAbort?.abort();
  const abort = cityAbort = new AbortController();
  view3d.hidden = false;
  sky.stopAnimation();
  cityLoading.hidden = false;
  cityProgress.textContent = 'Loading buildings, streets and trees…';
  document.body.classList.add('in3d');
  shell.setNote(null);
  let areaNote: string | null = null;
  // A2c Map → City (brief: "Map to City", option B): the map tilts to City's angle while City
  // loads, white buildings stand on it, then the coloured scene cross-fades over it. No zoom.
  const overMap = !opening && !keepPose && !!map && !reducedMotion() && mapOnCityScale(map);
  if (overMap) {
    document.body.classList.add('city-over-map');
    // City opens on the carried vehicle: the map moves there in the same ease as its tilt.
    await tiltMapTo(map!, cityTilt, carriedAt);
    if (load !== cityLoad) return;
  }
  try {
    const { createCity, pickQuality } = await import('./city/city');
    cityQuality = chosenQuality() ?? pickQuality();
    applyGlassMode();
    watchAutoGraphics(cityQuality, load);
    const d = await createCity(document.getElementById('view3d-canvas')!, rf, chosenQuality(), {
      signal: abort.signal,
      beforeFrame: shell.advanceMovement,
      areaNote: text => { areaNote = text; autoNote = false; shell.setNote(text); },
      mapGestures: true,
      whiteModel: overMap ? (cityBuiltOnce ? 'fade' : 'map') : 'paper',
      trains: () => source.update(),
      scheduledStreetcarsAt: ms => schedule.trainsAt(new Date(ms)).filter(t => t.routeId === 'marta:route:STREETCAR'),
      stopDistances: (pathId, stopId) => schedule.stopDistances(pathId, stopId),
      clockMs: () => clock.now().getTime(),
      // The Map's bus poll keeps running under City; City only reads the shared fixes.
      buses: () => (clock.isRealTime() ? buses.current() : null),
      follow,
      selectVehicle: hit => {
        follow?.stop();
        selectedTrain = hit?.kind === 'train' ? hit.id : null;
        selectedBus = hit?.kind === 'bus' ? hit.id : null;
        selectedFreight = hit?.kind === 'freight' ? hit.id : null;
        if (selectedTrain) renderTrainCard();
        else if (selectedBus) renderBusCard();
        else if (hit?.kind === 'freight') { freightCardKey = `${hit.consist}|${hit.lead}`; showCard(cityFreightCard(hit), !!follow); }
        else hideCard();
      },
      progress: (label) => { if (load === cityLoad) cityProgress.textContent = label; },
    });
    if (load !== cityLoad) {
      d.dispose(); // the user went back to Map (or reopened City) while this was loading
      return;
    }
    diorama = d;
    perf.phase('city:built');
    if (import.meta.env.DEV) Object.assign(window, { __city: d });
  } catch (err) {
    if (load !== cityLoad) return;
    keepPose = null;
    console.error(err);
    view3d.hidden = true;
    document.body.classList.remove('in3d');
    shell.setView('map'); // closes City, which clears the note, so set the note after
    shell.setNote(map ? 'City view couldn’t load here, so this is the map' : 'Interactive graphics unavailable · MARTA rail overview');
    return;
  }
  if (lastAtm) diorama.setAtmosphere(lastAtm, clock.now());
  perf.phase('city:atmosphere');
  let offBoard = false;
  // Arriving from Map keeps its camera within the loaded City board.
  // A Graphics change rebuilds City where it was; otherwise a link's camera opens it.
  const cameraLink = keepPose ?? (opening && parseCityCamera(params.get('cam')));
  keepPose = null;
  if (cameraLink) {
    diorama.lookAt(cameraLink.x, cameraLink.z, cameraLink);
  } else if (opening && params.get('board') === 'midtown' && params.get('site') === 'williams') {
    diorama.lookAt(95.5, -1701.8, { bearing: 0, tilt: 46, metresPerPixel: .32 });
  } else if (!opening && map) {
    // Read the current Map camera after loading: keyboard movement may have continued. A carried
    // vehicle that City reached without the over-map ease puts the map on it first.
    const at = pendingFollow && !overMap ? selectedAt() : null;
    if (at) map.jumpTo({ center: [at.lon, at.lat] });
    const c = map.getCenter();
    const [mx, mz] = lonLatToScene(CITY_ORIGIN, c.lng, c.lat);
    diorama.lookAt(mx, mz, {
      bearing: map.getBearing(),
      metresPerPixel: mapMetresPerPixel(c.lat, map.getZoom()),
      tilt: cityTilt,
    });
    const target = diorama.target();
    if (Math.hypot(target.x - mx, target.z - mz) > 1) {
      if (!areaNote) shell.setNote('Showing the nearest loaded City area');
      // Off the board: the white buildings wouldn't sit on the map's streets, so arrive over paper.
      offBoard = true;
    }
  }
  if (offBoard) document.body.classList.remove('city-over-map');
  // A2c: the white model holds until colour starts; only then is City "here" (Live, credit, vehicles).
  perf.phase('city:placed');
  diorama.beginReveal(offBoard && overMap ? 'paper' : undefined);
  await diorama.revealed;
  if (load !== cityLoad) return;
  perf.phase('city:revealed');
  opening = false;
  cityLoading.hidden = true;
  cityBuiltOnce = true;
  // WhiteModel starts the colour transition in rAF. Wait for that actual transition,
  // including an immediate or cancelled reveal, before handing the backing to City.
  if (overMap && !offBoard) {
    const arrival = leaving;
    requestAnimationFrame(async () => {
      const container = document.getElementById('view3d-canvas')!;
      await Promise.allSettled(container.getAnimations().map(a => a.finished));
      if (load === cityLoad && arrival === leaving && !mapExitActive)
        document.body.classList.remove('city-over-map');
    });
  }
  void applyGraphics();
  if (import.meta.env.DEV) Object.assign(window, { __diorama: diorama });
  setViewParam('city');
  startPendingFollow();
}

// ---- Graphics (A2c menu): Auto, High or Low for City, remembered per viewer ----------------------
type Graphics = 'auto' | 'high' | 'low';
const GRAPHICS_KEY = 'a2-graphics';
let graphics: Graphics = (() => {
  try {
    const g = localStorage.getItem(GRAPHICS_KEY);
    return g === 'high' || g === 'low' ? g : 'auto';
  } catch {
    return 'auto';
  }
})();
/** undefined lets createCity pick (?q=, then the device). Only A2c offers the choice. */
const chosenQuality = () => params.has('q') ? undefined
  : graphics !== 'auto' ? graphics : autoLow ? 'low' as const : undefined;
// Auto steps down to Low for the session when City runs under 20 fps at High (core/perf.ts
// watchSlow). Session only, so a better moment can try High again.
let autoLow = (() => {
  try {
    return sessionStorage.getItem('a2-graphics-auto') === 'low';
  } catch {
    return false;
  }
})();
let stopWatchSlow: (() => void) | null = null;
let autoNote = false;
function watchAutoGraphics(quality: 'low' | 'high', load: number) {
  stopWatchSlow?.();
  stopWatchSlow = null;
  if (graphics !== 'auto' || params.has('q') || autoLow || quality !== 'high') return;
  stopWatchSlow = perf.watchSlow(() => {
    stopWatchSlow = null;
    if (graphics !== 'auto' || load !== cityLoad || !diorama) return;
    autoLow = true;
    try {
      sessionStorage.setItem('a2-graphics-auto', 'low');
    } catch {
      /* private mode: this page only */
    }
    // A quiet, short notice; an area note that arrives meanwhile keeps the slot.
    autoNote = true;
    shell.setNote('Switched to lighter graphics');
    setTimeout(() => { if (autoNote) shell.setNote(null); autoNote = false; }, 6000);
    void applyGraphics();
  }, { belowFps: (import.meta.env.DEV && Number(params.get('slowfps'))) || 20 }); // dev: ?slowfps= to test
}
let keepPose: { x: number; z: number; bearing: number; tilt: number; distanceM: number } | null = null;
async function setGraphics(g: Graphics) {
  // A manual choice ends the watch; picking Auto again re-arms it on the next City open.
  stopWatchSlow?.();
  stopWatchSlow = null;
  graphics = g;
  try {
    localStorage.setItem(GRAPHICS_KEY, g);
  } catch {
    /* private mode: the choice lasts for this page */
  }
  // A menu choice that differs from the link's ?q= replaces it.
  if (params.has('q') && params.get('q') !== g) {
    params.delete('q');
    const u = new URL(location.href);
    u.searchParams.delete('q');
    history.replaceState(null, '', u);
  }
  await applyGraphics();
}
/** Rebuild City if the tier on screen isn't the chosen one. Also runs after every City load, so a
 * choice made while City was loading still lands. */
async function applyGraphics() {
  // The saved choice applies on the next City entry, including a reversed exit.
  if (!diorama || mapExitActive) return;
  const city = diorama;
  const { pickQuality } = await import('./city/city');
  if (diorama !== city || mapExitActive || city.quality === (chosenQuality() ?? pickQuality())) return;
  // Rebuild City at the same camera with the new tier.
  const t = diorama.target(), c = diorama.camera();
  keepPose = { x: t.x, z: t.z, bearing: c.bearing, tilt: c.tilt, distanceM: diorama.distance() };
  // A follow carries through the rebuild (Auto can step down to Low seconds after a follow starts);
  // openCity resumes it. Other selections close.
  const followed = follow?.vehicle ?? pendingFollow ?? undefined;
  if (!followed || followed.kind === 'freight') hideCard();
  else if (followed.kind === 'train') { selectedTrain = followed.id; selectedBus = selectedFreight = null; }
  else { selectedBus = followed.id; selectedTrain = selectedFreight = null; }
  cityLoad++;
  cityAbort?.abort();
  diorama.dispose();
  diorama = null;
  await openCity();
}

// ---- Map ↔ City camera match (A2c) -------------------------------------------------------------
const CITY_FOV = 22; // City's vertical field of view; the map takes it while they overlap
let mapFov: number | null = null; // MapLibre's own, restored when the map flattens
let mapMaxPitch: number | null = null;
let mapExitActive = false;
function cancelMapExit() {
  if (!mapExitActive) return;
  mapExitActive = false;
  leaving++;
  const container = document.getElementById('view3d-canvas')!;
  container.style.transition = container.style.opacity = '';
  document.body.classList.remove('city-over-map');
}
let leaving = 0; // bumped when City → Map starts, so a City click during the fade can cancel it
let cityBuiltOnce = false;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** City can open exactly on the map's view only near City's scale (its orbit limit). */
function mapOnCityScale(m: maplibregl.Map) {
  const mpp = mapMetresPerPixel(m.getCenter().lat, m.getZoom());
  return (mpp * innerHeight) / (2 * Math.tan((CITY_FOV / 2) * Math.PI / 180)) <= 6000;
}
function matchCityLens(m: maplibregl.Map) {
  mapFov ??= m.getVerticalFieldOfView();
  mapMaxPitch ??= m.getMaxPitch();
  m.setMaxPitch(80);
  m.setVerticalFieldOfView(CITY_FOV);
}
function tiltMapTo(m: maplibregl.Map, pitch: number, center?: { lon: number; lat: number } | null): Promise<void> {
  matchCityLens(m);
  return new Promise((done) => {
    const t = setTimeout(done, 1300);
    m.once('moveend', () => { clearTimeout(t); done(); });
    m.easeTo({ pitch, duration: 1000, ...(center ? { center: [center.lon, center.lat] as [number, number] } : {}) });
  });
}
function flattenMap(m: maplibregl.Map, animate: boolean) {
  const restore = () => {
    if (mapFov != null) m.setVerticalFieldOfView(mapFov);
    if (mapMaxPitch != null) m.setMaxPitch(mapMaxPitch);
    mapFov = mapMaxPitch = null;
  };
  if (!animate) {
    m.jumpTo({ pitch: 0 });
    restore();
    return;
  }
  m.once('moveend', restore);
  m.easeTo({ pitch: 0, duration: 1000 });
}

/** City → Map (A2c): the map takes City's exact view underneath, colour fades off it, then the
 * map flattens. Other exits (Models, errors) use closeCity directly. */
let mapArrival: Promise<void> = Promise.resolve();
async function leaveCityToMap() {
  const m = map;
  if (!diorama || !m || reducedMotion()) return closeCity();
  const load = cityLoad;
  const leave = ++leaving;
  mapExitActive = true;
  const t = diorama.target(), camera = diorama.camera();
  const [lon, lat] = sceneToLonLat(CITY_ORIGIN, t.x, t.z);
  cityTilt = camera.tilt;
  matchCityLens(m);
  m.jumpTo({ center: [lon, lat], bearing: camera.bearing, pitch: camera.tilt, zoom: mapZoomForScale(lat, camera.metresPerPixel) });
  if (lastAtm) paintMapAtmosphere?.(lastAtm);
  document.body.classList.add('city-over-map');
  const canvas = document.getElementById('view3d-canvas')!;
  canvas.style.transition = 'opacity 700ms cubic-bezier(.45,0,.55,1)';
  canvas.style.opacity = '0';
  await new Promise((r) => setTimeout(r, 720));
  if (leave !== leaving || load !== cityLoad || !diorama) return;
  closeCity(true);
}

function closeCity(keepMapView = false, writeUrl = true) {
  stopWatchSlow?.();
  stopWatchSlow = null;
  cancelMapExit();
  document.body.classList.remove('city-over-map');
  keepPose = null;
  // A train or bus carries back to the Map (its card stays, the map centres on it); a City freight
  // train is not drawn there, so its card closes.
  // A tier handoff since the last card refresh followed a new trip id: adopt it before the follow ends.
  const followed = follow?.vehicle;
  if (followed?.kind === 'train' && selectedTrain && selectedTrain !== followed.id && follow!.lineage.includes(selectedTrain)) {
    selectedTrain = followed.id;
    shownKey = followed.id;
  }
  const keep = carries(selection(), 'map', clock.isRealTime());
  if (keep) {
    follow?.stop();
    pendingFollow = null;
  } else hideCard();
  cityLoad++;
  cityAbort?.abort();
  cityAbort = null;
  opening = false;
  cityLoading.hidden = true;
  const pose = diorama && { target: diorama.target(), camera: diorama.camera() };
  diorama?.dispose();
  diorama = null;
  const map = openMap();
  if (keepMapView && map) flattenMap(map, true);
  else if (!pose && map && (mapFov != null || map.getPitch() !== 0)) flattenMap(map, false); // City never arrived
  else if (pose && map) {
    // Keep the same centre, direction and horizontal scale; only the tilt changes.
    const { target: t, camera } = pose;
    cityTilt = camera.tilt;
    const [lon, lat] = sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    map.jumpTo({ center: [lon, lat], bearing: camera.bearing, pitch: 0,
      zoom: mapZoomForScale(lat, camera.metresPerPixel) });
    flattenMap(map, false);
  }
  if (import.meta.env.DEV) Object.assign(window, { __diorama: null });
  view3d.hidden = true;
  if (lastAtm) paintMapAtmosphere?.(lastAtm);
  document.body.classList.remove('in3d');
  shell.setNote(null);
  if (writeUrl) setViewParam('map');
  map?.resize();
  if (keep) {
    if (selectedTrain) renderTrainCard();
    else if (selectedBus) renderBusCard();
    // After the flatten (1 s) so the two eases don't cut each other short.
    if (map && keepMapView && !reducedMotion()) map.once('moveend', () => requestAnimationFrame(focusSelection));
    else requestAnimationFrame(focusSelection);
  }
}

// ---- Models (A2c): the Model lab as the third view -------------------------------------
// The lab's own module mounts its markup into #lab-root (models/lab-markup.ts) and pauses drawing
// while this section is hidden. A completed City keeps its renderer and scene with the frame loop paused.
let labRoot: HTMLElement | null = null;
let labView: { enter(): void; openBrowser(): void; escape(): boolean; model(): string | null; reset(): void } | null = null;
let labReady: Promise<void> | null = null;
let sceneTitle = document.title;
let pendingModel: string | null = null;
const inModels = () => !!labRoot && !labRoot.hidden;
async function openModels() {
  hideCard();
  if (diorama && cityLoading.hidden) {
    leaving++;
    cancelMapExit();
    stopWatchSlow?.();
    stopWatchSlow = null;
    diorama.pause();
    parkedCity = diorama;
    diorama = null;
    view3d.hidden = true;
    document.body.classList.remove('in3d', 'city-over-map');
  } else if (!view3d.hidden) closeCity(false, false);
  if (!labRoot) {
    labRoot = Object.assign(document.createElement('section'), { id: 'lab-root' });
    labRoot.setAttribute('aria-label', 'Models');
    // The A2c layout classes go on before the lab loads, so its first resize sees the full stage.
    labRoot.classList.add('lab', 'a2-lab');
    document.body.prepend(labRoot);
  }
  if (labRoot.hidden !== false) sceneTitle = document.title;
  labRoot.hidden = false;
  applyTheme();
  setViewParam('models');
  // One mount, however often Models is chosen while the lab is still loading.
  labReady ??= (async () => {
    await import('./models/main');
    const { mountModelsView } = await import('./ui/next/models-view');
    labView = mountModelsView(labRoot!, { dev: params.has('dev') });
    const night = labRoot!.querySelector('#night');
    if (night) new MutationObserver(applyTheme).observe(night, { attributes: true, attributeFilter: ['aria-pressed'] });
    applyTheme();
  })();
  try {
    await labReady;
  } catch (err) {
    console.error(err);
    labReady = null;
    leaveModels();
    shell.setView('map');
    shell.setNote('Models couldn’t load here, so this is the map');
    return;
  }
  if (!inModels()) return;
  labView?.enter();
  const target = new URL(location.href).searchParams.get('model');
  if (target && labView?.model() !== target) {
    labRoot.querySelector<HTMLButtonElement>(`.library [data-model="${CSS.escape(target)}"]`)?.click();
  }
  setViewParam('models');
  (window as unknown as { __lab?: { resize?(): void } }).__lab?.resize?.();
}
function leaveModels() {
  if (!labRoot || labRoot.hidden) return;
  labRoot.hidden = true;
  document.title = sceneTitle; // the lab names the tab after its model
  applyTheme();
}
/** Zoom the model by a wheel step at the stage centre, through the lab's own OrbitControls. */
function labZoom(dir: 1 | -1) {
  const canvas = document.querySelector<HTMLCanvasElement>('#stage canvas');
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: dir > 0 ? -250 : 250, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
}

function setViewParam(v: View) {
  const u = new URL(location.href);
  u.searchParams.set('view', v);
  if (v === 'models') {
    const id = pendingModel ?? u.searchParams.get('model') ?? labView?.model() ?? u.searchParams.get('v') ?? 'cq400';
    u.searchParams.set('model', id);
    u.searchParams.delete('v');
  } else {
    u.searchParams.delete('model');
    u.searchParams.delete('v');
  }
  history.replaceState(history.state, '', u);
}

document.getElementById('early-map')!.hidden = true;
const shellOptions: ShellOptions = {
  view: 'map',
  onView(v: View) {
    const before = initialView(location.search, location.hash);
    if ((v === 'models' || inModels()) && before !== v) {
      const pose = diorama && shellOptions.shareTarget?.();
      if (pose?.view === 'city') {
        const u = new URL(location.href);
        u.searchParams.set('cam', pose.cam);
        history.replaceState(history.state, '', u);
      }
      history.pushState(null, '', location.href);
      setViewParam(v);
    }
    if (v !== 'models') {
      if (inModels() && v === 'city') keepPose = parseCityCamera(new URL(location.href).searchParams.get('cam')) ?? null;
      leaveModels();
    }
    if (v === 'city') void openCity();
    else if (v === 'models') void openModels();
    else if (parkedCity) {
      diorama = parkedCity;
      parkedCity = null;
      closeCity();
    } else mapArrival = leaveCityToMap();
  },
  center() {
    if (diorama) {
      const t = diorama.target();
      return sceneToLonLat(CITY_ORIGIN, t.x, t.z);
    }
    const c = map?.getCenter();
    return c ? [c.lng, c.lat] : [CITY_ORIGIN.lon, CITY_ORIGIN.lat];
  },
  pan(dx, dy) {
    if (inModels()) return; // the model turns by drag; keys don't move it
    // The shell sends a content-drag offset; both cameras move in the opposite direction.
    if (diorama) diorama.pan(-dx, -dy);
    else map?.panBy([-dx, -dy], { duration: 0 });
  },
  zoom(dir) {
    if (inModels()) return labZoom(dir);
    if (diorama) return diorama.zoom(dir);
    map?.zoomTo(map.getZoom() + dir, { duration: 200 });
  },
  rotate(degrees) {
    if (inModels()) return;
    diorama?.rotate(degrees);
  },
  onWeather: () => updateAtmosphere(),
  onSceneConditions(settings) {
    sceneConditions = settings;
    updateAtmosphere();
  },
  live: () => ({
    realTime: clock.isRealTime(),
    rail: railStatus(source.liveActive, live.error),
    trains: live.count,
    cityFreight: diorama?.hasFreight ?? false,
    cityTraffic: diorama?.hasTraffic ?? false,
    buses: buses.unavailable ? null : buses.current().length,
  }),
  bearing: () => (diorama ? diorama.camera().bearing : map?.getBearing() ?? 0),
  searchModels: () => labView?.openBrowser(),
  async goToPlace(lon, lat) {
    const flatten = mapExitActive;
    await mapArrival;
    if (!view3d.hidden || inModels()) return;
    // A search flight replaces the flattening animation started by the City exit.
    map?.flyTo({ center: [lon, lat], zoom: 15, ...(flatten && { pitch: 0 }), duration: reducedMotion() ? 0 : 500 });
  },
  search: {
    stations() {
      // MARTA rail and streetcar stops, and Amtrak's within the metro (its feed runs to New York).
      const out: { name: string; lon: number; lat: number }[] = [];
      for (const s of schedule.stops.values()) {
        const amtrak = s.id.startsWith('amtrak:');
        if (amtrak && Math.hypot((s.lon - CITY_ORIGIN.lon) * 92.6, (s.lat - CITY_ORIGIN.lat) * 111.2) > 45) continue;
        out.push({ name: amtrak ? `${stationName(s.name)} (Amtrak)` : stationName(s.name), lon: s.lon, lat: s.lat });
      }
      return out;
    },
    viewAt(cam) {
      const c = parseCityCamera(cam)!;
      const [lon, lat] = sceneToLonLat(CITY_ORIGIN, c.x, c.z);
      return { lon, lat };
    },
    inCity(lon, lat) {
      const [x, z] = lonLatToScene(CITY_ORIGIN, lon, lat);
      return diorama ? diorama.onBoard(x, z, true) : inCityArea(x, z);
    },
    pick(hit) {
      cancelDeferredFollowLink();
      // A View opens City on its camera (from the Map, as a link's camera would).
      if (hit.view) {
        hideCard(); // a carried vehicle would start a follow and take the camera off the View
        const cam = parseCityCamera(hit.view.cam)!;
        if (diorama) diorama.lookAt(cam.x, cam.z, cam);
        else keepPose = cam;
        // During the fade, Map already owns the shell. Re-select City to cancel its disposal.
        shell.setView('city');
        return;
      }
      const [x, z] = lonLatToScene(CITY_ORIGIN, hit.lon, hit.lat);
      // In City: move City's camera, keeping its angle. A place City can't show opens on the Map.
      if (!mapExitActive && !view3d.hidden && !inModels()) {
        pendingFollow = null; // a Follow in 3D still waiting would take the camera back
        updateFollowPanel();
        if (diorama?.onBoard(x, z, true)) {
          // The search takes the camera: a follow would pull it straight back to the vehicle.
          if (follow?.active) {
            follow.stop();
            updateFollowPanel();
          }
          // Glide at the current scale into a mounted area. Into an area still loading, lookAt
          // keeps the target and arrives once it mounts (glide would stop at the loaded edge). From
          // far out (the whole board), come in to 600 m so the place is what you see.
          if (diorama.distance() <= 900 && diorama.onBoard(x, z)) return diorama.glide(x, z);
          const c = diorama.camera();
          return diorama.lookAt(x, z, { bearing: c.bearing, tilt: c.tilt, distanceM: Math.min(diorama.distance(), 600) });
        }
        // Still building: City opens on the result (openCity reads keepPose once it is built).
        if (!diorama && inCityArea(x, z)) {
          keepPose = { x, z, bearing: map?.getBearing() ?? 0, tilt: cityTilt, distanceM: 600 };
          return;
        }
      }
      // A Map result supersedes the vehicle selection. Clear it before closeCity can carry
      // it, or before an already queued focusSelection reads it after the Map flattens.
      hideCard();
      if (!mapExitActive && !view3d.hidden) shell.setView('map');
      void shellOptions.goToPlace?.(hit.lon, hit.lat);
    },
  },
  outsideCity() {
    const c = map?.getCenter();
    if (!c) return false;
    const [x, z] = lonLatToScene(CITY_ORIGIN, c.lng, c.lat);
    return !inCityArea(x, z);
  },
  centerCity() { map?.jumpTo({ center: [CITY_ORIGIN.lon, CITY_ORIGIN.lat], zoom: 17 }); },
  getTilt: () => diorama?.camera().tilt ?? cityTilt,
  setTilt(degrees) {
    cityTilt = degrees;
    if (!diorama) return;
    const t = diorama.target();
    diorama.lookAt(t.x, t.z, { bearing: diorama.camera().bearing, tilt: degrees, distanceM: diorama.distance() });
  },
  north() {
    if (inModels()) return;
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
    updateAtmosphere();
  },
  onClock() {
    updateAtmosphere();
    updateClock(clock.now());
    if (selectedTrain) renderTrainCard();
    else if (selectedBus) renderBusCard();
    else refreshFreightCard();
  },
  metresPerPixel() {
    if (diorama) return diorama.camera().metresPerPixel;
    const c = map?.getCenter();
    return map && c ? mapMetresPerPixel(c.lat, map.getZoom()) : null;
  },
  sky: () => lastAtm,
  allStops() {
    const t = selectedTrain && source.find(selectedTrain);
    if (!t) return null;
    const stops = schedule.stopsAhead(t, clock.now());
    if (!stops.length) return null;
    const esc = (x: string) => x.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const name = (x: string) => esc(stationName(x));
    const timed = stops.some((s) => s.inSec != null);
    // Times come from the timetable (scheduled); a live train's later stops have no prediction.
    const note = timed
      ? '<p class="a2-stops-note"><span class="chip scheduled">Scheduled</span> Times from the published timetable; a delayed train will be later.</p>'
      : '<p class="a2-stops-note">The live feed predicts only the next stop; the rest follow in timetable order, without times.</p>';
    const rows = stops.map((s) => `<li><span>${name(s.name)}</span>${s.inSec == null ? '' : `<span>${s.inSec < 60 ? 'arriving' : `${Math.round(s.inSec / 60)} min`}</span>`}</li>`).join('');
    return `${note}<ol class="a2-stops">${rows}</ol>`;
  },
  loading: () => (!view3d.hidden && !cityLoading.hidden ? 'Building the city…' : null),
  // A link's ?q= decides the tier until the viewer picks one, so the menu shows that.
  graphics: {
    get: () => (params.get('q') === 'high' || params.get('q') === 'low' ? params.get('q') as Graphics : graphics),
    set: (g) => void setGraphics(g),
    autoResolved: () => (autoLow ? 'low' : null),
  },
  resetModelView: () => labView?.reset(),
  viewEscape: () => (inModels() ? labView?.escape() ?? false : false),
  shareTarget() {
    if (inModels()) {
      const model = labView?.model();
      return model ? { view: 'models' as const, model } : null;
    }
    // Decide by the view on screen: City still loading has no camera to share yet.
    if (!view3d.hidden && !diorama) return null;
    const selection = selectedTrain ? { kind: 'train', id: selectedTrain }
      : selectedBus ? { kind: 'bus', id: selectedBus } : selectedFreight ? { kind: 'freight', id: selectedFreight } : undefined;
    if (diorama) {
      const t = diorama.target(), c = diorama.camera();
      return { view: 'city' as const, selection, cam: formatCityCamera({ x: t.x, z: t.z, bearing: c.bearing, tilt: c.tilt, distanceM: diorama.distance() }) };
    }
    if (!map) return null;
    const c = map.getCenter();
    const b = Math.round(map.getBearing());
    return { view: 'map' as const, selection: selection ?? selectedMapFeature, hash: `#${map.getZoom().toFixed(2)}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}${b ? `/${b}` : ''}` };
  },
};
// The A2c interface (docs/ui-controls-brief.md).
Object.assign(window, { __northSelection: () => ({ selectedTrain, followed: follow?.vehicle, phase: follow?.phase, time: clock.now().toISOString() }) });
const shell = createShellNext(shellOptions);
addEventListener('popstate', () => {
  const v = initialView(location.search, location.hash);
  shell.setView(v);
});
cardContent.addEventListener('click', e => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-see-model]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  pendingModel = link.dataset.seeModel!;
  shell.setView('models');
  pendingModel = null;
});
if (import.meta.env.DEV) Object.assign(window, {
  __shell: shell,
  // Dev: select a train as a tap would, for checks that can't land a tap on a moving car.
  __selectTrain(id: string) { selectedTrain = id; selectedBus = null; selectedFreight = null; renderTrainCard(); },
  __trains: () => source.current,
  // Dev: select a live bus as a tap would (both views); __buses() lists ids and positions.
  __selectBus(id: string) { selectedBus = id; selectedTrain = null; selectedFreight = null; renderBusCard(); },
  __buses: () => buses.current(),
});

// City and its status card must keep time even while remote Map tiles are unavailable.
updateAtmosphere();
updateClock(clock.now());
shell.tick(clock.now());
setInterval(updateAtmosphere, 60_000);
let restoreSelection = params.has('train') || params.has('bus') || params.has('freight');
setInterval(() => {
  const now = clock.now();
  updateClock(now);
  shell.tick(now);
  if (restoreSelection && (landing === 'city' ? diorama : map)) {
    restoreSelection = false;
    keepSharedCamera = true;
    if (params.has('train')) {
      selectedTrain = params.get('train');
      source.update(now);
    }
    else if (params.has('bus')) selectedBus = params.get('bus');
    else if (diorama && ['illustrative:freight:downtown', 'illustrative:freight:norcross'].includes(params.get('freight') ?? '')) {
      selectedFreight = params.get('freight');
      const norcross = selectedFreight === 'illustrative:freight:norcross';
      showCard(cityFreightCard(norcross ? { line: 'NS Norcross District', railroad: 'ns' } : undefined), !!follow);
      freightCardKey = ''; // Refresh with this passage's consist when it is on the board.
    }
  }
  followFromLink();
  startPendingFollow();
  if (selectedTrain) renderTrainCard();
  else if (selectedBus) renderBusCard();
  else if (selectedFreight) { refreshFreightCard(); if (follow) updateFollowPanel(); }
  keepSharedCamera = false;
}, 500);


if (landing === 'city') shell.setView('city');
else if (landing === 'models') {
  openMap();
  shell.setView('models');
}
else if (!openMap()) shell.setNote('Interactive graphics unavailable · MARTA rail overview');

if (import.meta.env.DEV && params.get('perf') === 'models-return') {
  void import('./core/models-return').then(({ measureModelsReturn }) => measureModelsReturn(
    () => !inModels() && !!diorama && !view3d.hidden && cityLoading.hidden,
    () => inModels() && !!labView && !!(window as unknown as { __lab?: { framed(): boolean } }).__lab?.framed(),
  ));
}
