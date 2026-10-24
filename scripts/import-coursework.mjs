import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {getDb} from '../lib/db.js';
import {importAssignmentDatabase} from '../lib/import.js';
const source=fileURLToPath(new URL('../database/assignment3-original.db',import.meta.url));
let db;
try {
  if(!existsSync(source)) {
    console.log('No bundled private coursework database. Starting with the configured website database.');
  } else {
    db=await getDb();
    const result=await importAssignmentDatabase(source,db,process.env.TURSO_DATABASE_URL||process.env.DATABASE_URL||'file:./data/lost-found.db');
    console.log(result.alreadyImported?'Assignment 3 data already connected; no duplicate reports added.':`Assignment 3 connected: ${result.itemsAdded} reports. Existing website accounts kept.`);
    if(result.backup)console.log('Backup: '+result.backup);
  }
} catch(error) {
  console.error('Coursework setup stopped: '+error.message);
  process.exitCode=1;
} finally { db?.close(); }
