import {getDb} from '../lib/db.js';
import {backupLocal} from '../lib/migrate.js';
const db=await getDb();
try{const file=await backupLocal(db,process.env.TURSO_DATABASE_URL||process.env.DATABASE_URL||'file:./data/lost-found.db','backup-'+Date.now());if(!file)throw new Error('For a remote database, use the database provider export/backup tools.');console.log('Consistent SQLite backup created: '+file);}finally{db.close();}
