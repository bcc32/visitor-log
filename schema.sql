/* Set journal_mode to WAL to enable Write-Ahead Logging.  This is done only
 * once in the schema because this journal mode persists over multiple db
 * connections.
 */
PRAGMA journal_mode = WAL;

CREATE TABLE visitors (
  id INTEGER PRIMARY KEY,
  ip TEXT UNIQUE NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors,
  message TEXT NOT NULL
);

CREATE INDEX messages_timestamp ON messages (
  timestamp
);

CREATE TABLE link_clicks (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors,
  path TEXT NOT NULL,
  label TEXT NOT NULL,
  href TEXT NOT NULL
);
