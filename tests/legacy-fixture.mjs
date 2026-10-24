export const legacySchema=(withType=true)=>[
  'CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL)',
  `CREATE TABLE items(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,title TEXT NOT NULL,${withType?"report_type TEXT NOT NULL DEFAULT 'found',":''}category TEXT NOT NULL,location TEXT NOT NULL,date TEXT NOT NULL,description TEXT NOT NULL,handover TEXT NOT NULL,status TEXT NOT NULL,contact_name TEXT NOT NULL,contact_email TEXT NOT NULL,contact_phone TEXT NOT NULL DEFAULT '',contact_telegram TEXT NOT NULL DEFAULT '',sample INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL)`,
  'CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL)',
  'CREATE TABLE photos(item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,mime TEXT NOT NULL,data BLOB NOT NULL)',
  'CREATE TABLE claims(id TEXT PRIMARY KEY,item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,proof TEXT NOT NULL,email TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(item_id,user_id))',
  'CREATE TABLE flags(item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,PRIMARY KEY(item_id,user_id))',
  'CREATE INDEX idx_items_user_date ON items(user_id,date DESC)',
  'CREATE INDEX idx_sessions_expiry ON sessions(expires_at)'
];
