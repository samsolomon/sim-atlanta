import { drapeTriangle, type DrapeGround } from '../terrain/drape';
import { clump, drapeRing, landscapeMesh, retainingEdge, stairRun, tuft } from '../landscape/primitives';
import { lacebarkElm } from '../trees/lacebark-elm';
import type { TreePlacement } from '../trees/render';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';

// Cross-sections of the Peachtree forecourt, from the Collier corner to the
// northern entry. The west edge follows the tower and the east edge stops at
// the mapped Peachtree footway. Interior divisions are traced from photographs.
const stations = [
  [-5928, -245.9, -236.0, -221.0],
  [-5936, -246.8, -233.1, -219.9],
  [-5949, -246.6, -232.8, -218.7],
  [-5963, -242.7, -229.2, -216.6],
  [-5972, -240.2, -227.0, -214.9],
  [-5980, -238.0, -225.1, -214.0],
  [-5986, -235.7, -223.8, -212.9],
  [-5997, -231.6, -220.0, -211.2],
  [-6008, -226.5, -216.8, -208.9],
  [-6017, -222.0, -213.8, -207.0],
  [-6026, -216.4, -210.4, -204.5],
] as const;
type Station = (typeof stations)[number];

// Return from the south end of the court to the Collier sidewalk. The outer
// apron ties into the inside edge of the mapped footway, short of its crossing spur.
const cornerApron: P2[] = [
  [-245.9, -5928], [-221, -5928], [-222.1, -5919], [-223.8, -5908], [-225.7, -5900.8],
  [-222.35, -5900.4], [-222.89, -5898.3], [-228, -5899.5], [-232.8, -5902], [-247, -5910.6], [-259, -5918.2], [-248, -5921.3],
];
const cornerBed: P2[] = [
  [-244.5, -5925.5], [-239, -5926.1], [-234.1, -5924.7], [-231.4, -5922],
  [-230.5, -5918.4], [-231.5, -5914.6], [-234.6, -5912.1], [-239.3, -5912.8],
  [-246, -5916], [-252.3, -5919.7], [-249.2, -5920.5], [-246.8, -5922.5],
];

const elmRow: P2[] = [
  [-237.0, -5938], [-237.2, -5946], [-235.1, -5954],
  [-232.7, -5962], [-230.5, -5970], [-227.6, -5979],
  [-224.4, -5988], [-221.4, -5997], [-218.1, -6006],
];
export const piedmontGardenTrees: TreePlacement[] = elmRow.map(([x, z], i) => ({
  species: lacebarkElm, size: 'young', x, z, seed: 1968 + i, heightM: 5.5 + (i % 3) * 0.32, spreadM: 3.8 + (i % 3) * 0.25,
}));

function sectionRing(a: Station, b: Station, left: (s: Station) => number, right: (s: Station) => number): P2[] {
  return [[left(a), a[0]], [right(a), a[0]], [right(b), b[0]], [left(b), b[0]]];
}

/** Plan the stairs before carving, then drape paving and beds over the drawn grade. */
export function piedmontGarden(ground: DrapeGround, quality: 'high' | 'low') {
  const body = new Builder();
  const west = (s: Station) => s[1], court = (s: Station) => s[2];
  const street = (s: Station) => s[3], upperWalk = (s: Station) => street(s) - 2.6;
  const [south, north] = [stations[4], stations[5]];
  const crossZ = (south[0] + north[0]) / 2;
  const bottom: P2 = [(court(south) + court(north)) / 2, crossZ];
  const top: P2 = [(upperWalk(south) + upperWalk(north)) / 2, crossZ];
  const fromY = ground(...bottom), toY = ground(...top);
  const drawn = ground.triangles;
  if (!drawn || fromY === null || toY === null) return null;
  const stairs = stairRun(body, bottom, top, 7.6, ground, { fromY: fromY + 0.08, toY: toY + 0.08 });

  return {
    yields: stairs ? [stairs] : [],
    finish() {
      const surface = (ring: P2[], colour: string, holes: P2[][] = []) => drapeRing(ring, 4, (x, z) => (ground(x, z) ?? fromY) + 0.07,
        (a, b, c) => drapeTriangle(drawn, a, b, c, 0.07,
          (p, q, r) => body.tri(p.slice(0, 3), q.slice(0, 3), r.slice(0, 3), colour)), holes);
      surface(cornerApron, '#c6bcaa', [cornerBed]);
      surface(cornerBed, '#8c7460');
      retainingEdge(body, [...cornerBed, cornerBed[0]], ground, {
        width: 0.30, reveal: 0.16, stone: '#a49a8a', cap: '#bfb5a2', quality,
      });
      const cornerRandom = rng(31893);
      const spacing = quality === 'high' ? 1.45 : 2;
      for (let u = -251.5; u < -230.5; u += spacing) {
        for (let v = -5925.4; v < -5912; v += spacing) {
          const x = u + cornerRandom() * 0.6, z = v + cornerRandom() * 0.6;
          // Keep the grasses and low shrubs away from the curb and apron.
          if (![[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]]
            .every(([dx, dz]) => pointInRing(x + dx, z + dz, cornerBed))) continue;
          const y = ground(x, z);
          if (y === null) continue;
          if (cornerRandom() < 0.65) tuft(body, x, y + 0.07, z, 0.42 + cornerRandom() * 0.28, 7, '#a48a58', cornerRandom);
          else clump(body, x, y + 0.06, z, 0.41, 0.29 + cornerRandom() * 0.18, '#757b4d', cornerRandom() * 2);
        }
      }
      const random = rng(1893);
      for (let i = 1; i < stations.length; i++) {
        const a = stations[i - 1], b = stations[i];
        surface(sectionRing(a, b, west, court), i <= 3 ? '#bdb09c' : '#c6bcaa');
        surface(sectionRing(a, b, upperWalk, street), '#c9c5b8');
        if (a === south) continue;
        const isLink = i === 1 || i === stations.length - 1;
        surface(sectionRing(a, b, court, upperWalk), isLink ? '#c9c5b8' : '#8c7460');
        if (!isLink) {
          const rows = quality === 'high' ? 3 : 2;
          for (let v = 0.9; v < a[0] - b[0] - 0.8; v += 1.5) {
            const t = v / (a[0] - b[0]), left = court(a) + t * (court(b) - court(a));
            const right = upperWalk(a) + t * (upperWalk(b) - upperWalk(a));
            for (let row = 0; row < rows; row++) {
              const f = (row + 0.32 + random() * 0.36) / rows;
              const x = left + 0.6 + f * (right - left - 1.2), z = a[0] - v;
              const y = ground(x, z);
              if (y === null) continue;
              if (random() < 0.35) tuft(body, x, y + 0.07, z, 0.45 + random() * 0.35, 7, '#a69260', random);
              else clump(body, x, y + 0.06, z, 0.44 + random() * 0.29, 0.28 + random() * 0.25,
                random() < 0.45 ? '#787d4c' : '#646e44', random() * 2);
            }
          }
          retainingEdge(body, [[upperWalk(a), a[0]], [upperWalk(b), b[0]]], ground, {
            width: 0.30, reveal: 0.13, stone: '#a49a8a', cap: '#b7ad9e', quality,
          });
        }
      }
      return landscapeMesh(body);
    },
  };
}
