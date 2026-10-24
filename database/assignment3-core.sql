-- Original three-table design transcribed from the user's Assignment 3 report.
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE CHECK(length(trim(category_name)) BETWEEN 1 AND 40)
);
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin'))
);
CREATE TABLE items (
  item_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  report_number INTEGER NOT NULL CHECK(report_number > 0),
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  event_date TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK(report_type IN ('lost','found')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  UNIQUE(user_id,report_number),
  FOREIGN KEY(user_id) REFERENCES users(user_id),
  FOREIGN KEY(category_id) REFERENCES categories(category_id)
);
