const Promise = require('bluebird');
const dirname = require('path').dirname;
const mkdirp = require('mkdirp');
const sqlite3 = require('sqlite3');

const log = require('./log');

Promise.promisifyAll(sqlite3.Database.prototype);
Promise.promisifyAll(sqlite3.Statement.prototype);

mkdirp.sync(dirname(global.program.dbpath));

const db = new sqlite3.Database(global.program.dbpath);
module.exports = db;

const schema = String.raw`

PRAGMA foreign_keys=on;

CREATE TABLE IF NOT EXISTS
visitors (
  id INTEGER PRIMARY KEY,
  ip TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS
messages (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors (id),
  message TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS
messages_timestamp ON messages (
  timestamp
);

CREATE TABLE IF NOT EXISTS
link_clicks (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  visitor_id INTEGER NOT NULL REFERENCES visitors (id),
  path TEXT NOT NULL,
  label TEXT NOT NULL,
  href TEXT NOT NULL
);

`;

db.serialize(() => {
  db.execAsync(schema)
    .catch((e) => {
      log.error('Error initializing database: ', e);
      process.exit(1);
    });
});

{
  const insertStmt = db.prepare(String.raw`
    INSERT OR IGNORE INTO visitors (ip) VALUES (?)
  `);

  const selectStmt = db.prepare(String.raw`
    SELECT id FROM visitors WHERE ip = ?
  `);

  db.recordVisitor = (ip) => {
    return insertStmt.runAsync(ip)
      .then(() => selectStmt.getAsync(ip))
      .get('id');
  };
}

{
  const sql = String.raw`
    INSERT INTO link_clicks (timestamp, visitor_id, path, label, href)
    VALUES ($timestamp, $visitor_id, $path, $label, $href)
  `;
  const stmt = db.prepare(sql);

  db.recordLinkClick = ({ visitor_id, path, label, href }) => {
    const values = {
      $visitor_id: visitor_id,
      $path: path,
      $label: label,
      $href: href,
      $timestamp: new Date().toISOString(),
    };

    return stmt.runAsync(values);
  };
}
