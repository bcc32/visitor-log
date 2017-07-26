/* Set journal_mode to WAL to enable Write-Ahead Logging.  This is done only
 * once in the schema because this journal mode persists over multiple db
 * connections.
 */
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY,
  ip TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors,
  message TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS messages_timestamp ON messages (
  timestamp
);

CREATE INDEX IF NOT EXISTS messages_visitor_id ON messages (
  visitor_id
);

CREATE TABLE IF NOT EXISTS link_clicks (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors,
  path TEXT NOT NULL,
  label TEXT NOT NULL,
  href TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS link_clicks_visitor_id ON link_clicks (
  visitor_id
);

CREATE TABLE IF NOT EXISTS words (
  word TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS urls (
  short_url TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  expiry TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS urls_expiry ON urls (
  expiry
);
