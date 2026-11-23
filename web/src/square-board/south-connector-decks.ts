import { auburnTransport } from '../city/sweet-auburn-transport';
import { Line, type P2 } from '../vignette/geom';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';

type Sample = [stationM: number, elevationNavd88M: number];

// 2019 USGS class-17 deck returns in travel order. Keys are clipped City
// endpoints in metres. Trailing comments identify the OSM source way.
// Partial ranges carry a deck across the source split to its actual abutment.
const surveyed: Record<string, Sample[]> = {
  '-462.39,999.07/-306.95,990.99': [[0,310.42],[35.93,311.32],[59.88,311.58],[155.69,310.68]], // 9236208
  '-306.95,990.99/41.78,1100': [[0,310.68],[154.33,311.78],[213.68,311.41],[249.29,310.66],[296.78,308.97],[332.39,307.18],[373.94,304.57]], // 38964506
  '266.19,1011.93/218.81,983.29': [[0,308.03],[55.37,310.45]], // 38964601
  '-129.39,872.36/-168.61,888.34': [[0,309.27],[42.35,311.17]], // 38964629
  '-129.51,878.23/-168.61,888.34': [[0,309.45],[40.39,311.17]], // 38964634
  '-292.69,950.4/-16.27,961.29': [[0,310.17],[224.02,313.03],[277.08,313.5]], // 38964644
  '26.65,968.92/190.06,1018.38': [[0,313.63],[35.38,313.52],[82.56,312.95],[171.02,311.09]], // 39160299
  '260.46,1022.97/204.4,994.33': [[0,307.62],[62.96,309.98]], // 39160300
  '190.06,1018.38/263.15,1052.42': [[0,311.09],[80.63,308.22]], // 39160301
  '280.22,987.23/34.11,916.47': [[0,306.25],[95.37,310.51],[125.17,311.28],[149.01,311.53],[172.85,311.53],[208.62,310.7],[238.42,309.5],[280.14,307.04]], // 39160303
  '204.4,994.33/46.51,947.44': [[0,309.98],[82.58,312.86],[117.97,313.79],[165.16,314.56]], // 39160305
  '46.51,947.44/-293.23,931.88': [[0,314.56],[71.72,315.16],[143.44,314.93],[197.23,314.26],[340.68,311.29]], // 39160306
  '140.29,915.18/190.74,1098.6': [[0,302.41],[40.91,303.09],[111.04,302.97],[198.7,304.69]], // 39160308
  '218.81,983.29/173.49,957.77': [[0,310.45],[52.01,313.02]], // 39160309
  '-204.22,1014.43/-48.5,1100': [[0,303.98],[59.81,306.89],[95.7,308.18],[137.57,308.78],[179.44,308.18]], // 39160316
  '-35.75,1100/-116.4,1031.55': [[0,307.83],[29.46,307.79],[58.93,307.06],[106.07,304.56]], // 39160317
  '-306.11,1009.87/-87.66,1100': [[0,310.43],[47.15,309.76],[94.31,308.2],[129.67,306.48],[241.66,300.25]], // 39160881
  '-564.2,1007.61/-462.39,999.07': [[0,309.78],[45.42,309.45],[102.19,310.42]], // 39160905
  '-628.99,1017.74/-564.2,1007.61': [[0,310.57],[65.6,309.78]], // 39160906
  '190.74,1098.6/192.82,1100': [[0,304.69],[2.51,304.7]], // 68667797
  '-292.4,963.47/-16.27,961.29': [[0,309.8],[276.22,313.5]], // 89533511
  '136.82,1100/110.84,939.22': [[0,306.23],[29.16,305.73],[116.64,302.42],[163.3,301.15]], // 181273020
  '-462.39,999.07/-306.11,1009.87': [[0,310.42],[52.22,311.42],[156.66,310.43]], // 316454388
  '-168.61,888.34/-297.96,917.31': [[0,311.17],[34.61,312.12],[69.23,312.44],[98.07,312.18],[132.69,311.35]], // 316454389
  '173.49,957.77/-423.41,875.97': [[0,313.02],[106.98,317.98],[142.64,318.89],[184.25,319.18],[267.46,318.14],[326.89,317.03],[582.46,310.74],[618.12,309.37]], // 442591112
  '-16.27,961.29/26.65,968.92': [[0,313.5],[43.59,313.63]], // 630779031
  '265,816.25/140.29,915.18': [[152.36,302.06],[165.36,302.41]], // 9240001
  '383.43,1091.71/266.19,1011.93': [[127.84,307.46],[141.84,308.03]], // 28788140
  '-445.97,983.97/-292.4,963.47': [[144.03,309.64],[155.03,309.8]], // 38964553
  '-423.41,875.97/-508.49,880.61': [[0,309.37],[14,308.67]], // 38964560
  '110.84,939.22/-129.51,878.23': [[260.99,308.53],[274.99,309.45]], // 39160311
  '259.8,808.93/-129.39,872.36': [[382.9,308.46],[397.9,309.27]], // 39160885
  '383.43,1091.71/260.46,1022.97': [[126.88,307.15],[140.88,307.62]], // 316454361
};

const key = (pts: P2[]) => pts[0] + '/' + pts.at(-1);

/** I-20 and the interchange flyovers cross several other road surfaces before
 * reaching a bank. Use the deck profile for the structural mesh and its cars. */
export function southConnectorTransport(context: TerrainCity): TerrainCity {
  const city = auburnTransport(context);
  const roads: TransportRun[] = city.terrainTransport!.roads.filter(r => !surveyed[key(r.pts)]);
  const sources = city.roads.map(road => {
    const samples = road.cls === 'motorway' && surveyed[key(road.pts)];
    if (!samples) return road;
    const line = new Line(road.pts);
    const cursor = (s: number) => Math.abs(s - line.length) < .01 ? line.length : s;
    const start = cursor(samples[0][0]), end = cursor(samples.at(-1)![0]);
    const xy = (s: number): P2 => {
      if (s === 0) return road.pts[0];
      if (s === line.length) return road.pts.at(-1)!;
      const p = line.at(s);
      return [p.x, p.z];
    };
    const base = { cls: road.cls, name: road.name, sub: road.sub ?? undefined };
    const ground = (lo: number, hi: number) => {
      if (hi > lo) roads.push({ ...base, kind: 'ground',
        pts: [lo, ...line.cum.filter(s => s > lo && s < hi), hi].map(xy) });
    };
    ground(0, start);
    const stations = [...new Set([...samples.map(([s]) => cursor(s)),
      ...line.cum.filter(s => s > start && s < end)])].sort((a, b) => a - b);
    let next = 1;
    const deckNavd88M = stations.map(s => {
      while (next < samples.length - 1 && cursor(samples[next][0]) < s) next++;
      const [a, ya] = samples[next - 1], [b, yb] = samples[next];
      return ya + (yb - ya) * (s - cursor(a)) / (cursor(b) - cursor(a));
    });
    roads.push({ ...base, kind: 'bridge', pts: stations.map(xy), deckNavd88M });
    ground(end, line.length);
    return { ...road, bridge: true };
  });
  return { ...city, roads: sources, terrainTransport: { version: 1, roads, rail: city.terrainTransport!.rail } };
}
