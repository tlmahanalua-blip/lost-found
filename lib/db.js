import { createClient } from '@libsql/client';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { CATEGORIES } from '../public/model.js';
import { migrateWebsiteV2, backupLocal } from './migrate.js';

// The three domain tables use the same keys and relationships as Assignment 3.
export const schema = [
  `CREATE TABLE IF NOT EXISTS id_counters (
    name TEXT PRIMARY KEY,
    last_value INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE CHECK(length(trim(category_name)) BETWEEN 1 AND 40)
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
    created_at INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS items (
    item_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    report_number INTEGER NOT NULL CHECK(report_number > 0),
    category_id INTEGER NOT NULL REFERENCES categories(category_id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    event_date TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK(report_type IN ('lost','found')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
    event_time TEXT NOT NULL DEFAULT '',
    handover TEXT NOT NULL DEFAULT '',
    contact_name TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    contact_telegram TEXT NOT NULL DEFAULT '',
    sample INTEGER NOT NULL DEFAULT 0 CHECK(sample IN (0,1)),
    created_at INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id,report_number)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    item_id INTEGER PRIMARY KEY REFERENCES items(item_id) ON DELETE CASCADE,
    mime TEXT NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
    data BLOB NOT NULL CHECK(length(data) <= 900000)
  )`,
  `CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    proof TEXT NOT NULL CHECK(length(proof) BETWEEN 10 AND 400),
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(item_id,user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS flags (
    item_id INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(item_id,user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    hits INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS imports (
    source_hash TEXT PRIMARY KEY,
    users_added INTEGER NOT NULL,
    categories_added INTEGER NOT NULL,
    items_added INTEGER NOT NULL,
    imported_at INTEGER NOT NULL
  )`
];
export const indexes=[
  'CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)',
  'CREATE INDEX IF NOT EXISTS idx_items_user_event_date ON items(user_id,event_date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id)'
];
export const columns=async(db,table)=>(await db.execute(`PRAGMA table_info(${table})`)).rows.map(c=>c.name);
async function addColumns(db,table,definitions){
  let existing=await columns(db,table);
  for(const [name,definition] of Object.entries(definitions))if(!existing.includes(name)){
    try{await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);}
    catch(error){existing=await columns(db,table);if(!existing.includes(name))throw error;}
  }
}
export async function initialiseDatabase(client,url){
  const userColumns=await columns(client,'users');
  if(userColumns.includes('id')&&!userColumns.includes('user_id')){
    await backupLocal(client,url,'before-v3');
    await migrateWebsiteV2(client,schema);
  } else if(userColumns.length&&!userColumns.includes('user_id')) {
    throw new Error('DATABASE_SCHEMA: Unrecognised users table. Keep the file and inspect its schema before importing.');
  }
  // Extending an original Assignment 3 file adds website fields without replacing its rows.
  const itemColumns=await columns(client,'items');
  const originalCourseDatabase=itemColumns.includes('item_id')&&!itemColumns.includes('sample');
  if(userColumns.length&&itemColumns.length)await backupLocal(client,url,originalCourseDatabase?'before-website-fields':null);
  if(userColumns.length)await addColumns(client,'users',{created_at:'INTEGER NOT NULL DEFAULT 0'});
  if(itemColumns.includes('item_id'))await addColumns(client,'items',{
    event_time:"TEXT NOT NULL DEFAULT ''",handover:"TEXT NOT NULL DEFAULT ''",contact_name:"TEXT NOT NULL DEFAULT ''",contact_email:"TEXT NOT NULL DEFAULT ''",contact_phone:"TEXT NOT NULL DEFAULT ''",contact_telegram:"TEXT NOT NULL DEFAULT ''",sample:'INTEGER NOT NULL DEFAULT 0',created_at:'INTEGER NOT NULL DEFAULT 0'
  });
  await client.batch([...schema,...indexes],'write');
  await client.execute(`INSERT INTO id_counters(name,last_value)
    SELECT 'items',COALESCE(MAX(item_id),0) FROM items WHERE 1
    ON CONFLICT(name) DO UPDATE SET last_value=MAX(id_counters.last_value,excluded.last_value)`);
  if(originalCourseDatabase)await client.execute('UPDATE items SET sample=1');
  const count=await client.execute('SELECT COUNT(*) AS n FROM categories');
  if(!Number(count.rows[0].n))await client.batch(CATEGORIES.map(name=>({sql:'INSERT OR IGNORE INTO categories(category_name) VALUES(?)',args:[name]})),'write');
  const errors=await client.execute('PRAGMA foreign_key_check');
  if(errors.rows.length)throw new Error('DATABASE_SCHEMA: Foreign-key validation failed. Restore the backup and inspect the source data.');
  return client;
}
let ready;
export function getDb(){if(!ready)ready=open().catch(error=>{ready=undefined;throw error;});return ready;}
async function open(){
  const url=process.env.TURSO_DATABASE_URL||process.env.DATABASE_URL||(process.env.VERCEL?'':'file:./data/lost-found.db');
  if(!url)throw new Error('DATABASE_CONFIGURATION: Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel.');
  if(process.env.VERCEL&&url.startsWith('file:'))throw new Error('DATABASE_CONFIGURATION: Vercel needs a remote database.');
  if(!url.startsWith('file:')&&!process.env.TURSO_AUTH_TOKEN)throw new Error('DATABASE_CONFIGURATION: TURSO_AUTH_TOKEN is missing.');
  if(url.startsWith('file:'))await mkdir(dirname(resolve(url.slice(5))),{recursive:true});
  const client=createClient({url,authToken:process.env.TURSO_AUTH_TOKEN||undefined,intMode:'number',timeout:10000});
  try{return await initialiseDatabase(client,url);}catch(error){client.close();throw error;}
}
