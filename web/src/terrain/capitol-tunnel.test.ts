import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { capitolMouths, capitolTunnel, capitolTunnelSlots, MOUTH_FLOORS, MOUTH_LIDS, mouthFloor, mouthKey, TUNNEL_DEPTH_M, TUNNEL_VISIBLE_M } from './capitol-tunnel';
import { GroundGrid } from './grid';

const src = new URL('../../../pipeline/prototypes/', import.meta.url);
const grid = (p: string) => new GroundGrid(JSON.parse(readFileSync(new URL(p + '/ground.json', src)).toString()),
  Uint8Array.from(readFileSync(new URL(p + '/ground.i16', src))).buffer);
const grids = [grid('downtown-ground'), grid('square-board/south-band')];
const ground = (x: number, z: number) => {
  for (const g of grids) { const h = g.sample(x, z); if (h !== null) return h - g.manifest.vertical.sceneZeroNavd88M; }
  return null;
};

describe('the covered Connector under Capitol Gateway as a tunnel', () => {
  const mouths = capitolMouths();
  it('finds the ten mouths where a covered way meets an open one, each with a pinned floor', () => {
    expect(mouths.length).toBe(10);
    expect(new Set(mouths.map(mouthKey))).toEqual(new Set(Object.keys(MOUTH_FLOORS)));
    // The pinned floors are the board just outside each mouth, on whichever board holds it.
    for (const m of mouths) expect(Math.abs(mouthFloor(m, ground)! - MOUTH_FLOORS[mouthKey(m)]), mouthKey(m)).toBeLessThan(0.01);
  });

  it('keeps every tube and its cut under the lid, so the lid streets are never cut through', () => {
    for (const m of mouths) {
      const k = mouthKey(m), f = MOUTH_FLOORS[k];
      let lid = Infinity;
      for (let a = 4; a <= TUNNEL_DEPTH_M + 1; a++) for (let c = -m.halfWidth; c <= m.halfWidth; c++) {
        const h = ground(m.at[0] + m.dir[0] * a + m.right[0] * (c + m.offset), m.at[1] + m.dir[1] * a + m.right[1] * (c + m.offset));
        if (h !== null) lid = Math.min(lid, h - f);
      }
      expect(Math.abs(lid - MOUTH_LIDS[k]), k).toBeLessThan(0.02);
      // Room for a ceiling at least 4.5 m up, 0.75 m under the lid.
      expect(MOUTH_LIDS[k] - 0.75, k).toBeGreaterThan(4.5);
    }
  });

  it('cuts one covered slot per mouth, below the lid top, and shows cars only near the mouths', () => {
    const slots = capitolTunnelSlots();
    expect(slots.length).toBe(20);
    for (const slot of slots.filter(s => s.cutHeightM)) expect(slot.cutHeightM! - 0.4).toBeLessThan(Math.max(...Object.values(MOUTH_LIDS)) - 0.29);
    const tunnel = capitolTunnel(ground);
    try {
      const m = tunnel.mouths[0];
      const at = (along: number) => tunnel.floorAt(m.at[0] + m.dir[0] * along + m.right[0] * m.offset, m.at[1] + m.dir[1] * along + m.right[1] * m.offset);
      expect(at(5)).toBe(m.floor);
      expect(at(TUNNEL_VISIBLE_M + 5)).toBeNull();
      expect(tunnel.group.getObjectByName('Capitol Gateway tunnel portals')).toBeTruthy();
    } finally { tunnel.dispose(); }
  });
});
