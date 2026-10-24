import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export const SESSION_SECONDS=7*24*60*60;
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
  const salt=randomBytes(16).toString('hex');
  const key=await scrypt(password,salt,64,{N:16384,r:8,p:1});
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,hash) {
  const [algorithm,salt,hex]=hash.split('$');
  if(algorithm!=='scrypt'||!salt||!hex)return false;
  const key=await scrypt(password,salt,64,{N:16384,r:8,p:1});
  const expected=Buffer.from(hex,'hex');
  return key.length===expected.length && timingSafeEqual(key,expected);
}
export const isAdmin=email=>(process.env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
export function sessionCookie(token,req,clear=false) {
  const secure=!!process.env.VERCEL || req.socket?.encrypted || req.headers['x-forwarded-proto']==='https';
  return `aitu_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:SESSION_SECONDS}${secure?'; Secure':''}`;
}
export function cookieToken(req) {
  const match=(req.headers.cookie||'').match(/(?:^|;\s*)aitu_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1];
}
export function newSession(userId) {
  const token=randomBytes(32).toString('hex');
  return {token,statement:{sql:'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',args:[digest(token),userId,Date.now()+SESSION_SECONDS*1000]}};
}
export async function currentUser(db,req) {
  const token=cookieToken(req);if(!token)return null;
  const r=await db.execute({sql:'SELECT users.user_id,users.display_name,users.email,users.role FROM sessions JOIN users ON users.user_id=sessions.user_id WHERE token_hash=? AND expires_at>?',args:[digest(token),Date.now()]});
  const row=r.rows[0];return row?{id:String(row.user_id),name:row.display_name,email:row.email,isAdmin:row.role==='admin'||isAdmin(row.email)}:null;
}
export function sameOrigin(req) {
  if(!req.headers.origin || req.headers['sec-fetch-site']==='cross-site')return false;
  const proto=process.env.VERCEL?'https':(req.socket?.encrypted?'https':'http');
  const candidates=[`${proto}://${req.headers.host}`,process.env.APP_ORIGIN].filter(Boolean);
  try{return candidates.some(value=>new URL(value).origin===new URL(req.headers.origin).origin);}catch{return false;}
}
export async function limit(db,req,action,userId,max=20) {
  const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim():req.socket?.remoteAddress || 'local';
  const key=digest(`${action}:${userId || ip}`),now=Date.now(),windowStart=now-15*60*1000;
  const r=await db.execute({sql:`INSERT INTO rate_limits(key,window_start,hits) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN window_start<? THEN 1 ELSE hits+1 END,window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END
    RETURNING hits`,args:[key,now,windowStart,windowStart]});
  return Number(r.rows[0].hits)<=max;
}
