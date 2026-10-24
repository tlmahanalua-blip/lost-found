import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=['public/index.html','public/styles.css','public/app.js','public/api.js','public/model.js','public/media.js','api/index.js','lib/db.js','lib/ids.js','lib/migrate.js','lib/import.js','lib/security.js','lib/validation.js','server.js','scripts/import-db.mjs','scripts/import-coursework.mjs','scripts/backup.mjs','scripts/demo-db.mjs','scripts/seed.mjs','scripts/update-windows.mjs'];
for(const file of files){if(!existsSync(file))throw new Error('Missing '+file);if(/\.m?js$/.test(file))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}
const html=readFileSync('public/index.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML IDs');
for(const source of ['public/app.js','public/index.html']){const s=readFileSync(source,'utf8');if(/stay in this browser|Save demo claim|LOCAL SIMULATION/.test(s))throw new Error('Outdated local-only interface text in '+source);}
console.log('Build checks passed. Static files: public/. Server function: api/index.js.');
