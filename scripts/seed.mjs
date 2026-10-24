import {fileURLToPath} from 'node:url';
import {getDb} from '../lib/db.js';
import {importAssignmentDatabase} from '../lib/import.js';
const db=await getDb();
try{const result=await importAssignmentDatabase(fileURLToPath(new URL('../database/assignment3-demo.db',import.meta.url)),db,process.env.TURSO_DATABASE_URL||process.env.DATABASE_URL||'file:./data/lost-found.db');console.log(result.alreadyImported?'Demo records are already present; no duplicates added.':`Added ${result.itemsAdded} fictional sample reports, ${result.usersAdded} test users and ${result.categoriesAdded} categories. Existing website data kept.`);}finally{db.close();}
