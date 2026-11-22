// Run from the repository root. The patch is applied to Vite's in-memory response only.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)), web=resolve(here,'../../../web');
process.chdir(web);
const require=createRequire(resolve(web,'package.json'));
const {createServer}=await import(pathToFileURL(require.resolve('vite')));
const server=await createServer({root:web,cacheDir:resolve(web,'node_modules/.vite-east-cut-study'),
  optimizeDeps:{include:['three','three/addons/controls/OrbitControls.js']},
  server:{host:'127.0.0.1',port:Number(process.env.EAST_CUT_PORT ?? 5370),strictPort:true},
  plugins:[{name:'five-points-east-cut-local-study',enforce:'pre',transform(code,id){
    if(id.endsWith('/src/main.ts')) return code.replace('let cityTilt = 57;', 'let cityTilt = 26;');
    if(!id.endsWith('/src/city/city.ts')) return;
    const replace=(old,sub)=>{ if(!code.includes(old)) throw Error('City study hook changed: '+old); code=code.replace(old,sub); };
    replace('openings: terrainOpenings(marta)', 'openings: studyOn ? [...terrainOpenings(marta.map(study.mask)), ...study.openings(grid!)] : terrainOpenings(marta)');
    replace('createSurfaceTransport(vd, ground, terrain!.groundAt)', 'createSurfaceTransport(vd, ground, studyOn ? study.support(ground,terrain!.groundAt) : terrain!.groundAt)');
    replace('world.buildMarta(al, pierAllowed)', 'world.buildMarta(studyOn ? study.mask(al) : al, pierAllowed)');
    replace('  const edges = [', `  if (grid && transport) {
      if (studyOn) scene.add(study.commonFloor(THREE,grid));
      window.eastCutStudy=study.metrics(marta,transport,grid);
    }
    const edges = [`);
    return "import * as study from "+JSON.stringify('/@fs'+resolve(here,'preview.js'))+
      ";\nconst studyOn = new URLSearchParams(location.search).get('cut')==='mapped';\n"+code;
  }}]});
await server.listen();server.printUrls();
