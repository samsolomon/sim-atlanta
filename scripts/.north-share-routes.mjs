// Bake City pictures and crawler-readable entry pages into the finished Vite build.
import { launchChrome } from './chrome-cdp.mjs';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const web = fileURLToPath(new URL('../web/', import.meta.url));
const { createServer } = await import(createRequire(join(web, 'package.json')).resolve('vite'));
const dist = join(web, '..', '.study', 'diagnostic');
const cameras = JSON.parse(await readFile(join(web, 'src/ui/share-cameras.json')));
const places = JSON.parse(await readFile(join(dist, 'data/ga/neighborhoods.json')));
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pages = new Map();
for (const { properties: { name } } of places.features) {
  const id = slug(name);
  if (pages.has(id) && pages.get(id).name !== name) throw Error('Duplicate share slug ' + id);
  pages.set(id, { name, cam: cameras.neighborhoods[name] });
}
for (const v of cameras.views) pages.set('view-' + v.id, v);
const template = await readFile(join(dist, 'index.html'), 'utf8');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const output = join(dist, 'previews');
await mkdir(output, { recursive: true });
for (const [id,{name,cam}] of pages) {
  const title=escape(name+' · Sim Atlanta');
  const html=template.replaceAll('"https://atlanta.solomon.io/"', '"https://atlanta.solomon.io/s/'+id+'/"')
    .replaceAll('content="Sim Atlanta"', 'content="'+title+'"').replace('<title>Sim Atlanta</title>', '<title>'+title+'</title>').replaceAll('/previews/default.jpg','/previews/'+(cam?id:'default')+'.jpg');
  const dir=join(dist,'s',id);
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'index.html'),html);
}
console.log('Built '+pages.size+' static share entries.');
