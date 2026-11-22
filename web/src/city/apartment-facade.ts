import { hashStr, type Builder, type P2 } from '../vignette/geom';
import type { BuildingFinish, VBuilding } from '../vignette/world';

export interface ApartmentPalette {
  wall: string;
  roof: string;
  accent: string;
  shopFrame: string;
  recess: string;
  trim: string;
  glass: string;
}

export type GroundUse = 'residential' | 'storefront' | 'service';
export interface ApartmentLayout {
  panelBand?: boolean;
  /** Every second or third bay can have a stacked inset, or all bays can have paired windows. */
  balconyEvery: 2 | 3 | null;
  groundUse: GroundUse;
}

/** Opt-in for identified apartment buildings with a recorded four-to-six-story mass. */
export function apartmentFinish(building: VBuilding, palette: ApartmentPalette, layoutFor: (a: P2, b: P2) => ApartmentLayout): BuildingFinish | undefined {
  const floors = building.floors;
  if (floors === null || !Number.isInteger(floors) || floors < 4 || floors > 6) return;
  const seed = hashStr(building.id);
  return {
    wall: palette.wall,
    roof: palette.roof,
    drawRing(mesh, ring, hole, base, top, litGlass) {
      // Orient every edge with solid material to the right in (x,z), including courtyard holes.
      const area2 = ring.reduce((sum, a, i) => {
        const b = ring[(i + 1) % ring.length];
        return sum + a[0] * b[1] - b[0] * a[1];
      }, 0);
      const reverse = hole ? area2 < 0 : area2 > 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        drawWall(mesh, litGlass, reverse ? b : a, reverse ? a : b, base, top, floors, palette, layoutFor(a, b), seed);
      }
    },
  };
}

function drawWall(mesh: Builder, lit: Builder, a: P2, b: P2, base: number, top: number, floors: number,
  p: ApartmentPalette, layout: ApartmentLayout, seed: number) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length === 0) return;
  const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
  const point = (u: number, y: number, depth: number) =>
    [a[0] + dx * u + dz * depth, y, a[1] + dz * u - dx * depth];
  const panel = (l: number, r: number, y: number, h: number, d: number, color: string, batch = mesh) =>
    batch.quad(point(l, y, d), point(r, y, d), point(r, h, d), point(l, h, d), color);

  // Solid piers close both corners. Short returns have no room for a bay.
  if (length < 3.4) {
    panel(0, length, base - 0.5, top, 0, p.wall);
    return;
  }
  const use = layout.groundUse;
  const pier = 0.45, end = length - pier;
  panel(0, pier, base - 0.5, top, 0, p.wall);
  panel(end, length, base - 0.5, top, 0, p.wall);
  const bays = Math.max(1, Math.round((end - pier) / 4.2));
  // Keep the top balcony ceiling below the roof membrane and its 1.1 m parapet.
  const cap = top - 1.2, groundTop = base + Math.min(4, (cap - base) / floors + 0.4);
  const story = (cap - groundTop) / (floors - 1);
  const pairs = (l: number, r: number, y: number, h: number, glass: Builder) => {
    const mid = (l + r) / 2;
    const margin = (r - l) * 0.17;
    panel(l + margin, mid - 0.13, y, h, -0.035, p.glass, glass);
    panel(mid + 0.13, r - margin, y, h, -0.035, p.glass, glass);
  };
  for (let i = 0; i < bays; i++) {
    const l = pier + i * (end - pier) / bays, r = pier + (i + 1) * (end - pier) / bays;
    panel(l, r, base - 0.5, groundTop, 0, use === 'storefront' ? p.shopFrame : layout.panelBand ? p.accent : p.wall);
    if (use === 'storefront') {
      panel(l + 0.3, r - 0.3, base + 0.65, groundTop - 0.44, -0.04, p.glass, i % 7 === 1 ? lit : mesh);
    } else if (use === 'residential') {
      if (!layout.panelBand && bays >= 4 && i === Math.floor(bays / 2)) {
        const mid = (l + r) / 2;
        panel(mid - 0.55, mid + 0.55, base, base + 2.3, -0.04, p.recess);
      } else pairs(l, r, base + 1, groundTop - 0.6, mesh);
    }
    for (let floor = 0; floor < floors - 1; floor++) {
      const y = groundTop + floor * story, h = y + story;
      if (layout.balconyEvery && use !== 'service' && i % layout.balconyEvery === 1) {
        const depth = 1.05;
        panel(l, r, y, h, depth, p.recess);
        mesh.quad(point(l, y, 0), point(l, y, depth), point(l, h, depth), point(l, h, 0), p.trim);
        mesh.quad(point(r, y, depth), point(r, y, 0), point(r, h, 0), point(r, h, depth), p.trim);
        // Shared slabs close consecutive stacked bays.
        mesh.quad(point(l, y, 0), point(r, y, 0), point(r, y, depth), point(l, y, depth), p.trim);
        if (floor === floors - 2)
          mesh.quad(point(l, h, depth), point(r, h, depth), point(r, h, 0), point(l, h, 0), p.trim);
        panel(l, r, y, y + 0.23, 0, p.wall);
        panel(l, r, y + 0.25, y + 0.88, 0.1, p.recess);
      } else {
        panel(l, r, y, h, 0, layout.panelBand && i % 5 === 2 ? p.accent : p.wall);
        const glass = (seed + i + floor * 3) % 7 === 1 ? lit : mesh;
        pairs(l, r, y + 0.95, h - 0.56, glass);
      }
    }
  }
  panel(pier, end, cap, top, 0, p.wall);
}
