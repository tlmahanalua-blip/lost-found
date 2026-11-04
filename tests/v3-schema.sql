-- Full website schema. Original Assignment 3 core: assignment3-core.sql.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS id_counters (
    name TEXT PRIMARY KEY,
    last_value INTEGER NOT NULL
  );

CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE CHECK(length(trim(category_name)) BETWEEN 1 AND 40)
  );

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
    created_at INTEGER NOT NULL DEFAULT 0
  );

CREATE TABLE IF NOT EXISTS items (
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
  );

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

CREATE TABLE IF NOT EXISTS photos (
    item_id INTEGER PRIMARY KEY REFERENCES items(item_id) ON DELETE CASCADE,
    mime TEXT NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
    data BLOB NOT NULL CHECK(length(data) <= 900000)
  );

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    proof TEXT NOT NULL CHECK(length(proof) BETWEEN 10 AND 400),
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(item_id,user_id)
  );

CREATE TABLE IF NOT EXISTS flags (
    item_id INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(item_id,user_id)
  );

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    hits INTEGER NOT NULL
  );

CREATE TABLE IF NOT EXISTS imports (
    source_hash TEXT PRIMARY KEY,
    users_added INTEGER NOT NULL,
    categories_added INTEGER NOT NULL,
    items_added INTEGER NOT NULL,
    imported_at INTEGER NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_items_user_event_date ON items(user_id,event_date DESC);

CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id);
