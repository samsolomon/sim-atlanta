import * as THREE from 'three';
import { expect, it } from 'vitest';
import { bounds } from '../square-board/sections';
import { fullBoardFrame, looksNorth, mosaicPlinth, mountedBounds, nearestPoint, nearSection, northLookM } from './square-mosaic';

it('clamps the camera and walnut base to the same available ground during a partial load', () => {
  const rects = [bounds.downtown, bounds['north-band'], bounds['north-corner']];
  const base = mosaicPlinth(rects, -48);
  base.updateMatrixWorld(true);
  function covers(x: number, z: number) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 0, z), new THREE.Vector3(0, -1, 0));
    return ray.intersectObject(base).length > 0;
  }
  try {
    expect(covers(1790, -1690)).toBe(true);
    expect(covers(1500, -900)).toBe(true);
    expect(covers(1500, 0)).toBe(false);
    expect(covers(1500, 900)).toBe(false);
    expect(nearestPoint(rects, 1500, -900)).toEqual({ x: 1500, z: -900 });
    expect(nearestPoint(rects, 1500, 0)).toEqual({ x: 1000, z: 0 });
    for (const [x, z] of [[-1000, -1700], [1800, -1700], [-1000, 1100], [1800, 1100]]) {
      expect(nearestPoint(Object.values(bounds), x, z)).toEqual({ x, z });
    }
  } finally { base.geometry.dispose(); base.material.dispose(); }
});

it('clips canopy to the mounted rows, so a missing north row leaves no crowns past the walnut lip', () => {
  const lip = 8;
  const full = Object.values(bounds);
  // Brookwood station failed to load: the board, and its canopy, end at brookwood-south.
  const station = full.filter(r => r !== bounds.r16);
  const partial = station.filter(r => r !== bounds['brookwood-station']);
  for (const [rects, north] of [[full, -6500], [station, -5700], [partial, -4900]] as const) {
    const clip = mountedBounds([...rects]);
    expect(clip).toEqual({ minX: -1000, maxX: 1800, minZ: north, maxZ: 1100 });
    const base = mosaicPlinth([...rects], -48);
    const box = new THREE.Box3().setFromObject(base);
    try {
      expect(box.min.x).toBe(clip.minX - lip); expect(box.max.x).toBe(clip.maxX + lip);
      expect(box.min.z).toBe(clip.minZ - lip); expect(box.max.z).toBe(clip.maxZ + lip);
    } finally { base.geometry.dispose(); base.material.dispose(); }
  }
});

it('requests only the section within reach of the camera, including the short King corner', () => {
  for (const [x, z, direction] of [[0, -260, null], [0, -1200, 'north'], [100, -1199, null],
  [1500, -570, 'north'], [1600, 620, 'south'], [-250, 600, 'south'], [1500, 0, null]] as const) {
    expect(nearSection('north', x, z)).toBe(direction === 'north');
    expect(nearSection('south', x, z)).toBe(direction === 'south');
  }
});

it('frames the default board as the tilted diorama to its loaded edge, too far off to load R16', () => {
  const north = bounds['brookwood-station'].minZ;
  for (const aspect of [16 / 9, 1.6, 1, 390 / 844, 0.1]) {
    const frame = fullBoardFrame(1100, north, true, aspect);
    expect(frame).toEqual({ azimuth: -15, tilt: 35, targetZ: -2300,
      distance: Math.max(6800 * 2.95, 11700 / Math.max(.25, aspect)) });
    expect(looksNorth(frame.distance, () => true)).toBe(false);
  }
  // Show full board frames the whole rectangle, R16 included.
  expect(fullBoardFrame(1100, bounds.r16.minZ, true, 1.6)).toMatchObject({ targetZ: -2700, distance: 7600 * 2.95 });
  expect(looksNorth(northLookM, () => true)).toBe(true);
});
