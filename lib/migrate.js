import {access,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {CATEGORIES} from '../public/model.js';
import {allocateItemId} from './ids.js';

export async function backupLocal(db,url,label){
  if(!label||!url?.startsWith('file:'))return null;
  const target=resolve(url.slice(5))+'.'+label+'.backup.db';
  try{await access(target);return target;}catch{}
  await mkdir(dirname(target),{recursive:true});
  await db.execute({sql:'VACUUM INTO ?',args:[target]});
  return target;
}
async function rowsIfExists(db,table){
  const exists=await db.execute({sql:"SELECT name FROM sqlite_master WHERE type='table' AND name=?",args:[table]});
  return exists.rows.length?(await db.execute(`SELECT * FROM ${table}`)).rows:[];
}
export async function migrateWebsiteV2(db,schema){
  const tx=await db.transaction('write');
  try{
    const cols=(await tx.execute('PRAGMA table_info(users)')).rows.map(c=>c.name);
    if(cols.includes('user_id')){await tx.commit();return;}
    const old={};for(const name of ['users','items','sessions','photos','claims','flags'])old[name]=await rowsIfExists(tx,name);
    for(const name of ['users','items','sessions','photos','claims','flags']){
      const exists=await tx.execute({sql:"SELECT name FROM sqlite_master WHERE type='table' AND name=?",args:[name]});
      if(exists.rows.length)await tx.execute(`ALTER TABLE ${name} RENAME TO migration_v2_${name}`);
    }
    for(const statement of schema)await tx.execute(statement);
    const userMap=new Map(),itemMap=new Map(),categoryMap=new Map();
    for(const name of new Set([...CATEGORIES,...old.items.map(i=>i.category)])){
      const r=await tx.execute({sql:'INSERT INTO categories(category_name) VALUES(?) RETURNING category_id',args:[name]});categoryMap.set(name,Number(r.rows[0].category_id));
    }
    for(const user of old.users){
      const r=await tx.execute({sql:'INSERT INTO users(display_name,email,password_hash,created_at) VALUES(?,?,?,?) RETURNING user_id',args:[user.name,user.email,user.password_hash,user.created_at]});userMap.set(String(user.id),Number(r.rows[0].user_id));
    }
    let sampleUser;
    if(old.items.some(i=>!userMap.has(String(i.user_id)))){
      const r=await tx.execute({sql:'INSERT INTO users(display_name,email,password_hash,created_at) VALUES(?,?,?,0) RETURNING user_id',args:['Sample account','sample-archive@example.invalid','disabled']});sampleUser=Number(r.rows[0].user_id);
    }
    const numbers=new Map();
    for(const item of old.items){
      const userId=userMap.get(String(item.user_id))||sampleUser,number=(numbers.get(userId)||0)+1;numbers.set(userId,number);
      const allocatedId=await allocateItemId(tx);
      const r=await tx.execute({sql:`INSERT INTO items(item_id,user_id,report_number,category_id,title,description,location,event_date,report_type,status,handover,contact_name,contact_email,contact_phone,contact_telegram,sample,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING item_id`,args:[allocatedId,userId,number,categoryMap.get(item.category),item.title,item.description,item.location,item.date,item.report_type||'found',item.status==='returned'?'resolved':'open',item.handover||'',item.contact_name||'',item.contact_email||'',item.contact_phone||'',item.contact_telegram||'',item.sample||0,item.created_at||0]});itemMap.set(String(item.id),Number(r.rows[0].item_id));
    }
    for(const session of old.sessions)await tx.execute({sql:'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',args:[session.token_hash,userMap.get(String(session.user_id)),session.expires_at]});
    for(const photo of old.photos)await tx.execute({sql:'INSERT INTO photos(item_id,mime,data) VALUES(?,?,?)',args:[itemMap.get(String(photo.item_id)),photo.mime,photo.data]});
    for(const claim of old.claims)await tx.execute({sql:'INSERT INTO claims(id,item_id,user_id,proof,email,created_at) VALUES(?,?,?,?,?,?)',args:[claim.id,itemMap.get(String(claim.item_id)),userMap.get(String(claim.user_id)),claim.proof,claim.email,claim.created_at]});
    for(const flag of old.flags)await tx.execute({sql:'INSERT INTO flags(item_id,user_id,created_at) VALUES(?,?,?)',args:[itemMap.get(String(flag.item_id)),userMap.get(String(flag.user_id)),flag.created_at]});
    for(const name of ['flags','claims','photos','sessions','items','users'])await tx.execute(`DROP TABLE IF EXISTS migration_v2_${name}`);
    const errors=await tx.execute('PRAGMA foreign_key_check');if(errors.rows.length)throw new Error('Migration foreign-key check failed; changes rolled back.');
    await tx.commit();
  }catch(error){await tx.rollback();throw error;}finally{tx.close();}
}
