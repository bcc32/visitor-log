PRAGMA foreign_keys = OFF;

BEGIN IMMEDIATE;

CREATE TABLE messages_temp (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors,
  message TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden BETWEEN 0 AND 1)
);

INSERT INTO messages_temp (id, timestamp, visitor_id, message, hidden)
SELECT id, timestamp, visitor_id, message, 0 FROM messages;

DROP TABLE messages;

ALTER TABLE messages_temp RENAME TO messages;

CREATE INDEX IF NOT EXISTS messages_timestamp ON messages (
  timestamp
);

CREATE INDEX IF NOT EXISTS messages_visitor_id ON messages (
  visitor_id
);

PRAGMA foreign_key_check;

COMMIT;

PRAGMA foreign_keys = ON;
