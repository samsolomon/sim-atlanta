// Inferred backfill over the rear part of the eastern portal. The verified
// source grid stays intact; these sparse decimetre nodes belong to the study.
import nodes from './rear-bank.json';
import { GroundGrid } from '../../../web/src/terrain/grid';

export function eastPortalBank(grid: GroundGrid) {
  const manifest=grid.manifest;
  const graded=grid.copyBytes();
  const view=new DataView(graded);
  for(const [x,z,before,after] of nodes) {
    const c=(x-manifest.bounds.minX)/manifest.stepM,r=(z-manifest.bounds.minZ)/manifest.stepM;
    if (!Number.isInteger(c)||!Number.isInteger(r)||c<0||c>=manifest.cols||r<0||r>=manifest.rows)
      throw new Error('Eastern portal bank outside source grid');
    const address=2*(r*manifest.cols+c);
    if (view.getInt16(address,true)!==before) throw new Error('Eastern portal source grid changed');
    view.setInt16(address,after,true);
  }
  return new GroundGrid(manifest,graded);
}
