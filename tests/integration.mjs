import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {itemPhoto,renderItemVisual} from '../public/media.js';
import {legacySchema} from './legacy-fixture.mjs';
import {hashPassword,digest} from '../lib/security.js';
import {initialiseDatabase} from '../lib/db.js';
import {migrateWebsiteV2} from '../lib/migrate.js';
import {importAssignmentDatabase} from '../lib/import.js';
import {execFileSync} from 'node:child_process';
import {createClient} from '@libsql/client';
const folder=await mkdtemp(join(tmpdir(),'aitu-sqlite-test-'));
process.env.DATABASE_URL='file:'+join(folder,'test.db');delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;delete process.env.VERCEL;process.env.ADMIN_EMAILS='';
const {createApp}=await import('../server.js');
const {getDb,schema}=await import('../lib/db.js');
const {filterItems,formatEventDate,normaliseEventDate}=await import('../public/model.js');
const server=createApp();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let aliceCookie='',bobCookie='',itemId='';
async function request(action,{method='GET',data,cookie='',id,evilOrigin}={}){
  const url=new URL('/api/index',origin);url.searchParams.set('action',action);if(id)url.searchParams.set('id',id);
  const response=await fetch(url,{method,headers:{Origin:evilOrigin||origin,...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?JSON.stringify(data||{}):undefined});
  const body=(response.headers.get('content-type')||'').startsWith('application/json')?await response.json():Buffer.from(await response.arrayBuffer());
  return {status:response.status,body,cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
}
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=';
const report={title:"Green bottle, owner's label",category:'Other',location:'Library',date:'2026-10-05',description:'A green bottle found next to the library reading desk.',handover:'I will keep it safely',consent:true,contactName:'Alice Student',contactEmail:'alice@example.edu',contactPhone:'+7 700 123 4567',contactTelegram:'@alice_student',contactConsent:true,photo:png};
await test('End-to-end accounts, SQLite persistence, contacts and photos',async t=>{
  await t.test('Database starts with an empty shared noticeboard',async()=>{const r=await request('items');assert.equal(r.status,200);assert.deepEqual(r.body.items,[]);});
  await t.test('Registration rejects invalid data',async()=>{const r=await request('register',{method:'POST',data:{name:'A',email:'wrong',password:'123'}});assert.equal(r.status,400);assert.ok(r.body.errors.password);});
  await t.test('Register Alice and create an HttpOnly session',async()=>{const r=await request('register',{method:'POST',data:{name:'Alice Student',email:'alice@example.edu',password:'Alice-test-2026!'}});assert.equal(r.status,201);assert.equal(r.body.user.name,'Alice Student');assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Lax/);aliceCookie=r.cookie;});
  await t.test('Passwords and session tokens are never stored in plaintext',async()=>{const db=await getDb();const u=await db.execute('SELECT password_hash FROM users');assert.match(u.rows[0].password_hash,/^scrypt\$/);assert.notEqual(u.rows[0].password_hash,'Alice-test-2026!');const s=await db.execute('SELECT token_hash FROM sessions');assert.notEqual(s.rows[0].token_hash,aliceCookie.split('=')[1]);});
  await t.test('Duplicate registration is rejected',async()=>{const r=await request('register',{method:'POST',data:{name:'Copy Account',email:'ALICE@example.edu',password:'Long-enough-2026'}});assert.equal(r.status,409);});
  await t.test('Wrong password is rejected',async()=>{const r=await request('login',{method:'POST',data:{email:'alice@example.edu',password:'wrong-password'}});assert.equal(r.status,401);});
  await t.test('SQL injection does not bypass login',async()=>{const r=await request('login',{method:'POST',data:{email:"' OR 1=1 --@test.edu",password:'anything'}});assert.equal(r.status,400);});
  await t.test('An anonymous visitor cannot publish',async()=>{const r=await request('items',{method:'POST',data:report});assert.equal(r.status,401);});
  await t.test('Cross-origin mutations are rejected',async()=>{const r=await request('items',{method:'POST',data:report,cookie:aliceCookie,evilOrigin:'https://attacker.invalid'});assert.equal(r.status,403);});
  await t.test('Contact sharing requires consent',async()=>{const r=await request('items',{method:'POST',data:{...report,contactConsent:false},cookie:aliceCookie});assert.equal(r.status,400);assert.ok(r.body.errors.contactConsent);});
  await t.test('Disguised photos are rejected by file signature',async()=>{const r=await request('items',{method:'POST',data:{...report,photo:'data:image/png;base64,'+Buffer.from('<script>not-an-image</script>').toString('base64')},cookie:aliceCookie});assert.equal(r.status,400);assert.ok(r.body.errors.photo);});
  await t.test('Valid report, contacts and photo are saved together',async()=>{const r=await request('items',{method:'POST',data:report,cookie:aliceCookie});assert.equal(r.status,201);itemId=r.body.item.id;assert.ok(r.body.item.photo.startsWith('/api/index?action=photo'));const db=await getDb();assert.equal((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n,1);assert.equal((await db.execute('SELECT COUNT(*) AS n FROM photos')).rows[0].n,1);});
  await t.test('Anonymous item responses do not leak contacts',async()=>{const r=await request('item',{id:itemId});assert.equal(r.status,200);assert.equal(r.body.item.contact,null);assert.ok(!JSON.stringify(r.body).includes('alice@example.edu'));const list=await request('items');assert.ok(!JSON.stringify(list.body).includes('+7 700'));});
  await t.test('Signed-in visitors can read all entered contact fields',async()=>{const r=await request('item',{id:itemId,cookie:aliceCookie});assert.equal(r.body.item.contact.email,report.contactEmail);assert.equal(r.body.item.contact.phone,report.contactPhone);assert.equal(r.body.item.contact.telegram,'alice_student');});
  await t.test('Photo endpoint returns the saved binary image',async()=>{const r=await request('photo',{id:itemId});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.deepEqual(r.body,Buffer.from(png.split(',')[1],'base64'));});
  await t.test('A second account sees the same saved report',async()=>{const r=await request('register',{method:'POST',data:{name:'Bob Student',email:'bob@example.edu',password:'Bob-test-2026!'}});assert.equal(r.status,201);bobCookie=r.cookie;const items=await request('items',{cookie:bobCookie});assert.equal(items.body.items[0].id,itemId);assert.equal(items.body.items[0].canManage,false);});
  await t.test('Only the poster can mark their report returned',async()=>{const r=await request('returned',{method:'POST',cookie:bobCookie,data:{itemId}});assert.equal(r.status,403);});
  await t.test('The poster cannot claim their own item',async()=>{const r=await request('claim',{method:'POST',cookie:aliceCookie,data:{itemId,proof:'There is a yellow sticker underneath.'}});assert.equal(r.status,400);});
  await t.test('Another user can submit an ownership claim',async()=>{const r=await request('claim',{method:'POST',cookie:bobCookie,data:{itemId,proof:'There is a yellow sticker underneath.'}});assert.equal(r.status,201);});
  await t.test('Duplicate claims are rejected',async()=>{const r=await request('claim',{method:'POST',cookie:bobCookie,data:{itemId,proof:'There is a yellow sticker underneath.'}});assert.equal(r.status,409);});
  await t.test('Claims are visible to the poster, not unrelated users',async()=>{const a=await request('manage',{cookie:aliceCookie});assert.equal(a.body.claims.length,1);assert.equal(a.body.claims[0].email,'bob@example.edu');const b=await request('manage',{cookie:bobCookie});assert.equal(b.body.claims.length,0);});
  await t.test('Flags are persistent and idempotent',async()=>{for(let i=0;i<2;i++){const r=await request('flag',{method:'POST',cookie:bobCookie,data:{itemId}});assert.equal(r.status,200);}const db=await getDb();assert.equal((await db.execute('SELECT COUNT(*) AS n FROM flags')).rows[0].n,1);});
  await t.test('Configured coordinator can review flagged listings',async()=>{process.env.ADMIN_EMAILS='alice@example.edu';const r=await request('manage',{cookie:aliceCookie});assert.equal(r.body.isAdmin,true);assert.equal(r.body.flags.length,1);process.env.ADMIN_EMAILS='';});
  await t.test('The poster can complete the handover',async()=>{const r=await request('returned',{method:'POST',cookie:aliceCookie,data:{itemId}});assert.equal(r.status,200);const item=await request('item',{id:itemId});assert.equal(item.body.item.status,'returned');});
  await t.test('Returned items cannot receive new claims',async()=>{const r=await request('claim',{method:'POST',cookie:bobCookie,data:{itemId,proof:'There is a yellow sticker underneath.'}});assert.equal(r.status,409);});
  await t.test('Logout revokes the stored session',async()=>{const r=await request('logout',{method:'POST',cookie:aliceCookie});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await request('session',{cookie:aliceCookie})).body.user,null);});
  await t.test('Login restores the account and reports',async()=>{const r=await request('login',{method:'POST',data:{email:'alice@example.edu',password:'Alice-test-2026!'}});assert.equal(r.status,200);aliceCookie=r.cookie;const manager=await request('manage',{cookie:aliceCookie});assert.equal(manager.body.items[0].id,itemId);});
  await t.test('New server instance reads previously saved SQLite data',async()=>{const second=createApp();await new Promise(resolve=>second.listen(0,'127.0.0.1',resolve));try{const r=await fetch(`http://127.0.0.1:${second.address().port}/api/index?action=items`);assert.equal((await r.json()).items[0].id,itemId);}finally{await new Promise(resolve=>second.close(resolve));}});
  await t.test('Only public files can be served, not environment or database files',async()=>{const r=await fetch(origin+'/.env');assert.equal(r.status,404);const page=await fetch(origin+'/');assert.equal(page.status,200);assert.match(await page.text(),/contact-email/);});
  await t.test('Lost, Found and All statuses filters return the expected listings',()=>{
    const sample=[{id:'lost',title:'Bag',reportType:'lost',status:'available',date:'2026-10-05',category:'Other',location:'Library',description:'A lost bag.'},{id:'found',title:'Keys',reportType:'found',status:'available',date:'2026-10-05',category:'Keys',location:'Library',description:'Found keys.'},{id:'returned',title:'Book',reportType:'found',status:'returned',date:'2026-10-04',category:'Books & stationery',location:'Classrooms',description:'Returned book.'}];
    assert.equal(filterItems(sample).length,3);
    assert.deepEqual(filterItems(sample,{reportType:'lost'}).map(i=>i.id),['lost']);
    assert.deepEqual(filterItems(sample,{reportType:'found'}).map(i=>i.id),['found','returned']);
    assert.equal(filterItems(sample,{reportType:'lost',query:'bag',location:'Library'}).length,1);
  });
  let lostId;
  await t.test('A lost-item report persists its status and contact details',async()=>{
    const r=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,reportType:'lost',title:'Missing blue bag',date:'2026-10-04'}});
    assert.equal(r.status,201);assert.equal(r.body.item.reportType,'lost');lostId=r.body.item.id;
    const saved=await request('item',{id:lostId,cookie:bobCookie});assert.equal(saved.body.item.reportType,'lost');assert.equal(saved.body.item.contact.name,'Alice Student');
  });
  await t.test('Unknown report statuses are rejected',async()=>{
    const r=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,reportType:'anything'}});assert.equal(r.status,400);assert.ok(r.body.errors.reportType);
  });
  await t.test('Lost-item reports direct finders to contact rather than ownership claims',async()=>{
    const r=await request('claim',{method:'POST',cookie:bobCookie,data:{itemId:lostId,proof:'I found this bag at the library.'}});assert.equal(r.status,400);assert.match(r.body.error,/Contact the owner/);
  });
  for(const version of [false,true])await t.test(`Version 2.${version?1:0} migration preserves accounts, sessions, claims and photos`,async()=>{
    const url='file:'+join(folder,'legacy-'+version+'.db'),old=createClient({url});
    await old.batch(legacySchema(version),'write');const hash=await hashPassword('Migration-test-2026!');
    for(const [id,name,email] of [['owner','Alua','existing@example.edu'],['other','Bob','bob-migrate@example.edu']])await old.execute({sql:'INSERT INTO users VALUES(?,?,?,?,?)',args:[id,name,email,hash,1]});
    await old.execute({sql:"INSERT INTO items(id,user_id,title,category,location,date,description,handover,status,contact_name,contact_email,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",args:['old-item','owner','Existing bag','Other','Library','2026-10-01','An existing saved report.','Campus staff','available','Alua','existing@example.edu',1]});
    await old.execute({sql:'INSERT INTO photos VALUES(?,?,?)',args:['old-item','image/png',Buffer.from(png.split(',')[1],'base64')]});
    await old.execute({sql:'INSERT INTO claims VALUES(?,?,?,?,?,?)',args:['old-claim','old-item','other','An identifying detail on the bag.','bob-migrate@example.edu',1]});
    await old.execute({sql:'INSERT INTO flags VALUES(?,?,?)',args:['old-item','other',1]});
    await old.execute({sql:'INSERT INTO sessions VALUES(?,?,?)',args:[digest('e'.repeat(64)),'owner',Date.now()+600000]});old.close();
    const code=`import {getDb} from ${JSON.stringify(new URL('../lib/db.js',import.meta.url).href)}; import {currentUser,verifyPassword} from ${JSON.stringify(new URL('../lib/security.js',import.meta.url).href)}; const db=await getDb(); const r=await db.execute('SELECT users.display_name AS name,items.title,items.report_type,users.password_hash FROM users JOIN items ON items.user_id=users.user_id'); const user=await currentUser(db,{headers:{cookie:'aitu_session='+'e'.repeat(64)}}); const photos=await db.execute('SELECT data FROM photos'); const claims=await db.execute('SELECT COUNT(*) AS n FROM claims'); const flags=await db.execute('SELECT COUNT(*) AS n FROM flags'); console.log(JSON.stringify({name:r.rows[0].name,title:r.rows[0].title,type:r.rows[0].report_type,password:await verifyPassword('Migration-test-2026!',r.rows[0].password_hash),session:user.name,photo:Buffer.from(photos.rows[0].data).toString('base64'),claims:claims.rows[0].n,flags:flags.rows[0].n})); db.close();`;
    const output=execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,DATABASE_URL:url},encoding:'utf8'});
    assert.deepEqual(JSON.parse(output.trim()),{name:'Alua',title:'Existing bag',type:'found',password:true,session:'Alua',photo:png.split(',')[1],claims:1,flags:1});
    const backup=createClient({url:url+'.before-v3.backup.db'});assert.equal((await backup.execute('SELECT name FROM users WHERE id=\'owner\'')).rows[0].name,'Alua');backup.close();
  });
  await t.test('Failed migration rolls back to the intact original schema',async()=>{
    const db=createClient({url:'file:'+join(folder,'rollback.db')});await db.batch(legacySchema(),'write');
    await db.execute({sql:'INSERT INTO users VALUES(?,?,?,?,?)',args:['u','Alua','rollback@example.edu','original-hash',1]});
    await db.execute({sql:'INSERT INTO items(id,user_id,title,category,location,date,description,handover,status,contact_name,contact_email,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',args:['i','u','Old bag','x'.repeat(41),'Library','2026-10-01','Original record survives.','Campus staff','available','Alua','rollback@example.edu',1]});
    await assert.rejects(()=>migrateWebsiteV2(db,schema));assert.equal((await db.execute('SELECT name FROM users')).rows[0].name,'Alua');assert.equal((await db.execute('SELECT id FROM items')).rows[0].id,'i');db.close();
  });
  await t.test('The original three-table Assignment 3 schema can run directly',async()=>{
    const url='file:'+join(folder,'original-course.db'),course=createClient({url});
    await course.executeMultiple(await readFile(new URL('../database/assignment3-core.sql',import.meta.url),'utf8'));
    await course.execute("INSERT INTO categories VALUES(1,'Bags')");await course.execute("INSERT INTO users VALUES(1,'Existing Student','course@example.invalid','legacy-hash','student')");
    await course.execute("INSERT INTO items VALUES(1,1,1,1,'Green bag','An original course report.','Library','2026-10-03','lost','open')");
    await initialiseDatabase(course,url);
    const r=await course.execute('SELECT users.display_name,categories.category_name,items.sample FROM items JOIN users USING(user_id) JOIN categories USING(category_id)');
    assert.equal(r.rows[0].display_name,'Existing Student');assert.equal(r.rows[0].category_name,'Bags');assert.equal(r.rows[0].sample,1);course.close();
  });
  await t.test('Import keeps current accounts and is idempotent',async()=>{
    const sourcePath=join(folder,'import-source.db'),source=createClient({url:'file:'+sourcePath});
    await source.executeMultiple(await readFile(new URL('../database/assignment3-core.sql',import.meta.url),'utf8'));
    await source.execute("INSERT INTO categories VALUES(1,'Bags')");
    await source.execute("INSERT INTO users VALUES(1,'Old Alice','alice@example.edu','old-hash','admin')");
    await source.execute("INSERT INTO items VALUES(1,1,1,1,'Imported bag','A report imported from coursework.','Library','2026-10-03','lost','open')");source.close();
    const originalBytes=await readFile(sourcePath);const db=await getDb(),first=await importAssignmentDatabase(sourcePath,db,process.env.DATABASE_URL);assert.equal(first.itemsAdded,1);assert.equal(first.usersAdded,0);
    const alice=(await db.execute({sql:'SELECT display_name,role FROM users WHERE email=?',args:['alice@example.edu']})).rows[0];assert.equal(alice.display_name,'Alice Student');assert.equal(alice.role,'student');
    const second=await importAssignmentDatabase(sourcePath,db,process.env.DATABASE_URL);assert.equal(second.alreadyImported,true);assert.deepEqual(await readFile(sourcePath),originalBytes);
    const check=createClient({url:'file:'+sourcePath});assert.equal((await check.execute('PRAGMA table_info(items)')).rows.length,10);check.close();
  });
  await t.test('SQL constraints reject missing users/categories and duplicate report numbers',async()=>{
    const db=await getDb();const sql='INSERT INTO items(user_id,report_number,category_id,title,description,location,event_date,report_type) VALUES(?,?,?,?,?,?,?,?)';
    await assert.rejects(()=>db.execute({sql,args:[999999,1,1,'Invalid report','Missing owner.','Library','2026-10-01','found']}));
    await assert.rejects(()=>db.execute({sql,args:[1,99999,999999,'Invalid report','Missing category.','Library','2026-10-01','found']}));
    const row=(await db.execute('SELECT user_id,report_number,category_id FROM items LIMIT 1')).rows[0];await assert.rejects(()=>db.execute({sql,args:[row.user_id,row.report_number,row.category_id,'Duplicate number','A duplicate report number.','Library','2026-10-01','found']}));
  });
  await t.test('Time is stored and shown; malformed time is rejected',async()=>{
    const created=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,title:'Timed report',eventTime:'14:35'}});assert.equal(created.status,201);assert.equal(created.body.item.eventTime,'14:35');
    const bad=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,eventTime:'25:99'}});assert.equal(bad.status,400);assert.ok(bad.body.errors.eventTime);
  });
  await t.test('The bundled fictional database has 10 users, 10 categories and 100 reports',async testcase=>{
    const path=new URL('../database/assignment3-demo.db',import.meta.url),db=await getDb();
    const {existsSync}=await import('node:fs');if(!existsSync(path)){testcase.skip('Optional local demo database is excluded from the deployment export.');return;}
    const source=createClient({url:path.href.replace('file:///','file:/')});
    for(const [table,n] of [['users',10],['categories',10],['items',100]])assert.equal((await source.execute('SELECT COUNT(*) AS n FROM '+table)).rows[0].n,n);source.close();
    const {fileURLToPath}=await import('node:url');const result=await importAssignmentDatabase(fileURLToPath(path),db,process.env.DATABASE_URL);assert.equal(result.itemsAdded,100);
    const board=await request('items');assert.ok(board.body.items.filter(i=>i.sample).length>=100);
    const account=await request('session',{cookie:aliceCookie});assert.equal(account.body.user.name,'Alice Student');
  });
  await t.test('Categories imported from the course database can be used in new interface reports',async()=>{
    const choices=await request('categories');assert.ok(choices.body.categories.some(c=>c.name==='Bags'));
    const added=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,title:'A bag in an imported category',category:'Bags',eventTime:'10:20'}});assert.equal(added.status,201);assert.equal(added.body.item.category,'Bags');
  });

  await t.test('The uploaded Assignment 3 database imports all 102 reports without changing the source or current login',async testcase=>{
    const {fileURLToPath}=await import('node:url');
    const sourcePath=fileURLToPath(new URL('../database/assignment3-original.db',import.meta.url));
    const {existsSync}=await import('node:fs');if(!existsSync(sourcePath)){testcase.skip('Private coursework database is only included in the private ZIP.');return;}
    const before=await readFile(sourcePath),source=createClient({url:'file:'+sourcePath});
    for(const [table,n] of [['users',10],['categories',10],['items',102]])assert.equal((await source.execute('SELECT COUNT(*) AS n FROM '+table)).rows[0].n,n);
    assert.equal((await source.execute('PRAGMA foreign_key_check')).rows.length,0);source.close();
    const db=await getDb(),oldCount=Number((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n);
    const result=await importAssignmentDatabase(sourcePath,db,process.env.DATABASE_URL);assert.equal(result.itemsAdded,102);
    assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n),oldCount+102);
    assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length,0);
    assert.equal((await request('session',{cookie:aliceCookie})).body.user.name,'Alice Student');
    assert.equal((await importAssignmentDatabase(sourcePath,db,process.env.DATABASE_URL)).alreadyImported,true);
    assert.deepEqual(await readFile(sourcePath),before);
    const board=await request('items');assert.equal(board.status,200);assert.ok(board.body.items.length>=102);
  });

  await t.test('Imported unpadded dates cannot interrupt display and are sorted chronologically',async()=>{
    assert.throws(()=>new Intl.DateTimeFormat('en-GB').format(new Date('2026-10-9T12:00:00')),RangeError);
    assert.equal(normaliseEventDate('2026-10-9'),'2026-10-09');
    assert.equal(formatEventDate('2026-10-9'),'9 Oct');
    for(const invalid of ['2026-02-30','2026-13-01','invalid',null,''])assert.equal(formatEventDate(invalid),'Date not specified');
    const sorted=filterItems([{date:'2026-10-9'},{date:'2026-10-10'},{date:'2026-9-30'}]);assert.equal(sorted[0].date,'2026-10-10');
    const board=await request('items');for(const item of board.body.items)assert.doesNotThrow(()=>formatEventDate(item.date));
  });

  await t.test('No-photo reports show a neutral placeholder and distinct uploaded photos stay with their own report',async()=>{
    for(const category of ['Bottles','Phones','Bags','Other']){
      const markup=renderItemVisual({id:'100',title:'A '+category,category,icon:'bag',photo:''});
      assert.match(markup,/No photo/);assert.doesNotMatch(markup,/<img|M68 62/);
    }
    assert.equal(itemPhoto({id:'100',photo:'/api/index?action=photo&id=200'}),'');
    const images=await Promise.all(['green-pixel','blue-pixel'].map(name=>readFile(new URL('./fixtures/'+name+'.png',import.meta.url))));
    assert.notDeepEqual(images[0],images[1]);
    const posted=[];
    for(const [index,title] of ['Green bottle with its own photo','Blue bag with its own photo'].entries()){
      const created=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,title,category:index?'Bags':'Bottles',photo:'data:image/png;base64,'+images[index].toString('base64')}});
      assert.equal(created.status,201);posted.push(created.body.item);
      const photo=await request('photo',{id:created.body.item.id});assert.deepEqual(photo.body,images[index]);
      const markup=renderItemVisual(created.body.item);assert.match(markup,/<img /);assert.doesNotMatch(markup,/No photo/);
    }
    assert.notEqual(posted[0].photo,posted[1].photo);
    const board=await request('items');for(const item of posted)assert.equal(board.body.items.find(row=>row.id===item.id).photo,item.photo);
  });

  let deletedHighestId='';
  await t.test('Deleting requires sign-in, POST and a same-origin request',async()=>{
    assert.equal((await request('delete',{method:'POST',data:{itemId}})).status,401);
    assert.equal((await request('delete',{id:itemId,cookie:aliceCookie})).status,404);
    assert.equal((await request('delete',{method:'POST',data:{itemId},cookie:aliceCookie,evilOrigin:'https://attacker.invalid'})).status,403);
    assert.equal((await request('item',{id:itemId})).status,200);
  });
  await t.test('An unrelated user cannot delete another person’s report',async()=>{
    const r=await request('delete',{method:'POST',cookie:bobCookie,data:{itemId}});assert.equal(r.status,403);
    assert.equal((await request('photo',{id:itemId})).status,200);
  });
  await t.test('The owner can permanently delete a returned report with its photo, claims and flags',async()=>{
    const db=await getDb();for(const table of ['photos','claims','flags'])assert.ok(Number((await db.execute({sql:'SELECT COUNT(*) AS n FROM '+table+' WHERE item_id=?',args:[itemId]})).rows[0].n)>0);
    const before=Number((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n);
    const removed=await request('delete',{method:'POST',cookie:aliceCookie,data:{itemId}});assert.equal(removed.status,200);
    for(const table of ['photos','claims','flags'])assert.equal(Number((await db.execute({sql:'SELECT COUNT(*) AS n FROM '+table+' WHERE item_id=?',args:[itemId]})).rows[0].n),0);
    assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n),before-1);
    assert.equal((await request('item',{id:itemId})).status,404);assert.equal((await request('photo',{id:itemId})).status,404);
    assert.equal((await request('delete',{method:'POST',cookie:aliceCookie,data:{itemId}})).status,404);
    assert.equal((await request('session',{cookie:aliceCookie})).body.user.name,'Alice Student');
    assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length,0);
  });
  await t.test('A configured coordinator can delete another user’s report',async()=>{
    const created=await request('items',{method:'POST',cookie:bobCookie,data:{...report,title:'Bob report for coordinator deletion'}});assert.equal(created.status,201);deletedHighestId=created.body.item.id;
    process.env.ADMIN_EMAILS='alice@example.edu';
    try{assert.equal((await request('delete',{method:'POST',cookie:aliceCookie,data:{itemId:deletedHighestId}})).status,200);}finally{process.env.ADMIN_EMAILS='';}
    assert.equal((await request('item',{id:deletedHighestId})).status,404);
    assert.ok((await request('session',{cookie:bobCookie})).body.user);
  });
  await t.test('A deleted report ID is not reused for a new report or photo',async()=>{
    const created=await request('items',{method:'POST',cookie:aliceCookie,data:{...report,title:'New report with a fresh URL'}});assert.equal(created.status,201);
    assert.ok(Number(created.body.item.id)>Number(deletedHighestId));assert.equal((await request('photo',{id:deletedHighestId})).status,404);
  });
  await t.test('Invalid deletion IDs cannot remove unrelated reports',async()=>{
    const db=await getDb(),before=Number((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n);
    for(const id of ['9999999',"' OR 1=1 --",''])assert.equal((await request('delete',{method:'POST',cookie:aliceCookie,data:{itemId:id}})).status,404);
    assert.equal(Number((await db.execute('SELECT COUNT(*) AS n FROM items')).rows[0].n),before);
  });
  await t.test('Deleting a coursework example does not recreate it on the next import',async testcase=>{
    const {existsSync}=await import('node:fs'),{fileURLToPath}=await import('node:url');const source=fileURLToPath(new URL('../database/assignment3-original.db',import.meta.url));
    if(!existsSync(source)){testcase.skip('Private coursework database absent.');return;}
    const db=await getDb(),id=String((await db.execute('SELECT item_id FROM items WHERE sample=1 ORDER BY item_id DESC LIMIT 1')).rows[0].item_id);
    process.env.ADMIN_EMAILS='alice@example.edu';try{assert.equal((await request('delete',{method:'POST',cookie:aliceCookie,data:{itemId:id}})).status,200);}finally{process.env.ADMIN_EMAILS='';}
    assert.equal((await importAssignmentDatabase(source,db,process.env.DATABASE_URL)).alreadyImported,true);
    assert.equal((await request('item',{id})).status,404);
  });

});
await new Promise(resolve=>server.close(resolve));(await getDb()).close();await rm(folder,{recursive:true,force:true});
