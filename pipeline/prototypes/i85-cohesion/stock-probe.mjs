// Bundle the evidence-only probe against the requested private mount revision.
// Run this file from the Connector worktree root, passing the path of the private mount.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
const mount=process.argv[2];
if(!mount)throw new Error('Pass the path to the pinned private City worktree');
const head=execFileSync('git',['-C',mount,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!head.startsWith('6f3e9021'))throw new Error('Expected private City 6f3e9021 at '+mount);
const source='pipeline/prototypes/i85-cohesion';
const temp=fs.mkdtempSync(path.join(tmpdir(),'i85-traffic-'));
const esbuildDir=fs.readdirSync('node_modules/.pnpm').find(x=>x.startsWith('esbuild@'));
const load=createRequire(import.meta.url);
try {
  load(path.resolve('node_modules/.pnpm',esbuildDir,'node_modules/esbuild')).buildSync({
    stdin:{contents:fs.readFileSync(source+'/stock-probe.ts','utf8'),resolveDir:path.resolve(mount,source),loader:'ts'},
    bundle:true,platform:'node',format:'esm',define:{'import.meta.env.DEV':'false'},outfile:temp+'/probe.mjs'
  });
  execFileSync(process.execPath,[temp+'/probe.mjs'],{stdio:'inherit'});
} finally {fs.rmSync(temp,{recursive:true});}
