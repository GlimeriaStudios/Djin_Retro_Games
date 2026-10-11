import {readdirSync} from 'node:fs';import {spawnSync} from 'node:child_process';
const files=readdirSync(new URL('../tests/',import.meta.url)).filter(n=>n.endsWith('.test.mjs')&&n!=='network.test.mjs').map(n=>'tests/'+n);
const r=spawnSync(process.execPath,['--experimental-strip-types','--test',...files],{stdio:'inherit',cwd:new URL('../',import.meta.url)});process.exit(r.status??1);
