import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
const source = new URL('../../../pipeline/prototypes/', import.meta.url);
const boards = ['downtown-ground', 'king-memorial/ground', 'sweet-auburn/ground',
  ...['north-band', 'north-corner', 'south-band', 'south-corner', 'midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station'].map(id => 'square-board/' + id)];
it('time', () => {
  let t2 = 0, t8 = 0, n8 = 0, n2 = 0, down = 0;
  for (const b of boards) {
    const grid = new GroundGrid(JSON.parse(readFileSync(new URL(b + '/ground.json', source), 'utf8')), Uint8Array.from(readFileSync(new URL(b + '/ground.i16', source))).buffer);
    const s = new GroundSurface(grid, 'low');
    let t = performance.now(); const g2 = s.farGeometry(2); t2 += performance.now() - t; n2 += g2.index!.count / 3;
    t = performance.now(); const g8 = s.farGeometry(8, 160, true); t8 += performance.now() - t; n8 += g8.index!.count / 3;
    const raw = s.farGeometry(8); const p = g8.getAttribute('position'), q = raw.getAttribute('position');
    for (let i = 0; i < p.count; i++) down = Math.max(down, q.getY(i) - p.getY(i));
    g2.dispose(); g8.dispose(); raw.dispose(); s.geometry.dispose();
  }
  console.log(`TIME 2m ${t2.toFixed(0)} ms ${n2} tris | 8m-lowered ${t8.toFixed(0)} ms ${n8} tris | max vertex drop ${down.toFixed(2)} m`);
}, 600000);
