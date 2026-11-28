import { capitolTunnelGround, capitolTunnelSlots } from '../terrain/capitol-tunnel';
import { joinGroundMaps } from './north-seam-texture';
import { rowJoinNormals } from './north-seam-ground';
import { mountStationFragments } from './north-seam-neighborhood';
import type { TrafficArea as SeamArea } from '../square-board/sections';
import { northFreightMain } from './norcross-north-study';
/**
 * City: downtown Atlanta as a model-railway diorama, in the same style as the East Portal
 * vignette (ink lines, colour grade, tilt-shift) and built by the same engine (`vignette/world`).
 * Loaded on demand from the main app, so the Map never pays for Three.js.
 *
 * Downtown terrain, transport and train geometry share one vertical reference. Older scene
 * bakes use the flat board. Quality is selected once when the view opens.
 */
import * as THREE from 'three';
import { ORBIT_MIN, minOrbitDistance } from './dev-camera';
import { takeHouseLodChange } from './house-lod';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Atmosphere } from '../core/atmosphere';
import type { GroundCamera } from '../core/camera';
import type { RoutesFile, TrainState } from '../model/types';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import { prepareNorthLine, type createNorthLine } from './midtown-marta-rail';
import { drawnAt } from './drawn-at';
import { FOLLOW_CAMERA, leadFirst, liveSource, needsHandoff, trainHidden, type Fix, type Followed, type VehicleFollow } from './vehicle-follow';
import { alignment } from '../vignette/alignment';
import { Line } from '../vignette/geom';
import { gradeShader } from '../vignette/grade';
import { checkFrozen, freezeSelf, freezeStatic } from './freeze';
import { hideEmptyMeshes } from './empty-draws';
import { frameFraction } from './camera-damping';
import { bindDirectDrag } from './direct-drag';
import { CityGlass } from './glass';
import { canvasGlassAllowed, glassSource, setCanvasGlass } from '../ui/glass';
import { FoliageMaskPass, inkShader } from '../vignette/ink';
import { local } from '../vignette/time';
import type { TrafficData } from '../vignette/traffic';
import { tiltShiftShader } from '../vignette/tiltshift';
import { Rain } from '../vignette/weather';
import { World, type Alignment, type VData } from '../vignette/world';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { inConnectorLanes } from '../terrain/connector-paint';
import { createDowntownTerrain, takeGroundLodChange } from '../terrain/model';
import { takeFarChange, updateFarForms } from '../terrain/far-form';
import { underpassDrive } from './underpass-drive';
import { createSurfaceTransport } from '../terrain/transport';
import { applyRampDecks } from '../terrain/ramp-decks';
import { applyLids } from '../terrain/lids';
import type { TerrainCity } from '../terrain/transport-data';
import { terrainAlignment, terrainOpenings } from './terrain-rail';
import { boardPoint, eastBounds, eastJoin, nearEast, nearNorth, northBounds, northSouthJoin, northWestJoin } from './board-footprint';
import { prepareEastCut } from './east-cut';
import { cutFloor, cutOpenings, maskCut } from './east-cut-ground';
import { ConnectorTraffic, type ConnectorBoard } from './connector-traffic';
import { StreetFigures } from './street-figures';
import { cityTravellers, type Traveller } from './walkways';
import { ArterialTraffic } from './arterial-traffic';
import midtownRowBounds from '../../../pipeline/prototypes/square-board/midtown-rows.json';
import { loadArterials } from './arterials';
import { cityRoadHeight } from './road-height';
import { buildStreetcarTrack, poleBlocked, roadSurface, streetcarLines, withoutTram } from './streetcar';
import { createStreetcarCars, streetcarCovers } from './streetcar-cars';
import { streetcarTraffic } from './streetcar-traffic';
import { buildStreetcarStops, platformFootprints, platformSites, streetcarStops } from './streetcar-stops';
import { orbitNear } from './depth-range';
import { CityFreight } from './freight';
import { freightNight } from './freight-batches';
import { HeadlightPools } from './headlight-pools';
import { CityBuses, busRuns } from './buses';
import type { LiveBus } from '../model/types';
import { CityTrains } from './trains';
import { registerStationLine, stationTrack, type StationTrack } from './station-track';
import { createGeorgiaState } from './station';
import { georgiaStateScene } from './georgia-state-geometry';
import { createFloyd } from './floyd';
import { createGeorgiaPower } from './georgia-power';
import { createPeachtreeTowers } from './peachtree-towers';
import { createGeorgiaPacific } from './georgia-pacific';
import { createFootballHall } from './football-hall';
import { createMuseumTower } from './museum-tower';
import { createCourtlandGrand } from './courtland-grand';
import { createOneParkTower } from './one-park-tower';
import { createParkPlaceTower } from './park-place-tower';
import { createTDeck } from './t-deck';
import { createHardRock } from './hard-rock';
import { createTheLandmark } from './the-landmark';
import { createInternationalGarage } from './international-garage';
import { createLandmarkDeck } from './landmark-deck';
import { createFiftyFiveParkPlace } from './55-park-place';
import { createFultonBank } from './55-marietta';
import { createDavisons } from './davisons';
import { createRitzCarlton } from './ritz-carlton-atlanta';
import { createSouthernBell } from './southern-bell';
import { createRhodesHaverty } from './rhodes-haverty';
import { createEmpireBuilding } from './empire-building';
import { createCommerceBuilding } from './commerce-building';
import { createHundredEdgewood } from './100-edgewood';
import { createMetropolitan } from './metropolitan';
import { createMariettaBackdrop } from './marietta-backdrop';
import { createOne12Courtland } from './one12-courtland';
import { createCitizensTrust } from './citizens-trust';
import { createFultonGovernmentCenter } from './fulton-government-center';
import { createGeorgiaAquarium } from './georgia-aquarium';
import { createWorldOfCocaCola } from './world-of-coca-cola';
import { createWilliams250 } from './250-williams';
import { createFultonCourthouse } from './fulton-courthouse';
import { createPeachtreeOffices } from './peachtree-offices';
import { createWilliamOliver } from './william-oliver';
import { createOmniAtlanta } from './omni-atlanta';
import { createFivePointsPlaza } from './five-points-plaza';
import { createTwoPeachtree } from './two-peachtree';
import { createHealey } from './healey';
import { createFlatiron } from './flatiron';
import { createCentralLibrary } from './central-library';
import { createPeachtreeCenter } from './peachtree-center';
import { createHubPeachtreeCenter } from './hub-peachtree-center';
import { createPeachtree191 } from './peachtree-191';
import { createHyattRegency } from './hyatt-regency';
import { createAltitudeApartments } from './altitude-apartments';
import { createHiltonAtlanta } from './hilton-atlanta';
import { createMarriottMarquis } from './marriott-marquis';
import { createMarquisOne, createMarquisTwo } from './marquis-offices';
import { createCapitalCityClub } from './capital-city-club';
import { createMedicalArts } from './medical-arts';
import { createJwMarriott } from './jw-marriott-downtown';
import { createTwelveCentennial } from './twelve-centennial';
import { createTruistPlaza } from './truist-plaza';
import { createWestin } from './westin';
import { createCoreyTower } from './corey';
import { createRussellBuilding } from './russell-building';
import { createCentennialTower } from './centennial-tower';
import { createSkyView } from './skyview-atlanta';
import { createStadium } from './stadium';
import { createCapitol } from './capitol';
import { createAtlantaCityHall } from './atlanta-city-hall';
import { createAmericasMart } from './americasmart';
import { createHurtBuilding } from './hurt-building';
import { createAymDeck } from './aym-deck';
import { createTheMitchell } from './the-mitchell';
import { createRenaissanceLofts } from './renaissance-lofts';
import { createBarclayHotel } from './barclay-hotel';
import { createAllenPlaza55 } from './allen-plaza-55';
import { createTheCenter } from './the-center';
import { createSamNunn } from './sam-nunn';
import { createCandler } from './candler';
import { createEquitable } from './equitable';
import { createOlympia } from './olympia-building';
import { createGrady } from './grady';
import { createStateFarmArena } from './state-farm-arena';
import { createCongressCenter } from './congress-center';
import { mapGestures } from './map-gestures';
import { createWhiteModel } from './white-model';
import type { Placeholder } from './placeholder';
/** Ink strength while City is a white model (as in colour; dev: ?whiteink= to tune). */
/** View depth (m) past which ink is fully faded (keep in step with vignette/ink.ts), plus a margin. */
const INK_FADE_END_M = 4300;
/** OrbitControls' default damping, and City's glide-to step, as fractions per 60 Hz frame. */
const DAMPING_PER_60HZ_FRAME = 0.05;
const GLIDE_PER_60HZ_FRAME = 0.12;
const WHITE_INK = (import.meta.env.DEV && Number(new URLSearchParams(location.search).get('whiteink'))) || 0.9;
import { listenForTap, pickVehicle, type FreightPick, type VehicleSelection } from './pick';
import { Snow } from './snow';
import { boxedFromAfar, boxesFromObject, FAR_LANDMARKS } from './far-board';
import { batchLandmarkBodies, batchLandmarks, LANDMARK_LOD, landmarkBatchOff, landmarkBatchReport, type LandmarkEntry } from '../materials/landmark-batch';
import { surfaceDefaults } from '../materials';
import { cameraWatch, releaseCamera, runBudgeted, runSync, sliceBudget, sliceInput, sliceStats, type Build } from '../core/slice';
import { distToLine } from './line-distance';
import { perf, perfEnabled, perfOverrides, type PerfCategory } from '../core/perf';
import { shadowStepM } from './shadow-step';
import { createPrewarmer, type Prewarmer } from '../core/prewarm';
import { deviceFacts, deviceTier } from '../core/device-tier';
import { rolloutBatch } from '../trees/rollout-city';
import { takePrefetched } from '../core/prefetch';
import { glassFloorStrength, installGlassFloor } from '../vignette/glass-floor';

export type Quality = 'low' | 'high';

export interface CityView {
  measuredGround: boolean;
  hasFreight: boolean;
  hasTraffic: boolean;
  hasPeople: boolean;
  bounds: VData['bounds'];
  /** Centre the view on scene metres (x east, z −north). */
  lookAt(x: number, z: number, camera?: (GroundCamera | { bearing: number; distanceM: number }) & { tilt?: number }): void;
  target(): { x: number; z: number };
  /** Where a link or lookAt is still headed while its area loads (the camera waits at the nearest
   * loaded edge), or null. A rebuild keeps this, not the clamped target. */
  pendingTarget(): { x: number; z: number } | null;
  /** True when scene metres (x, z) lie on a mounted area, or with `eventually`, anywhere on
   * the board once every area has mounted. */
  onBoard(x: number, z: number, eventually?: boolean): boolean;
  /** Load the area a vehicle stands in, without moving the camera. */
  seek(x: number, z: number): void;
  camera(): GroundCamera & { tilt: number };
  /** Orbit distance in metres, the last field of a `cam` link. */
  distance(): number;
  /** Pan by a screen offset in CSS pixels (keyboard movement). */
  pan(dxPx: number, dyPx: number): void;
  /** Turn the view by degrees (Q/E). */
  rotate(degrees: number): void;
  /** Zoom a step in (+1) or out (−1). */
  zoom(dir: 1 | -1): void;
  /** Sun, darkness and weather from the shared atmosphere; the date sets the season. */
  setAtmosphere(a: Atmosphere, now: Date): void;
  quality: Quality;
  /** Live buses drawn this frame; `occupies` lets illustrative traffic avoid them (call after the frame's bus update). */
  buses: Pick<CityBuses, 'occupies' | 'summary'>;
  /** Where City draws this train right now, for its card: a car out on the North Line open
   * cut (inferred track) or a Crescent berthed on the Brookwood model (inferred berth).
   * Recomputed on every call, so it follows the train into a tunnel or along a corridor. */
  drawnAt(trainId: string): { inferredTrack: boolean; inferredBerth: boolean };
  /** The passage a freight id is drawing now (it changes each slot), or null when none is drawn. */
  freightPassage(trainId: string): FreightPick | null;
  stats(): { roadVehicles: number; arterialCars: number; freightCars: number; surfaceCars: number; buses: number; fps: number; drawCalls: number; triangles: number; buildMs: number; stages: Record<string, number> };
  pause(): void;
  resume(): boolean;
  dispose(): void;
  /** Resolves when colour starts to show (at once without the white model). */
  revealed: Promise<void>;
  /** The host has placed the camera and set the atmosphere: start the white-model reveal, in
   * `mode` if it must change (the map's view fell off the board). */
  beginReveal(mode?: 'paper' | 'map' | 'fade'): void;
  /** Glide the view's centre to scene metres, keeping bearing, tilt and distance (A2c: a selection). */
  glide(x: number, z: number): void;
}

/** Phones, mobile GPUs and small-memory devices get the light tier (core/device-tier.ts);
 * `?q=low|high` overrides. */
