import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from '../../../../../node_modules/esbuild/lib/main.js';
const root = resolve(import.meta.dir, '../../../../..');
const out = import.meta.dir;
const src = root + '/battery/dumling-new/src/schemas/concrete-language';
const files = readdirSync(src, { recursive: true }).filter(p => p.endsWith('.ts') && !p.endsWith('feature-catalog.ts')).sort();
const routes = files.map(p => {
 const content = readFileSync(join(src,p),'utf8');
 const name = content.match(/export const (\w+FeatureBagsSchema)/)?.[1];
 if(!name) throw Error(p);
 return { path:join(src,p),name };
});
writeFileSync(out+'/routes.json',JSON.stringify(routes,null,2));
const zod = root+'/battery/dumling-new/node_modules/zod/index.js';
const entries = {
 empty:'export const value = 1;',
 zod:`export { z } from ${JSON.stringify(zod)};`,
 noun:`export { DeNounFeatureBagsSchema as schema } from ${JSON.stringify(src+'/de/lexeme/noun.ts')};`,
 all: routes.map((r,i)=>`import {${r.name} as r${i}} from ${JSON.stringify(r.path)};`).join('\n')+`\nexport const schemas=[${routes.map((_,i)=>'r'+i).join(',')}];`,
 oldHeavy:`export * from ${JSON.stringify(root+'/battery/dumling/src/dangerously-heavy-schema-tree.ts')};`,
 oldParser:`export {parseAsLemma} from ${JSON.stringify(root+'/battery/dumling/src/operations/parsing/lightweight-parsers.ts')};`,
};
for(const [name,code] of Object.entries(entries)) {
 writeFileSync(out+'/'+name+'.ts',code);
 const result = await build({entryPoints:[out+'/'+name+'.ts'],outfile:out+'/'+name+'.mjs',bundle:true,format:'esm',platform:'node',target:'node24',metafile:true,logLevel:'silent'});
 writeFileSync(out+'/'+name+'.meta.json',JSON.stringify(result.metafile));
 console.log(name, readFileSync(out+'/'+name+'.mjs').length, 'bytes',Object.keys(result.metafile.inputs).length,'modules');
}
console.log('routes',routes.length);
