import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {initialiseDatabase,getDb} from '../lib/db.js';
import {formatEventTime,filterItems} from '../public/model.js';
import {hasCoordinates,mapLinksMarkup} from '../public/maps.js';

const folder=await mkdtemp(join(tmpdir(),'aitu-pink-'));
process.env.DATABASE_URL='file:'+join(folder,'new.db');
for(const key of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','VERCEL'])delete process.env[key];
const {createApp}=await import('../server.js');
const server=createApp();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let cookie='';
const report={title:'Blue headphones',reportType:'lost',category:'Electronics',location:'Library',date:'2026-10-01',description:'Blue wireless headphones with a small sticker.',handover:'Campus staff',consent:true,contactName:'Test Student',contactEmail:'test@example.edu',contactConsent:true};
async function request(action,data,id){
  const url=new URL('/api/index',origin);url.searchParams.set('action',action);if(id)url.searchParams.set('id',id);
  const response=await fetch(url,{method:data?'POST':'GET',headers:{Origin:origin,Cookie:cookie,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
try{
  await test('Time choices and map points survive API and SQLite round trips',async t=>{
    const account=await request('register',{name:'Test Student',email:'test@example.edu',password:'Example-student-2026!'});assert.equal(account.status,201);cookie=account.cookie;
    for(const timePrecision of ['exact','range','unknown'])await t.test(timePrecision,async()=>{
      const data={...report,timePrecision,eventTime:'09:30',eventTimeEnd:'12:15',latitude:51.090953,longitude:71.418383,locationDetails:'Block C1, floor 2, room 204'};
      const saved=await request('items',data);assert.equal(saved.status,201);
      const item=(await request('item',null,saved.body.item.id)).body.item;
      assert.equal(item.timePrecision,timePrecision);assert.equal(item.eventTime,timePrecision==='unknown'?'':'09:30');assert.equal(item.eventTimeEnd,timePrecision==='range'?'12:15':'');
      assert.equal(item.latitude,data.latitude);assert.equal(item.longitude,data.longitude);assert.equal(item.locationDetails,data.locationDetails);
      assert.equal(formatEventTime(item),timePrecision==='unknown'?'Time not remembered':timePrecision==='range'?'09:30–12:15':'09:30');
      assert.equal(filterItems([item],{query:'room 204'}).length,1);
    });
    await t.test('Unknown time needs neither a time value nor a map point',async()=>{
      const saved=await request('items',{...report,timePrecision:'unknown'});assert.equal(saved.status,201);assert.equal(saved.body.item.eventTime,'');assert.equal(saved.body.item.latitude,null);assert.equal(saved.body.item.longitude,null);
    });
    await t.test('Legacy clients retain their exact time',async()=>{
      const saved=await request('items',{...report,eventTime:'17:20'});assert.equal(saved.status,201);assert.equal(saved.body.item.timePrecision,'exact');assert.equal(saved.body.item.eventTime,'17:20');
    });
    for(const [data,error] of [
      [{timePrecision:'exact'},'eventTime'],
      [{timePrecision:'range',eventTime:'12:00'},'eventTimeEnd'],
      [{timePrecision:'range',eventTime:'12:00',eventTimeEnd:'11:00'},'eventTimeEnd'],
      [{timePrecision:'range',eventTime:'12:00',eventTimeEnd:'12:00'},'eventTimeEnd'],
      [{timePrecision:'soon'},'timePrecision'],
      [{latitude:91,longitude:71},'coordinates'],
      [{latitude:51},'coordinates'],
      [{latitude:'51',longitude:71},'coordinates'],
      [{latitude:false,longitude:71},'coordinates'],
      [{locationDetails:'x'.repeat(161)},'locationDetails']
    ])await t.test('Reject invalid '+error+' '+JSON.stringify(data),async()=>{
      const result=await request('items',{...report,...data});assert.equal(result.status,400);assert.ok(result.body.errors[error]);
    });
    await t.test('Saved points can be removed in a new report; coordinate zero is valid',async()=>{
      const result=await request('items',{...report,timePrecision:'unknown',latitude:0,longitude:0});assert.equal(result.status,201);assert.ok(hasCoordinates(result.body.item));assert.match(mapLinksMarkup(result.body.item),/query=0.000000,0.000000/);assert.equal(mapLinksMarkup({latitude:null,longitude:null}),'');
    });
  });
  await test('Upgrade preserves existing accounts, listings, photos and exact times; reruns preserve ranges',async()=>{
    const db=createClient({url:'file:'+join(folder,'old-v3.db')});
    try{
      await db.executeMultiple(await readFile(new URL('./v3-schema.sql',import.meta.url),'utf8'));
      await db.execute("INSERT INTO categories VALUES(1,'Electronics')");
      await db.execute("INSERT INTO users(user_id,display_name,email,password_hash) VALUES(1,'Existing Student','existing@example.edu','original-password-hash')");
      await db.execute("INSERT INTO items(item_id,user_id,report_number,category_id,title,description,location,event_date,event_time,report_type) VALUES(7,1,1,1,'Existing headphones','Existing saved description','Library','2026-10-01','15:45','found')");
      await db.execute({sql:"INSERT INTO photos VALUES(7,'image/png',?)",args:[Buffer.from('preserved-image-bytes')]});
      await initialiseDatabase(db,'file:'+join(folder,'old-v3.db'));
      const result=(await db.execute('SELECT * FROM items')).rows[0];assert.equal(result.item_id,7);assert.equal(result.title,'Existing headphones');assert.equal(result.event_time,'15:45');assert.equal(result.time_precision,'exact');assert.equal(result.latitude,null);
      assert.equal((await db.execute('SELECT password_hash FROM users')).rows[0].password_hash,'original-password-hash');assert.equal(Buffer.from((await db.execute('SELECT data FROM photos')).rows[0].data).toString(),'preserved-image-bytes');
      await db.execute("UPDATE items SET time_precision='range',event_time='10:00',event_time_end='12:00',latitude=51.09,longitude=71.42,location_details='C1 room 204' WHERE item_id=7");
      await initialiseDatabase(db,'file:'+join(folder,'old-v3.db'));
      const again=(await db.execute('SELECT * FROM items')).rows[0];assert.equal(again.time_precision,'range');assert.equal(again.event_time_end,'12:00');assert.equal(again.latitude,51.09);assert.equal(again.location_details,'C1 room 204');assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length,0);
    }finally{db.close();}
  });
}finally{
  await new Promise(resolve=>server.close(resolve));(await getDb()).close();await rm(folder,{recursive:true,force:true});
}
