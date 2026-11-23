// Keep the row's vegetation and ground detail in its existing context request.
import { readFile } from 'node:fs/promises';

const root = new URL('../pipeline/prototypes/midtown-landscape/', import.meta.url);
const [crowns, ground] = await Promise.all(['crowns.json', 'ground.json'].map(async file =>
  JSON.parse(await readFile(new URL(file, root)))));

export function withMidtownLandscape(bytes) {
  const context = JSON.parse(bytes);
  const { trees, lowCount } = crowns[context.name];
  // The large park fill draws over ordinary grass. Its named interior lawn
  // uses the existing meadow fill, drawn above the park and below its paths.
  const covers = context.ground.map(feature => feature.kind === 'grass' && feature.name === 'Oak Hill'
    ? { ...feature, kind: 'meadow' } : feature);
  return JSON.stringify({ ...context, trees, treeLowCount: lowCount,
    treeSource: 'City of Atlanta / Georgia Tech 2023 Urban Tree Canopy; Meta & WRI canopy heights (Tolan et al., 2024, CC BY 4.0). Crown centers, radii and heights inferred.',
    ground: [...covers, ...ground[context.name]],
  }) + '\n';
}
