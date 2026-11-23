// Embed the pre-baked crowns in the neighborhood's existing lazy request.
import { readFile } from 'node:fs/promises';

const crowns = JSON.parse(await readFile(new URL('../pipeline/prototypes/expanded-canopy/crowns.json', import.meta.url)));
export function withCanopy(bytes) {
  const context = JSON.parse(bytes);
  const { trees, lowCount } = crowns[context.name];
  return JSON.stringify({ ...context, trees, treeLowCount: lowCount, treeSource:
    'City of Atlanta / Georgia Tech 2023 Urban Tree Canopy; Meta & WRI canopy heights (Tolan et al., 2024, CC BY 4.0); USDA NAIP 2023. Crown centers and sizes inferred.' }) + '\n';
}
