/**
 * City: downtown Atlanta as a model-railway diorama, in the same style as the East Portal
 * vignette (ink lines, colour grade, tilt-shift) and built by the same engine (`vignette/world`).
 * Loaded on demand from the main app, so the Map never pays for Three.js.
 *
 * Downtown terrain, transport and train geometry share one vertical reference. Older scene
 * bakes use the flat board. Quality is selected once when the view opens.
 */
import * as THREE from 'three';
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
import { createNorthLine } from './midtown-marta-rail';
import { drawnAt } from './drawn-at';
import { drawnCar, FOLLOW_CAMERA, needsHandoff, trainHidden, type Fix, type Followed, type VehicleFollow } from './vehicle-follow';
import { alignment } from '../vignette/alignment';
import { Line } from '../vignette/geom';
import { gradeShader } from '../vignette/grade';
import { FoliageMaskPass, inkShader } from '../vignette/ink';
import { local } from '../vignette/time';
import type { TrafficData } from '../vignette/traffic';
import { tiltShiftShader } from '../vignette/tiltshift';
import { Rain } from '../vignette/weather';
import { World, type Alignment, type VData } from '../vignette/world';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { inConnectorLanes } from '../terrain/connector-paint';
import { createDowntownTerrain } from '../terrain/model';
import { underpassDrive } from './underpass-drive';
import { createSurfaceTransport } from '../terrain/transport';
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
import { createStreetcarCars } from './streetcar-cars';
import { CityFreight } from './freight';
import { CityBuses, busRuns } from './buses';
import type { LiveBus } from '../model/types';
import { CityTrains } from './trains';
import { registerStationLine, stationTrack, type StationTrack } from './station-track';
import { createGeorgiaState } from './station';
import { georgiaStateScene } from './georgia-state-geometry';
import { createFloyd } from './floyd';
import { createGeorgiaPower } from './georgia-power';
import { createGeorgiaPacific } from './georgia-pacific';
import { createFootballHall } from './football-hall';
import { createOneParkTower } from './one-park-tower';
import { createParkPlaceTower } from './park-place-tower';
import { createFiftyFiveParkPlace } from './55-park-place';
import { createFultonBank } from './55-marietta';
import { createRitzCarlton } from './ritz-carlton-atlanta';
import { createSouthernBell } from './southern-bell';
import { createRhodesHaverty } from './rhodes-haverty';
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
import { createPeachtree191 } from './peachtree-191';
import { createHyattRegency } from './hyatt-regency';
import { createAltitudeApartments } from './altitude-apartments';
import { createHiltonAtlanta } from './hilton-atlanta';
import { createMarriottMarquis } from './marriott-marquis';
import { createTwelveCentennial } from './twelve-centennial';
import { createTruistPlaza } from './truist-plaza';
import { createWestin } from './westin';
import { createCoreyTower } from './corey';
import { createRussellBuilding } from './russell-building';
import { createCentennialTower } from './centennial-tower';
import { createStadium } from './stadium';
import { createCapitol } from './capitol';
import { createAtlantaCityHall } from './atlanta-city-hall';
import { createAmericasMart } from './americasmart';
import { createHurtBuilding } from './hurt-building';
import { createTheCenter } from './the-center';
import { createSamNunn } from './sam-nunn';
import { createCandler } from './candler';
import { createEquitable } from './equitable';
import { createGrady } from './grady';
import { createStateFarmArena } from './state-farm-arena';
import { createCongressCenter } from './congress-center';
import { mapGestures } from './map-gestures';
import { listenForTap, pickVehicle, type VehicleSelection } from './pick';
import { Snow } from './snow';

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
  /** True when scene metres (x, z) lie on a mounted area, or with `eventually`, anywhere on
   * the board once every area has mounted. */
  onBoard(x: number, z: number, eventually?: boolean): boolean;
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
  stats(): { roadVehicles: number; arterialCars: number; freightCars: number; surfaceCars: number; buses: number; fps: number; drawCalls: number; triangles: number; buildMs: number; stages: Record<string, number> };
  dispose(): void;
}

