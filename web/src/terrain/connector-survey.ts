import north from '../../../pipeline/prototypes/connector-footprint/north.json';
import south from '../../../pipeline/prototypes/connector-footprint/south.json';
import type { P2 } from '../vignette/geom';

export type SurveyPick = { way: number; inner: P2; outer: P2 };
const directions = ['northbound', 'southbound'] as const;
export const surveyedEdges: SurveyPick[] = [
  ...north.sections.flatMap((row) =>
    directions.map((dir) => ({
      way: row.way[dir],
      inner: row[dir][0] as P2,
      outer: row[dir][1] as P2,
    })),
  ),
  ...south.sections.flatMap((row) =>
    directions.flatMap((dir) =>
      Object.values(row[dir])
        .filter(Boolean)
        .map((group) => ({
          way: group!.way,
          inner: group!.inner as P2,
          outer: group!.outer as P2,
        })),
    ),
  ),
];