export function pickQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'high') return q;
  return deviceTier(deviceFacts()).tier;
}

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export async function createCity(container: HTMLElement, rf: RoutesFile, quality = pickQuality(), options: {
  signal?: AbortSignal;
  progress?: (label: string) => void;
  /** The area notice, and a retry for the failed areas it names when they can be retried. */
  areaNote?: (text: string | null, retry?: () => void) => void;
  /** Maps-style input (A2c, ?ui=next): drag pans, right/Ctrl-drag rotates, zoom to cursor, twist, two-finger tilt. */
  mapGestures?: boolean;
  /** Arrive as a white study model, then fade colour in (A2c step 9; see white-model.ts). */
  whiteModel?: false | 'paper' | 'map' | 'fade';
  trains: () => TrainState[];
  /** Timetable-only historical samples for deterministic streetcar following. */
  scheduledStreetcarsAt?: (clockMs: number) => readonly TrainState[];
  /** Where the timetable stops trains along a path (for platform berthing). */
  stopDistances?: (pathId: string, stopId: string) => number[];
  clockMs: () => number;
  /** Current live bus fixes from the shared feed, or null off the real present (City shows none). */
  buses?: () => LiveBus[] | null;
  beforeFrame?: (timestamp: number) => void;
  follow?: VehicleFollow;
  selectVehicle?: (vehicle: VehicleSelection | null) => void;
}): Promise<CityView> {
  const DATA = `${BASE}/data`;
  const low = quality === 'low';
  // Shaded glass keeps a floor (vignette/glass-floor.ts): a Lambert source patch, so no new programs.
  installGlassFloor(glassFloorStrength(location.search, import.meta.env.DEV));
  // Library materials follow the quality tier; ?surfaces=off draws every landmark flat (A/B).
  surfaceDefaults.tier = quality;
  surfaceDefaults.enabled = new URLSearchParams(globalThis.location?.search ?? '').get('surfaces') !== 'off';
  async function asset(name: string) {
    const url = `${DATA}/scene/downtown/${name}`;
    // A City landing started these at boot (core/prefetch.ts); otherwise fetch now.
    const r = (await takePrefetched(url, options.signal)) ?? await fetch(url, { signal: options.signal });
    options.signal?.throwIfAborted();
    if (!r.ok) throw new Error(`City ${name} (${r.status})`);
    return r;
  }
  async function optionalJSON<T>(name: string): Promise<T | null> {
    try {
      return await (await asset(name)).json() as T;
    } catch {
      options.signal?.throwIfAborted();
      return null;
    }
  }
  const [vd, manifest, trees, trafficData, arterialData] = await Promise.all([
    asset('vignette.json').then(r => r.json() as Promise<TerrainCity>),
    asset('scene.json').then(r => r.json() as Promise<SceneManifest>),
    asset('trees.json').then(r => r.json() as Promise<{ trees: [number, number, number, number][] }>),
    optionalJSON<Pick<TrafficData, 'hourly'>>('traffic.json'),
    optionalJSON<unknown>('arterials.json'),
  ]);
  perf.phase('city:data');
  // Downtown halves of the stacked Connector ramps take their measured spans too.
  applyRampDecks(vd);
  // The downtown edge of the Capitol Gateway lid draws its streets on the lid.
  applyLids(vd);
  let grid: GroundGrid | undefined, groundBytes: ArrayBuffer | undefined;
  if (manifest.rail?.version === 1 && vd.terrainTransport?.version === 1) {
    try {
      const [spec, bytes] = await Promise.all([
        asset('ground.json').then(r => r.json() as Promise<GroundManifest>),
        asset('ground.i16').then(r => r.arrayBuffer()),
      ]);
      groundBytes = bytes;
      grid = new GroundGrid(spec, bytes);
    } catch {
      options.signal?.throwIfAborted();
      // Older or partially refreshed caches can still render the legacy profiles.
      console.warn('City ground grid unavailable. Using the flat board.');
    }
  }
  const query = new URLSearchParams(location.search);
  // A/B for phone measurements: ?ground=old draws the near ground at every distance.
  GroundSurface.farLow = query.get('ground') !== 'old';
  const board = query.get('board');
  const joinedEast = board !== 'downtown' && query.get('east') === 'king-memorial';
  const rectangle = board === null && !joinedEast;
  const midtown = rectangle || board === 'midtown';
  const brookwoodStudy = midtown && query.get('site') === 'brookwood';
  let brookwood: ReturnType<typeof import('./brookwood').createBrookwood> | undefined;
  let preparedBrookwood: typeof brookwood;
  let railModule: Promise<typeof import('./brookwood') | undefined> | undefined;
  async function brookwoodGrid(spec: GroundManifest, bytes: ArrayBuffer) {
    // Prepare the station before either row is cut. Both rows retain the original
    // surface and generic structures if the chunk or the model is unavailable.
    railModule ??= import('./brookwood').then(async mod => {
      if (eastController.signal.aborted) return;
      const build = mod.createBrookwoodSteps(spec.vertical.sceneZeroNavd88M, !low, northFreightMain), budget = sliceBudget();
      const built = budget ? await runBudgeted(build, { budgetMs: budget, stats: sliceStats }) : runSync(build);
      if (eastController.signal.aborted) { built.dispose(); return; }
      preparedBrookwood = built;
      return mod;
    }).catch(error => {
      console.warn('Brookwood station unavailable', error);
      return undefined;
    });
    const mod = await railModule;
    // Grading the ground under the rail is its own frame's work.
    await nextFrame();
    return mod ? mod.brookwoodGrid(spec, bytes) : new GroundGrid(spec, bytes);
  }
  const replaced: {parent: THREE.Object3D; object: THREE.Object3D}[] = [];
  const requestedSquare = midtown || board === 'square';
  const square = grid && requestedSquare ? await import('./square-mosaic').catch(error => {
    console.warn('City square unavailable', error);
    return undefined;
  }) : undefined;
  options.signal?.throwIfAborted();
  if (requestedSquare && !square) options.areaNote?.('Showing the available downtown board.');
  const seamNormals = rowJoinNormals();
  /** Where a page builds in steps, wait a frame between two pieces of main-thread work. */
  const nextFrame = () => sliceBudget() ? new Promise<unknown>(resolve => requestAnimationFrame(resolve)) : Promise.resolve();
  // The North Line is built with its row, aside, and joins the row's group when City mounts it.
  const northLines = new WeakMap<object, { holder: THREE.Group; line: ReturnType<typeof createNorthLine> }>();
  function prepareRow(id: string, area: Parameters<typeof prepareNorthLine>[0]): Build<void> | undefined {
    if (id !== 'brookwood-station') return;
    return (function* () {
      northLines.set(area, yield* prepareNorthLine(area, rf, manifest.origin, trains.group, line => { if (northLine === line) northLine = undefined; }));
    })();
  }
  const mosaic = square && new square.SquareMosaic(DATA, midtown, midtown ? brookwoodGrid : undefined, prepareRow);
  // Every area not loaded yet draws as the white study model (city/placeholder.ts). Its file loads
  // beside the board's build; it joins the scene before the first frame.
  const placeholderLoad = mosaic ? import('./placeholder').then(async m => {
    const data = await m.loadPlaceholder(DATA, options.signal);
    return data && { m, data };
  }).catch(error => { console.warn('City placeholder unavailable', error); return null; }) : Promise.resolve(null);
  let placeholder: Placeholder | null = null;
  let cityDisposed = false;
  const markRects = new Float32Array(16 * 4);
  // With the south band, which draws the Capitol tunnel, downtown's edge of its north-east
  // portals is cut into the bank too. Downtown alone (board=downtown, or no square board) keeps
  // its ground and no tunnel cut.
  if (mosaic && grid && groundBytes) grid = new GroundGrid(grid.manifest, capitolTunnelGround(grid.manifest, groundBytes));
  const previewEast = !!mosaic || (!!grid && joinedEast);
  const previewNorth = !!mosaic || (previewEast && query.get('north') === 'sweet-auburn');
  const cut = prepareEastCut(rf, manifest, grid, vd.terrainTransport?.rail);
  const b = vd.bounds;

  // ---- the board ----------------------------------------------------------------------
  const t0 = performance.now();
  const stages: Record<string, number> = {};
  const build = async (name: string, fn: () => void) => {
    options.progress?.(`Building ${name}…`);
    // Let the loading plate paint and a Map click cancel between construction stages.
    await new Promise((resolve) => setTimeout(resolve, 0));
    options.signal?.throwIfAborted();
    const start = performance.now();
    fn();
    stages[name] = Math.round(performance.now() - start);
    perf.phase(`stage:${name}`);
  };
  // The night light map is 2 m texels on low (7 MB instead of 28 MB for downtown's 2 km board).
  const worldOptions = { cityFacades: true, terrain: 'flat' as const, clumps: low ? 4 : 8, lightMapMax: low ? 1024 : 2048 };
  let terrain: ReturnType<typeof createDowntownTerrain> | undefined;
  let east: (ReturnType<typeof createDowntownTerrain> & { connectorBoard: ConnectorBoard }) | undefined;
  let downtownBatches: ReturnType<typeof batchLandmarks> | undefined;
  let eastRail: { dispose(): void; setNight(dark: number): void } | undefined;
  let eastRailFailed = false;
  const areaFailures = new Map<string, string>();
  // Brookwood's station model is prepared once at boot; the notice offers no retry for it.
  const retryable = (key: string) => key !== 'brookwood-rail';
  function areaResult(key: string, note: string | null) {
    if (mosaic) {
      if (note) areaFailures.set(key, note);
      else areaFailures.delete(key);
    } else {
      areaFailures.clear();
      if (note) areaFailures.set(key, note);
    }
    const text = [...areaFailures.values()].join(' · ') || null;
    options.areaNote?.(text, [...areaFailures.keys()].some(retryable) ? retryAreas : undefined);
  }
  /** The notice's Retry: loads each failed area again from where the last request stood, asking
   * for no area that never failed. Retry itself never moves the camera; a camera link's pending
   * destination in that area still resumes once it loads. A failure that recurs puts its note
   * back. A failure the camera has since moved away from clears its own note (the mosaic's
   * onForget, approachEast, approachNorth), so the notice never offers a retry that loads nothing. */
  function retryAreas() {
    const failed = [...areaFailures.keys()].filter(retryable);
    for (const key of failed) areaFailures.delete(key);
    options.areaNote?.([...areaFailures.values()].join(' · ') || null);
    const retryEast = eastFailed, retryNorth = northFailed;
    eastFailed = northFailed = false;
    mosaic?.retryFailed();
    if (east && eastRailFailed) loadKingRail(east);
    // The full board loads King Memorial and Sweet Auburn from the board's middle (as Show full
    // board does); a single-area preview retries where the camera is, since that is near it.
    const at = mosaic ? { x: 1400, z: 0 } : controls.target;
    if (retryEast) approachEast(at.x, at.z);
    if (retryNorth) approachNorth(at.x, at.z);
  }
  if (mosaic) mosaic.onForget = d => areaResult(d, null);
  // Where trains are drawn and followed, and the rail cover they follow: downtown until the east area joins.
  let trainBounds = b;
  let trainRail = manifest.rail;
  let north: typeof east;
  let eastPlinth: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshLambertMaterial> | undefined;
  let downtownPlinth: THREE.Mesh | undefined;
  const eastController = new AbortController();
  let transport: ReturnType<typeof createSurfaceTransport> | undefined;
  let streetcarDowntown: ReturnType<typeof buildStreetcarTrack> | undefined;
  // Street surface under the streetcar, per board, for its track and its cars.
  const streetcarSurface: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; height: (x: number, z: number) => number | null }[] = [];
  let stopsDowntown: ReturnType<typeof buildStreetcarStops> | undefined;
  let northStops: ReturnType<typeof buildStreetcarStops> | undefined;
  const streetcarStopList = () => streetcarStops(rf, manifest.origin, (path, stop) => (options.stopDistances?.(path, stop) ?? []).length > 0);
  // Elevated roads get their own structural geometry. Place lamps on ground roads.
  const groundRoads = grid ? [...vd.roads.filter(r => !r.bridge && !r.tunnel),
    ...vd.terrainTransport!.roads.filter(r => r.kind === 'ground').map(r =>
      ({ ...r, name: null, bridge: false, tunnel: false }))] : vd.roads;
  class DowntownWorld extends World {
    override ground(x: number, z: number) {
      if (!grid) return super.ground(x, z);
      const h = grid.sample(x, z);
      return h === null ? 0 : h - grid.manifest.vertical.sceneZeroNavd88M;
    }
  }
  const world = new DowntownWorld({ ...vd, roads: groundRoads }, null, worldOptions);
  const disposeBoard = () => {
    eastController.abort();
    preparedBrookwood?.dispose();
    streetcarDowntown?.dispose();
    stopsDowntown?.dispose();
    for (const {parent, object} of replaced) parent.add(object);
    seamNormals.reset();
    mosaic?.dispose();
    eastRail?.dispose();
    north?.dispose();
    east?.dispose();
    terrain?.dispose();
    transport?.dispose();
    world.dispose();
    world.group.removeFromParent();
  };
  let travellers: Traveller[] = [];
  let marta: Alignment[] = [];
  const stationSite = georgiaStateScene(manifest.origin);
  let station: StationTrack | undefined;
  let floyd: ReturnType<typeof createFloyd> = null;
  let georgiaPower: ReturnType<typeof createGeorgiaPower> = null;
  let peachtreeTowers: ReturnType<typeof createPeachtreeTowers> = null;
  let georgiaPacific: ReturnType<typeof createGeorgiaPacific> = null;
  let footballHall: ReturnType<typeof createFootballHall> = null;
  let museumTower: ReturnType<typeof createMuseumTower> = null;
  let courtlandGrand: ReturnType<typeof createCourtlandGrand> = null;
  let oneParkTower: ReturnType<typeof createOneParkTower> = null;
  let parkPlaceTower: ReturnType<typeof createParkPlaceTower> = null;
  let tDeck: ReturnType<typeof createTDeck> = null;
  let hardRock: ReturnType<typeof createHardRock> = null;
  let theLandmark: ReturnType<typeof createTheLandmark> = null;
  let landmarkDeck: ReturnType<typeof createLandmarkDeck> = null;
  let fiftyFiveParkPlace: ReturnType<typeof createFiftyFiveParkPlace> = null;
  let fultonBank: ReturnType<typeof createFultonBank> = null;
  let davisons: ReturnType<typeof createDavisons> = null;
  let ritzCarlton: ReturnType<typeof createRitzCarlton> = null;
  let southernBell: ReturnType<typeof createSouthernBell> = null;
  let rhodesHaverty: ReturnType<typeof createRhodesHaverty> = null;
  let empireBuilding: ReturnType<typeof createEmpireBuilding> = null;
  let commerceBuilding: ReturnType<typeof createCommerceBuilding> = null;
  let hundredEdgewood: ReturnType<typeof createHundredEdgewood> = null;
  let metropolitan: ReturnType<typeof createMetropolitan> = null;
  let mariettaBackdrop: ReturnType<typeof createMariettaBackdrop> = null;
  let one12Courtland: ReturnType<typeof createOne12Courtland> = null;
  let citizensTrust: ReturnType<typeof createCitizensTrust> = null;
  let fultonGovernmentCenter: ReturnType<typeof createFultonGovernmentCenter> = null;
  let internationalGarage: ReturnType<typeof createInternationalGarage> = null;
  let georgiaAquarium: ReturnType<typeof createGeorgiaAquarium> = null;
  let worldOfCocaCola: ReturnType<typeof createWorldOfCocaCola> = null;
  let williams250: ReturnType<typeof createWilliams250> = null;
  let fultonCourthouse: ReturnType<typeof createFultonCourthouse> = null;
  let peachtreeOffices: ReturnType<typeof createPeachtreeOffices> = null;
  let williamOliver: ReturnType<typeof createWilliamOliver> = null;
  let omniAtlanta: ReturnType<typeof createOmniAtlanta> = null;
  let fivePointsPlaza: ReturnType<typeof createFivePointsPlaza> = null;
  let twoPeachtree: ReturnType<typeof createTwoPeachtree> = null;
  let healey: ReturnType<typeof createHealey> = null;
  let flatiron: ReturnType<typeof createFlatiron> = null;
  let library: ReturnType<typeof createCentralLibrary> = null;
  let peachtreeCenter: ReturnType<typeof createPeachtreeCenter> = null;
  let hub: ReturnType<typeof createHubPeachtreeCenter> = null;
  let peachtree: ReturnType<typeof createPeachtree191> = null;
  let hyatt: ReturnType<typeof createHyattRegency> = null;
  let altitude: ReturnType<typeof createAltitudeApartments> = null;
  let hilton: ReturnType<typeof createHiltonAtlanta> = null;
  let marquis: ReturnType<typeof createMarriottMarquis> = null;
  let marquisOne: ReturnType<typeof createMarquisOne> = null;
  let medicalArts: ReturnType<typeof createMedicalArts> = null;
  let jwMarriott: ReturnType<typeof createJwMarriott> = null;
  let marquisTwo: ReturnType<typeof createMarquisTwo> = null;
  let capitalCityClub: ReturnType<typeof createCapitalCityClub> = null;
  let twelve: ReturnType<typeof createTwelveCentennial> = null;
  let truist: ReturnType<typeof createTruistPlaza> = null;
  let westin: ReturnType<typeof createWestin> = null;
  let arena: ReturnType<typeof createStateFarmArena> = null;
  let atlantaCityHall: ReturnType<typeof createAtlantaCityHall> = null;
  let americasMart: ReturnType<typeof createAmericasMart> = null;
  let hurtBuilding: ReturnType<typeof createHurtBuilding> = null;
  let theCenter: ReturnType<typeof createTheCenter> = null;
  let samNunn: ReturnType<typeof createSamNunn> = null;
  let aymDeck: ReturnType<typeof createAymDeck> = null;
  let theMitchell: ReturnType<typeof createTheMitchell> = null;
  let renaissanceLofts: ReturnType<typeof createRenaissanceLofts> = null;
  let barclayHotel: ReturnType<typeof createBarclayHotel> = null;
  let allenPlaza55: ReturnType<typeof createAllenPlaza55> = null;
  let candler: ReturnType<typeof createCandler> = null;
  let equitable: ReturnType<typeof createEquitable> = null;
  let olympia: ReturnType<typeof createOlympia> = null;
  let grady: ReturnType<typeof createGrady> = null;
  let russell: ReturnType<typeof createRussellBuilding> = null;
  let centennial: ReturnType<typeof createCentennialTower> = null;
  let skyView: ReturnType<typeof createSkyView> = null;
  let capitol: ReturnType<typeof createCapitol> = null;
  let platforms: ReturnType<typeof createGeorgiaState> | undefined;
  /** The downtown data as City draws its ground and streets. */
  let drawn = vd;
  try {
    await build('alignments', () => {
      ({ tracks: marta, station } = martaAlignments(rf, manifest, b, stationSite, grid));
      const ground = grid;
      if (station && ground) {
        floyd = createFloyd(vd.buildings, station.passage, (x, z) => {
          const y = ground.sample(x, z);
          return y == null ? null : y - ground.manifest.vertical.sceneZeroNavd88M;
        });
        if (floyd) station.alignment.visibleInStation = station.visibleInStation;
      }
      if (cut) marta = marta.map(maskCut);
    });
    if (grid) {
      const ground = grid;
      await build('terrain', () => {
        const buildings = floyd?.buildings ?? vd.buildings;
        const groundAt = (x: number, z: number) => {
          const h = ground.sample(x, z);
          return h === null ? null : h - ground.manifest.vertical.sceneZeroNavd88M;
        };
        westin = createWestin(buildings, groundAt);
        peachtree = createPeachtree191(westin?.buildings ?? buildings, groundAt);
        const remaining = peachtree?.buildings ?? westin?.buildings ?? buildings;
        peachtreeCenter = createPeachtreeCenter(remaining, ground);
        const afterPeachtreeCenter = peachtreeCenter?.buildings ?? remaining;
        hub = createHubPeachtreeCenter(afterPeachtreeCenter, ground);
        const afterCenter = hub?.buildings ?? afterPeachtreeCenter;
        marquis = createMarriottMarquis(afterCenter, ground);
        const afterMarriott = marquis?.buildings ?? afterCenter;
        marquisOne = createMarquisOne(afterMarriott, ground);
        const afterOne = marquisOne?.buildings ?? afterMarriott;
        marquisTwo = createMarquisTwo(afterOne, ground);
        const afterTwo = marquisTwo?.buildings ?? afterOne;
        capitalCityClub = createCapitalCityClub(afterTwo, ground);
        const afterClub = capitalCityClub?.buildings ?? afterTwo;
        medicalArts = createMedicalArts(afterClub, ground);
        const afterMedicalArts = medicalArts?.buildings ?? afterClub;
        jwMarriott = createJwMarriott(afterMedicalArts, ground);
        const hotelSite = jwMarriott?.buildings ?? afterMedicalArts;
        hilton = createHiltonAtlanta(hotelSite, ground);
        const afterHilton = hilton?.buildings ?? hotelSite;
        altitude = createAltitudeApartments(afterHilton, ground);
        const afterAltitude = altitude?.buildings ?? afterHilton;
        hyatt = createHyattRegency(afterAltitude, ground);
        const afterHyatt = hyatt?.buildings ?? afterAltitude;
        twelve = createTwelveCentennial(afterHyatt, ground);
        const afterTwelve = twelve?.buildings ?? afterHyatt;
        truist = createTruistPlaza(afterTwelve, groundAt);
        const librarySite = truist?.buildings ?? afterTwelve;
        library = createCentralLibrary(librarySite, groundAt);
        flatiron = createFlatiron(library?.buildings ?? librarySite, groundAt);
        const towerSite = flatiron?.buildings ?? library?.buildings ?? librarySite;
        healey = createHealey(towerSite, groundAt);
        const afterHealey = healey?.buildings ?? towerSite;
        hardRock = createHardRock(afterHealey, ground);
        const afterHardRock = hardRock?.buildings ?? afterHealey;
        theLandmark = createTheLandmark(afterHardRock, ground);
        landmarkDeck = createLandmarkDeck(theLandmark?.buildings ?? afterHardRock, ground, afterHardRock);
        const afterLandmark = landmarkDeck?.buildings ?? theLandmark?.buildings ?? afterHardRock;
        tDeck = createTDeck(afterLandmark, ground);
        const afterTDeck = tDeck?.buildings ?? afterLandmark;
        parkPlaceTower = createParkPlaceTower(afterTDeck, ground);
        const afterParkPlaceTower = parkPlaceTower?.buildings ?? afterTDeck;
        fiftyFiveParkPlace = createFiftyFiveParkPlace(afterParkPlaceTower, ground);
        const afterFiftyFiveParkPlace = fiftyFiveParkPlace?.buildings ?? afterParkPlaceTower;
        fultonBank = createFultonBank(afterFiftyFiveParkPlace, ground);
        const afterFultonBank = fultonBank?.buildings ?? afterFiftyFiveParkPlace;
        davisons = createDavisons(afterFultonBank, ground);
        ritzCarlton = createRitzCarlton(davisons?.buildings ?? afterFultonBank, ground);
        const afterRitzCarlton = ritzCarlton?.buildings ?? davisons?.buildings ?? afterFultonBank;
        southernBell = createSouthernBell(afterRitzCarlton, ground);
        const afterSouthernBell = southernBell?.buildings ?? afterRitzCarlton;
        rhodesHaverty = createRhodesHaverty(afterSouthernBell, ground);
        const afterRhodesHaverty = rhodesHaverty?.buildings ?? afterSouthernBell;
        empireBuilding = createEmpireBuilding(afterRhodesHaverty, ground);
        commerceBuilding = createCommerceBuilding(empireBuilding?.buildings ?? afterRhodesHaverty, ground);
        const afterCommerceBuilding = commerceBuilding?.buildings ?? empireBuilding?.buildings ?? afterRhodesHaverty;
        hundredEdgewood = createHundredEdgewood(afterCommerceBuilding, ground);
        const afterHundredEdgewood = hundredEdgewood?.buildings ?? afterCommerceBuilding;
        metropolitan = createMetropolitan(afterHundredEdgewood, ground);
        const afterMetropolitan = metropolitan?.buildings ?? afterHundredEdgewood;
        mariettaBackdrop = createMariettaBackdrop(afterMetropolitan, ground);
        const afterMariettaBackdrop = mariettaBackdrop?.buildings ?? afterMetropolitan;
        one12Courtland = createOne12Courtland(afterMariettaBackdrop, ground);
        const afterOne12Courtland = one12Courtland?.buildings ?? afterMariettaBackdrop;
        citizensTrust = createCitizensTrust(afterOne12Courtland, ground);
        const afterCitizensTrust = citizensTrust?.buildings ?? afterOne12Courtland;
        fultonGovernmentCenter = createFultonGovernmentCenter(afterCitizensTrust, ground);
        internationalGarage = createInternationalGarage(fultonGovernmentCenter?.buildings ?? afterCitizensTrust, ground);
        const afterFultonGovernmentCenter = internationalGarage?.buildings ?? fultonGovernmentCenter?.buildings ?? afterCitizensTrust;
        georgiaAquarium = createGeorgiaAquarium(afterFultonGovernmentCenter, ground);
        const afterGeorgiaAquarium = georgiaAquarium?.buildings ?? afterFultonGovernmentCenter;
        worldOfCocaCola = createWorldOfCocaCola(afterGeorgiaAquarium, ground);
        const afterWorldOfCocaCola = worldOfCocaCola?.buildings ?? afterGeorgiaAquarium;
        williams250 = createWilliams250(afterWorldOfCocaCola, ground);
        const afterWilliams250 = williams250?.buildings ?? afterWorldOfCocaCola;
        fultonCourthouse = createFultonCourthouse(afterWilliams250, ground);
        const afterFultonCourthouse = fultonCourthouse?.buildings ?? afterWilliams250;
        peachtreeOffices = createPeachtreeOffices(afterFultonCourthouse, ground);
        const afterPeachtreeOffices = peachtreeOffices?.buildings ?? afterFultonCourthouse;
        williamOliver = createWilliamOliver(afterPeachtreeOffices, ground);
        const afterWilliamOliver = williamOliver?.buildings ?? afterPeachtreeOffices;
        omniAtlanta = createOmniAtlanta(afterWilliamOliver, ground);
        const afterOmniAtlanta = omniAtlanta?.buildings ?? afterWilliamOliver;
        fivePointsPlaza = createFivePointsPlaza(afterOmniAtlanta, ground);
        const afterFivePointsPlaza = fivePointsPlaza?.buildings ?? afterOmniAtlanta;
        twoPeachtree = createTwoPeachtree(afterFivePointsPlaza, ground);
        const afterTwoPeachtree = twoPeachtree?.buildings ?? afterFivePointsPlaza;
        footballHall = createFootballHall(afterTwoPeachtree, ground);
        const afterFootballHall = footballHall?.buildings ?? afterTwoPeachtree;
        museumTower = createMuseumTower(afterFootballHall, ground);
        const afterMuseumTowerOnly = museumTower?.buildings ?? afterFootballHall;
        courtlandGrand = createCourtlandGrand(afterMuseumTowerOnly, ground);
        const afterMuseumTower = courtlandGrand?.buildings ?? afterMuseumTowerOnly;
        oneParkTower = createOneParkTower(afterMuseumTower, ground);
        const afterOnePark = oneParkTower?.buildings ?? afterMuseumTower;
        georgiaPower = createGeorgiaPower(afterOnePark, ground);
        const afterPower = georgiaPower?.buildings ?? afterOnePark;
        peachtreeTowers = createPeachtreeTowers(afterPower, ground);
        const afterPeachtreeTowers = peachtreeTowers?.buildings ?? afterPower;
        georgiaPacific = createGeorgiaPacific(afterPeachtreeTowers, groundAt);
        const stackSite = georgiaPacific?.buildings ?? afterPeachtreeTowers;
        const stack = createCoreyTower(stackSite, ground);
        const stadiumSite = stack?.buildings ?? stackSite;
        const stadium = createStadium(stadiumSite, ground);
        const afterStadium = stadium?.buildings ?? stadiumSite;
        russell = createRussellBuilding(afterStadium, ground);
        const afterRussell = russell?.buildings ?? afterStadium;
        centennial = createCentennialTower(afterRussell, ground);
        const afterCentennialTower = centennial?.buildings ?? afterRussell;
        skyView = createSkyView(afterCentennialTower, ground);
        const afterCentennial = skyView?.buildings ?? afterCentennialTower;
        capitol = createCapitol(afterCentennial, (x, z) => {
          const h = ground.sample(x, z);
          return h === null ? null : h - ground.manifest.vertical.sceneZeroNavd88M;
        });
        const exhibitionSite = capitol?.buildings ?? afterCentennial;
        const congressCenter = createCongressCenter(exhibitionSite, ground);
        const arenaSite = congressCenter?.buildings ?? exhibitionSite;
        arena = createStateFarmArena(arenaSite, groundAt);
        const hospitalSite = arena?.buildings ?? arenaSite;
        grady = createGrady(hospitalSite, ground);
        const afterGrady = grady?.buildings ?? hospitalSite;
        candler = createCandler(afterGrady, ground);
        const afterCandler = candler?.buildings ?? afterGrady;
        equitable = createEquitable(afterCandler, ground);
        const samNunnSite = equitable?.buildings ?? afterCandler;
        atlantaCityHall = createAtlantaCityHall(samNunnSite, ground);
        const afterAtlantaCityHall = atlantaCityHall?.buildings ?? samNunnSite;
        americasMart = createAmericasMart(afterAtlantaCityHall, ground);
        const afterAmericasMart = americasMart?.buildings ?? afterAtlantaCityHall;
        hurtBuilding = createHurtBuilding(afterAmericasMart, ground);
        const afterHurtBuilding = hurtBuilding?.buildings ?? afterAmericasMart;
        theCenter = createTheCenter(afterHurtBuilding, ground);
        const afterTheCenter = theCenter?.buildings ?? afterHurtBuilding;
        samNunn = createSamNunn(afterTheCenter, ground);
        const afterSamNunn = samNunn?.buildings ?? afterTheCenter;
        aymDeck = createAymDeck(afterSamNunn, ground);
        const afterAymDeck = aymDeck?.buildings ?? afterSamNunn;
        theMitchell = createTheMitchell(afterAymDeck, ground, low ? 'low' : 'high');
        const afterTheMitchell = theMitchell?.buildings ?? afterAymDeck;
        olympia = createOlympia(afterTheMitchell, ground);
        const afterOlympia = olympia?.buildings ?? afterTheMitchell;
        renaissanceLofts = createRenaissanceLofts(afterOlympia, ground, low ? 'low' : 'high');
        const afterRenaissanceLofts = renaissanceLofts?.buildings ?? afterOlympia;
        barclayHotel = createBarclayHotel(afterRenaissanceLofts, ground, low ? 'low' : 'high');
        const afterBarclayHotel = barclayHotel?.buildings ?? afterRenaissanceLofts;
        allenPlaza55 = createAllenPlaza55(afterBarclayHotel, ground, low ? 'low' : 'high');
        // The Landmark deck draws its own lot, aisles included.
        drawn = landmarkDeck ? { ...vd, roads: vd.roads.filter(r => !landmarkDeck!.ownDrive(r)) } : vd;
        const city = { ...drawn, buildings: allenPlaza55?.buildings ?? afterBarclayHotel,
          ground: congressCenter ? [...(vd.ground ?? []), congressCenter.apron] : vd.ground };
        terrain = createDowntownTerrain(ground, city, trees.trees, { quality, yields: landmarkDeck?.yields, bottomY: midtown && square ? square.midtownBaseNavd88M - ground.manifest.vertical.sceneZeroNavd88M : undefined, separateBuilding: square?.summitDowntown, join: mosaic ? mosaic.joins('downtown') : previewNorth ? [eastJoin, northWestJoin] : previewEast ? eastJoin : undefined, openings: [...terrainOpenings(marta), ...(cut ? cutOpenings(ground) : []), ...(mosaic ? capitolTunnelSlots() : [])], deferFarBoxes: true });
        mosaic?.areas.set('downtown', terrain);
        downtownPlinth = world.buildPlinth(terrain.bottomY);
        const landmarksFrom = world.group.children.length;
        if (floyd) world.group.add(floyd.group);
        if (hyatt) world.group.add(hyatt.group);
        if (marquis) world.group.add(marquis.group);
        if (marquisOne) world.group.add(marquisOne.group);
        if (marquisTwo) world.group.add(marquisTwo.group);
        if (capitalCityClub) world.group.add(capitalCityClub.group);
        if (medicalArts) world.group.add(medicalArts.group);
        if (jwMarriott) world.group.add(jwMarriott.group);
        if (hilton) world.group.add(hilton.group);
        if (altitude) world.group.add(altitude.group);
        if (twelve) world.group.add(twelve.group);
        if (truist) world.group.add(truist.group);
        if (westin) world.group.add(westin.group);
        if (peachtreeCenter) world.group.add(peachtreeCenter.group);
        if (hub) world.group.add(hub.group);
        if (peachtree) world.group.add(peachtree.group);
        if (library) world.group.add(library.group);
        if (flatiron) world.group.add(flatiron.group);
        if (healey) world.group.add(healey.group);
        if (footballHall) world.group.add(footballHall.group);
        if (museumTower) world.group.add(museumTower.group);
        if (courtlandGrand) world.group.add(courtlandGrand.group);
        if (oneParkTower) world.group.add(oneParkTower.group);
        if (parkPlaceTower) world.group.add(parkPlaceTower.group);
        if (tDeck) world.group.add(tDeck.group);
        if (hardRock) world.group.add(hardRock.group);
        if (theLandmark) world.group.add(theLandmark.group);
        if (landmarkDeck) world.group.add(landmarkDeck.group);
        if (fiftyFiveParkPlace) world.group.add(fiftyFiveParkPlace.group);
        if (fultonBank) world.group.add(fultonBank.group);
        if (davisons) world.group.add(davisons.group);
        if (ritzCarlton) world.group.add(ritzCarlton.group);
        if (southernBell) world.group.add(southernBell.group);
        if (rhodesHaverty) world.group.add(rhodesHaverty.group);
        if (empireBuilding) world.group.add(empireBuilding.group);
        if (commerceBuilding) world.group.add(commerceBuilding.group);
        if (hundredEdgewood) world.group.add(hundredEdgewood.group);
        if (metropolitan) world.group.add(metropolitan.group);
        if (mariettaBackdrop) world.group.add(mariettaBackdrop.group);
        if (one12Courtland) world.group.add(one12Courtland.group);
        if (citizensTrust) world.group.add(citizensTrust.group);
        if (fultonGovernmentCenter) world.group.add(fultonGovernmentCenter.group);
        if (internationalGarage) world.group.add(internationalGarage.group);
        if (georgiaAquarium) world.group.add(georgiaAquarium.group);
        if (worldOfCocaCola) world.group.add(worldOfCocaCola.group);
        if (williams250) world.group.add(williams250.group);
        if (fultonCourthouse) world.group.add(fultonCourthouse.group);
        if (peachtreeOffices) world.group.add(peachtreeOffices.group);
        if (williamOliver) world.group.add(williamOliver.group);
        if (omniAtlanta) world.group.add(omniAtlanta.group);
        if (fivePointsPlaza) world.group.add(fivePointsPlaza.group);
        if (twoPeachtree) world.group.add(twoPeachtree.group);
        if (georgiaPower) world.group.add(georgiaPower.group);
        if (peachtreeTowers) world.group.add(peachtreeTowers.group);
        if (georgiaPacific) world.group.add(georgiaPacific.group);
        if (stack) world.group.add(stack.group);
        if (stadium) world.group.add(stadium.group);
        if (russell) world.group.add(russell.group);
        if (centennial) world.group.add(centennial.group);
        if (skyView) world.group.add(skyView.group);
        if (capitol) world.group.add(capitol.group);
        if (congressCenter) world.group.add(congressCenter.group);
        if (arena) world.group.add(arena.group);
        if (atlantaCityHall) world.group.add(atlantaCityHall.group);
        if (americasMart) world.group.add(americasMart.group);
        if (hurtBuilding) world.group.add(hurtBuilding.group);
        if (theCenter) world.group.add(theCenter.group);
        if (samNunn) world.group.add(samNunn.group);
        if (aymDeck) world.group.add(aymDeck.group);
        if (theMitchell) world.group.add(theMitchell.group);
        if (renaissanceLofts) world.group.add(renaissanceLofts.group);
        if (barclayHotel) world.group.add(barclayHotel.group);
        if (allenPlaza55) world.group.add(allenPlaza55.group);
        if (candler) world.group.add(candler.group);
        if (equitable) world.group.add(equitable.group);
        if (olympia) world.group.add(olympia.group);
        if (grady) world.group.add(grady.group);
        const landmarks = world.group.children.slice(landmarksFrom);
        for (const c of landmarks) c.userData.perf = 'buildings';
        // Far-board buildings (low): downtown's landmarks join the downtown area's box mesh, from
        // boxes taken before batching empties their groups.
        const boxed = landmarks.filter(g => boxedFromAfar(g.name));
        const farBoxesDowntown = low ? boxed.flatMap(g => boxesFromObject(g, terrain!.scenery)) : [];
        const farRoots: THREE.Object3D[] = [...boxed];
        if (landmarkBatchOff) { const bodies = batchLandmarkBodies(landmarks); world.group.add(bodies); if (FAR_LANDMARKS) farRoots.push(bodies); }
        else {
          // Each landmark with its night switch, which the batcher probes. A new landmark goes here
          // too, next to its setNight call; one missing from this list is drawn unbatched.
          const listed = ([
            floyd, hyatt, marquis, marquisOne, marquisTwo, capitalCityClub, medicalArts, jwMarriott, hilton, altitude, twelve, truist, westin, peachtreeCenter, hub,
            peachtree, library, flatiron, healey, footballHall, museumTower, courtlandGrand, oneParkTower, parkPlaceTower, tDeck, hardRock, theLandmark, landmarkDeck,
            fiftyFiveParkPlace,
            fultonBank, davisons, ritzCarlton, southernBell, rhodesHaverty, empireBuilding, commerceBuilding,
            hundredEdgewood, metropolitan, mariettaBackdrop, one12Courtland, citizensTrust, fultonGovernmentCenter, internationalGarage,
            georgiaAquarium, worldOfCocaCola, williams250, fultonCourthouse, peachtreeOffices, williamOliver,
            omniAtlanta, fivePointsPlaza, twoPeachtree, georgiaPower, peachtreeTowers, georgiaPacific, stack, stadium, russell,
            centennial, skyView, capitol, congressCenter, arena, atlantaCityHall, americasMart, hurtBuilding, theCenter,
            samNunn, candler, equitable, grady, allenPlaza55, barclayHotel, renaissanceLofts, aymDeck, theMitchell, olympia,
          ] as (LandmarkEntry | null | undefined)[]).filter((l): l is LandmarkEntry => !!l);
          const batches = downtownBatches = batchLandmarks(listed, world.group, { name: 'Downtown landmark batches', lod: low ? LANDMARK_LOD.low : LANDMARK_LOD.high });
          world.group.add(batches.group);
          if (FAR_LANDMARKS) farRoots.push(batches.group);
          if (import.meta.env.DEV) {
            const unlisted = landmarks.filter(g => !listed.some(l => l.group === g)).map(g => g.name || '(unnamed)');
            if (unlisted.length) console.warn('Landmarks missing from the batch list, drawn unbatched:', unlisted.join(', '));
            console.info('City landmark batches (downtown)', JSON.stringify(batches.stats));
            void batches.farReady.then(() => console.info('City landmark far versions (downtown)', JSON.stringify({ ms: batches.stats.lodMs, maxStepMs: batches.stats.lodMaxStepMs, dropped: batches.stats.lodDropped })));
          }
        }
        terrain!.addFar(farBoxesDowntown, farRoots);
      });
      await build('sidewalks and trails', () => { travellers = cityTravellers(vd, terrain!.groundAt, low); });
      await build('streets and freight', () => { transport = createSurfaceTransport(withoutTram(americasMart?.surfaceData(drawn) ?? drawn), ground, terrain!.groundAt, cut); terrain!.carve(transport.cutting); });
    } else {
      if (trees.trees.length) world.realTrees = trees.trees;
      await build('board', () => { world.setOpenCuts(marta); world.buildBoard(); });
      await build('streets', () => world.buildStreets());
      await build('ground', () => world.buildGround());
      await build('freight', () => world.buildFreight());
      await build('buildings', () => world.buildBuildings(undefined, 8, undefined, quality));
      await build('trees', () => world.buildTrees());
    }
    // The Atlanta Streetcar draws its own embedded track and wire from the GTFS shapes,
    // the geometry its vehicles run on. The OSM tram strips stopped at the downtown edge.
    await build('streetcar', () => {
      const flat = (x: number, z: number) => world.ground(x, z) + 0.2; // vignette road surface
      const ground = terrain ? terrain.groundAt : flat;
      const height = roadSurface(vd.roads, cityRoadHeight(vd, ground, transport?.deckAt), ground);
      const lines = streetcarLines(rf, manifest.origin);
      const sites = platformSites(streetcarStopList(), lines, vd.roads);
      const blocked = poleBlocked(vd.roads, vd.buildings), onPlatform = platformFootprints(sites);
      streetcarDowntown = buildStreetcarTrack(lines, b, height, (x, z) => blocked(x, z) || onPlatform(x, z));
      streetcarSurface.push({ bounds: b, height });
      world.group.add(streetcarDowntown.group);
      stopsDowntown = buildStreetcarStops(sites, b, height);
      world.group.add(stopsDowntown.group);
    });
    await build('MARTA', () => {
      const lower = transport;
      const pierAllowed = lower ? (x: number, z: number) =>
        lower.clearOfFreight(x, z) && !inConnectorLanes(x, z, 1.8) : undefined;
      for (const al of marta) world.buildMarta(al, pierAllowed);
      if (station && floyd) {
        platforms = createGeorgiaState(station, stationSite, floyd.eastFace);
        world.group.add(platforms.group);
      }
    });
    await build('lights', () => world.buildLights(terrain?.board, terrain?.groundAt, terrain ? inConnectorLanes : undefined));
  } catch (err) {
    disposeBoard();
    throw err;
  }
  const buildMs = Object.values(stages).reduce((sum, ms) => sum + ms, 0);
  options.progress?.('Drawing downtown…');

  // ---- renderer -------------------------------------------------------------------------
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
  } catch (err) {
    disposeBoard();
    throw err;
  }
  renderer.info.autoReset = false;
  renderer.localClippingEnabled = true;
  // The tier's (or ?perf&pr's) ratio for the display City is on now; see watchPixelRatio below.
  const wantedPixelRatio = () => perfOverrides.pixelRatio ?? (low ? 1 : Math.min(devicePixelRatio, 2));
  renderer.setPixelRatio(wantedPixelRatio());
  renderer.shadowMap.enabled = perfOverrides.shadow !== 'off';
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  perf.phase('city:renderer');

  const scene = new THREE.Scene();
  // `?perf&freeze=off` keeps three.js recomposing every static matrix each frame, for A/B runs.
  const freezeOn = !(perfEnabled && new URLSearchParams(location.search).get('freeze') === 'off');
  if (freezeOn) freezeSelf(scene);
  let staticFrozen = !freezeOn;
  // `?perf&empty=draw` keeps drawing meshes with no vertices (city/empty-draws.ts), for A/B runs.
  const keepEmpty = perfEnabled && new URLSearchParams(location.search).get('empty') === 'draw';
  let emptyHidden = false;
  const bg = new THREE.Color('#e7e2d8');
  scene.background = bg;
  scene.fog = new THREE.Fog('#e7e2d8', 5000, 12000);
  scene.add(world.group);
  // The tree rollout's species, one batch for every board row (trees/rollout-city.ts).
  scene.add(rolloutBatch.group);
  if (terrain && transport) scene.add(terrain.group, transport.group);
  if (cut && grid) scene.add(cutFloor(grid));
  // Trim content to the board, retaining the ground, cut edge and walnut lip.
  const edgePlanes = (box: typeof b) => [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -box.minX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.maxX),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -box.minZ),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box.maxZ),
  ];
  const edges = edgePlanes(b);
  const perimeter = mosaic && edgePlanes(mosaic.bounds);
  function clipScenery(group: THREE.Object3D, planes: THREE.Plane[]) {
    group.traverse(o => {
      const material = (o as THREE.Mesh).material;
      for (const mat of Array.isArray(material) ? material : material ? [material] : []) {
        mat.clippingPlanes = planes;
        mat.clipShadows = true;
      }
    });
  }
  const clipped = world.group.children.slice(terrain ? 1 : 3);
  if (terrain && transport) clipped.push(terrain.scenery, transport.group);
  for (const child of clipped) clipScenery(child, edges);
  const colors = new Map(rf.routes.filter(r => r.mode === 'heavy_rail').map(r => [r.id, r.color]));
  // Trains clip to their own copy of the board edges, so the east area can open them alone.
  const trainEdges = edges.map(p => p.clone());
  let northLine: ReturnType<typeof createNorthLine>;
  const trains = new CityTrains(marta, manifest, b, colors, trainEdges, cut);
  // Atlanta Streetcar: Siemens S70s on the published schedule, drawn where a board is mounted.
  const streetcar = createStreetcarCars(rf, manifest.origin, (x, z) => {
    for (const { bounds: r, height } of streetcarSurface)
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return height(x, z);
    return null;
  }, []);
  const scenery = scene.children.slice();
  // Added after the scenery snapshot, so a streetcar never occludes its own pick.
  scene.add(streetcar.group);
  scene.add(trains.group);
  const freight = transport?.freightTreads.length ? new CityFreight(transport.freightTreads, edges, low) : undefined;
  // Headlight pools on the road and track ahead of every lit vehicle at night, High only (Low is at its
  // program budget). One instanced draw for all producers; the hidden template compiles it at boot.
  // Capacity covers every producer's maximum: road traffic caps, 64 buses, trains, streetcars, freight.
  // Dev: ?pools=0 turns them off for matched before/after stills from one build.
  const lightPools = low || (import.meta.env.DEV && query.get('pools') === '0') ? null : new HeadlightPools(640);
  if (lightPools) scene.add(lightPools.mesh, lightPools.template);
  if (freight) scene.add(freight.group);
  // Live buses on the drawn streets: terrain-painted ground and exact bridge treads, or the
  // flat board's ribbons when there is no measured ground.
  const busStreets = busRuns(vd, !!(grid && vd.terrainTransport));
  const flatY = (x: number, z: number) => world.ground(x, z) + 0.2;
  const buses = new CityBuses({
    runs: busStreets,
    groundAt: terrain ? terrain.groundAt : flatY,
    deckAt: transport ? transport.deckAt : (x, z) => Math.max(0.2, flatY(x, z)),
    origin: manifest.origin,
    bounds: b,
  });
  (buses.mesh.material as THREE.Material).clippingPlanes = edges;
  scene.add(buses.mesh);
  const hourly = trafficData?.hourly;
  const trafficOptions = terrain && Array.isArray(hourly?.weekday) && Array.isArray(hourly?.weekend)
    ? { city: vd, quality, hourly, clippingPlanes: edges,
        // A model car never drives through a live bus or a drawn streetcar: it skips that frame.
        busOccupies: (x: number, y: number, z: number, lengthM: number, headingRad: number) =>
          buses.occupies(x, y, z, lengthM, headingRad) || streetcarCovers(streetcar, x, y, z, lengthM, headingRad),
        roadHeight: cityRoadHeight(vd, terrain.groundAt, transport?.deckAt) }
    : undefined;
  let traffic = trafficOptions && new ConnectorTraffic(trafficOptions);
  /** Set when an area mounts: ground and joins may change, so cached car heights refresh next frame. */
  let trafficHeightsStale = false;
  let trafficQueued = false;
  /** Rejoin Connector traffic across the mounted boards: in a page that builds in steps, on the
   * next frame, once for however many boards mounted, so no mount carries it. */
  function extendConnectorTraffic() {
    trafficHeightsStale = true;
    if (!trafficOptions || trafficQueued) return;
    if (!sliceBudget()) { joinConnectorTraffic(); return; }
    trafficQueued = true;
    requestAnimationFrame(() => {
      trafficQueued = false;
      if (!eastController.signal.aborted) joinConnectorTraffic();
    });
  }
  function joinConnectorTraffic() {
    if (!trafficOptions) return;
    const clippingPlanes = edges.map(p => p.clone());
    if (east) clippingPlanes[1].constant = east.bounds.maxX;
    const neighbors = [east, north, ...(mosaic?.patches.values() ?? [])].flatMap(a => a ? [a.connectorBoard] : []);
    if (mosaic) {
      for (const { bounds: r } of mosaic.areas.values()) {
        clippingPlanes[1].constant = Math.max(clippingPlanes[1].constant, r.maxX);
        clippingPlanes[2].constant = Math.max(clippingPlanes[2].constant, -r.minZ);
        clippingPlanes[3].constant = Math.max(clippingPlanes[3].constant, r.maxZ);
      }
    }
    const joined = new ConnectorTraffic({ ...trafficOptions, neighbors, clippingPlanes });
    traffic?.dispose();
    traffic = joined;
    scene.add(joined.group);
  }
  // Midtown's arterials join as their rows mount: HPMS volumes, illustrative positions.
  let midtownArterials: import('./midtown-arterial-traffic').MidtownArterialTraffic | undefined;
  let midtownBuild = 0;
  async function extendMidtownArterials(added: Iterable<string>) {
    const trafficRow = (id: string) => id === 'r16' || Object.hasOwn(midtownRowBounds, id);
    if (!trafficOptions || !mosaic || ![...added].some(trafficRow)) return;
    const build = ++midtownBuild;
    const { MidtownArterialTraffic } = await import('./midtown-arterial-traffic');
    if (build !== midtownBuild || eastController.signal.aborted) return;
    const boards = [...mosaic.patches].filter(([id]) => trafficRow(id))
      .map(([row, a]) => ({ row, ...a.connectorBoard }));
    const { city: _city, roadHeight: _height, ...shared } = trafficOptions;
    // Share the four-plane shader variants with downtown. The perimeter moves as rows mount.
    const next = new MidtownArterialTraffic({ ...shared, clippingPlanes: perimeter }, boards);
    midtownArterials?.dispose();
    midtownArterials = next;
    scene.add(next.group);
  }
  const corridors = trafficOptions && loadArterials(arterialData, vd).corridors;
  const movingBlocks = trafficOptions && options.scheduledStreetcarsAt
    ? streetcarTraffic(rf, manifest.origin, options.scheduledStreetcarsAt, (x,z) => {
      for (const { bounds:r, height } of streetcarSurface)
        if (x>=r.minX && x<=r.maxX && z>=r.minZ && z<=r.maxZ) return height(x,z);
      return null;
    }, trafficOptions.roadHeight) : undefined;
  const trafficView = new THREE.Frustum(), trafficViewMatrix = new THREE.Matrix4();
  const arterials = trafficOptions && corridors?.length
    ? new ArterialTraffic({ ...trafficOptions, arterials: corridors, movingBlocks })
    : undefined;
  if (traffic) scene.add(traffic.group);
  if (arterials) scene.add(arterials.group);
  const figures = terrain && travellers.length ? new StreetFigures(travellers, terrain.groundAt, low,
    midtown ? (x,z) => mosaic?.areas.get('midtown-upper')?.groundAt(x,z) ?? null : undefined) : undefined;
  if (figures) scene.add(figures.group);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  // The studio table under the diorama.
  const tableMat = new THREE.MeshLambertMaterial({ color: '#d8d2c6' });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), tableMat);
  table.rotation.x = -Math.PI / 2;
  table.position.set(cx, (terrain?.bottomY ?? -18) - 6.05, cz);
  table.name = 'Studio table';
  // The plinth ends the model. Keep distant city shadows off the studio backdrop.
  table.receiveShadow = false;
  scene.add(table);

  const hemi = new THREE.HemisphereLight('#e4ecf7', '#a48d72', 1.5);
  const sun = new THREE.DirectionalLight('#fff1da', 2.8);
  sun.castShadow = true;
  // The shadow box follows the camera's target, so shadows stay sharp wherever you look.
  const SH = low ? 520 : 700;
  const sc = sun.shadow.camera;
  sc.left = -SH;
  sc.right = SH;
  sc.top = SH;
  sc.bottom = -SH;
  sc.near = 100;
  sc.far = 4000;
  const shadowSize = typeof perfOverrides.shadow === 'number' ? perfOverrides.shadow : low ? 1024 : 4096;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0016;
  sun.shadow.normalBias = 1.2;
  scene.add(hemi, sun, sun.target);

  const rain = new Rain(low ? 4000 : 9000, 2400, 450);
  const snow = new Snow(low ? 2500 : 6000);
  scene.add(rain.mesh, snow.mesh);

  // ---- camera ---------------------------------------------------------------------------
  const drive = underpassDrive(query, vd);
  const camera = new THREE.PerspectiveCamera(drive ? 66 : 22, 1, drive ? 0.18 : 20, midtown ? 40000 : 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = DAMPING_PER_60HZ_FRAME;
  // `?camera=legacy` keeps the per-frame (frame-rate dependent) smoothing, for one release.
  const legacyCamera = new URLSearchParams(location.search).get('camera') === 'legacy';
  // `?camera=direct`: drags track the pointer 1:1 and inertia starts on release from
  // the pointer's last velocity, as map apps do; mouse-wheel zoom steps ease in (city/map-gestures.ts).
  const directCamera = !legacyCamera && new URLSearchParams(location.search).get('camera') === 'direct';
  const orbitInternals = controls as unknown as { state: number; _panOffset: THREE.Vector3; _sphericalDelta: THREE.Spherical };
  const directDrag = directCamera ? bindDirectDrag(controls, DAMPING_PER_60HZ_FRAME) : undefined;
  // OrbitControls calls update() from its own pointer and wheel handlers too, and each call took
  // a damping step: the smoothing then depended on how often input arrived. Outside the frame
  // loop an update still applies everything immediate (zoom, a set view) but advances no damping;
  // the frame loop advances it once per frame, by the time that elapsed.
  let cameraFrame = false;
  if (!legacyCamera) {
    const update = controls.update.bind(controls);
    controls.update = (deltaTime?: number | null) => {
      if (cameraFrame) return update(deltaTime);
      const factor = controls.dampingFactor;
      controls.dampingFactor = 0;
      try { return update(deltaTime); } finally { controls.dampingFactor = factor; }
    };
  }
  controls.minPolarAngle = THREE.MathUtils.degToRad(20);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
  controls.minDistance = minOrbitDistance(query, import.meta.env.DEV);
  // A closer dev orbit needs a nearer clip plane, or the subject is cut away.
  if (controls.minDistance < ORBIT_MIN && !drive) { camera.near = Math.min(camera.near, controls.minDistance / 4); camera.updateProjectionMatrix(); }
  controls.maxDistance = midtown ? 32000 : mosaic ? 11000 : 6500;
  controls.screenSpacePanning = false;
  controls.keys = { LEFT: '', UP: '', RIGHT: '', BOTTOM: '' }; // the shell owns the keyboard
  const squareButton = mosaic ? document.createElement('button') : undefined;
  let eastLoading = false;
  let eastFailed = false;
  let pendingEastTarget: { x: number; z: number } | undefined;
  let northLoading = false, northFailed = false;
  let wholeBoardRequested = false;
  let pendingNorthTarget: { x: number; z: number } | undefined;
  function updatePlinth(next: NonNullable<typeof eastPlinth>) {
    if (eastPlinth) {
      eastPlinth.removeFromParent();
      eastPlinth.geometry.dispose(); eastPlinth.material.dispose();
    }
    if (downtownPlinth) downtownPlinth.visible = false;
    eastPlinth = next;
    scene.add(next);
  }
  function mosaicBase() {
    const rects = Array.from(mosaic!.areas.values(), a => a.bounds);
    // Follow the mounted footprint, so a row that is missing or failed leaves no crowns over the table.
    if (perimeter) edgePlanes(square!.mountedBounds(rects)).forEach((plane, i) => perimeter[i].copy(plane));
    return square!.mosaicPlinth(rects, terrain!.bottomY);
  }
  // Set once the prewarm scheduler exists (below); an area mounting before then is covered by its first run.
  let requestPrewarm = () => {};
  let prewarmer: Prewarmer | undefined;
  let colourShown = !options.whiteModel;
  let prewarmDone = false;
  let prewarmBatch = 2;
  let bloomWarmFrames = 0;
  // setNight gating (environment()); `?perf&night=every` applies it every frame, for A/B runs.
  const nightEveryFrame = perfEnabled && query.get('night') === 'every';
  let nightDirty = true;
  let nightApplied = NaN;
  let nightGeometries = -1;
  let nightFrames = 0;
  function addArea(area: NonNullable<typeof east>, id: string) {
    // Its placeholder dissolves into it from the next frame, then hides.
    placeholder?.reveal(id);
    requestPrewarm();
    nightDirty = true;
    // A crown rooted inside the mosaic can overhang its outer edge. Interior joins stay open.
    if (perimeter) clipScenery(area.scenery, perimeter);
    scene.add(area.group);
    if (!keepEmpty) hideEmptyMeshes(area.group);
    scenery.push(area.group);
    // The area is in place: its board and scenery never move again (city/freeze.ts). Its transport
    // subgroup keeps updating (freight runs in it).
    if (freezeOn) {
      freezeSelf(area.group);
      freezeStatic(area.board);
      freezeStatic(area.scenery);
    }
    area.setSeason(local(new Date(options.clockMs())).doy);
    if (squareButton && mosaic) squareButton.textContent = mosaic.areas.size === mosaic.areaCount
      ? 'Frame the full board' : `Show full board (${mosaic.areas.size}/${mosaic.areaCount} areas loaded)`;
    renderer.shadowMap.needsUpdate = true;
  }
  function attachBrookwood(area: NonNullable<typeof east>) {
    if (!preparedBrookwood) {
      areaResult('brookwood-rail', 'Brookwood station model unavailable.');
      return;
    }
    if (!brookwood) {
      brookwood = preparedBrookwood;
      scene.add(brookwood.group);
      scenery.push(brookwood.structure);
    }
    const stationArea = mosaic?.areas.get('brookwood-station');
    if (stationArea) brookwood.mountLandings(stationArea.terrainAt, stationArea.terrainTriangles);
    brookwood.setNorthEdge(area.bounds.minZ);
    for (const id of ['osm:way:265350477', 'osm:way:38978515']) {
      const object = area.group.getObjectByName(id);
      if (object?.parent) {
        replaced.push({parent: object.parent, object});
        object.removeFromParent();
      }
    }
    renderer.shadowMap.needsUpdate = true;
  }
  // Phone load time: building a far area blocks the main thread for seconds on a phone, which
  // starves the white model's settle frames and delays colour. While the reveal runs, a camera
  // holds far areas back, including the default whole-board request; they start once colour shows
  // (or after 8 s at most). Only an explicit far target (a camera link to Brookwood, a study
  // camera) loads now, since the view it opens on needs that area.
  let areasHeld = !!options.whiteModel;
  let heldAt: { x: number; z: number } | undefined;
  // R16 bare earth spans -87.6 to -34.7 m in scene coordinates.
  const northBoundsBox = square?.northStudyBounds && new THREE.Box3(
    new THREE.Vector3(square.northStudyBounds.minX, -88, square.northStudyBounds.minZ),
    new THREE.Vector3(square.northStudyBounds.maxX, -34, square.northStudyBounds.maxZ));
  const northFrustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const clipCorners = [-1, 1].flatMap(z => [-1, 1].flatMap(y => [-1, 1].map(x => new THREE.Vector3(x, y, z))));
  const worldCorners = clipCorners.map(() => new THREE.Vector3());
  const frustumFaces = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6]];
  const faceTriangle = new THREE.Triangle();
  const northVisible = () => {
    if (!northBoundsBox) return false;
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    northFrustum.setFromProjectionMatrix(viewProjection);
    if (!northFrustum.intersectsBox(northBoundsBox)) return false;
    if (northFrustum.containsPoint(northBoundsBox.min)) return true;
    // The plane-only rejection above can admit a wide row entirely outside a close view.
    // For the remaining cases, a frustum face must meet the row box.
    for (let i = 0; i < worldCorners.length; i++) worldCorners[i].copy(clipCorners[i]).unproject(camera);
    return frustumFaces.some(([a, b, c, d]) =>
      northBoundsBox.intersectsTriangle(faceTriangle.set(worldCorners[a], worldCorners[b], worldCorners[c])) ||
      northBoundsBox.intersectsTriangle(faceTriangle.set(worldCorners[a], worldCorners[c], worldCorners[d])));
  };
  // Dev: `?placeholderhold` loads no area past downtown, so the placeholder can be reviewed.
  const holdAreas = import.meta.env.DEV && query.has('placeholderhold');
  function approachMosaic(x: number, z: number, needed = false) {
    if (holdAreas) return;
    if (areasHeld && mosaic && !needed) { heldAt = { x, z }; return; }
    mosaic?.approach(x, z, quality, eastController.signal, (added, target) => {
      const northernRow = added.get('r16');
      if (northernRow) {
        const station = mosaic!.areas.get('brookwood-station') as SeamArea;
        const { structures, rails, freightRailhead, disposeBuildings } = northernRow.northMount!;
        const restoreMaps = joinGroundMaps(
          northernRow.board.material.map as THREE.CanvasTexture, station.board.material.map as THREE.CanvasTexture);
        preparedBrookwood?.mountNorthFreight(freightRailhead);
        northLine?.extend(rails);

        const disposeArea = northernRow.dispose.bind(northernRow);
        northernRow.dispose = () => {
          const materials = new Set<THREE.Material>();
          structures.traverse(object => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
            }
          });
          for (const material of materials) material.dispose();
          restoreMaps();
          disposeBuildings();
          seamNormals.reset();
          disposeArea();
        };
      }
      for (const [id, area] of added) addArea(area, id);
      perf.phase(`area:${[...added.keys()].join('+')}`);
      const atl = added.get('brookwood-station');
      if (atl) {
        const disposeFragments = mountStationFragments(atl, quality, perimeter ? group => clipScenery(group, perimeter) : undefined);
        const dispose = atl.dispose.bind(atl);
        atl.dispose = () => { disposeFragments(); dispose(); };
        const prepared = northLines.get(atl);
        if (prepared?.holder.children.length) atl.group.add(...prepared.holder.children);
        northLine = prepared?.line;
      }
      const railArea = atl ?? added.get('brookwood-south');
      if (railArea) attachBrookwood(railArea);
      updatePlinth(mosaicBase());
      extendConnectorTraffic();
      void extendMidtownArterials(added.keys());
      const first = added.keys().next().value!;
      areaResult(first === 'north-band' ? 'north' : first === 'south-band' ? 'south' : first, null);
      if (target) {
        const offset = camera.position.clone().sub(controls.target);
        controls.target.set(target.x, targetY(target.x, target.z), target.z);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        if (atl && brookwoodStudy) setView(65, 66, 165, target.x, target.z);
      }
    }, direction => areaResult(direction, `Could not load the ${direction} section.`),
      () => ({ orbitM: camera.position.distanceTo(controls.target), inView: northVisible }));
  }
  function approachNorth(x: number, z: number) {
    if (holdAreas) return;
    if (!previewNorth || north || !east || !terrain || !grid) return;
    if (!nearNorth(x, z)) {
      // The full board still needs a failed Sweet Auburn wherever the camera is: keep its Retry.
      if (northFailed && mosaic && wholeBoardRequested) return;
      if (northFailed) areaResult('auburn', null);
      northFailed = false;
      return;
    }
    if (northLoading || northFailed || eastController.signal.aborted) return;
    northLoading = true;
    const downtown = terrain, king = east, westGrid = grid, signal = eastController.signal;
    void Promise.all([import('./sweet-auburn-board'), import('./king-memorial-board')]).then(async ([{ loadNorth }, { joinedPlinth }]) => {
      signal.throwIfAborted();
      const area = await loadNorth(DATA, westGrid, king.grid, quality, downtown.bottomY, signal, mosaic?.joins('auburn').slice(2));
      if (signal.aborted) { area.dispose(); return; }
      // The streetcar's track and stops are ready before the board shows, a frame apart.
      const board = area.connectorBoard;
      const { surface, track, stops } = await (async () => {
        await nextFrame();
        const surface = roadSurface(board.city.roads, board.roadHeight, area.groundAt);
        const lines = streetcarLines(rf, manifest.origin);
        const sites = platformSites(streetcarStopList(), lines, board.city.roads);
        const blocked = poleBlocked(board.city.roads, board.city.buildings), onPlatform = platformFootprints(sites);
        await nextFrame();
        const track = buildStreetcarTrack(lines, area.bounds, surface, (x, z) => blocked(x, z) || onPlatform(x, z));
        await nextFrame();
        const stops = buildStreetcarStops(sites, area.bounds, surface);
        await nextFrame();
        return { surface, track, stops };
      })().catch(error => { area.dispose(); throw error; });
      const discard = () => { track.dispose(); stops.dispose(); };
      if (signal.aborted) { discard(); area.dispose(); return; }
      try { mosaic?.mount('auburn', area); }
      catch (error) { discard(); throw error; }
      updatePlinth(mosaic ? mosaicBase() : joinedPlinth(b, downtown.bottomY, northBounds.minZ));
      addArea(area, 'auburn');
      north = area;
      {
        const entry = { bounds: area.bounds, height: surface };
        streetcarSurface.push(entry);
        area.group.add(track.group);
        // Match the downtown track and shelter shaders while keeping the interior seam open.
        if (perimeter) {
          clipScenery(track.group, perimeter);
          clipScenery(stops.group, perimeter);
        }
        area.group.add(stops.group);
        northStops = stops;
        const disposeArea = area.dispose.bind(area);
        area.dispose = () => {
          track.dispose();
          stops.dispose();
          if (northStops === stops) northStops = undefined;
          const i = streetcarSurface.indexOf(entry);
          if (i >= 0) streetcarSurface.splice(i, 1);
          disposeArea();
        };
      }
      extendConnectorTraffic();
      if (!mosaic) {
        downtown.openJoin(1); king.openJoin(1); area.openJoin(); area.openJoin(1);
      }
      renderer.shadowMap.needsUpdate = true;
      areaResult('auburn', null);
      perf.phase('area:auburn');
      if (pendingNorthTarget) {
        const { x, z } = pendingNorthTarget;
        const offset = camera.position.clone().sub(controls.target);
        controls.target.set(x, area.groundAt(x,z) ?? 0, z);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }
    }).catch(err => {
      if (!signal.aborted) {
        northFailed = true;
        areaResult('auburn', 'Sweet Auburn could not load. Downtown and King Memorial are available.');
        console.warn('Sweet Auburn board unavailable', err);
      }
    }).finally(() => { northLoading = false; if (!northFailed) pendingNorthTarget = undefined; }); // a failure keeps it for Retry
  }
  function approachEast(x: number, z: number) {
    if (holdAreas) return;
    if (!previewEast || east || !terrain || !grid) return;
    if (!nearEast(x, z) && !(previewNorth && nearNorth(x, z))) {
      // The full board still needs a failed King Memorial wherever the camera is: keep its Retry.
      if (eastFailed && mosaic && wholeBoardRequested) return;
      if (eastFailed) areaResult('king', null);
      eastFailed = false;
      pendingEastTarget = undefined;
      return;
    }
    if (eastLoading || eastFailed || eastController.signal.aborted) return;
    eastLoading = true;
    const downtown = terrain;
    const westGrid = grid;
    void import('./king-memorial-board').then(async ({ loadEast, joinedPlinth }) => {
      eastController.signal.throwIfAborted();
      const area = await loadEast(DATA, westGrid, quality, downtown.bottomY, eastController.signal, mosaic ? mosaic.joins('king').slice(1) : previewNorth ? northSouthJoin : undefined);
      if (eastController.signal.aborted) { area.dispose(); return; }
      mosaic?.mount('king', area);
      updatePlinth(mosaic ? mosaicBase() : joinedPlinth(b, downtown.bottomY));
      addArea(area, 'king');
      if (!mosaic) { area.openJoin(); downtown.openJoin(); }
      east = area;
      extendConnectorTraffic();
      loadKingRail(area);
      const next = pendingNorthTarget ?? controls.target;
      if (wholeBoardRequested) approachNorth(1400, 0);
      else approachNorth(next.x, next.z);
      areaResult('king', null);
      perf.phase('area:king');
      renderer.shadowMap.needsUpdate = true;
      if (pendingEastTarget) {
        const { x, z } = pendingEastTarget;
        const offset = camera.position.clone().sub(controls.target);
        controls.target.set(x, east.groundAt(x, z) ?? 0, z);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }
    }).catch(err => {
      if (!eastController.signal.aborted) {
        eastFailed = true;
        areaResult('king', 'King Memorial could not load. Downtown is available.');
        console.warn('King Memorial board unavailable', err);
      }
    }).finally(() => { eastLoading = false; if (!eastFailed) pendingEastTarget = undefined; }); // a failure keeps it for Retry
  }
  // MARTA through the east area (track, station, trains). Rail owns this; the area mount calls it.
  function loadKingRail(area: NonNullable<typeof east>) {
    eastRailFailed = false;
    void attachEastRail(area).then(() => {
      if (mosaic && !eastController.signal.aborted) areaResult('rail', null);
    }).catch(err => {
      if (eastController.signal.aborted) return;
      eastRailFailed = true;
      if (mosaic) areaResult('rail', 'King Memorial rail could not load.');
      console.warn('MARTA east of the board unavailable', err);
    });
  }
  async function attachEastRail(area: { groundAt(x: number, z: number): number | null }) {
    if (!grid || eastRail) return;
    const ground = grid;
    const mod = await import('./east-rail');
    const r = await fetch(`${DATA}/scene/king-memorial/corridor.json`, { signal: eastController.signal });
    if (!r.ok) throw new Error(`corridor.json (${r.status})`);
    const pack = await r.json();
    if (eastController.signal.aborted) return;
    const extended = mod.extendRail(manifest, rf);
    const union = { ...b, maxX: eastBounds.maxX };
    const rebuilt = martaAlignments(rf, extended, union, stationSite, mod.joinedGround(ground, area.groundAt));
    if (rebuilt.station && floyd) rebuilt.station.alignment.visibleInStation = rebuilt.station.visibleInStation;
    const tracks = cut ? rebuilt.tracks.map(maskCut) : rebuilt.tracks;
    for (const t of tracks) {
      const inStation = t.visibleInStation;
      // Cars stay visible under the open-sided King Memorial canopy, like Georgia State's.
      t.visibleInStation = s => !!inStation?.(s) || (t.coverAt?.(s) === 'roofed' && t.formAt?.(s) === 'station' && t.line.at(s).x > b.maxX);
    }
    // The alignments and the track are each a frame's work on a phone.
    if (sliceBudget()) await new Promise(resolve => requestAnimationFrame(resolve));
    if (eastController.signal.aborted) return;
    const rail = mod.buildEastRail(extended, rf, pack, area.groundAt, ground.manifest.vertical.sceneZeroNavd88M, b.maxX);
    scene.add(rail.mesh);
    scenery.push(rail.mesh); // occludes picking: no selecting a train hidden under the canopy
    trains.setTracks(tracks, union);
    if (options.stopDistances) trains.setBerths(mod.kingMemorialBerths(rf, extended, pack.station?.platforms ?? [], options.stopDistances));
    trainBounds = union;
    trainRail = extended.rail;
    trainEdges[1].constant = eastBounds.maxX;
    eastRail = rail;
    renderer.shadowMap.needsUpdate = true;
  }
  function patchY(x: number, z: number) {
    if (mosaic) for (const a of mosaic.patches.values()) {
      const y = a.groundAt(x, z) ?? a.orbitGround?.(x,z) ?? null;
      if (y !== null) return y;
    }
    return null;
  }
  const pointOnBoard = (x: number, z: number) => mosaic?.point(x, z) ?? boardPoint(b, !!east, x, z, !!north);
  const targetY = (x: number, z: number) => patchY(x, z) ?? north?.groundAt(x, z) ?? east?.groundAt(x, z) ?? (previewNorth ? terrain?.groundAt(x, z) : null) ?? world.ground(x, z);
  const clampTarget = () => {
    if (drive) return;
    const t = controls.target;
    approachMosaic(t.x, t.z);
    approachEast(t.x, t.z);
    approachNorth(t.x, t.z);
    const point = pointOnBoard(t.x, t.z);
    const dx = point.x - t.x, dz = point.z - t.z;
    const dy = grid ? targetY(point.x, point.z) - t.y : 0;
    if (dx || dy || dz) {
      // Direct mode: inertia into the board edge stops there instead of pushing on silently.
      if (directCamera && (dx || dz)) orbitInternals._panOffset.set(0, 0, 0);
      t.x += dx;
      t.y += dy;
      t.z += dz;
      camera.position.x += dx;
      camera.position.y += dy;
      camera.position.z += dz;
    }
  };
  controls.addEventListener('change', clampTarget);

  function setView(azDeg: number, polarDeg: number, dist: number, tx = controls.target.x, tz = controls.target.z) {
    const ty = targetY(tx, tz);
    controls.target.set(tx, ty, tz);
    const az = THREE.MathUtils.degToRad(azDeg);
    const po = THREE.MathUtils.degToRad(polarDeg);
    camera.position.set(tx + dist * Math.sin(po) * Math.sin(az), ty + dist * Math.cos(po), tz + dist * Math.sin(po) * Math.cos(az));
    controls.update();
  }
  // Opening view: downtown at a glance from the southwest — the Gulch in front, Five Points,
  // and the Peachtree Center towers behind.
  setView(-28, 57, 5500, -40, -260);
  const profileCameras:Record<string,[number,number,number,number,number]> = {
    baker:[878,-936,-38,52,.32],courtland:[690,-1162,84,72,.26],peachtree:[563,-1274,-50,48,.23],
    turner:[320,-1445,85,72,.26],capitol:[354,1050,85,72,.26],mlk:[595,626,9,72,.26],decatur:[855,452,3,72,.26],
  };
  const profile=query.get('bridgeProfile') ?? '';
  if (Object.hasOwn(profileCameras,profile)) {
    const [x,z,bearing,tilt,scale]=profileCameras[profile];
    mosaic?.remember(x,z);
    approachMosaic(x,z,true);
    setView(-bearing,tilt,Math.max(150,scale*container.clientHeight/(2*Math.tan(THREE.MathUtils.degToRad(11)))),x,z);
  }
  if (brookwoodStudy) {
    mosaic?.remember(-92,-5054);
    approachMosaic(-92,-5054,true);
  }

  // ---- post: ink, ambient occlusion, bloom, tilt-shift, grade ------------------------------
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  sceneTarget.depthTexture = new THREE.DepthTexture(1, 1);
  const composer = new EffectComposer(renderer, sceneTarget);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const ink = new ShaderPass(inkShader());
  // Named species' leaves (inkFoliageMesh) draw into a mask the ink pass reads; with none on the
  // board the pass does nothing and the ink is unchanged.
  const foliageMask = new FoliageMaskPass(scene, camera, ink);
  composer.addPass(foliageMask);
  composer.addPass(ink);
  const gtaoOld = perfEnabled && new URLSearchParams(location.search).get('gtao') === 'old';
  const gtao = low ? null : new GTAOPass(scene, camera, 1, 1);
  // `?perf&aoblend=old` keeps GTAOPass's copy-then-blend output, for A/B runs.
  const aoBlend = gtao && !(perfEnabled && query.get('aoblend') === 'old') ? new ShaderPass({
    name: 'AoBlend',
    uniforms: { tDiffuse: { value: null }, tAO: { value: null }, intensity: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    // GTAOBlendShader's colour, applied as its multiply blend did: dst * mix(1, ao, intensity).
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse, tAO;
      uniform float intensity;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec4 ao = texture2D(tAO, vUv);
        gl_FragColor = vec4(c.rgb * mix(vec3(1.0), ao.rgb, intensity), c.a * ao.a);
      }`,
  }) : null;
  if (gtao) {
    // Read the scene pass's own depth instead of re-rendering the whole scene with a normal
    // override (which doubled draw calls and triangles). The scene is flat-shaded, so normals
    // rebuilt from depth match face normals. The depth texture is set per frame, below.
    // `?perf&gtao=old` keeps the previous normal-override pass, for A/B runs from one build.
    if (!gtaoOld) {
      gtao.setGBuffer(sceneTarget.depthTexture);
      // AO only on the boards (aoClip, per frame, since joined boards arrive later). Normals
      // rebuilt from depth band on the far, grazing paper table (hyperbolic depth has no
      // precision left there), and the table needs no contact shading.
      gtao.setSceneClipBox(new THREE.Box3());
    }
    gtao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.5, thickness: 4, scale: 1.2 });
    gtao.blendIntensity = 0.9;
    composer.addPass(gtao);
    if (aoBlend) {
      // GTAOPass's default output copies the whole frame, then multiplies the AO over it with
      // blending: two full-resolution passes. One pass that multiplies as it copies does the same.
      gtao.output = GTAOPass.OUTPUT.Off;
      gtao.needsSwap = false;
      aoBlend.uniforms.tAO.value = gtao.pdRenderTarget.texture;
      aoBlend.uniforms.intensity.value = gtao.blendIntensity;
      composer.addPass(aoBlend);
    }
  }
  // `?perf&bloom=device` keeps the old device-px bloom, for A/B runs.
  const bloomCss = !(perfEnabled && query.get('bloom') === 'device');
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0, 0.55, 0.82);
  composer.addPass(bloom);
  const hts = new ShaderPass(tiltShiftShader([1, 0]));
  const vts = new ShaderPass(tiltShiftShader([0, 1]));
  composer.addPass(hts);
  composer.addPass(vts);
  // Grade does OutputPass's tone mapping and sRGB output itself (one fewer full-resolution pass).
  // `?perf&output=pass` keeps the separate pass, for A/B runs.
  const outputPass = perfEnabled && query.get('output') === 'pass';
  if (outputPass) composer.addPass(new OutputPass());
  // High draws the glass panels' blurred backings itself (city/glass.ts), so the DOM can drop
  // backdrop-filter and the canvas is presented directly. `?perf&glass=css` keeps the CSS blur.
  // The blur reads grade's input, so it applies the same output step grade does.
  const glass = !low && !(perfEnabled && query.get('glass') === 'css') ? new CityGlass({ output: !outputPass }) : null;
  if (glass) composer.addPass(glass.pass);
  const grade = new ShaderPass(gradeShader({ output: !outputPass, after: glass?.gradeHook }));
  // ShaderPass clones its uniforms; the glass hook's must stay the live objects CityGlass updates.
  if (glass) Object.assign(grade.uniforms, glass.gradeHook.uniforms);
  composer.addPass(grade);
  let glassDrawn = false;
  const showGlass = (drawn: boolean) => {
    if (drawn !== glassDrawn) setCanvasGlass(glassDrawn = drawn);
  };
  const gl = renderer.getContext();
  const onContextLost = () => showGlass(false);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  const tilt = Number(new URLSearchParams(location.search).get('tilt') ?? 0.65);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    if (mosaic && !drive) {
      controls.maxDistance = midtown ? Math.max(32000, 11700 / Math.max(.25, camera.aspect)) : Math.max(11000, 9600 / Math.max(.25, camera.aspect));
      camera.far = Math.max(20000, controls.maxDistance + 4000);
    }
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
    // Render soft contact shading at CSS resolution. Ink and façades keep the display resolution.
    gtao?.setSize(w, h);
    // The composer sizes every pass in device px; bloom works in CSS px, so its glow is the same
    // size at every pixel ratio (and a 2x display doesn't pay for a full-resolution bloom chain).
    if (bloomCss) bloom.setSize(w, h);
    const pr = renderer.getPixelRatio();
    ink.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
    ink.uniforms.uWidth.value = Math.max(1, pr);
    grade.uniforms.uRes.value.set(w * pr, h * pr);
    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    glass?.setSize(buffer.x, buffer.y, buffer.x / w);
    for (const p of [hts, vts]) {
      p.uniforms.uTexel.value.set(1 / w, 1 / h);
      p.uniforms.uStrength.value = tilt;
      p.enabled = tilt > 0.01 && !perfOverrides.nopass.has('tilt');
    }
  }
  const inkWanted = !perfOverrides.nopass.has('ink');
  if (perfOverrides.nopass.size) {
    for (const p of composer.passes) if (p instanceof FoliageMaskPass && perfOverrides.nopass.has('ink')) p.enabled = false;
    ink.enabled = inkWanted;
    grade.enabled = !perfOverrides.nopass.has('grade');
    if (gtao) gtao.enabled = !perfOverrides.nopass.has('gtao');
    if (aoBlend) aoBlend.enabled = !perfOverrides.nopass.has('gtao');
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  // A window dragged to a display with another devicePixelRatio doesn't resize the container, so
  // the frame loop checks the ratio itself (one global read; a resolution media query's change
  // event isn't fired everywhere). The buffer, the composer and every pass's targets follow it.
  let seenDpr = devicePixelRatio;
  const followPixelRatio = () => {
    if (devicePixelRatio === seenDpr) return;
    seenDpr = devicePixelRatio;
    const pr = wantedPixelRatio();
    if (pr === renderer.getPixelRatio()) return;
    renderer.setPixelRatio(pr);
    composer.setPixelRatio(pr);
    resize();
  };
  const perfContext: Parameters<typeof perf.attach>[0] = {
    renderer, scene, quality,
    rotate: degrees => { rotateBy(degrees); controls.update(); },
    pan: (dx, dy) => panPx(dx, dy),
    view: (x, z, dist, bearing, tilt) => { manualCamera(); setView(-bearing, tilt, THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance), x, z); },
    post: () => [sceneTarget, composer, ...composer.passes, ...(glass?.targets() ?? [])],
    areas: () => mosaic ? [...mosaic.areas.keys()] : ['downtown', ...(east ? ['king'] : []), ...(north ? ['auburn'] : [])],
    roots: () => {
      const m = new Map<THREE.Object3D, PerfCategory>();
      const set = (o: THREE.Object3D | null | undefined, c: PerfCategory) => { if (o) m.set(o, c); };
      for (const v of [trains.group, buses.mesh, freight?.group, traffic?.group, arterials?.group, midtownArterials?.group, figures?.group,
        brookwood?.cars, brookwood?.freight, (northLine as { group?: THREE.Object3D } | undefined)?.group, streetcar.group]) set(v, 'vehicles');
      // An area's group holds its board, scenery and surface transport; the nearer roots win.
      for (const a of [terrain, east, north, ...(mosaic ? [...mosaic.areas.values(), ...mosaic.patches.values()] : [])]) {
        set(a?.group, 'transport'); set(a?.board, 'terrain'); set(a?.scenery, 'scenery');
      }
      set(brookwood?.group, 'transport');
      set(transport?.group, 'transport');
      set(world.group, 'transport'); // streetcar track, MARTA guideway, lamps; landmarks are tagged
      return m;
    },
  };
  // A load cancelled while building must not take over from the City that replaced it.
  if (!options.signal?.aborted) perf.attach(perfContext);

  // Double-click glides to the board surface, ignoring trains, trees and buildings.
  let glideTo: THREE.Vector3 | null = null;
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const onDbl = (ev: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (terrain) {
      const surface = ray.intersectObjects(mosaic ? Array.from(mosaic.areas.values(), a => a.board) : east && north ? [terrain.board, east.board, north.board] : east ? [terrain.board, east.board] : [terrain.board], false)[0];
      if (surface) {
        glideTo = surface.point;
        glideTo.y = targetY(glideTo.x, glideTo.z);
      }
    } else if (ray.ray.intersectPlane(groundPlane, hit) && world.inBounds(hit.x, hit.z)) glideTo = hit;
    if (glideTo) manualCamera();
  };
  renderer.domElement.addEventListener('dblclick', onDbl);
  const cancelPendingTarget = () => {
    mosaic?.cancelTarget();
    pendingNorthTarget = undefined;
    pendingEastTarget = undefined;
  };
  const manualCamera = () => {
    cancelPendingTarget();
    if (options.follow?.active) options.follow.stop();
  };
  // Observe pan input before damping. A touch starts in PAN even when a second
  // finger is about to turn it into an orbit. Use the same 6 px slop as picking.
  const orbitInput = controls as unknown as { state: number; _pan(dx: number, dy: number): void };
  const applyPan = orbitInput._pan.bind(controls);
  let panX = 0, panY = 0;
  orbitInput._pan = (dx, dy) => {
    if (options.follow?.active) {
      panX += dx;
      panY += dy;
      if (Math.hypot(panX, panY) <= 6) return;
      dx = panX;
      dy = panY;
      manualCamera();
    }
    applyPan(dx, dy);
  };
  const startGesture = () => {
    panX = panY = 0;
    // In three r180 wheel zoom starts in NONE (-1), mouse dolly in DOLLY (1).
    if (orbitInput.state === -1 || orbitInput.state === 1) manualCamera();
  };
  controls.addEventListener('start', startGesture);
  // A press keeps a link's pending target until it travels past the picking slop. A tap (inspecting
  // a vehicle, focusing the page) is not a camera move; dropping the target on pointerdown left a
  // Brookwood link parked at the downtown edge it was clamped to while its row loaded.
  const pressEvents = new AbortController();
  // Per pointer, so a second finger lifting does not forget the first one's press.
  const pressedAt = new Map<number, { x: number; y: number }>();
  renderer.domElement.addEventListener('pointerdown', e => {
    // Only the buttons OrbitControls moves the camera with (a pen eraser or a side button does not).
    if (e.button < 0 || e.button > 2) return;
    // A second finger is a pinch or twist: that takes the camera however small it stays.
    if (pressedAt.size) cancelPendingTarget();
    pressedAt.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }, { capture: true, signal: pressEvents.signal });
  renderer.domElement.addEventListener('pointermove', e => {
    const at = pressedAt.get(e.pointerId);
    if (!at || Math.hypot(e.clientX - at.x, e.clientY - at.y) <= 6) return;
    pressedAt.clear();
    cancelPendingTarget();
  }, { capture: true, signal: pressEvents.signal });
  for (const type of ['pointerup', 'pointercancel'] as const)
    renderer.domElement.addEventListener(type, e => { pressedAt.delete(e.pointerId); }, { capture: true, signal: pressEvents.signal });
  // A press released in another window never reports here; it must not make the next tap a pinch.
  window.addEventListener('blur', () => pressedAt.clear(), { signal: pressEvents.signal });
  // Sliced area builds stay out of the way while the camera is in use: while a gesture is held
  // (here) and whenever the view moves (watched once a frame, below).
  releaseCamera();
  const watchCamera = cameraWatch();
  controls.addEventListener('start', () => { sliceInput.dragging = true; sliceInput.inputAt = performance.now(); });
  controls.addEventListener('end', () => { sliceInput.dragging = false; sliceInput.inputAt = performance.now(); });
  // A gesture the browser cancels, or one whose window loses focus, never ends.
  const dropGesture = () => { sliceInput.dragging = false; };
  window.addEventListener('blur', dropGesture);
  renderer.domElement.addEventListener('pointercancel', dropGesture);
  /** Turn the view about its target; the frame loop's controls.update() applies it. */
  const rotateBy = (degrees: number) => {
    cancelPendingTarget();
    glideTo = null;
    const off = new THREE.Vector3().subVectors(camera.position, controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees));
    camera.position.copy(controls.target).add(off);
  };
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  // Observe wheels for tap cancellation before the map gesture handler can consume them.
  const stopPicking = listenForTap(renderer.domElement, (clientX, clientY) => {
    const r = renderer.domElement.getBoundingClientRect();
    options.selectVehicle?.(pickVehicle(clientX - r.left, clientY - r.top, r.width, r.height,
      camera, trains.group, buses.positions, edges, scenery, freight?.poses, brookwood?.cars, brookwood?.freightPoses, streetcar.group));
  });
  const stopGestures = options.mapGestures ? mapGestures(controls, renderer.domElement, rotateBy, manualCamera, { legacy: legacyCamera, easeWheel: directCamera, motionPreference }) : undefined;
  // Maps-style input zooms on double-click instead of gliding to the clicked point.
  if (options.mapGestures) renderer.domElement.removeEventListener('dblclick', onDbl);
  if (squareButton && mosaic) {
    squareButton.type = 'button';
    squareButton.textContent = 'Show full board';
    document.getElementById('city-info')?.append(squareButton);
    const loadFullBoard = (includeNorth = true) => {
      wholeBoardRequested = true;
      eastFailed = northFailed = false;
      mosaic.requestFullBoard(includeNorth);
      if (east && eastRailFailed) loadKingRail(east);
      // This explicit request also works as a retry when any geographic pack is missing.
      approachMosaic(400, -1500);
      approachEast(1400, 0);
      approachNorth(1400, 0);
    };
    const frameFullBoard = (includeNorth = false) => {
      const frame = square!.fullBoardFrame(1100, mosaic.framedNorthEdge(includeNorth), midtown, camera.aspect);
      mosaic.remember(400, frame.targetZ);
      setView(frame.azimuth, frame.tilt, Math.min(controls.maxDistance, frame.distance), 400, frame.targetZ);
    };
    if (rectangle || !midtown) {
      loadFullBoard(false);
      if (!drive && !brookwoodStudy && !Object.hasOwn(profileCameras, profile)) frameFullBoard();
    }
    squareButton.onclick = () => {
      manualCamera();
      glideTo = null;
      loadFullBoard();
      frameFullBoard(true);
    };
  }

  // ---- sun, sky, weather --------------------------------------------------------------
  const C = (x: string) => new THREE.Color(x);
  const pal = {
    skyDay: C('#e4ecf7'), skyNight: C('#6f86c8'),
    gndDay: C('#a48d72'), gndNight: C('#2c3346'),
    bgDay: C('#e7e2d8'), bgDusk: C('#e2b998'), bgNight: C('#232a3f'),
    tableDay: C('#d8d2c6'), tableNight: C('#2b3142'),
    sunHigh: C('#fff1da'), sunLow: C('#ffa45c'),
    greySky: C('#cfd4da'), greyBg: C('#c6c8c9'), greyBgNight: C('#1e2229'), greySun: C('#e8ecf0'),
    overcastSky: C('#f4f5f2'), overcastGround: C('#c4bdb0'), overcastHaze: C('#e2e5e6'),
    morningSky: C('#ffe0c6'), morningHaze: C('#efbcab'),
    eveningSun: C('#ffbe62'), eveningHaze: C('#f7c48c'), afterglow: C('#ffb479'), twilightSky: C('#9daed6'),
    snowBg: C('#eef0f2'),
  };
  const sm = (a: number, c: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (c - a)));
    return k * k * (3 - 2 * k);
  };
  let atm: Atmosphere = { sunElev: 40, sunAz: 180, dark: 0, cloud: 0, rain: 0, snow: 0, fog: 0 };
  const wx = { cloud: 0, rain: 0, snow: 0, fog: 0 }; // eased toward the atmosphere's weather
  const reduceMotion = motionPreference.matches;
  const shadowTarget = new THREE.Vector3(Infinity, 0, Infinity);
  // The shadow camera moves in grid steps (80 m on low, 60 m on high), so a pan redraws the
  // map a few times instead of every frame (each redraw re-renders every caster in the box).
  // The light sits over the stepped point, snapped to whole shadow-map texels in light space,
  // so a re-centre lands the same shadow edges in the same places and nothing shimmers.
  const SHADOW_STEP_M = perfOverrides.shadowStepM ?? (low ? 80 : 60);
  // ...and at most one move-driven redraw per 250 ms; the last step lands once the pan settles.
  // On high, a target more than half the box from the centre (a fast pan when zoomed out)
  // redraws at once, so the shadowed patch never trails the view. Low keeps the gap.
  const SHADOW_GAP_MS = SHADOW_STEP_M ? 250 : 0;
  const shadowTexel = (2 * SH) / shadowSize;
  const lightX = new THREE.Vector3(), lightY = new THREE.Vector3(), lightZ = new THREE.Vector3();
  const shadowCentre = new THREE.Vector3();
  let shadowDrawnAt = -Infinity;
  // Low, far orbits: shadows fade out where a typical building's shadow is under 2 pixels, and the
  // map stops redrawing there, so every pan re-centre is free (a redraw at the default view submits
  // ~1.4M triangles, more than half a second scene).
  // The threshold is screen-space: a TYPICAL_H building's shadow (h / tan(sun elevation)) against
  // the pixel size at the orbit distance, so long dusk shadows stay further out. Strength fades
  // across 0.85-1x the threshold with the orbit, so a zoom never pops; redraws stop at zero
  // strength. Shadow programs stay compiled: toggling shadowMap.enabled or castShadow would change
  // every lit material's program key. ?perf&farshadow=<m> fixes the threshold (0: never).
  const TYPICAL_H = 12, SHADOW_PX = 2;
  let shadowsFar = false;
  let shadowDebug: object = {};
  if (perfEnabled) Object.assign(window, { __shadowFar: () => shadowDebug });
  const farShadowAt = (elevDeg: number) => {
    if (!low) return Infinity;
    if (perfOverrides.farShadowM !== null) return perfOverrides.farShadowM;
    const shadowLen = TYPICAL_H / Math.tan(Math.max(elevDeg, 2) * (Math.PI / 180));
    const pxPerM = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    // shadowLen / (orbit / pxPerM) < SHADOW_PX  =>  orbit > shadowLen * pxPerM / SHADOW_PX
    return (shadowLen * pxPerM) / SHADOW_PX;
  };
  let shadowLodDirty = false;
  let shadowElev = Infinity;
  let shadowAz = Infinity;

  function environment(dt: number) {
    const el = atm.sunElev;
    const day = sm(-6, 10, el);
    const gold = (1 - sm(3, 28, el)) * sm(-3, 2, el);
    const elDir = Math.max(el, 4) * (Math.PI / 180);
    const az = atm.sunAz * (Math.PI / 180);
    const t = controls.target;
    const orbit = camera.position.distanceTo(t);
    const farAt = farShadowAt(el);
    // Full strength inside 0.85x, none beyond 1x; casters off once beyond (strength is 0 there).
    sun.shadow.intensity = Number.isFinite(farAt) ? THREE.MathUtils.clamp((farAt - orbit) / (0.15 * farAt), 0, 1) : 1;
    if (perfEnabled) shadowDebug = { orbit: Math.round(orbit), farAt: Math.round(farAt), intensity: sun.shadow.intensity, far: shadowsFar, elev: Math.round(el * 10) / 10 };
    const nextFar = shadowsFar ? orbit > 0.97 * farAt : orbit > farAt;
    if (nextFar !== shadowsFar) {
      shadowsFar = nextFar;
      // Going far the map just stops redrawing (strength is 0 there). Coming back it is stale, so
      // redraw once. (three's shadow pass tests casters against the main camera's layers, so a
      // layer on the shadow camera cannot empty it; the saving is the skipped redraws.)
      if (!nextFar) renderer.shadowMap.needsUpdate = true;
    }
    // A house tile that swapped its near and far versions changes what casts shadows.
    // Bitwise so both flags are consumed every frame (the house one also counts frames).
    // Transport far form (terrain/far-form.ts): lamp heads follow the same glow as world.setNight.
    updateFarForms(camera.position, low ? 'low' : 'high', world.night.value);
    // Low: a swap marks the map dirty and redraws within the same 250 ms gap as a camera move, so
    // a fly-over that swaps tiles every few frames redraws ~4 times a second, not every swap (route:north
    // logged 206-216 redraws in 10 s, each about a million triangles). High redraws on each swap.
    if (Number(takeHouseLodChange()) | Number(takeGroundLodChange()) | Number(takeFarChange())) {
      if (low && !perfOverrides.shadowGapOld) shadowLodDirty = true; else renderer.shadowMap.needsUpdate = true;
      // A late swap changes what draws: ?perf=run must not sample before it settles.
      if (perfEnabled) perf.phase('lod:swap');
    }
    // Low re-centres on a step that grows with the orbit (0.15 x, at least 80 m): from far away the
    // same 80 m step came round many times a second while panning, for shadows a few pixels wide.
    // Capped at a quarter of the shadow box (260 m on low): an uncapped 0.15 x orbit is ~3.2 km at
    // the default view, three times the box, and with the 0.6 hysteresis the target could pan ~1.9 km
    // away from its shadows before the box followed. Far orbits are the far-shadow rule's to handle.
    const step = low && SHADOW_STEP_M && !perfOverrides.shadowGapOld ? shadowStepM(camera.position.distanceTo(t), SHADOW_STEP_M, 2 * SH) : SHADOW_STEP_M;
    const snap = (v: number) => step ? Math.round(v / step) * step : v;
    const sx = snap(t.x), sz = snap(t.z);
    const now = performance.now();
    // Hysteresis: re-centre only once the target is 0.6 of a step from the current centre on an
    // axis (a fresh centre is at most half a step away), so a target resting on a cell boundary
    // cannot flip the shadow box back and forth.
    const off = (v: number, c: number) => Math.abs(v - c) > step * 0.6;
    const moved = SHADOW_STEP_M ? off(t.x, shadowTarget.x) || off(t.z, shadowTarget.z) : t.distanceToSquared(shadowTarget) > 1;
    const far = !low && Math.max(Math.abs(t.x - shadowTarget.x), Math.abs(t.z - shadowTarget.z)) > SH / 2;
    const turned = Math.abs(el - shadowElev) > 0.1 || Math.abs(atm.sunAz - shadowAz) > 0.1;
    // The gap applies to sun moves too, so a sped-up clock cannot redraw every frame.
    // Far from the board the centre still follows the target (the light sits over it; a session
    // that opens far would otherwise keep the initial Infinity), but nothing redraws.
    if ((moved || turned || shadowLodDirty) && (shadowsFar || far || now - shadowDrawnAt >= SHADOW_GAP_MS)) {
      if (!shadowsFar) renderer.shadowMap.needsUpdate = true;
      shadowLodDirty = false;
      shadowDrawnAt = now;
      shadowTarget.set(sx, t.y, sz);
      shadowElev = el;
      shadowAz = atm.sunAz;
    }
    const lx = SHADOW_STEP_M ? shadowTarget.x : t.x, lz = SHADOW_STEP_M ? shadowTarget.z : t.z;
    // Light-space axes as the shadow camera's lookAt builds them (z toward the sun, up = +y).
    lightZ.set(Math.sin(az) * Math.cos(elDir), Math.sin(elDir), -Math.cos(az) * Math.cos(elDir));
    lightX.crossVectors(sun.shadow.camera.up, lightZ).normalize();
    lightY.crossVectors(lightZ, lightX);
    shadowCentre.set(lx, 0, lz);
    const q = (v: number) => Math.round(v / shadowTexel) * shadowTexel - v;
    shadowCentre.addScaledVector(lightX, q(shadowCentre.dot(lightX))).addScaledVector(lightY, q(shadowCentre.dot(lightY)));
    sun.target.position.copy(shadowCentre);
    sun.position.copy(shadowCentre).addScaledVector(lightZ, 2000);
    sun.intensity = 2.9 * sm(-1, 7, el);
    sun.color.copy(pal.sunHigh).lerp(pal.sunLow, gold);
    hemi.color.copy(pal.skyNight).lerp(pal.skyDay, day);
    hemi.groundColor.copy(pal.gndNight).lerp(pal.gndDay, day);
    hemi.intensity = 1.05 + 0.45 * day;
    bg.copy(pal.bgNight).lerp(pal.bgDay, day).lerp(pal.bgDusk, gold * 0.7);
    tableMat.color.copy(pal.tableNight).lerp(pal.tableDay, day);
    const night = atm.dark;
    // ~60 landmarks and every area take setNight; night only moves with the clock, so apply it when
    // it moves, when something mounts (addArea, or any new geometry), and once a second regardless.
    const geometries = renderer.info.memory.geometries;
    const applyNight = nightEveryFrame || nightDirty || !(Math.abs(night - nightApplied) <= 0.001)
      || geometries !== nightGeometries || ++nightFrames >= 60;
    if (applyNight) {
      nightDirty = false;
      nightApplied = night;
      nightGeometries = geometries;
      nightFrames = 0;
      world.setNight(night);
      platforms?.setNight(night);
      floyd?.setNight(night);
      eastRail?.setNight(night);
      hyatt?.setNight(night);
      marquis?.setNight(night);
      marquisOne?.setNight(night);
      marquisTwo?.setNight(night);
      capitalCityClub?.setNight(night);
      medicalArts?.setNight(night);
      jwMarriott?.setNight(night);
      hilton?.setNight(night);
      altitude?.setNight(night);
      twelve?.setNight(night);
      truist?.setNight(night);
      westin?.setNight(night);
      peachtreeCenter?.setNight(night);
      hub?.setNight(night);
      peachtree?.setNight(night);
      library?.setNight(night);
      flatiron?.setNight(night);
      healey?.setNight(night);
      footballHall?.setNight(night);
      museumTower?.setNight(night);
      courtlandGrand?.setNight(night);
      oneParkTower?.setNight(night);
      parkPlaceTower?.setNight(night);
      tDeck?.setNight(night);
      hardRock?.setNight(night);
      theLandmark?.setNight(night);
      landmarkDeck?.setNight(night);
      fiftyFiveParkPlace?.setNight(night);
      fultonBank?.setNight(night);
      davisons?.setNight(night);
      ritzCarlton?.setNight(night);
      southernBell?.setNight(night);
      rhodesHaverty?.setNight(night);
      empireBuilding?.setNight(night);
      commerceBuilding?.setNight(night);
      hundredEdgewood?.setNight(night);
      metropolitan?.setNight(night);
      mariettaBackdrop?.setNight(night);
      one12Courtland?.setNight(night);
      citizensTrust?.setNight(night);
      fultonGovernmentCenter?.setNight(night);
      internationalGarage?.setNight(night);
      georgiaAquarium?.setNight(night);
      worldOfCocaCola?.setNight(night);
      williams250?.setNight(night);
      fultonCourthouse?.setNight(night);
      peachtreeOffices?.setNight(night);
      williamOliver?.setNight(night);
      omniAtlanta?.setNight(night);
      fivePointsPlaza?.setNight(night);
      twoPeachtree?.setNight(night);
      georgiaPower?.setNight(night);
      peachtreeTowers?.setNight(night);
      georgiaPacific?.setNight(night);
      russell?.setNight(night);
      centennial?.setNight(night);
      skyView?.setNight(night);
      capitol?.setNight(night);
      arena?.setNight(night);
      atlantaCityHall?.setNight(night);
      americasMart?.setNight(night);
      hurtBuilding?.setNight(night);
      theCenter?.setNight(night);
      samNunn?.setNight(night);
      aymDeck?.setNight(night);
      theMitchell?.setNight(night);
      renaissanceLofts?.setNight(night);
      barclayHotel?.setNight(night);
      allenPlaza55?.setNight(night);
      candler?.setNight(night);
      equitable?.setNight(night);
      olympia?.setNight(night);
      grady?.setNight(night);
      terrain?.setNight(night);
      east?.setNight(night);
      north?.setNight(night);
      stopsDowntown?.setNight(night);
      northStops?.setNight(night);
      if (mosaic) for (const a of mosaic.patches.values()) a.setNight(night);
    }
    downtownBatches?.sync(); // after every downtown landmark's setNight
    bloom.strength = 0.55 * night;
    // A one-frame warm-up runs bloom at strength 0 by day (it adds nothing), so its blur shaders compile
    // then and not on the first dusk frame.
    bloom.enabled = !low && (night > 0.02 || bloomWarmFrames > 0) && !perfOverrides.nopass.has('bloom');
    if (bloomWarmFrames > 0) bloomWarmFrames--;

    const ease = 1 - Math.exp(-dt * 2);
    wx.cloud += (atm.cloud - wx.cloud) * ease;
    wx.rain += (atm.rain - wx.rain) * ease;
    wx.snow += (atm.snow - wx.snow) * ease;
    wx.fog += (atm.fog - wx.fog) * ease;
    const cl = wx.cloud;
    sun.intensity *= 1 - 0.85 * cl;
    sun.color.lerp(pal.greySun, cl * 0.6);
    hemi.color.lerp(pal.greySky, cl * 0.6 * day);
    hemi.intensity += 0.25 * cl * day;
    bg.lerp(day > 0.5 ? pal.greyBg : pal.greyBgNight, cl * 0.75);
    // Dry cloud scatters daylight onto shaded walls and the ground. Keep the sun soft.
    const dry = 1 - sm(0, 0.4, Math.max(wx.rain, wx.snow));
    const diffuse = sm(0.55, 1, cl) * dry * (1 - sm(0.35, 0.85, wx.fog)) * day;
    hemi.color.lerp(pal.overcastSky, diffuse);
    hemi.groundColor.lerp(pal.overcastGround, diffuse);
    hemi.intensity += 0.4 * diffuse;
    bg.lerp(pal.overcastHaze, diffuse);
    // The rising sun is east of the meridian. Ease from civil dawn into the morning sky.
    const morning = sm(-6, 2, el) * (1 - sm(4, 24, el)) * sm(0, 0.65, Math.sin(az))
      * dry * (1 - 0.75 * cl) * (1 - wx.fog);
    hemi.color.lerp(pal.morningSky, 0.38 * morning);
    bg.lerp(pal.morningHaze, 0.45 * morning);
    // Low western sun picks out façades and tree crowns; the sky keeps its cool ambient fill.
    const west = sm(0, 0.65, -Math.sin(az)) * dry * (1 - cl) * (1 - wx.fog);
    const evening = (1 - sm(5, 16, el)) * west;
    const beam = sm(-1.25, 5, el) * evening;
    sun.color.lerp(pal.eveningSun, 0.9 * beam);
    sun.intensity += 1.7 * beam;
    // The visible solar disc fades first. Scattered light above the horizon outlasts it.
    const twilight = sm(-9, -2, el) * (1 - sm(1, 8, el)) * west;
    hemi.color.lerp(pal.twilightSky, 0.55 * twilight);
    hemi.intensity += 0.45 * twilight;
    bg.lerp(pal.eveningHaze, 0.32 * beam);
    bg.lerp(pal.afterglow, 0.48 * twilight * sm(-7, -1, el));
    bg.lerp(pal.snowBg, wx.snow * day * 0.4);
    world.setWet(wx.rain);
    terrain?.setWet(wx.rain);
    east?.setWet(wx.rain);
    north?.setWet(wx.rain);
    if (mosaic) for (const a of mosaic.patches.values()) a.setWet(wx.rain);
    // A dev close orbit (?dev&mindist) keeps the fog of the normal 150 m limit, so nearby detail stays clear.
    const dist = Math.max(camera.position.distanceTo(controls.target), controls.minDistance < ORBIT_MIN ? ORBIT_MIN : 0);
    const f = Math.max(wx.fog, wx.rain * 0.5);
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(bg);
    fog.near = dist * (1.5 - 0.65 * f);
    fog.far = dist * (3.0 - 1.25 * f);
    rain.update(reduceMotion ? 0 : performance.now() / 1000, controls.target, reduceMotion ? 0 : wx.rain);
    snow.update(performance.now() / 1000, controls.target, reduceMotion ? 0 : wx.snow, renderer.getPixelRatio());
    // Keep the centre readable while fog softens the edges, matching the Map atmosphere.
    for (const pass of [hts, vts]) {
      pass.uniforms.uStrength.value = tilt + wx.fog * 4;
      pass.enabled = tilt + wx.fog * 4 > 0.01 && !perfOverrides.nopass.has('tilt');
    }
  }

  // ---- loop -----------------------------------------------------------------------------
  let raf = 0;
  let frames = 0;
  let speciesTs = performance.now();
  let fpsT = performance.now();
  let fps = 0;
  let lastFrame = performance.now();
  const project = makeProjector(manifest.origin);
  const driveStart = performance.now();
  // A car counts as drawn only when it is visible and inside its own clipping planes, so
  // follow never frames a consist that a board edge or tunnel mouth has cut away.
  const busDrawn = (x: number, z: number) => edges.every(plane => plane.distanceToPoint(new THREE.Vector3(x, 0, z)) >= 0);
  function locate(v: Followed, states: ReturnType<typeof options.trains>): Fix | null {
    if (v.kind === 'train') {
      const t = states.find(s => s.id === v.id);
      if (!t) return null;
      const [x, z] = project(t.lon, t.lat);
      const cars = leadFirst([...trains.group.children, ...(brookwood?.cars.children ?? []), ...streetcar.cars()]
        .filter(c => c.userData.trainId === t.id));
      return { id: t.id, pathId: t.pathId, tier: t.s.tier, routeId: t.routeId, heading: t.heading, x, z, cars,
        hidden: trainHidden(trainRail, t.routeId, t.pathId, t.s.value, x, z) };
    }
    if (v.kind === 'freight') {
      const cars = leadFirst([...(freight?.poses.children ?? []), ...(brookwood?.freightPoses.children ?? [])]
        .filter(c => c.userData.trainId === v.id));
      if (!cars.length) return null;
      return { id: v.id, tier: 'illustrative', x: cars[0].x, z: cars[0].z, cars, hidden: null };
    }
    if (v.kind === 'bus') {
      const bus = options.buses?.()?.find(b => b.id === v.id);
      if (!bus) return null;
      const shown = buses.positions.find(p => p.id === v.id);
      const [x, z] = shown ? [shown.x, shown.z] : project(bus.position.value.lon, bus.position.value.lat);
      return { id: bus.id, tier: bus.position.tier, x, z, cars: shown && busDrawn(x, z) ? [{ x, z }] : [], hidden: null };
    }
    return null;
  }
  const frame = (ts: number) => {
    raf = requestAnimationFrame(frame);
    const frameStart = performance.now();
    if (!emptyHidden) {
      // Downtown is all built by the first frame; areas are checked as they mount (addArea).
      emptyHidden = true;
      if (!keepEmpty) hideEmptyMeshes(scene);
    }
    followPixelRatio();
    if (!staticFrozen) {
      // Downtown's world, board and scenery are all built by the first frame.
      staticFrozen = true;
      freezeStatic(world.group);
      freezeSelf(terrain?.group);
      freezeStatic(terrain?.board);
      freezeStatic(terrain?.scenery);
      freezeStatic(rolloutBatch.group);
    }
    options.beforeFrame?.(ts);
    // Camera smoothing is tuned per 60 Hz frame; scale it by the real frame time so a drag coasts
    // the same at 30, 60 and 120 fps (city/camera-damping.ts). `?camera=legacy` keeps it per frame.
    const frameMs = legacyCamera ? 1000 / 60 : ts - lastFrame;
    // While a pointer is down, the old controls also took a damping step from each (frame-aligned)
    // pointer event: two per 60 Hz frame. Keep that feel, now by time instead of event count.
    const dragging = orbitInternals.state !== -1;
    const step = frameFraction(DAMPING_PER_60HZ_FRAME, frameMs);
    controls.dampingFactor = legacyCamera || !dragging ? step : 1 - (1 - step) * (1 - step);
    directDrag?.frame(ts);
    stopGestures?.tick?.(frameMs);
    environment(Math.min(1, Math.max(0, (ts - lastFrame) / 1000)));
    lastFrame = ts;
    // Watching a vehicle counts as using the camera, even while it stands still.
    if (options.follow?.vehicle) sliceInput.inputAt = performance.now();
    if (glideTo) {
      const step = glideTo.clone().sub(controls.target).multiplyScalar(reduceMotion ? 1 : frameFraction(GLIDE_PER_60HZ_FRAME, frameMs));
      controls.target.add(step);
      camera.position.add(step);
      // Done within a fixed distance, the same at any frame rate (0.05 m of a 60 Hz step).
      if (glideTo.distanceTo(controls.target) < 0.05 / GLIDE_PER_60HZ_FRAME) glideTo = null;
    }
    if (drive) {
      controls.enabled = false;
      const {eye,ahead} = drive((ts-driveStart)/1000);
      approachMosaic(eye.x,eye.z);
      approachEast(eye.x,eye.z);
      approachNorth(eye.x,eye.z);
      const floor = (p:typeof eye) => {
        const boards = [trafficOptions, east?.connectorBoard, north?.connectorBoard,
          ...Array.from(mosaic?.patches.values() ?? [], a=>a.connectorBoard)];
        for (const board of boards) {
          if(!board)continue;
          const b=board.city.bounds;
          if(p.x<b.minX || p.x>b.maxX || p.z<b.minZ || p.z>b.maxZ)continue;
          const y=board.roadHeight(p.x,p.z,p.road);
          if(y!==null) return y;
        }
        return targetY(p.x,p.z);
      };
      camera.position.set(eye.x, floor(eye)+1.55, eye.z);
      controls.target.set(ahead.x,floor(ahead)+1.65,ahead.z);
      camera.lookAt(controls.target);
      if (scene.fog instanceof THREE.Fog) { scene.fog.near=110; scene.fog.far=800; }
    } else {
      cameraFrame = true;
      controls.update();
      cameraFrame = false;
    }
    freightNight.value = atm.dark;
    if (lightPools) {
      lightPools.setNight(atm.dark, wx.rain);
      lightPools.setEye(camera.position);
      lightPools.begin();
    }
    // Every producer each frame: traffic layers and the North Line are rebuilt as boards mount.
    buses.lights = trains.lights = streetcar.lights = lightPools;
    if (freight) freight.lights = lightPools;
    if (northLine) northLine.lights = lightPools;
    brookwood?.setLights(lightPools);
    for (const layer of [traffic, arterials, midtownArterials]) if (layer) layer.lights = lightPools;
    buses.night.value = atm.dark;
    buses.update(options.buses?.() ?? null);
    const states = options.trains();
    trains.update(states, atm.dark);
    trains.surfaceCars += northLine?.(states, atm.dark) ?? 0;
    trains.surfaceCars += streetcar.update(states, atm.dark);
    if (brookwood) {
      trains.surfaceCars += brookwood.update(states, atm.dark);
    }
    const sceneTime = options.clockMs();
    freight?.update(sceneTime);
    brookwood?.updateFreight(sceneTime);
    const followed = options.follow?.vehicle;
    let fix = followed ? locate(followed, states) : null;
    // A timetable trip replaced by live rail (or the reverse) hands off to its nearest match.
    if (followed && needsHandoff(followed, fix)) {
      const others = states.filter(s => liveSource(s.s.tier) !== liveSource(followed.tier)).flatMap(s => locate({ kind: 'train', id: s.id, tier: s.s.tier }, states) ?? []);
      fix = options.follow!.handoff(others) ?? fix;
    }
    // A followed vehicle loads the area it is heading into, without a manual pan. On the full
    // board follow runs to the mounted edge. Off the mosaic, a train heading east keeps its trip
    // (as "out of view") while King Memorial and its rail load, then falls back to downtown.
    let followBounds: typeof trainBounds | ((p: { x: number; z: number }) => boolean) = trainBounds;
    if (fix && mosaic) {
      mosaic.seek(fix);
      approachMosaic(fix.x, fix.z);
      // Per mounted area, so a failed row counts as off the board. A row still on its way to the
      // vehicle keeps the trip, as the east board does.
      const rects = Array.from(mosaic.areas.values(), a => a.bounds);
      followBounds = p => rects.some(r => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ) || mosaic.pending(p);
    } else if (fix && previewEast) {
      approachEast(fix.x, fix.z);
      if (!eastFailed && !eastRailFailed && !eastRail && (eastLoading || east)) followBounds = { ...b, maxX: eastBounds.maxX };
    }
    const frameFromPreset = options.follow?.framingRequested;
    const focus = options.follow?.frame(fix, followBounds, ts, !!motionPreference?.matches, controls.target);
    if (focus) {
      glideTo = null;
      // An area that finishes loading must not pull the camera back to a remembered point.
      cancelPendingTarget();
      if (frameFromPreset) {
        setView(-FOLLOW_CAMERA.bearing, FOLLOW_CAMERA.tilt, FOLLOW_CAMERA.distance, focus.x, focus.z);
      } else {
        // Translate the orbit with the vehicle, including changes in ground height.
        const t = controls.target;
        const y = targetY(focus.x, focus.z);
        camera.position.x += focus.x - t.x;
        camera.position.y += y - t.y;
        camera.position.z += focus.z - t.z;
        t.set(focus.x, y, focus.z);
        clampTarget();
      }
    }
    watchCamera(camera.position, controls.target, camera.quaternion);
    treeDetail();
    figures?.update(sceneTime, camera, container.clientHeight);
    // Cars off screen (with a shadow-length margin) are not posed or height-sampled.
    if (trafficHeightsStale) {
      trafficHeightsStale = false;
      for (const layer of [traffic, arterials, midtownArterials]) layer?.refreshHeights();
    }
    camera.updateMatrixWorld();
    trafficView.setFromProjectionMatrix(trafficViewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    traffic?.update(sceneTime, atm.dark, trafficView);
    arterials?.update(sceneTime, atm.dark, trafficView);
    midtownArterials?.update(sceneTime, atm.dark, trafficView);
    lightPools?.end();
    if (import.meta.env.DEV && lightPools?.overflowed) console.warn('Headlight pools over capacity this frame');
    const speciesDt = Math.min(0.1, Math.max(0, (ts - speciesTs) / 1000));
    speciesTs = ts;
    for (const a of [terrain, east, north, ...(mosaic ? mosaic.patches.values() : [])]) (a as { update?: (dt: number, c: THREE.Camera) => void } | undefined)?.update?.(speciesDt, camera);
    const northEdge = mosaic?.areas.get('r16'), southEdge = mosaic?.areas.get('brookwood-station');
    if (northEdge && southEdge) seamNormals.sync(northEdge.board.geometry, southEdge.board.geometry);
    rolloutBatch.update(speciesDt, camera, camera.position.distanceTo(controls.target));
    if (!drive) {
      // Tighten the depth range with the orbit distance (city/depth-range.ts).
      const p = camera.position;
      // A dev close-up orbit (?dev&mindist) keeps its shorter near plane; the default 150 m orbit keeps 20 m.
      const near = orbitNear(p.distanceTo(controls.target), p.y - targetY(p.x, p.z), Math.min(20, controls.minDistance / 4));
      if (Math.abs(near - camera.near) > 0.05 * camera.near) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }
    }
    ink.uniforms.tDepth.value = composer.readBuffer.depthTexture;
    // Ink fades out completely by 4.2 km of view depth (vignette/ink.ts). View depth is linear in
    // position, so its minimum over the boards' box is at a corner: when even that is beyond the
    // fade, the pass (and its foliage mask) would only copy the frame, so skip them.
    if (inkWanted) {
      camera.updateMatrixWorld();
      const m = camera.matrixWorldInverse.elements;
      let near = Infinity;
      for (const r of [b, mosaic?.bounds, east?.bounds, north?.bounds]) {
        if (!r) continue;
        for (const x of [r.minX, r.maxX]) for (const y of [-200, 600]) for (const z of [r.minZ, r.maxZ])
          near = Math.min(near, -(m[2] * x + m[6] * y + m[10] * z + m[14]));
      }
      ink.enabled = foliageMask.enabled = near < INK_FADE_END_M;
    }
    if (gtao && !gtaoOld) {
      // The scene pass draws into the composer's current read buffer, which alternates between
      // its two targets, so point AO at whichever depth texture it fills this frame.
      gtao.depthTexture = composer.readBuffer.depthTexture!;
      gtao.gtaoMaterial.uniforms.tDepth.value = gtao.depthTexture;
      gtao.pdMaterial.uniforms.tDepth.value = gtao.depthTexture;
      const lo = gtao.gtaoMaterial.uniforms.sceneBoxMin.value as THREE.Vector3;
      const hi = gtao.gtaoMaterial.uniforms.sceneBoxMax.value as THREE.Vector3;
      lo.set(b.minX, -500, b.minZ);
      hi.set(b.maxX, 3000, b.maxZ);
      for (const r of [mosaic?.bounds, east?.bounds, north?.bounds]) {
        if (!r) continue;
        lo.x = Math.min(lo.x, r.minX); lo.z = Math.min(lo.z, r.minZ);
        hi.x = Math.max(hi.x, r.maxX); hi.z = Math.max(hi.z, r.maxZ);
      }
    }
    ink.uniforms.uNear.value = camera.near;
    ink.uniforms.uFar.value = camera.far;
    ink.uniforms.uStrength.value = 0.9;
    if (placeholder) {
      placeholder.update(ts);
      // Night blue with cream ink after dark; white while the opening's white model holds.
      const dark = whiteModel?.phase === 'white' ? 0 : atm.dark;
      placeholder.setNight(dark);
      ink.uniforms.uMarkNight.value = dark;
      if (dark > 0) {
        ink.uniforms.uMarkCount.value = placeholder.rects(markRects);
        (ink.uniforms.uMarkRects.value as THREE.Vector4[]).forEach((r, i) => r.fromArray(markRects, i * 4));
        camera.updateMatrixWorld();
        (ink.uniforms.uInvViewProj.value as THREE.Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
      }
    }
    grade.uniforms.uAmount.value = 1;
    grade.uniforms.uTime.value = ts / 1000;
    renderer.info.reset();
    const renderStart = performance.now();
    // Count only redraws that render: with shadows off, needsUpdate is set but no pass runs.
    if (renderer.shadowMap.enabled && renderer.shadowMap.needsUpdate) perf.shadowUpdate();
    whiteModel?.before();
    // The backings go with the composer's frame: no composer, or no grade, means CSS blurs.
    const composed = !perfOverrides.postOff && !whiteModel?.holding;
    // A lost context renders nothing, so the panels need CSS until it is restored.
    const glassRects = glass && composed && canvasGlassAllowed() && grade.enabled && !gl.isContextLost() ? glassSource(renderer.domElement) : null;
    glass?.prepare(glassRects);
    if (perfOverrides.postOff) renderer.render(scene, camera);
    else if (composed) composer.render();
    if (glass) showGlass(!!glassRects && glass.drew());
    whiteModel?.after();
    const renderEnd = performance.now();
    perf.frame(ts, renderStart - frameStart, renderEnd - renderStart, renderer.info.render.triangles);
    if (!firstFrame) { firstFrame = true; perf.phase('city:first-frame'); }
    if (import.meta.env.DEV && freezeOn && frames % 120 === 0) {
      const moved = checkFrozen(scene);
      if (moved.length) console.error(`Frozen objects moved without refreeze() (city/freeze.ts): ${moved.length}`, moved.slice(0, 10));
    }
    // A few never-drawn objects per frame in one scratch render, after the frame's own work.
    if (prewarmer?.pending) {
      // The batch adapts: it doubles while steps stay quick (most first draws reuse a compiled
      // program) and halves after a slow one (a real compile), so a phone that compiles slowly
      // never stacks several compiles into one frame.
      const t = performance.now();
      if (prewarmer.step(prewarmBatch)) {
        const ms = performance.now() - t;
        perf.prewarmStep(ms);
        prewarmBatch = ms > 20 ? Math.max(1, prewarmBatch >> 1) : ms < 8 ? Math.min(low ? 6 : 12, prewarmBatch * 2) : prewarmBatch;
      }
      if (!prewarmer.pending && !prewarmDone) { prewarmDone = true; bloomWarmFrames = 1; perf.phase('city:prewarmed'); }
    }
    if (perfOverrides.hide.size && frames % 30 === 0) perf.applyHide();
    frames++;
    if (ts - fpsT > 1000) {
      fps = (frames * 1000) / (ts - fpsT);
      frames = 0;
      fpsT = ts;
    }
  };
  // The first frames: a white study model of this exact scene, then colour (white-model.ts).
  const whiteModel = options.whiteModel ? createWhiteModel({
    renderer, scene, camera, container,
    // Read each frame: some vehicle layers arrive after createCity returns.
    hide: () => [trains.group, buses.mesh, freight?.group, traffic?.group, arterials?.group, midtownArterials?.group, figures?.group,
      brookwood?.cars, (northLine as { group?: THREE.Object3D } | undefined)?.group, rain.mesh, snow.mesh],
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    inkBoost: () => { ink.uniforms.uStrength.value = WHITE_INK; },
    skipPasses: [gtao, aoBlend],
    massesOnly: on => placeholder?.massesOnly(on),
    mode: options.whiteModel,
  }) : undefined;
  if (whiteModel) controls.addEventListener('start', () => whiteModel.cancel());
  if (areasHeld) {
    const release = () => {
      if (!areasHeld) return;
      areasHeld = false;
      perf.phase('city:areas-released');
      if (heldAt && !options.signal?.aborted) approachMosaic(heldAt.x, heldAt.z);
    };
    void (whiteModel?.revealed ?? Promise.resolve()).then(release);
    setTimeout(release, 8000);
  }
  if (import.meta.env.DEV) Object.assign(window, { __cityScene: scene });
  // Downtown's far-board buildings are only seen from beyond 15 km, so they build after colour
  // shows, a few ms a frame, instead of holding up ready; until then its buildings draw as near.
  void (whiteModel?.revealed ?? Promise.resolve()).then(async () => {
    if (!terrain || options.signal?.aborted) return;
    await terrain.buildFar();
    if (!options.signal?.aborted) perf.phase('city:far-boards');
  });
  // Compile what City may show later (weather, dusk and night lights, culled areas) a little at a
  // time once colour shows, so a clock or weather change never stalls on a first-use shader compile.
  // Waits for the reveal: the white model swaps materials while it holds. ?perf&prewarm=0 for an A/B.
  if (!perfOverrides.prewarmOff) {
    prewarmer = createPrewarmer(renderer, scene, camera, sceneTarget.texture.type);
    perf.setPrewarmPending(() => prewarmer?.pending ?? 0);
    const rescan = () => { if (colourShown && !options.signal?.aborted) prewarmer?.scan(); };
    requestPrewarm = () => setTimeout(rescan, 500);
    // Freight, vehicles and night-lit stock can join later; a scan only walks the scene.
    const rescanTimer = setInterval(rescan, 10000);
    options.signal?.addEventListener('abort', () => clearInterval(rescanTimer), { once: true });
    void (whiteModel?.revealed ?? Promise.resolve()).then(() => { colourShown = true; rescan(); });
  }
  let firstFrame = false;
  // Low tier: generic tree limbs are a few pixels beyond ~800 m of orbit, so drop them there
  // (World.setDetail, owned by the tree framework), with hysteresis so a zoom does not flicker.
  const FAR_TREES_M = perfOverrides.farTreesM ?? (low ? 800 : 0);
  let farTrees = false;
  // Low tier: houses cast no shadow beyond this orbit (city/house-lod.ts setDetail).
  const HOUSE_SHADOWS_M = low ? 9000 : 0;
  let houseNoShadow = false;
  const FAR_LAMPS_M = 800;
  let farLamps = false;
  // Areas (and the downtown World) that already carry the current detail; a newly mounted or
  // swapped area is caught here without allocating every frame.
  let detailed = new WeakSet<object>();
  function treeDetail() {
    const d = camera.position.distanceTo(controls.target);
    const far = FAR_TREES_M > 0 && (farTrees ? d > FAR_TREES_M * 0.85 : d > FAR_TREES_M);
    // Past HOUSE_SHADOWS_M houses stop casting: an 8 m house shadow is under 2 px there on the A16, and a
    // 2.4 km far block goes whole into the shadow pass (100k triangles at the default view).
    const noHouseShadows = HOUSE_SHADOWS_M > 0 && (houseNoShadow ? d > HOUSE_SHADOWS_M * 0.84 : d > HOUSE_SHADOWS_M);
    // Both tiers: park path lamps drop out by day beyond this orbit, where their posts read as a
    // fence line of dark dots on open lawn (World.setDetail farLamps).
    const lampsFar = farLamps ? d > FAR_LAMPS_M * 0.85 : d > FAR_LAMPS_M;
    if (far !== farTrees || noHouseShadows !== houseNoShadow || lampsFar !== farLamps) { farTrees = far; houseNoShadow = noHouseShadows; farLamps = lampsFar; detailed = new WeakSet(); }
    // Limb shadows stay on until a moving-camera A16 run shows they cost something.
    const detail = { farTrees: far, houseShadows: !noHouseShadows, farLamps: lampsFar };
    let applied = false;
    const apply = (a: { setDetail(d: { farTrees?: boolean }): void } | undefined) => {
      if (!a || detailed.has(a)) return;
      a.setDetail(detail);
      detailed.add(a);
      applied = true;
    };
    apply(world);
    apply(terrain);
    apply(east);
    apply(north);
    if (mosaic) {
      for (const a of mosaic.areas.values()) apply(a);
      for (const a of mosaic.patches.values()) apply(a);
    }
    if (!applied) return;
    // Limbs cast shadows, and the low shadow map only redraws on camera steps.
    renderer.shadowMap.needsUpdate = true;
    if (perfOverrides.hide.size) perf.applyHide();
  }
  // The placeholder joins before the first frame when its file is in (it loads beside the board's
  // build), so the opening's white still holds it.
  const attachPlaceholder = (loaded: Awaited<typeof placeholderLoad>, late: boolean) => {
    if (!loaded || options.signal?.aborted || cityDisposed) return;
    const p = placeholder = loaded.m.createPlaceholder(loaded.data, {
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      // A dissolve that ends (or an area shown again) changes what casts shadows: redraw Low's
      // manual shadow map then, not every frame of the dissolve.
      changed: () => { renderer.shadowMap.needsUpdate = true; },
      // The skirts end at this board's plinth bottom (the square alone sits higher than Midtown's).
      bottomY: terrain?.bottomY,
    });
    // White stands in only for an area this board will load; the square alone never loads Midtown.
    // A file that arrives after the first frame dissolves in rather than popping.
    for (const id of p.ids) if (mosaic!.areas.has(id as never) || !mosaic!.loads(id)) p.hide(id); else if (late) p.appear(id); else p.show(id);
    scene.add(p.group);
    if (freezeOn) freezeStatic(p.group);
    renderer.shadowMap.needsUpdate = true;
  };
  // Wait briefly: a file that misses this dissolves in when it arrives (appear), so ready never waits on it.
  const early = await Promise.race([placeholderLoad.then(p => ({ p })), new Promise<null>(r => setTimeout(() => r(null), 400))]);
  if (early) attachPlaceholder(early.p, false);
  else void placeholderLoad.then(p => attachPlaceholder(p, true));
  raf = requestAnimationFrame(frame);

  const panPx = (dxPx: number, dyPx: number) => {
    glideTo = null;
    // Metres per pixel at the target, from the camera distance and vertical field of view.
    const dist = camera.position.distanceTo(controls.target);
    const mpp = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.max(1, container.clientHeight);
    const fwd = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = right.multiplyScalar(dxPx * mpp).addScaledVector(fwd, -dyPx * mpp * 1.3);
    controls.target.add(move);
    camera.position.add(move);
    clampTarget();
  };

  if (import.meta.env.DEV) {
    // Dev-only: frame a camera link (bearing, tilt, distance, x, z) without a reload.
    // zoom > 1 narrows the lens from the same position, for close-up evidence shots.
    (window as unknown as Record<string, unknown>).__setView = (bearing: number, tilt: number, dist: number, x: number, z: number, zoom = 1) => {
      manualCamera();
      setView(-bearing, tilt, THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance), x, z);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    };
    (window as unknown as Record<string, unknown>).__cityDev = { scene, camera, renderer, controls, areas: () => mosaic?.areas, areaCount: () => mosaic?.areaCount };
    // Dev-only: which landmark meshes draw on their own, and why (materials/landmark-batch.ts).
    (window as unknown as Record<string, unknown>).__landmarkBatchReport = landmarkBatchReport;
    // Dev-only ground-contact audit (see terrain/ground-audit.ts): window.__groundAudit().
    (window as unknown as Record<string, unknown>).__groundAudit = async (o?: object) => {
      const { groundAudit, cityLayer, CITY_COLORS } = await import('../terrain/ground-audit');
      const areas: [string, NonNullable<typeof terrain>][] = mosaic ? [...mosaic.areas] : [];
      if (!mosaic && terrain) areas.push(['downtown', terrain]);
      if (!mosaic && east) areas.push(['king', east]);
      return groundAudit(scene, areas.map(([id, area]) => ({ id, bounds: area.bounds, terrainAt: area.terrainAt, terrain: [area.board] })), { layer: cityLayer, colors: CITY_COLORS, ...o });
    };
  }
  console.info(`City: built in ${Math.round(buildMs)} ms (${Math.round(performance.now() - t0)} ms including yields), quality ${quality}`);
  console.info('City build stages (ms)', stages);
  return {
    pause() {
      cancelAnimationFrame(raf);
      raf = 0;
      showGlass(false);
    },
    resume() {
      if (renderer.getContext().isContextLost()) return false;
      lastFrame = fpsT = performance.now();
      frames = 0;
      if (!raf) raf = requestAnimationFrame(frame);
      return true;
    },
    measuredGround: !!terrain,
    hasFreight: !!freight,
    hasPeople: !!figures,
    buses,
    get hasTraffic() { return !!(traffic?.group.children.length || arterials?.group.children.length || midtownArterials?.group.children.length); },
    bounds: b,
    quality,
    lookAt(x, z, view) {
      glideTo = null;
      pendingEastTarget = previewEast && !east && x > b.maxX && x <= eastBounds.maxX &&
        z >= eastBounds.minZ && z <= eastBounds.maxZ ? { x, z } : undefined;
      pendingNorthTarget = previewNorth && !north && x > b.maxX && x <= northBounds.maxX &&
        z >= northBounds.minZ && z < northBounds.maxZ ? { x, z } : undefined;
      mosaic?.remember(x, z);
      const offBoard = mosaic ? Math.hypot(mosaic.point(x, z).x - x, mosaic.point(x, z).z - z) >= 1 : false;
      approachMosaic(x, z, offBoard);
      approachEast(x, z);
      approachNorth(x, z);
      const point = pointOnBoard(x, z);
      if (view) {
        const dist = 'distanceM' in view ? view.distanceM : view.metresPerPixel * Math.max(1, container.clientHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
        const tilt = THREE.MathUtils.clamp(view.tilt ?? THREE.MathUtils.radToDeg(controls.getPolarAngle()),
          THREE.MathUtils.radToDeg(controls.minPolarAngle), THREE.MathUtils.radToDeg(controls.maxPolarAngle));
        setView(-view.bearing, tilt, THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance),
          point.x, point.z);
        return;
      }
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      controls.target.set(point.x, targetY(point.x, point.z), point.z);
      clampTarget();
      camera.position.copy(controls.target).add(off);
      controls.update();
    },
    target: () => ({ x: controls.target.x, z: controls.target.z }),
    pendingTarget: () => {
      const p = mosaic?.pendingTarget ?? pendingNorthTarget ?? pendingEastTarget;
      return p ? { x: p.x, z: p.z } : null;
    },
    distance: () => camera.position.distanceTo(controls.target),
    seek(x, z) {
      mosaic?.seek({ x, z });
      approachMosaic(controls.target.x, controls.target.z);
    },
    onBoard(x, z, eventually = false) {
      if (eventually && mosaic) {
        const r = mosaic.bounds;
        return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
      }
      const p = pointOnBoard(x, z);
      return Math.hypot(p.x - x, p.z - z) < 1;
    },
    camera: () => ({
      bearing: -THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()),
      tilt: THREE.MathUtils.radToDeg(controls.getPolarAngle()),
      metresPerPixel: 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, container.clientHeight),
    }),
    pan(dx, dy) { manualCamera(); panPx(dx, dy); },
    rotate(degrees) {
      rotateBy(degrees);
      controls.update();
    },
    zoom(dir) {
      manualCamera();
      glideTo = null;
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      const d = THREE.MathUtils.clamp(off.length() * (dir > 0 ? 0.8 : 1.25), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(off.setLength(d));
      controls.update();
    },
    setAtmosphere(a, now) {
      atm = a;
      const day = local(now).doy;
      sliceInput.dayOfYear = day;
      (terrain ?? world).setSeason(day);
      east?.setSeason(day);
      north?.setSeason(day);
      if (mosaic) for (const a of mosaic.patches.values()) a.setSeason(day);
    },
    drawnAt: (trainId: string) => drawnAt(trainId, trains.group.children, [...(brookwood?.cars.children ?? []), ...streetcar.cars()]),
    freightPassage: (trainId: string) => {
      const car = [...(freight?.poses.children ?? []), ...(brookwood?.freightPoses.children ?? [])]
        .find(c => c.visible && c.userData.trainId === trainId);
      return car ? { kind: 'freight', id: trainId, line: car.userData.line, railroad: car.userData.railroad,
        consist: car.userData.consist, lead: car.userData.lead } : null;
    },
    stats: () => ({ roadVehicles: (traffic?.visibleCars ?? 0) + (arterials?.visibleCars ?? 0) + (midtownArterials?.visibleCars ?? 0), arterialCars: (arterials?.visibleCars ?? 0) + (midtownArterials?.visibleCars ?? 0), freightCars: (freight?.visibleCars ?? 0) + (brookwood?.freightCars ?? 0), surfaceCars: trains.surfaceCars, buses: buses.summary().count, fps, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, buildMs, stages }),
    revealed: whiteModel?.revealed ?? Promise.resolve(),
    beginReveal(mode) {
      if (mode) whiteModel?.setMode(mode);
      whiteModel?.begin();
    },
    glide(x, z) {
      // A loading area must not pull the camera back to a remembered point afterwards.
      mosaic?.cancelTarget();
      pendingNorthTarget = undefined;
      pendingEastTarget = undefined;
      const p = pointOnBoard(x, z);
      glideTo = new THREE.Vector3(p.x, targetY(p.x, p.z), p.z);
    },
    dispose() {
      prewarmer?.dispose();
      perf.setPrewarmPending(null);
      perf.detach(perfContext);
      whiteModel?.dispose();
      cityDisposed = true;
      placeholder?.dispose();
      stopGestures?.();
      directDrag?.dispose();
      squareButton?.remove();
      cancelAnimationFrame(raf);
      showGlass(false);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      glass?.dispose();
      ro.disconnect();
      stopPicking();
      pressEvents.abort();
      controls.removeEventListener('start', startGesture);
      window.removeEventListener('blur', dropGesture);
      renderer.domElement.removeEventListener('pointercancel', dropGesture);
      // A drag held while City leaves gets no 'end'.
      releaseCamera();
      renderer.domElement.removeEventListener('dblclick', onDbl);
      controls.dispose();
      sun.shadow.dispose();
      figures?.dispose();
      freight?.dispose();
      streetcar.dispose();
      buses.dispose();
      traffic?.dispose();
      arterials?.dispose();
      midtownArterials?.dispose();
      disposeBoard();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) mat.dispose();
      });
      for (const pass of composer.passes) pass.dispose();
      composer.dispose();
      sceneTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/**
 * Every heavy-rail MARTA path that crosses the board, one per corridor: the two directions
 * (and lines sharing track) are near-identical centrelines, so a path that runs within a few
 * metres of one already kept is skipped. Tunnels aren't drawn; buildMarta shows open track only.
 */
function martaAlignments(rf: RoutesFile, manifest: SceneManifest, b: VData['bounds'], site: ReturnType<typeof georgiaStateScene>, grid?: GroundGrid) {
  let station: StationTrack | undefined;
  const kept: Alignment[] = [];
  // Keep through services first. A short-turn shape ending at Five Points would
  // otherwise claim half a corridor and be drawn again under the full alignment.
  const ids = Object.keys(manifest.profiles).sort((a, b) => {
    const length = (id: string) => manifest.profiles[id].z.length * manifest.profiles[id].step;
    return length(b) - length(a);
  });
  for (const id of ids) {
    let al: ReturnType<typeof alignment>;
    try {
      al = alignment(rf, manifest, b, id);
    } catch {
      continue;
    }
    if (al.line.length < 20) continue;
    let near = 0;
    let total = 0;
    for (let s = 0; s < al.line.length; s += 25) {
      const p = al.line.at(s);
      if (p.x < b.minX || p.x > b.maxX || p.z < b.minZ || p.z > b.maxZ) continue;
      total++;
      if (kept.some((k) => distToLine(k.line, p.x, p.z, 6) < 6)) near++;
    }
    if (!total || near / total >= 0.9) continue;
    const registered = grid && !station ? registerStationLine(al, site, manifest.rail?.paths[id]) : undefined;
    if (registered) al = registered;
    const track = grid ? terrainAlignment(al, id, manifest, grid) : al;
    if (registered) {
      station = stationTrack(track, al.pathMetresAt, manifest.rail?.paths[id]);
    }
    kept.push(track);
  }
  return { tracks: kept, station };
}

