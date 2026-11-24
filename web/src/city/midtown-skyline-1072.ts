import { rng, type P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

// 1072 West Peachtree (TVS with Brock Hudgins, topped out November 2025). Three
// stacked volumes on the corner of West Peachtree and 12th:
// - a 36 m base over the whole lot: lobby and retail, nine screened parking
//   levels, and the glazed tenth-floor Commons;
// - a 72 m precast office block, floors 11 to 18;
// - a blue-grey glass residential tower, floors 20 to 60, at the north-east corner.
// Each tower face has a recessed balcony slot, arranged as a pinwheel, and the
// parapet steps up in the middle of the broad faces to the reported 749 ft (228 m).
// Frame: u east along 12th Street, v south; origin at the lot centre; heights above
// the West Peachtree grade. Part outlines are mapped (OSM 1464967895/905/904); the
// floor heights, slot sizes and crown step are estimated from the developer's stack
// diagram and April 2026 photographs (see docs/1072-west-peachtree.md).

const PODIUM = 36, OFFICE = 72, ROOF = 219, SHOULDER = 223.4, CROWN = 228;
const STONE = '#d8d2c6', SCREEN = '#a7a49c', PRECAST = '#ddd6ca', DARK = '#3d4a57';
const TOWER = '#5f7891', MULLION = '#9db0c0', SLOT = '#36424f';

/** The tower plan with one recessed balcony slot per face, turned as a pinwheel (counter-clockwise). */
export function pinwheel(cu: number, cv: number, hu: number, hv: number, w = 3, d = 1.5, k1 = 5, k2 = 3): P2[] {
  const h = w / 2;
  const ring: P2[] = [
    [hu, -hv], [hu, k1 - h], [hu - d, k1 - h], [hu - d, k1 + h], [hu, k1 + h],
    [hu, hv], [-k2 + h, hv], [-k2 + h, hv - d], [-k2 - h, hv - d], [-k2 - h, hv],
    [-hu, hv], [-hu, -k1 + h], [-hu + d, -k1 + h], [-hu + d, -k1 - h], [-hu, -k1 - h],
    [-hu, -hv], [k2 - h, -hv], [k2 - h, -hv + d], [k2 + h, -hv + d], [k2 + h, -hv],
  ];
  return ring.map(([u, v]) => [cu + u, cv + v]);
}

export function westPeachtree1072(shell: Shell) {
  const { body, lights } = shell;
  const random = rng(1072);
  const edges = (ring: P2[], draw: (a: P2, b: P2, len: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      draw(a, b, Math.hypot(b[0] - a[0], b[1] - a[1]));
    });
  const along = (a: P2, b: P2) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    return (t: number, y: number, off: number) => [a[0] + dx * t + dz * off, y, a[1] + dz * t - dx * off];
  };
  /**
   * Windows on a wall from `a` to `b` (building on the left), within the landmark
   * budget: one strip per bay column, a band across the face at each floor, and a
   * lamp quad only for each window lit at night.
   */
  function glaze(a: P2, b: P2, lo: number, hi: number, bay: number, fill: number, pitch: number,
    occupancy: number, glass: string, band: string, sill = .19) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), at = along(a, b);
    const count = Math.max(1, Math.round(len / bay)), rows = Math.max(1, Math.round((hi - lo) / pitch));
    const step = (hi - lo) / rows, s = step * sill;
    for (let i = 0; i < count; i++) {
      const l = (i + (1 - fill) / 2) * len / count, r = (i + (1 + fill) / 2) * len / count;
      body.quad(at(l, lo + s, .07), at(l, hi - s, .07), at(r, hi - s, .07), at(r, lo + s, .07), glass);
      for (let j = 0; j < rows; j++)
        if (random() < occupancy)
          lights.quad(at(l, lo + j * step + s, .11), at(l, lo + (j + 1) * step - s, .11),
            at(r, lo + (j + 1) * step - s, .11), at(r, lo + j * step + s, .11), glass);
    }
    for (let j = 1; j < rows; j++) {
      const y = lo + j * step;
      body.quad(at(0, y - s, .09), at(0, y + s, .09), at(len, y + s, .09), at(len, y - s, .09), band);
    }
  }
  /** A thin lit line along the top of a wall: the podium and office roof edges glow at night. */
  const edgeLight = (ring: P2[], y: number) => edges(ring, (a, b, len) => {
    const at = along(a, b);
    lights.quad(at(0, y - .35, .12), at(0, y, .12), at(len, y, .12), at(len, y - .35, .12), STONE);
  });

  // The base: limestone lobby and retail, screened parking above, the glazed Commons on top.
  const lot: P2[] = [[27.45, -37.7], [27.43, 37.72], [-27.41, 37.72], [-27.39, -37.72]];
  shell.prism(lot, shell.base, PODIUM, STONE, '#b9b4aa');
  edges(lot, (a, b) => {
    glaze(a, b, .4, 5.6, 4.2, .82, 5.2, .35, DARK, STONE);
    glaze(a, b, 6, 31.5, 2.2, .8, 2.85, 0, SCREEN, STONE, .14);
    glaze(a, b, 32, PODIUM - .4, 3, .9, 3.6, .45, DARK, STONE, .08);
  });
  edgeLight(lot, PODIUM);

  // The office block, floors 11 to 18, in a strong precast grid. It also runs under the tower footprint.
  const office: P2[] = [[24, -34.5], [24, 31.5], [-8, 31.5], [-8, -34.5]];
  shell.prism(office, PODIUM, OFFICE, PRECAST, '#c9c3b8');
  edges(office, (a, b) => glaze(a, b, PODIUM, OFFICE - .6, 3.1, .74, 4.5, .25, DARK, PRECAST));
  edgeLight(office, OFFICE);

  // The tower: reflective glass with a light floor line each storey and a mullion
  // every unit; the slots are dark balcony recesses with glass rails.
  const tower = pinwheel(12.05, -18.25, 11.75, 16.25);
  shell.prism(tower, OFFICE, ROOF, TOWER, '#7d8b97');
  const floors = 41, pitch = (ROOF - 2 - OFFICE) / floors;
  edges(tower, (a, b, len) => {
    const at = along(a, b);
    if (len < 2) {
      // Slot walls and back: darker, the inset balconies.
      body.quad(at(0, OFFICE, .02), at(0, ROOF, .02), at(len, ROOF, .02), at(len, OFFICE, .02), SLOT);
      return;
    }
    const units = Math.max(1, Math.round(len / 4.6));
    for (let i = 1; i < units; i++) {
      const t = (i * len) / units;
      body.quad(at(t - .12, OFFICE, .06), at(t - .12, ROOF, .06), at(t + .12, ROOF, .06), at(t + .12, OFFICE, .06), MULLION);
    }
    for (let j = 1; j <= floors; j++) {
      const y = OFFICE + j * pitch;
      body.quad(at(0, y - .18, .08), at(0, y + .18, .08), at(len, y + .18, .08), at(len, y - .18, .08), MULLION);
    }
    // Residences lit at night, one unit at a time; the crown above stays dark.
    for (let j = 0; j < floors; j++)
      for (let i = 0; i < units; i++)
        if (random() < .32) {
          const l = (i + .08) * len / units, r = (i + .92) * len / units, y = OFFICE + j * pitch;
          lights.quad(at(l, y + .3, .1), at(l, y + pitch - .3, .1), at(r, y + pitch - .3, .1), at(r, y + .3, .1), TOWER);
        }
  });
  // The parapet hides the machine room; it steps up in the middle of the broad (east and west) faces.
  shell.prism(tower, ROOF, SHOULDER, '#55697e', '#6f7c88');
  shell.prism([[24.05, -27], [24.05, -9.5], [0.05, -9.5], [0.05, -27]], SHOULDER, CROWN, '#55697e', '#6f7c88');

  return shell.finish('#ffdcae', .7);
}
