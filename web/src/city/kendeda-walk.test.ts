import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import { auburnTransport } from './sweet-auburn-transport';
import { joins } from '../square-board/sections';
import { Line } from '../vignette/geom';

it.each(['high','low'] as const)('joins the measured-band walk across the row seam at %s', quality => {
  const seams: number[][] = [];
  for (const row of ['midtown-upper','brookwood-south'] as const) {
    const root = new URL('../../../pipeline/prototypes/square-board/' + row + '/', import.meta.url);
    const read = (name: string) => readFileSync(new URL(name, root));
    const grid = new GroundGrid(JSON.parse(read('ground.json').toString()), Uint8Array.from(read('ground.i16')).buffer);
    const mesh = new GroundSurface(grid, quality, [], joins(row));
    const ground = mesh.sampleScene.bind(mesh);
    const city = auburnTransport(JSON.parse(read('context.json').toString()));
    const run = city.terrainTransport!.roads.find(r => r.name === 'Kendeda Canopy Walk')!;
    const decks = createSurfaceTransport(city, grid, ground);
    const deck = (x: number, z: number) => decks.deckAt(x,z,run)!;
    try {
      const line = new Line(run.pts);
      for (let s=0; s<line.length; s+=.5) {
        const p=line.at(s);
        // Both deck edges, past the square corner of the first station.
        for (const o of s ? [-1.75,0,1.75] : [0]) {
          const x=p.x+o*p.nx, z=p.z+o*p.nz;
          expect(deck(x,z)).toBeGreaterThanOrEqual(ground(x,z)!-.05);
        }
      }
      seams.push([-1.6,0,1.6].map(dx => deck(1712.36+dx,-4100)));
      if (row === 'brookwood-south') {
        const h = deck(1712.45,-4103.33) + grid.manifest.vertical.sceneZeroNavd88M;
        expect(h).toBeCloseTo(286.74, 0);
        const p=line.at(90);
        expect(deck(p.x,p.z)-ground(p.x,p.z)!).toBeGreaterThan(10);
        const toe=run.pts.at(-1)!;
        const next=city.terrainTransport!.roads.find(r=>r!==run && r.pts[0][0]===toe[0] && r.pts[0][1]===toe[1])!;
        expect(deck(...toe)).toBeCloseTo(decks.deckAt(...toe,next)!,1);
      }
    } finally { decks.dispose(); mesh.geometry.dispose(); }
  }
  for (let i=0;i<3;i++) expect(seams[0][i]).toBeCloseTo(seams[1][i],4);
});
