import { randomUUID, createHash } from 'node:crypto';
import { getDb } from '../lib/db.js';
import { allocateItemId } from '../lib/ids.js';
import { currentUser, hashPassword, verifyPassword, newSession, sessionCookie, cookieToken, digest, sameOrigin, limit } from '../lib/security.js';
import { registrationErrors, reportData, claimErrors, text, emailOK } from '../lib/validation.js';

class HttpError extends Error {constructor(status,message,errors){super(message);this.status=status;this.errors=errors;}}
const fail=(status,message,errors)=>{throw new HttpError(status,message,errors);};
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
function requireUser(user){if(!user)fail(401,'Please sign in to continue.');}
async function readBody(req) {
  if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))fail(415,'Send JSON data.');
  let body=req.body;
  if(!body){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1400000)fail(413,'The photo is too large. Choose a smaller image.');}body=raw;}
  if(Buffer.isBuffer(body))body=body.toString('utf8');
  if(typeof body==='string'){if(Buffer.byteLength(body)>1400000)fail(413,'The photo is too large.');try{body=JSON.parse(body);}catch{fail(400,'Invalid JSON.');}}
  if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Enter valid form data.');
  if(Buffer.byteLength(JSON.stringify(body))>1400000)fail(413,'The photo is too large.');
  return body;
}
const itemFrom='items JOIN categories ON categories.category_id=items.category_id JOIN users AS author ON author.user_id=items.user_id';
const itemColumns=`items.item_id AS id,items.user_id,items.title,items.report_type,categories.category_name AS category,items.location,items.event_date AS date,items.event_time AS eventTime,items.description,items.handover,items.status,items.sample,items.created_at,EXISTS(SELECT 1 FROM photos WHERE photos.item_id=items.item_id) AS has_photo`;
function publicItem(row,user) {
  return {id:String(row.id),userId:String(row.user_id),title:row.title,reportType:row.report_type,category:row.category,location:row.location,date:row.date,eventTime:row.eventTime,description:row.description,handover:row.handover,status:row.status==='resolved'?'returned':'available',sample:!!row.sample,tone:'sage',photo:row.has_photo?`/api/index?action=photo&id=${encodeURIComponent(row.id)}`:'',canManage:!!user&&(user.isAdmin||user.id===String(row.user_id))};
}
async function itemRow(db,id) {const r=await db.execute({sql:`SELECT ${itemColumns},COALESCE(NULLIF(contact_name,''),author.display_name) AS contact_name,COALESCE(NULLIF(contact_email,''),author.email) AS contact_email,contact_phone,contact_telegram FROM ${itemFrom} WHERE items.item_id=?`,args:[id]});if(!r.rows[0])fail(404,'This listing could not be found.');return r.rows[0];}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'health';
  try {
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');fail(405,'Method not allowed.');}
    if(req.method==='POST'&&!sameOrigin(req))fail(403,'This request must come from this website. Refresh the page and try again.');
    const db=await getDb();
    if(action==='health'&&req.method==='GET'){json(res,200,{ok:true,database:process.env.TURSO_DATABASE_URL?'remote-sqlite':'local-sqlite'});return;}
    const user=await currentUser(db,req);
    if(action==='categories'&&req.method==='GET'){const r=await db.execute('SELECT category_id,category_name FROM categories ORDER BY category_id');json(res,200,{categories:r.rows.map(c=>({id:Number(c.category_id),name:c.category_name}))});return;}
    if(action==='session'&&req.method==='GET'){json(res,200,{user});return;}
    if(action==='items'&&req.method==='GET') {
      const r=await db.execute(`SELECT ${itemColumns} FROM ${itemFrom} ORDER BY items.event_date DESC,items.created_at DESC,items.item_id DESC`);
      json(res,200,{items:r.rows.map(row=>publicItem(row,user))});return;
    }
    if(action==='item'&&req.method==='GET') {
      const row=await itemRow(db,text(url.searchParams.get('id')));
      const flags=user?await db.execute({sql:'SELECT 1 FROM flags WHERE item_id=? AND user_id=?',args:[row.id,user.id]}):{rows:[]};
      json(res,200,{item:{...publicItem(row,user),contact:user?{name:row.contact_name,email:row.contact_email,phone:row.contact_phone,telegram:row.contact_telegram}:null,flagged:flags.rows.length>0}});return;
    }
    if(action==='photo'&&req.method==='GET') {
      const r=await db.execute({sql:'SELECT mime,data FROM photos WHERE item_id=?',args:[text(url.searchParams.get('id'))]});
      if(!r.rows[0])fail(404,'Photo not found.');
      const bytes=Buffer.from(r.rows[0].data);
      const etag='"'+createHash('sha256').update(bytes).digest('hex')+'"';
      res.setHeader('Content-Type',r.rows[0].mime);
      res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
      res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
      res.setHeader('ETag',etag);
      const tags=String(req.headers['if-none-match']||'').split(',').map(tag=>tag.trim());
      if(tags.some(tag=>tag==='*'||tag===etag||tag==='W/'+etag)) {
        res.statusCode=304;res.end();return;
      }
      res.statusCode=200;res.end(bytes);return;
    }
    if(action==='manage'&&req.method==='GET') {
      requireUser(user);
      const own=user.isAdmin?'': ' WHERE items.user_id=?';const args=user.isAdmin?[]:[user.id];
      const items=await db.execute({sql:`SELECT ${itemColumns} FROM ${itemFrom}${own} ORDER BY items.created_at DESC`,args});
      const claims=await db.execute({sql:`SELECT claims.id,claims.item_id AS itemId,claims.proof,claims.email,claims.created_at AS createdAt,items.title FROM claims JOIN items ON items.item_id=claims.item_id${own} ORDER BY claims.created_at DESC`,args});
      const flags=user.isAdmin?await db.execute('SELECT flags.item_id AS itemId,items.title,COUNT(*) AS count FROM flags JOIN items ON items.item_id=flags.item_id GROUP BY flags.item_id,items.title'):{rows:[]};
      json(res,200,{items:items.rows.map(row=>publicItem(row,user)),claims:claims.rows.map(r=>({...r})),flags:flags.rows.map(r=>({...r})),isAdmin:user.isAdmin});return;
    }
    if(req.method!=='POST')fail(404,'Endpoint not found.');
    const body=await readBody(req);
    if(action==='register') {
      if(!await limit(db,req,'register',null,8))fail(429,'Too many registration attempts. Try again in 15 minutes.');
      const data={name:text(body.name),email:text(body.email).toLowerCase(),password:body.password};
      const errors=registrationErrors(data);if(Object.keys(errors).length)fail(400,'Check your registration details.',errors);
      const passwordHash=await hashPassword(data.password),tx=await db.transaction('write');let session;
      try{const added=await tx.execute({sql:'INSERT INTO users(display_name,email,password_hash,created_at) VALUES(?,?,?,?) RETURNING user_id',args:[data.name,data.email,passwordHash,Date.now()]});session=newSession(Number(added.rows[0].user_id));await tx.execute(session.statement);await tx.commit();}
      catch(error){await tx.rollback();if(String(error.code).includes('CONSTRAINT')||String(error.message).includes('UNIQUE'))fail(409,'An account with this email already exists.',{email:'This email is already registered. Sign in instead.'});throw error;}finally{tx.close();}
      res.setHeader('Set-Cookie',sessionCookie(session.token,req));json(res,201,{user:await currentUser(db,{...req,headers:{...req.headers,cookie:`aitu_session=${session.token}`}})});return;
    }
    if(action==='login') {
      const email=text(body.email).toLowerCase();
      if(!await limit(db,req,'login-ip',null,30)||!await limit(db,req,'login-email',digest(email),15))fail(429,'Too many sign-in attempts. Try again in 15 minutes.');
      if(!emailOK(email)||typeof body.password!=='string'||body.password.length>128)fail(400,'Enter your email and password.');
      const found=await db.execute({sql:'SELECT user_id,password_hash FROM users WHERE lower(email)=?',args:[email]});
      const row=found.rows[0];
      // An unknown email still performs scrypt to reduce account-discovery timing differences.
      const valid=await verifyPassword(body.password,row?.password_hash || 'scrypt$00000000000000000000000000000000$'+'00'.repeat(64));
      if(!row||!valid)fail(401,'Incorrect email or password.');
      const session=newSession(Number(row.user_id));await db.batch([session.statement,{sql:'DELETE FROM sessions WHERE expires_at<?',args:[Date.now()]}],'write');
      res.setHeader('Set-Cookie',sessionCookie(session.token,req));json(res,200,{user:await currentUser(db,{...req,headers:{...req.headers,cookie:`aitu_session=${session.token}`}})});return;
    }
    if(action==='logout') {
      const token=cookieToken(req);if(token)await db.execute({sql:'DELETE FROM sessions WHERE token_hash=?',args:[digest(token)]});
      res.setHeader('Set-Cookie',sessionCookie('',req,true));json(res,200,{ok:true});return;
    }
    requireUser(user);
    if(!await limit(db,req,'write',user.id,60))fail(429,'Too many requests. Try again in 15 minutes.');
    if(action==='items') {
      const categories=await db.execute('SELECT category_id,category_name FROM categories');
      const validated=reportData(body,categories.rows.map(c=>c.category_name));if(validated.errors)fail(400,'Check the highlighted fields.',validated.errors);
      const d=validated.data,category=categories.rows.find(c=>c.category_name===d.category),tx=await db.transaction('write');let id;
      try{
        const allocatedId=await allocateItemId(tx);
        const added=await tx.execute({sql:`INSERT INTO items(item_id,user_id,report_number,category_id,title,report_type,location,event_date,event_time,description,handover,contact_name,contact_email,contact_phone,contact_telegram,created_at)
          SELECT ?,?,COALESCE(MAX(report_number),0)+1,?,?,?,?,?,?,?,?,?,?,?,?,? FROM items WHERE user_id=? RETURNING item_id`,args:[allocatedId,user.id,Number(category.category_id),d.title,d.reportType,d.location,d.date,d.eventTime,d.description,d.handover,d.contactName,d.contactEmail.toLowerCase(),d.contactPhone,d.contactTelegram.replace(/^@/,''),Date.now(),user.id]});
        id=Number(added.rows[0].item_id);
        if(validated.photo)await tx.execute({sql:'INSERT INTO photos(item_id,mime,data) VALUES(?,?,?)',args:[id,validated.photo.mime,validated.photo.bytes]});
        await tx.commit();
      }catch(error){await tx.rollback();throw error;}finally{tx.close();}
      json(res,201,{item:publicItem(await itemRow(db,id),user)});return;
    }
    if(action==='claim') {
      const errors=claimErrors({proof:body.proof,email:user.email});if(Object.keys(errors).length)fail(400,'Check your claim.',errors);
      const row=await itemRow(db,text(body.itemId));
      if(row.report_type==='lost')fail(400,'This is a lost-item report. Contact the owner if you found it.');
      if(String(row.user_id)===user.id)fail(400,'You cannot claim your own listing.');
      if(row.sample)fail(400,'This is a sample listing. Claims are available on real reports.');
      try{
        const r=await db.execute({sql:`INSERT INTO claims(id,item_id,user_id,proof,email,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM items WHERE item_id=? AND status='open')`,args:[randomUUID(),row.id,user.id,text(body.proof),user.email,Date.now(),row.id]});
        if(!r.rowsAffected)fail(409,'This item has already been returned.');
      }catch(error){if(String(error.code).includes('CONSTRAINT'))fail(409,'You already sent a claim for this item.');throw error;}
      json(res,201,{ok:true});return;
    }
    if(action==='flag') {
      const row=await itemRow(db,text(body.itemId));
      await db.execute({sql:'INSERT OR IGNORE INTO flags(item_id,user_id,created_at) VALUES(?,?,?)',args:[row.id,user.id,Date.now()]});json(res,200,{ok:true});return;
    }
    if(action==='delete') {
      const tx=await db.transaction('write');
      try {
        const found=await tx.execute({sql:'SELECT item_id,user_id FROM items WHERE item_id=?',args:[text(body.itemId)]});
        const row=found.rows[0];if(!row)fail(404,'This listing could not be found.');
        if(!user.isAdmin&&String(row.user_id)!==user.id)fail(403,'Only the person who posted this report or a coordinator can delete it.');
        await tx.execute({sql:'DELETE FROM items WHERE item_id=?',args:[row.item_id]});
        await tx.commit();
      } catch(error) {await tx.rollback();throw error;} finally {tx.close();}
      json(res,200,{ok:true});return;
    }
    if(action==='returned') {
      const row=await itemRow(db,text(body.itemId));
      if(!user.isAdmin&&String(row.user_id)!==user.id)fail(403,'Only the person who posted this item or a coordinator can mark it returned.');
      await db.execute({sql:"UPDATE items SET status='resolved' WHERE item_id=?",args:[row.id]});json(res,200,{ok:true});return;
    }
    fail(404,'Endpoint not found.');
  }catch(error) {
    if(error instanceof HttpError){json(res,error.status,{error:error.message,errors:error.errors});return;}
    // Avoid exposing queries, emails, tokens or database connection details in responses.
    console.error('Lost & Found API failure:',String(error.code||error.name||'Error'));
    const configured=String(error.message).startsWith('DATABASE_CONFIGURATION:');
    json(res,503,{error:configured?'Database is not configured. Follow DEPLOYMENT.md to connect your Turso database.':'The service is temporarily unavailable. Please try again.'});
  }
}
