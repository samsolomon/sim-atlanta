/**
 * Model Lab station-platform inspection: the CQ400 stopped at an illustrative island or pair of
 * side platforms. It is built from the shared platform primitive (StationLayout, boardingChoices,
 * platformSection) and the CQ400's own floor height and door positions, so track clearance, the
 * boarding edge and door alignment can be read at a glance. The layouts are illustrative: they are
 * not a sourced station. See docs/model-lab-platforms.md.
 *
 * Lab frame: the track runs along z and the cab faces +z, which is the reference direction. "Right"
 * of +z, looking along it with y up, is −x, so a lateral offset v (positive right) sits at x = −v.
 */
import * as THREE from 'three';
import { boardingChoices, type Side, type StationLayout } from '../model/platforms';
import { platformSection } from '../city/platform-section';
import { CAR_FLOOR, CAR_GAP, CAR_LENGTH, CAR_WIDTH, CQ400_DOORS } from '../vignette/cq400';
import { labTrack } from './track';

export type PlatformKind = 'island' | 'side';

/**
 * Level boarding for rapid rail (49 CFR 38.53(d)): a horizontal gap of no more than 3 in (76 mm),
 * and the car floor within ±5/8 in (16 mm) of the platform. The lab sets the gap just inside that
 * limit.
 */
export const LIMITS = { gapM: 0.076, stepM: 0.016 } as const;
export const GAP_M = 0.075;
const TRACK_TO_LIP = CAR_WIDTH / 2 + GAP_M;
const ISLAND_WIDTH = 8, SIDE_WIDTH = 5;
/** Side-platform track centres 4.86 m apart, as surveyed at Georgia State (docs/georgia-state-geometry.md). */
const SIDE_HALF = 2.43;
const LENGTH = 52; // covers the two lab cars (47.6 m) with a short run-off at each end

export const LAYOUTS: Record<PlatformKind, { layout: StationLayout; offsets: Record<string, number>; bounds: Record<string, [number, number]> }> = {
  island: {
    layout: { id: 'lab:island', tracks: ['T1', 'T2'], platforms: [{ id: 'island', edges: [{ trackId: 'T1', side: 'right' }, { trackId: 'T2', side: 'left' }] }] },
    offsets: { T1: -(ISLAND_WIDTH / 2 + TRACK_TO_LIP), T2: ISLAND_WIDTH / 2 + TRACK_TO_LIP },
    bounds: { island: [-50, 50] },
  },
  side: {
    layout: { id: 'lab:side', tracks: ['T1', 'T2'], platforms: [
      { id: 'north', edges: [{ trackId: 'T1', side: 'left' }] },
      { id: 'south', edges: [{ trackId: 'T2', side: 'right' }] },
    ] },
    offsets: { T1: -SIDE_HALF, T2: SIDE_HALF },
    bounds: { north: [-SIDE_HALF - TRACK_TO_LIP - SIDE_WIDTH, 50], south: [-50, SIDE_HALF + TRACK_TO_LIP + SIDE_WIDTH] },
  },
};

/** Door-pair centres in lab z for the lab's two cars (cab car ahead at +z, middle car behind). */
export function doorCentres() {
  const cab = CAR_LENGTH / 2 + CAR_GAP / 2, mid = -cab;
  return [...CQ400_DOORS.cab.map((d) => cab + d), ...CQ400_DOORS.middle.map((d) => mid + d)].sort((a, b) => a - b);
}

const mat = (color: string) => new THREE.MeshLambertMaterial({ color });

/** The stopped train travels +z on the track that boards on its right. Returns the scene and what the panel reports. */
export function createPlatformScene(kind: PlatformKind) {
  const { layout, offsets, bounds } = LAYOUTS[kind];
  // Stop on the track whose boarding edge is on the train's right, so the lab's presets (which
  // look from −x) face the platform side of the car in both layouts.
  const choices = boardingChoices(layout, 1);
  const choice = choices.find((c) => c.doorSide === 'right') ?? choices[0];
  const stopTrack = choice.trackId;
  const group = new THREE.Group();
  group.name = `Model Lab ${kind} platform`;
  const materials = [mat('#c9c3b6'), mat('#e2bd3c'), mat('#eee8da')];
  const [concrete, tactile, doorZone] = materials;
  for (const id of layout.tracks) {
    const t = labTrack();
    t.position.x = -offsets[id];
    t.traverse((o) => ((o as THREE.Mesh).receiveShadow = true));
    group.add(t);
  }
  const top = CAR_FLOOR; // level boarding: the platform meets the car floor
  const doors = doorCentres();
  const slabs = layout.platforms.map((p) => {
    const s = platformSection(p, bounds[p.id], offsets, TRACK_TO_LIP);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(s.max - s.min, top + 0.05, LENGTH), concrete);
    slab.position.set(-(s.min + s.max) / 2, (top - 0.05) / 2, 0);
    slab.castShadow = slab.receiveShadow = true;
    group.add(slab);
    for (const lip of s.lips) {
      // A 0.6 m tactile strip along each boarding edge.
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.012, LENGTH), tactile);
      strip.position.set(-(lip.v + lip.inward * 0.3), top + 0.006, 0);
      group.add(strip);
      // Door zones: the CQ400's door pairs marked on the platform beside the stopped train's edge.
      const facesTrain = p.edges.some((e) => e.trackId === stopTrack && (e.side === 'right' ? 1 : -1) === lip.inward);
      if (!facesTrain) continue;
      for (const z of doors) {
        const zone = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.014, CQ400_DOORS.width), doorZone);
        zone.position.set(-(lip.v + lip.inward * (0.6 + 0.7)), top + 0.007, z);
        group.add(zone);
      }
    }
    return { id: p.id, ...s };
  });
  const lipToCar = TRACK_TO_LIP - CAR_WIDTH / 2;
  return {
    group,
    layout,
    trainX: -offsets[stopTrack],
    stopTrack,
    platformTop: top,
    slabs,
    doorSide: choice.doorSide as Side,
    platformId: choice.platformId,
    doors,
    report: { gapM: lipToCar, stepM: top - CAR_FLOOR, withinGap: lipToCar <= LIMITS.gapM, withinStep: Math.abs(top - CAR_FLOOR) <= LIMITS.stepM },
    dispose() {
      group.removeFromParent();
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      for (const m of materials) m.dispose();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh && !materials.includes(o.material as THREE.MeshLambertMaterial)) (o.material as THREE.Material).dispose();
      });
    },
  };
}
