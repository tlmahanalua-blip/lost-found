import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {getDb} from '../lib/db.js';
import {importAssignmentDatabase} from '../lib/import.js';
let db;
try{
  const rl=createInterface({input:stdin,output:stdout});
  const path=(process.argv[2]||await rl.question('Path to your Assignment 3 .db / .sqlite file: ')).trim().replace(/^"|"$/g,'');rl.close();
  if(!path)throw new Error('No file selected.');
  db=await getDb();const result=await importAssignmentDatabase(path,db,process.env.TURSO_DATABASE_URL||process.env.DATABASE_URL||'file:./data/lost-found.db');
  console.log(result.alreadyImported?'This database was already imported. No duplicate posts were added.':`Imported: ${result.usersAdded} users, ${result.categoriesAdded} categories, ${result.itemsAdded} reports, ${result.photosAdded} photos.`);
  if(result.backup)console.log('Backup: '+result.backup);
  console.log('Existing website accounts and passwords were kept. Restart the website and refresh the page.');
}catch(error){console.error('Import stopped: '+error.message);process.exitCode=1;}finally{db?.close();}
