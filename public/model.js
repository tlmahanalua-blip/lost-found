export const CATEGORIES = ['Electronics', 'Keys', 'Clothing', 'Books & stationery', 'Cards & IDs', 'Bags & backpacks', 'Bottles', 'Chargers & cables', 'Accessories', 'Other'];
export const LOCATIONS = ['Library', 'Cafeteria', 'Classrooms', 'Main entrance', 'Other campus area'];
export const STORAGE_KEY = 'aitu-lost-found-v1';
const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
export const TODAY = ['year','month','day'].map(key=>todayParts.find(p=>p.type===key).value).join('-');
export function normaliseEventDate(value) {
  const parts=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value ?? '').trim());
  if(!parts)return '';
  const [,year,month,day]=parts.map(Number),date=new Date(0);
  date.setUTCFullYear(year,month-1,day);date.setUTCHours(12,0,0,0);
  if(date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day)return '';
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function formatEventDate(value) {
  const date=normaliseEventDate(value);
  return date?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'Date not specified';
}
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
export const seeds = [
  {id:'demo-1', title:'Black wireless headphones', category:'Electronics', location:'Library', date:'2026-10-06', description:'Over-ear headphones left on a study desk. Tell us the brand and one identifying detail to claim them.', icon:'headphones', tone:'sage', status:'available', handover:'Campus staff', sample:true},
  {id:'demo-2', title:'Keys with a blue keyring', category:'Keys', location:'Main entrance', date:'2026-10-06', description:'A small set of keys with a blue keyring. Describe the number of keys and the keyring shape.', icon:'keys', tone:'blue', status:'available', handover:'I will keep it safely', sample:true},
  {id:'demo-3', title:'Cream-coloured bag', category:'Other', location:'Cafeteria', date:'2026-10-05', description:'A canvas bag found near a table. Please describe the print and what was inside.', icon:'bag', tone:'sand', status:'available', handover:'Campus staff', sample:true},
  {id:'demo-4', title:'Green spiral notebook', category:'Books & stationery', location:'Classrooms', date:'2026-10-05', description:'A green notebook with handwritten study notes. Describe the subject or the first page.', icon:'notebook', tone:'mint', status:'available', handover:'I will keep it safely', sample:true},
  {id:'demo-5', title:'Silver water bottle', category:'Other', location:'Library', date:'2026-10-04', description:'A metal water bottle left near the reading area. Describe the stickers or the bottle cap.', icon:'bottle', tone:'peach', status:'available', handover:'Campus staff', sample:true},
  {id:'demo-6', title:'Grey hoodie', category:'Clothing', location:'Classrooms', date:'2026-10-04', description:'A grey hoodie found on a chair. Describe the size and the design on the front.', icon:'hoodie', tone:'lavender', status:'available', handover:'Campus staff', sample:true},
  {id:'demo-7', title:'Student card', category:'Cards & IDs', location:'Main entrance', date:'2026-10-03', description:'A student card was returned to its owner. Personal details were never displayed publicly.', icon:'card', tone:'blue', status:'returned', handover:'Campus staff', sample:true},
  {id:'demo-8', title:'USB-C laptop charger', category:'Electronics', location:'Cafeteria', date:'2026-10-03', description:'A laptop charger with a USB-C cable. Describe the brand and the power rating.', icon:'charger', tone:'sand', status:'available', handover:'I will keep it safely', sample:true}
];
export function initialState() { return { items: structuredClone(seeds), claims: [], flags: [], myIds: [] }; }
export function loadState(storage) {
  try {
    const s = JSON.parse(storage.getItem(STORAGE_KEY));
    if (s && Array.isArray(s.items) && Array.isArray(s.claims) && Array.isArray(s.flags) && Array.isArray(s.myIds) && s.items.every(i => typeof i.id==='string' && typeof i.title==='string' && typeof i.description==='string' && CATEGORIES.includes(i.category) && LOCATIONS.includes(i.location) && ['available','returned'].includes(i.status) && validDate(i.date))) return s;
  } catch {}
  return initialState();
}
export function persist(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function filterItems(items, { query='', category='', location='', status='', reportType='', mine=false, myIds=[] }={}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(i => (!category || i.category===category) && (!location || i.location===location) && (!status || i.status===status) && (!reportType || (i.reportType || 'found')===reportType) && (!mine || myIds.includes(i.id)) && terms.every(t => [i.title,i.description,i.category,i.location].join(' ').toLocaleLowerCase().includes(t))).sort((a,b)=>normaliseEventDate(b.date).localeCompare(normaliseEventDate(a.date)));
}
export function validateReport(d, today=TODAY, categories=CATEGORIES) {
  const e={};
  if (!d.title || d.title.trim().length<3 || d.title.trim().length>80) e.title='Enter an item name with 3–80 characters.';
  if (!categories.includes(d.category)) e.category='Choose an item category.';
  if (!LOCATIONS.includes(d.location)) e.location=d.reportType==='lost'?'Choose where you last saw the item.':'Choose where you found the item.';
  if (d.eventTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.eventTime)) e.eventTime='Choose a valid time.';
  if (!validDate(d.date) || d.date>today) e.date='Choose a valid date, today or earlier.';
  if (!d.description || d.description.trim().length<10 || d.description.trim().length>600) e.description='Add a description with 10–600 characters.';
  if (!['Campus staff','I will keep it safely'].includes(d.handover)) e.handover='Choose a safe handover option.';
  if (!d.consent) e.consent='Confirm that the post contains no private details.';
  if (d.photo && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.photo)) e.photo='Choose a JPG, PNG or WebP photo.';
  return e;
}
export function createReport(state,d,id,today=TODAY) {
  const errors=validateReport(d,today);
  if(Object.keys(errors).length) return {errors};
  const item={id,title:d.title.trim(),category:d.category,location:d.location,date:d.date,description:d.description.trim(),handover:d.handover,photo:d.photo || '',icon:iconFor(d.category),tone:'sage',status:'available',sample:false};
  return {state:{...state,items:[item,...state.items],myIds:[id,...state.myIds]},item};
}
export function iconFor(c) { return {'Electronics':'headphones','Keys':'keys','Clothing':'hoodie','Books & stationery':'notebook','Cards & IDs':'card'}[c] || 'bag'; }
export function validateClaim(d) {
  const e={};
  if(!d.proof || d.proof.trim().length<10 || d.proof.trim().length>400) e.proof='Describe a private identifying detail (10–400 characters).';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '') || d.email.length>150) e.email='Enter a valid email address.';
  return e;
}
export function createClaim(state,itemId,d) {
  const errors=validateClaim(d);
  if(!state.items.some(i=>i.id===itemId && i.status==='available')) errors.item='This item is no longer available.';
  if(Object.keys(errors).length) return {errors};
  if(state.claims.some(c=>c.itemId===itemId && c.email.toLowerCase()===d.email.trim().toLowerCase())) return {errors:{email:'A demo claim for this item is already saved for this email.'}};
  return {state:{...state,claims:[...state.claims,{itemId,proof:d.proof.trim(),email:d.email.trim(),createdAt:new Date().toISOString()}]}};
}
export function markReturned(state,id) { return {...state,items:state.items.map(i=>i.id===id?{...i,status:'returned'}:i)}; }
export function flagItem(state,id) { return state.flags.includes(id)?state:{...state,flags:[...state.flags,id]}; }
export function safePhoto(photo) { return typeof photo==='string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)?photo:''; }