/** Phones and small touch screens get the light tier; `?q=low|high` overrides. */
export function pickQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'high') return q;
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  return touch && small ? 'low' : 'high';
}

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export async function createCity(container: HTMLElement, rf: RoutesFile, quality = pickQuality(), options: {
  signal?: AbortSignal;
  progress?: (label: string) => void;
  areaNote?: (text: string | null) => void;
  /** Maps-style input (A2c, ?ui=next): drag pans, right/Ctrl-drag rotates, zoom to cursor, twist, two-finger tilt. */
  mapGestures?: boolean;
  trains: () => TrainState[];
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
  async function asset(name: string) {
    const r = await fetch(`${DATA}/scene/downtown/${name}`, { signal: options.signal });
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
  let grid: GroundGrid | undefined;
  if (manifest.rail?.version === 1 && vd.terrainTransport?.version === 1) {
    try {
      const [spec, bytes] = await Promise.all([
        asset('ground.json').then(r => r.json() as Promise<GroundManifest>),
        asset('ground.i16').then(r => r.arrayBuffer()),
      ]);
      grid = new GroundGrid(spec, bytes);
    } catch {
      options.signal?.throwIfAborted();
      // Older or partially refreshed caches can still render the legacy profiles.
      console.warn('City ground grid unavailable. Using the flat board.');
    }
  }
  const query = new URLSearchParams(location.search);
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
    railModule ??= import('./brookwood').then(mod => {
      if (eastController.signal.aborted) return;
      preparedBrookwood = mod.createBrookwood(spec.vertical.sceneZeroNavd88M);
      return mod;
    }).catch(error => {
      console.warn('Brookwood station unavailable', error);
      return undefined;
    });
    const mod = await railModule;
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
  const mosaic = square && new square.SquareMosaic(DATA, midtown, midtown ? brookwoodGrid : undefined);
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
  };
  const worldOptions = { terrain: 'flat' as const, clumps: low ? 4 : 8, lightMapMax: 2048 };
  let terrain: ReturnType<typeof createDowntownTerrain> | undefined;
  let east: (ReturnType<typeof createDowntownTerrain> & { connectorBoard: ConnectorBoard }) | undefined;
  let eastRail: { dispose(): void; setNight(dark: number): void } | undefined;
  let eastRailFailed = false;
  const areaFailures = new Map<string, string>();
  function areaResult(key: string, note: string | null) {
    if (!mosaic) { options.areaNote?.(note); return; }
    if (note) areaFailures.set(key, note);
    else areaFailures.delete(key);
    options.areaNote?.([...areaFailures.values()].join(' · ') || null);
  }
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
    for (const {parent, object} of replaced) parent.add(object);
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
  let georgiaPacific: ReturnType<typeof createGeorgiaPacific> = null;
  let footballHall: ReturnType<typeof createFootballHall> = null;
  let oneParkTower: ReturnType<typeof createOneParkTower> = null;
  let parkPlaceTower: ReturnType<typeof createParkPlaceTower> = null;
  let fiftyFiveParkPlace: ReturnType<typeof createFiftyFiveParkPlace> = null;
  let fultonBank: ReturnType<typeof createFultonBank> = null;
  let ritzCarlton: ReturnType<typeof createRitzCarlton> = null;
  let southernBell: ReturnType<typeof createSouthernBell> = null;
  let rhodesHaverty: ReturnType<typeof createRhodesHaverty> = null;
  let commerceBuilding: ReturnType<typeof createCommerceBuilding> = null;
  let hundredEdgewood: ReturnType<typeof createHundredEdgewood> = null;
  let metropolitan: ReturnType<typeof createMetropolitan> = null;
  let mariettaBackdrop: ReturnType<typeof createMariettaBackdrop> = null;
  let one12Courtland: ReturnType<typeof createOne12Courtland> = null;
  let citizensTrust: ReturnType<typeof createCitizensTrust> = null;
  let fultonGovernmentCenter: ReturnType<typeof createFultonGovernmentCenter> = null;
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
  let peachtree: ReturnType<typeof createPeachtree191> = null;
  let hyatt: ReturnType<typeof createHyattRegency> = null;
  let altitude: ReturnType<typeof createAltitudeApartments> = null;
  let hilton: ReturnType<typeof createHiltonAtlanta> = null;
  let marquis: ReturnType<typeof createMarriottMarquis> = null;
  let twelve: ReturnType<typeof createTwelveCentennial> = null;
  let truist: ReturnType<typeof createTruistPlaza> = null;
  let westin: ReturnType<typeof createWestin> = null;
  let arena: ReturnType<typeof createStateFarmArena> = null;
  let atlantaCityHall: ReturnType<typeof createAtlantaCityHall> = null;
  let americasMart: ReturnType<typeof createAmericasMart> = null;
  let hurtBuilding: ReturnType<typeof createHurtBuilding> = null;
  let theCenter: ReturnType<typeof createTheCenter> = null;
  let samNunn: ReturnType<typeof createSamNunn> = null;
  let candler: ReturnType<typeof createCandler> = null;
  let equitable: ReturnType<typeof createEquitable> = null;
  let grady: ReturnType<typeof createGrady> = null;
  let russell: ReturnType<typeof createRussellBuilding> = null;
  let centennial: ReturnType<typeof createCentennialTower> = null;
  let capitol: ReturnType<typeof createCapitol> = null;
  let platforms: ReturnType<typeof createGeorgiaState> | undefined;
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
        const afterCenter = peachtreeCenter?.buildings ?? remaining;
        marquis = createMarriottMarquis(afterCenter, ground);
        const hotelSite = marquis?.buildings ?? afterCenter;
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
        parkPlaceTower = createParkPlaceTower(afterHealey, ground);
        const afterParkPlaceTower = parkPlaceTower?.buildings ?? afterHealey;
        fiftyFiveParkPlace = createFiftyFiveParkPlace(afterParkPlaceTower, ground);
        const afterFiftyFiveParkPlace = fiftyFiveParkPlace?.buildings ?? afterParkPlaceTower;
        fultonBank = createFultonBank(afterFiftyFiveParkPlace, ground);
        const afterFultonBank = fultonBank?.buildings ?? afterFiftyFiveParkPlace;
        ritzCarlton = createRitzCarlton(afterFultonBank, ground);
        const afterRitzCarlton = ritzCarlton?.buildings ?? afterFultonBank;
        southernBell = createSouthernBell(afterRitzCarlton, ground);
        const afterSouthernBell = southernBell?.buildings ?? afterRitzCarlton;
        rhodesHaverty = createRhodesHaverty(afterSouthernBell, ground);
        const afterRhodesHaverty = rhodesHaverty?.buildings ?? afterSouthernBell;
        commerceBuilding = createCommerceBuilding(afterRhodesHaverty, ground);
        const afterCommerceBuilding = commerceBuilding?.buildings ?? afterRhodesHaverty;
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
        const afterFultonGovernmentCenter = fultonGovernmentCenter?.buildings ?? afterCitizensTrust;
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
        oneParkTower = createOneParkTower(afterFootballHall, ground);
        const afterOnePark = oneParkTower?.buildings ?? afterFootballHall;
        georgiaPower = createGeorgiaPower(afterOnePark, ground);
        const afterPower = georgiaPower?.buildings ?? afterOnePark;
        georgiaPacific = createGeorgiaPacific(afterPower, groundAt);
        const stackSite = georgiaPacific?.buildings ?? afterPower;
        const stack = createCoreyTower(stackSite, ground);
        const stadiumSite = stack?.buildings ?? stackSite;
        const stadium = createStadium(stadiumSite, ground);
        const afterStadium = stadium?.buildings ?? stadiumSite;
        russell = createRussellBuilding(afterStadium, ground);
        const afterRussell = russell?.buildings ?? afterStadium;
        centennial = createCentennialTower(afterRussell, ground);
        const afterCentennial = centennial?.buildings ?? afterRussell;
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
        const city = { ...vd, buildings: samNunn?.buildings ?? afterTheCenter,
          ground: congressCenter ? [...(vd.ground ?? []), congressCenter.apron] : vd.ground };
        terrain = createDowntownTerrain(ground, city, trees.trees, { quality, bottomY: midtown && square ? square.midtownBaseNavd88M - ground.manifest.vertical.sceneZeroNavd88M : undefined, separateBuilding: square?.summitDowntown, join: mosaic ? mosaic.joins('downtown') : previewNorth ? [eastJoin, northWestJoin] : previewEast ? eastJoin : undefined, openings: [...terrainOpenings(marta), ...(cut ? cutOpenings(ground) : [])] });
        mosaic?.areas.set('downtown', terrain);
        downtownPlinth = world.buildPlinth(terrain.bottomY);
        if (floyd) world.group.add(floyd.group);
        if (hyatt) world.group.add(hyatt.group);
        if (marquis) world.group.add(marquis.group);
        if (hilton) world.group.add(hilton.group);
        if (altitude) world.group.add(altitude.group);
        if (twelve) world.group.add(twelve.group);
        if (truist) world.group.add(truist.group);
        if (westin) world.group.add(westin.group);
        if (peachtreeCenter) world.group.add(peachtreeCenter.group);
        if (peachtree) world.group.add(peachtree.group);
        if (library) world.group.add(library.group);
        if (flatiron) world.group.add(flatiron.group);
        if (healey) world.group.add(healey.group);
        if (footballHall) world.group.add(footballHall.group);
        if (oneParkTower) world.group.add(oneParkTower.group);
        if (parkPlaceTower) world.group.add(parkPlaceTower.group);
        if (fiftyFiveParkPlace) world.group.add(fiftyFiveParkPlace.group);
        if (fultonBank) world.group.add(fultonBank.group);
        if (ritzCarlton) world.group.add(ritzCarlton.group);
        if (southernBell) world.group.add(southernBell.group);
        if (rhodesHaverty) world.group.add(rhodesHaverty.group);
        if (commerceBuilding) world.group.add(commerceBuilding.group);
        if (hundredEdgewood) world.group.add(hundredEdgewood.group);
        if (metropolitan) world.group.add(metropolitan.group);
        if (mariettaBackdrop) world.group.add(mariettaBackdrop.group);
        if (one12Courtland) world.group.add(one12Courtland.group);
        if (citizensTrust) world.group.add(citizensTrust.group);
        if (fultonGovernmentCenter) world.group.add(fultonGovernmentCenter.group);
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
        if (georgiaPacific) world.group.add(georgiaPacific.group);
        if (stack) world.group.add(stack.group);
        if (stadium) world.group.add(stadium.group);
        if (russell) world.group.add(russell.group);
        if (centennial) world.group.add(centennial.group);
        if (capitol) world.group.add(capitol.group);
        if (congressCenter) world.group.add(congressCenter.group);
        if (arena) world.group.add(arena.group);
        if (atlantaCityHall) world.group.add(atlantaCityHall.group);
        if (americasMart) world.group.add(americasMart.group);
        if (hurtBuilding) world.group.add(hurtBuilding.group);
        if (theCenter) world.group.add(theCenter.group);
        if (samNunn) world.group.add(samNunn.group);
        if (candler) world.group.add(candler.group);
        if (equitable) world.group.add(equitable.group);
        if (grady) world.group.add(grady.group);
      });
      await build('sidewalks and trails', () => { travellers = cityTravellers(vd, terrain!.groundAt, low); });
      await build('streets and freight', () => { transport = createSurfaceTransport(withoutTram(americasMart?.surfaceData(vd) ?? vd), ground, terrain!.groundAt, cut); });
    } else {
      if (trees.trees.length) world.realTrees = trees.trees;
      await build('board', () => { world.setOpenCuts(marta); world.buildBoard(); });
      await build('streets', () => world.buildStreets());
      await build('ground', () => world.buildGround());
      await build('freight', () => world.buildFreight());
      await build('buildings', () => world.buildBuildings());
      await build('trees', () => world.buildTrees());
    }
    // The Atlanta Streetcar draws its own embedded track and wire from the GTFS shapes,
    // the geometry its vehicles run on. The OSM tram strips stopped at the downtown edge.
    await build('streetcar', () => {
      const flat = (x: number, z: number) => world.ground(x, z) + 0.2; // vignette road surface
      const ground = terrain ? terrain.groundAt : flat;
      const height = roadSurface(vd.roads, cityRoadHeight(vd, ground, transport?.deckAt), ground);
      streetcarDowntown = buildStreetcarTrack(streetcarLines(rf, manifest.origin), b, height, poleBlocked(vd.roads, vd.buildings));
      streetcarSurface.push({ bounds: b, height });
      world.group.add(streetcarDowntown.group);
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
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene();
  const bg = new THREE.Color('#e7e2d8');
  scene.background = bg;
  scene.fog = new THREE.Fog('#e7e2d8', 5000, 12000);
  scene.add(world.group);
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
  const freight = transport?.freightTreads.length ? new CityFreight(transport.freightTreads, edges) : undefined;
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
        busOccupies: buses.occupies.bind(buses),
        roadHeight: cityRoadHeight(vd, terrain.groundAt, transport?.deckAt) }
    : undefined;
  let traffic = trafficOptions && new ConnectorTraffic(trafficOptions);
  function extendConnectorTraffic() {
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
    if (!trafficOptions || !mosaic || ![...added].some(id => Object.hasOwn(midtownRowBounds, id))) return;
    const build = ++midtownBuild;
    const { MidtownArterialTraffic } = await import('./midtown-arterial-traffic');
    if (build !== midtownBuild || eastController.signal.aborted) return;
    const boards = [...mosaic.patches].filter(([id]) => Object.hasOwn(midtownRowBounds, id))
      .map(([row, a]) => ({ row, ...a.connectorBoard }));
    const { city: _city, roadHeight: _height, ...shared } = trafficOptions;
    const next = new MidtownArterialTraffic({ ...shared, clippingPlanes: [] }, boards);
    midtownArterials?.dispose();
    midtownArterials = next;
    scene.add(next.group);
  }
  const corridors = trafficOptions && loadArterials(arterialData, vd).corridors;
  const arterials = trafficOptions && corridors?.length
    ? new ArterialTraffic({ ...trafficOptions, arterials: corridors })
    : undefined;
  if (traffic) scene.add(traffic.group);
  if (arterials) scene.add(arterials.group);
  const figures = terrain && travellers.length ? new StreetFigures(travellers, terrain.groundAt, low) : undefined;
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
  sun.shadow.mapSize.set(low ? 1024 : 4096, low ? 1024 : 4096);
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
  controls.minPolarAngle = THREE.MathUtils.degToRad(20);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
  controls.minDistance = 150;
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
  function addArea(area: NonNullable<typeof east>) {
    // A crown rooted inside the mosaic can overhang its outer edge. Interior joins stay open.
    if (perimeter) clipScenery(area.scenery, perimeter);
    scene.add(area.group);
    scenery.push(area.group);
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
  function approachMosaic(x: number, z: number) {
    mosaic?.approach(x, z, quality, eastController.signal, (added, target) => {
      for (const area of added.values()) addArea(area);
      const atl = added.get('brookwood-station');
      if (atl) {
        const line = createNorthLine(atl, rf, manifest.origin, trains.group);
        northLine = line;
        // The area's dispose clears its group without freeing it; free the North Line too.
        const disposeArea = atl.dispose.bind(atl);
        atl.dispose = () => { line?.dispose(); if (northLine === line) northLine = undefined; disposeArea(); };
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
    }, direction => areaResult(direction, `Could not load the ${direction} section. Use Show full board to retry.`));
  }
  function approachNorth(x: number, z: number) {
    if (!previewNorth || north || !east || !terrain || !grid) return;
    if (!nearNorth(x, z)) {
      if (northFailed && !mosaic) options.areaNote?.(null);
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
      mosaic?.mount('auburn', area);
      updatePlinth(mosaic ? mosaicBase() : joinedPlinth(b, downtown.bottomY, northBounds.minZ));
      addArea(area);
      north = area;
      {
        const board = area.connectorBoard;
        const surface = roadSurface(board.city.roads, board.roadHeight, area.groundAt);
        const track = buildStreetcarTrack(streetcarLines(rf, manifest.origin), area.bounds, surface, poleBlocked(board.city.roads, board.city.buildings));
        const entry = { bounds: area.bounds, height: surface };
        streetcarSurface.push(entry);
        area.group.add(track.group);
        const disposeArea = area.dispose.bind(area);
        area.dispose = () => {
          track.dispose();
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
    }).finally(() => { northLoading = false; pendingNorthTarget = undefined; });
  }
  function approachEast(x: number, z: number) {
    if (!previewEast || east || !terrain || !grid) return;
    if (!nearEast(x, z) && !(previewNorth && nearNorth(x, z))) {
      if (eastFailed && !mosaic) options.areaNote?.(null);
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
      addArea(area);
      if (!mosaic) { area.openJoin(); downtown.openJoin(); }
      east = area;
      extendConnectorTraffic();
      loadKingRail(area);
      const next = pendingNorthTarget ?? controls.target;
      if (wholeBoardRequested) approachNorth(1400, 0);
      else approachNorth(next.x, next.z);
      areaResult('king', null);
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
    }).finally(() => { eastLoading = false; pendingEastTarget = undefined; });
  }
  // MARTA through the east area (track, station, trains). Rail owns this; the area mount calls it.
  function loadKingRail(area: NonNullable<typeof east>) {
    eastRailFailed = false;
    void attachEastRail(area).then(() => {
      if (mosaic && !eastController.signal.aborted) areaResult('rail', null);
    }).catch(err => {
      if (eastController.signal.aborted) return;
      eastRailFailed = true;
      if (mosaic) areaResult('rail', 'King Memorial rail could not load. Show full board to retry.');
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
      const y = a.groundAt(x, z);
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
    approachMosaic(x,z);
    setView(-bearing,tilt,Math.max(150,scale*container.clientHeight/(2*Math.tan(THREE.MathUtils.degToRad(11)))),x,z);
  }
  if (brookwoodStudy) {
    mosaic?.remember(-92,-5054);
    approachMosaic(-92,-5054);
  }

  // ---- post: ink, ambient occlusion, bloom, tilt-shift, grade ------------------------------
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  sceneTarget.depthTexture = new THREE.DepthTexture(1, 1);
  const composer = new EffectComposer(renderer, sceneTarget);
  composer.addPass(new RenderPass(scene, camera));
  const ink = new ShaderPass(inkShader());
  // Named species' leaves (inkFoliageMesh) draw into a mask the ink pass reads; with none on the
  // board the pass does nothing and the ink is unchanged.
  composer.addPass(new FoliageMaskPass(scene, camera, ink));
  composer.addPass(ink);
  const gtao = low ? null : new GTAOPass(scene, camera, 1, 1);
  if (gtao) {
    gtao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.5, thickness: 4, scale: 1.2 });
    gtao.blendIntensity = 0.9;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0, 0.55, 0.82);
  composer.addPass(bloom);
  const hts = new ShaderPass(tiltShiftShader([1, 0]));
  const vts = new ShaderPass(tiltShiftShader([0, 1]));
  composer.addPass(hts);
  composer.addPass(vts);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(gradeShader());
  composer.addPass(grade);
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
    bloom.resolution.set(w / 2, h / 2);
    const pr = renderer.getPixelRatio();
    ink.uniforms.uTexel.value.set(1 / (w * pr), 1 / (h * pr));
    ink.uniforms.uWidth.value = Math.max(1, pr);
    grade.uniforms.uRes.value.set(w * pr, h * pr);
    for (const p of [hts, vts]) {
      p.uniforms.uTexel.value.set(1 / w, 1 / h);
      p.uniforms.uStrength.value = tilt;
      p.enabled = tilt > 0.01;
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

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
  };
  renderer.domElement.addEventListener('dblclick', onDbl);
  const manualCamera = () => { mosaic?.cancelTarget(); pendingNorthTarget = undefined; pendingEastTarget = undefined; if (options.follow?.active) options.follow.stop(); };
  controls.addEventListener('start', manualCamera);
  // Every gesture, OrbitControls' own and the twist and double-tap below, goes through manualCamera.
  /** Turn the view about its target; the frame loop's controls.update() applies it. */
  const rotateBy = (degrees: number) => {
    manualCamera();
    glideTo = null;
    const off = new THREE.Vector3().subVectors(camera.position, controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees));
    camera.position.copy(controls.target).add(off);
  };
  const stopGestures = options.mapGestures ? mapGestures(controls, renderer.domElement, rotateBy, manualCamera) : undefined;
  // Maps-style input zooms on double-click instead of gliding to the clicked point.
  if (options.mapGestures) renderer.domElement.removeEventListener('dblclick', onDbl);
  if (squareButton && mosaic) {
    squareButton.type = 'button';
    squareButton.textContent = 'Show full board';
    document.getElementById('city-info')?.append(squareButton);
    const loadFullBoard = () => {
      wholeBoardRequested = true;
      eastFailed = northFailed = false;
      mosaic.requestFullBoard();
      if (east && eastRailFailed) loadKingRail(east);
      // This explicit request also works as a retry when any geographic pack is missing.
      approachMosaic(400, -1500);
      approachEast(1400, 0);
      approachNorth(1400, 0);
    };
    const frameFullBoard = () => {
      const aspect = Math.max(.25, camera.aspect);
      const depth = 1100 - mosaic.northEdge;
      const distance = midtown ? Math.max(depth * 2.95, 11700 / aspect) : Math.max(9200, 9600 / aspect);
      const centerZ = (1100 + mosaic.northEdge) / 2;
      mosaic.remember(400, centerZ);
      setView(-15, 35, Math.min(controls.maxDistance, distance), 400, centerZ);
    };
    if (rectangle || !midtown) {
      loadFullBoard();
      if (!drive && !brookwoodStudy && !Object.hasOwn(profileCameras, profile)) frameFullBoard();
    }
    squareButton.onclick = () => {
      manualCamera();
      glideTo = null;
      loadFullBoard();
      frameFullBoard();
      document.getElementById('city-info')?.hidePopover?.();
    };
  }
  const stopPicking = listenForTap(renderer.domElement, (clientX, clientY) => {
    const r = renderer.domElement.getBoundingClientRect();
    options.selectVehicle?.(pickVehicle(clientX - r.left, clientY - r.top, r.width, r.height,
      camera, trains.group, buses.positions, edges, scenery, freight?.group, brookwood?.cars, brookwood?.freight, streetcar.group));
  });

  // ---- sun, sky, weather --------------------------------------------------------------
  const C = (x: string) => new THREE.Color(x);
  const pal = {
    skyDay: C('#e4ecf7'), skyNight: C('#6f86c8'),
    gndDay: C('#a48d72'), gndNight: C('#2c3346'),
    bgDay: C('#e7e2d8'), bgDusk: C('#e2b998'), bgNight: C('#232a3f'),
    tableDay: C('#d8d2c6'), tableNight: C('#2b3142'),
    sunHigh: C('#fff1da'), sunLow: C('#ffa45c'),
    greySky: C('#cfd4da'), greyBg: C('#c6c8c9'), greyBgNight: C('#1e2229'), greySun: C('#e8ecf0'),
    snowBg: C('#eef0f2'),
  };
  const sm = (a: number, c: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (c - a)));
    return k * k * (3 - 2 * k);
  };
  let atm: Atmosphere = { sunElev: 40, sunAz: 180, dark: 0, cloud: 0, rain: 0, snow: 0, fog: 0 };
  const wx = { cloud: 0, rain: 0, snow: 0, fog: 0 }; // eased toward the atmosphere's weather
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shadowTarget = new THREE.Vector3(Infinity, 0, Infinity);
  let shadowElev = Infinity;
  let shadowAz = Infinity;

  function environment(dt: number) {
    const el = atm.sunElev;
    const day = sm(-6, 10, el);
    const gold = (1 - sm(3, 28, el)) * sm(-3, 2, el);
    const elDir = Math.max(el, 4) * (Math.PI / 180);
    const az = atm.sunAz * (Math.PI / 180);
    const t = controls.target;
    if (t.distanceToSquared(shadowTarget) > 1 || Math.abs(el - shadowElev) > 0.1 || Math.abs(atm.sunAz - shadowAz) > 0.1) {
      renderer.shadowMap.needsUpdate = true;
      shadowTarget.copy(t);
      shadowElev = el;
      shadowAz = atm.sunAz;
    }
    sun.position.set(t.x + Math.sin(az) * Math.cos(elDir) * 2000, Math.sin(elDir) * 2000, t.z - Math.cos(az) * Math.cos(elDir) * 2000);
    sun.target.position.set(t.x, 0, t.z);
    sun.intensity = 2.9 * sm(-1, 7, el);
    sun.color.copy(pal.sunHigh).lerp(pal.sunLow, gold);
    hemi.color.copy(pal.skyNight).lerp(pal.skyDay, day);
    hemi.groundColor.copy(pal.gndNight).lerp(pal.gndDay, day);
    hemi.intensity = 1.05 + 0.45 * day;
    bg.copy(pal.bgNight).lerp(pal.bgDay, day).lerp(pal.bgDusk, gold * 0.7);
    tableMat.color.copy(pal.tableNight).lerp(pal.tableDay, day);
    const night = atm.dark;
    world.setNight(night);
    platforms?.setNight(night);
    floyd?.setNight(night);
    eastRail?.setNight(night);
    hyatt?.setNight(night);
    marquis?.setNight(night);
    hilton?.setNight(night);
    altitude?.setNight(night);
    twelve?.setNight(night);
    truist?.setNight(night);
    westin?.setNight(night);
    peachtreeCenter?.setNight(night);
    peachtree?.setNight(night);
    library?.setNight(night);
    flatiron?.setNight(night);
    healey?.setNight(night);
    footballHall?.setNight(night);
    oneParkTower?.setNight(night);
    parkPlaceTower?.setNight(night);
    fiftyFiveParkPlace?.setNight(night);
    fultonBank?.setNight(night);
    ritzCarlton?.setNight(night);
    southernBell?.setNight(night);
    rhodesHaverty?.setNight(night);
    commerceBuilding?.setNight(night);
    hundredEdgewood?.setNight(night);
    metropolitan?.setNight(night);
    mariettaBackdrop?.setNight(night);
    one12Courtland?.setNight(night);
    citizensTrust?.setNight(night);
    fultonGovernmentCenter?.setNight(night);
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
    georgiaPacific?.setNight(night);
    russell?.setNight(night);
    centennial?.setNight(night);
    capitol?.setNight(night);
    arena?.setNight(night);
    atlantaCityHall?.setNight(night);
    americasMart?.setNight(night);
    hurtBuilding?.setNight(night);
    theCenter?.setNight(night);
    samNunn?.setNight(night);
    candler?.setNight(night);
    equitable?.setNight(night);
    grady?.setNight(night);
    terrain?.setNight(night);
    east?.setNight(night);
    north?.setNight(night);
    if (mosaic) for (const a of mosaic.patches.values()) a.setNight(night);
    bloom.strength = 0.55 * night;
    bloom.enabled = !low && night > 0.02;

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
    bg.lerp(pal.snowBg, wx.snow * day * 0.4);
    world.setWet(wx.rain);
    terrain?.setWet(wx.rain);
    east?.setWet(wx.rain);
    north?.setWet(wx.rain);
    if (mosaic) for (const a of mosaic.patches.values()) a.setWet(wx.rain);
    const dist = camera.position.distanceTo(controls.target);
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
      pass.enabled = tilt + wx.fog * 4 > 0.01;
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
  const motionPreference = options.follow ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  const driveStart = performance.now();
  // A car counts as drawn only when it is visible and inside its own clipping planes, so
  // follow never frames a consist that a board edge or tunnel mouth has cut away.
  const busDrawn = (x: number, z: number) => edges.every(plane => plane.distanceToPoint(new THREE.Vector3(x, 0, z)) >= 0);
  function locate(v: Followed, states: ReturnType<typeof options.trains>): Fix | null {
    if (v.kind === 'train') {
      const t = states.find(s => s.id === v.id);
      if (!t) return null;
      const [x, z] = project(t.lon, t.lat);
      const cars = [...trains.group.children, ...(brookwood?.cars.children ?? []), ...streetcar.cars()]
        .filter(c => c.userData.trainId === t.id).flatMap(c => drawnCar(c) ?? []);
      return { id: t.id, pathId: t.pathId, tier: t.s.tier, routeId: t.routeId, heading: t.heading, x, z, cars,
        hidden: trainHidden(trainRail, t.routeId, t.pathId, t.s.value, x, z) };
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
    options.beforeFrame?.(ts);
    environment(Math.min(1, Math.max(0, (ts - lastFrame) / 1000)));
    lastFrame = ts;
    if (glideTo) {
      const step = glideTo.clone().sub(controls.target).multiplyScalar(reduceMotion ? 1 : 0.12);
      controls.target.add(step);
      camera.position.add(step);
      if (step.length() < 0.05) glideTo = null;
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
    } else controls.update();
    buses.night.value = atm.dark;
    buses.update(options.buses?.() ?? null);
    const states = options.trains();
    trains.update(states, atm.dark);
    trains.surfaceCars += northLine?.(states, atm.dark) ?? 0;
    trains.surfaceCars += streetcar.update(states, atm.dark);
    if (brookwood) {
      trains.surfaceCars += brookwood.update(states, atm.dark);
    }
    const followed = options.follow?.vehicle;
    let fix = followed ? locate(followed, states) : null;
    // A timetable trip replaced by live rail (or the reverse) hands off to its nearest match.
    if (followed && needsHandoff(followed, fix)) {
      const others = states.filter(s => s.s.tier !== followed.tier).flatMap(s => locate({ kind: 'train', id: s.id, tier: s.s.tier }, states) ?? []);
      fix = options.follow!.handoff(others) ?? fix;
    }
    // A followed vehicle loads the area it is heading into, without a manual pan. On the full
    // board follow runs to the mounted edge. Off the mosaic, a train heading east keeps its trip
    // (as "out of view") while King Memorial and its rail load, then falls back to downtown.
    let followBounds: typeof trainBounds | ((p: { x: number; z: number }) => boolean) = trainBounds;
    if (fix && mosaic) {
      approachMosaic(fix.x, fix.z);
      // Per mounted area, so a row that failed or is still loading counts as off the board.
      const rects = Array.from(mosaic.areas.values(), a => a.bounds);
      followBounds = p => rects.some(r => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ);
    } else if (fix && previewEast) {
      approachEast(fix.x, fix.z);
      if (!eastFailed && !eastRailFailed && !eastRail && (eastLoading || east)) followBounds = { ...b, maxX: eastBounds.maxX };
    }
    const focus = options.follow?.frame(fix, followBounds, ts, !!motionPreference?.matches, controls.target);
    if (focus) {
      glideTo = null;
      // An area that finishes loading must not pull the camera back to a remembered point.
      mosaic?.cancelTarget(); pendingNorthTarget = undefined; pendingEastTarget = undefined;
      setView(-FOLLOW_CAMERA.bearing, FOLLOW_CAMERA.tilt, FOLLOW_CAMERA.distance, focus.x, focus.z);
    }
    const sceneTime = options.clockMs();
    figures?.update(sceneTime, camera, container.clientHeight);
    freight?.update(sceneTime);
    brookwood?.updateFreight(sceneTime);
    traffic?.update(sceneTime, atm.dark);
    arterials?.update(sceneTime, atm.dark);
    midtownArterials?.update(sceneTime, atm.dark);
    const speciesDt = Math.min(0.1, Math.max(0, (ts - speciesTs) / 1000));
    speciesTs = ts;
    for (const a of [terrain, east, north, ...(mosaic ? mosaic.patches.values() : [])]) (a as { update?: (dt: number, c: THREE.Camera) => void } | undefined)?.update?.(speciesDt, camera);
    ink.uniforms.tDepth.value = composer.readBuffer.depthTexture;
    ink.uniforms.uNear.value = camera.near;
    ink.uniforms.uFar.value = camera.far;
    ink.uniforms.uStrength.value = 0.9;
    grade.uniforms.uAmount.value = 1;
    grade.uniforms.uTime.value = ts / 1000;
    renderer.info.reset();
    composer.render();
    frames++;
    if (ts - fpsT > 1000) {
      fps = (frames * 1000) / (ts - fpsT);
      frames = 0;
      fpsT = ts;
    }
  };
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

  console.info(`City: built in ${Math.round(buildMs)} ms (${Math.round(performance.now() - t0)} ms including yields), quality ${quality}`);
  console.info('City build stages (ms)', stages);
  return {
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
      approachMosaic(x, z);
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
    distance: () => camera.position.distanceTo(controls.target),
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
      (terrain ?? world).setSeason(day);
      east?.setSeason(day);
      north?.setSeason(day);
      if (mosaic) for (const a of mosaic.patches.values()) a.setSeason(day);
    },
    drawnAt: (trainId: string) => drawnAt(trainId, trains.group.children, [...(brookwood?.cars.children ?? []), ...streetcar.cars()]),
    stats: () => ({ roadVehicles: (traffic?.visibleCars ?? 0) + (arterials?.visibleCars ?? 0) + (midtownArterials?.visibleCars ?? 0), arterialCars: (arterials?.visibleCars ?? 0) + (midtownArterials?.visibleCars ?? 0), freightCars: (freight?.visibleCars ?? 0) + (brookwood?.freightCars ?? 0), surfaceCars: trains.surfaceCars, buses: buses.summary().count, fps, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, buildMs, stages }),
    dispose() {
      stopGestures?.();
      squareButton?.remove();
      cancelAnimationFrame(raf);
      ro.disconnect();
      stopPicking();
      controls.removeEventListener('start', manualCamera);
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
      if (kept.some((k) => distToLine(k.line, p.x, p.z) < 6)) near++;
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

function distToLine(line: Line, x: number, z: number) {
  let best = Infinity;
  const pts = line.pts;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, az] = pts[i - 1];
    const [bx, bz] = pts[i];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return best;
}
