import {getDb} from '../lib/db.js';
const db=await getDb();
console.log('Database schema ready. Tables: users, categories, items, sessions, photos, claims, flags, rate_limits, imports, id_counters.');
db.close();
