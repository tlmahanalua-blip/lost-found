import {createClient} from '@libsql/client';
import {createHash} from 'node:crypto';
import {stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {backupLocal} from './migrate.js';
import {allocateItemId} from './ids.js';

export async function importAssignmentDatabase(sourcePath,target,targetUrl){
  const sourceFile=resolve(sourcePath);
  if(targetUrl?.startsWith('file:')&&(process.platform==='win32'?resolve(targetUrl.slice(5)).toLowerCase():resolve(targetUrl.slice(5)))===(process.platform==='win32'?sourceFile.toLowerCase():sourceFile))throw new Error('This file is already the website database. No import is needed.');
  if(!(await stat(sourceFile)).isFile())throw new Error('Choose a SQLite database file.');
  const source=createClient({url:'file:'+sourceFile,intMode:'number'});
  let data;
  try{
    const read=await source.transaction('read');
    try{
      for(const [table,required] of Object.entries({users:['user_id','display_name','email','password_hash'],categories:['category_id','category_name'],items:['item_id','user_id','report_number','category_id','title','description','location','event_date','report_type','status']})){
        const cols=(await read.execute(`PRAGMA table_info(${table})`)).rows.map(c=>c.name);
        if(required.some(name=>!cols.includes(name)))throw new Error(`The ${table} table does not match Assignment 3. The original file was not changed.`);
      }
      data={};for(const table of ['users','categories','items'])data[table]=(await read.execute(`SELECT * FROM ${table} ORDER BY 1`)).rows.map(row=>({...row}));
      const tables=(await read.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>r.name);
      data.photos=tables.includes('photos')?(await read.execute('SELECT * FROM photos ORDER BY item_id')).rows.map(row=>({...row})):[];
      await read.commit();
    }catch(error){await read.rollback();throw error;}finally{read.close();}
  }finally{source.close();}
  const hash=createHash('sha256').update(JSON.stringify(data,(_key,value)=>value instanceof ArrayBuffer?Buffer.from(value).toString('base64'):value)).digest('hex');
  const previous=await target.execute({sql:'SELECT * FROM imports WHERE source_hash=?',args:[hash]});
  if(previous.rows.length)return {alreadyImported:true,usersAdded:0,categoriesAdded:0,itemsAdded:0,photosAdded:0};
  const backup=await backupLocal(target,targetUrl,'before-import-'+Date.now());
  const tx=await target.transaction('write');
  try{
    // Recheck inside the write transaction, in case another importer completed first.
    if((await tx.execute({sql:'SELECT 1 FROM imports WHERE source_hash=?',args:[hash]})).rows.length){await tx.commit();return {alreadyImported:true,usersAdded:0,categoriesAdded:0,itemsAdded:0,photosAdded:0};}
    const users=new Map(),categories=new Map(),items=new Map();
    let usersAdded=0,categoriesAdded=0,itemsAdded=0,photosAdded=0;
    for(const row of data.users){
      const found=await tx.execute({sql:'SELECT user_id FROM users WHERE lower(email)=?',args:[String(row.email).toLowerCase()]});
      let id;
      if(found.rows.length)id=Number(found.rows[0].user_id);
      else{const added=await tx.execute({sql:'INSERT INTO users(display_name,email,password_hash,role,created_at) VALUES(?,?,?,\'student\',?) RETURNING user_id',args:[row.display_name,String(row.email).toLowerCase(),row.password_hash,row.created_at||0]});id=Number(added.rows[0].user_id);usersAdded++;}
      users.set(Number(row.user_id),id);
    }
    for(const row of data.categories){
      const result=await tx.execute({sql:'INSERT OR IGNORE INTO categories(category_name) VALUES(?)',args:[row.category_name]});categoriesAdded+=result.rowsAffected;
      const saved=await tx.execute({sql:'SELECT category_id FROM categories WHERE category_name=?',args:[row.category_name]});categories.set(Number(row.category_id),Number(saved.rows[0].category_id));
    }
    for(const row of data.items){
      const userId=users.get(Number(row.user_id)),categoryId=categories.get(Number(row.category_id));
      if(!userId||!categoryId)throw new Error('A report references a missing user or category. No import changes were saved.');
      const used=await tx.execute({sql:'SELECT 1 FROM items WHERE user_id=? AND report_number=?',args:[userId,row.report_number]});
      const number=used.rows.length?Number((await tx.execute({sql:'SELECT COALESCE(MAX(report_number),0)+1 AS n FROM items WHERE user_id=?',args:[userId]})).rows[0].n):Number(row.report_number);
      const type=String(row.report_type).toLowerCase();if(!['lost','found'].includes(type))throw new Error('Invalid Lost/Found type in the source database.');
      const status=['resolved','returned'].includes(String(row.status).toLowerCase())?'resolved':'open';
      const allocatedId=await allocateItemId(tx);
      const added=await tx.execute({sql:`INSERT INTO items(item_id,user_id,report_number,category_id,title,description,location,event_date,event_time,report_type,status,handover,contact_name,contact_email,contact_phone,contact_telegram,sample,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?) RETURNING item_id`,args:[allocatedId,userId,number,categoryId,row.title,row.description,row.location,row.event_date,row.event_time||'',type,status,row.handover||'',row.contact_name||'',row.contact_email||'',row.contact_phone||'',row.contact_telegram||'',row.created_at||0]});
      items.set(Number(row.item_id),Number(added.rows[0].item_id));itemsAdded++;
    }
    for(const photo of data.photos){
      const itemId=items.get(Number(photo.item_id));if(!itemId)throw new Error('A photo references a missing source item.');
      await tx.execute({sql:'INSERT INTO photos(item_id,mime,data) VALUES(?,?,?)',args:[itemId,photo.mime,photo.data]});photosAdded++;
    }
    await tx.execute({sql:'INSERT INTO imports(source_hash,users_added,categories_added,items_added,imported_at) VALUES(?,?,?,?,?)',args:[hash,usersAdded,categoriesAdded,itemsAdded,Date.now()]});
    if((await tx.execute('PRAGMA foreign_key_check')).rows.length)throw new Error('Foreign-key validation failed; import rolled back.');
    await tx.commit();return {alreadyImported:false,usersAdded,categoriesAdded,itemsAdded,photosAdded,backup};
  }catch(error){await tx.rollback();throw error;}finally{tx.close();}
}
