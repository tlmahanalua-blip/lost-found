import {createClient} from '@libsql/client';
import {mkdir,stat,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {hashPassword} from '../lib/security.js';
import {CATEGORIES,LOCATIONS} from '../public/model.js';
const path=resolve(process.argv[2]||'database/assignment3-demo.db');
try{await stat(path);throw new Error('The output file already exists. Choose a different filename.');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(dirname(path),{recursive:true});const db=createClient({url:'file:'+path});
try{
  await db.executeMultiple(await readFile(new URL('../database/assignment3-core.sql',import.meta.url),'utf8'));
  for(let i=0;i<10;i++){
    await db.execute({sql:'INSERT INTO categories(category_id,category_name) VALUES(?,?)',args:[i+1,CATEGORIES[i]]});
    await db.execute({sql:'INSERT INTO users(user_id,display_name,email,password_hash,role) VALUES(?,?,?,?,\'student\')',args:[i+1,'Demo Student '+(i+1),`student${i+1}@example.invalid`,await hashPassword('Demo-only-2026!')]});
  }
  const titles=['Black headphones','Library keys','Grey hoodie','Math notebook','Student card','Blue bag','Green bottle','Laptop charger','Silver bracelet','Black umbrella'];
  for(let i=0;i<100;i++){
    await db.execute({sql:`INSERT INTO items(item_id,user_id,report_number,category_id,title,description,location,event_date,report_type,status) VALUES(?,?,?,?,?,?,?,?,?,?)`,args:[i+1,(i%10)+1,Math.floor(i/10)+1,(i%10)+1,titles[i%10]+' '+(Math.floor(i/10)+1),'Fictional coursework item. Describe identifying details before a return.',LOCATIONS[i%LOCATIONS.length],`2026-10-${String(1+i%20).padStart(2,'0')}`,i%2?'found':'lost',i%7===0?'resolved':'open']});
  }
  console.log('Created a SEPARATE fictional demo database: '+path+'\n10 users, 10 categories, 100 reports. Demo password: Demo-only-2026!');
}finally{db.close();}
