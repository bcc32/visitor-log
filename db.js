const Promise = require('bluebird');
const dirname = require('path').dirname;
const mkdirp = require('mkdirp');
const sqlite3 = require('sqlite3');

Promise.promisifyAll(sqlite3.Database.prototype);
Promise.promisifyAll(sqlite3.Statement.prototype);

mkdirp.sync(dirname(global.program.dbpath));

const db = new sqlite3.Database(global.program.dbpath);

const schema = String.raw`

CREATE TABLE IF NOT EXISTS
messages (
  id INTEGER PRIMARY KEY,
  timestamp TEXT,
  ip TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS
messages_timestamp ON messages (
  timestamp
);

CREATE TABLE IF NOT EXISTS
link_clicks (
  id INTEGER PRIMARY KEY,
  timestamp TEXT,
  ip TEXT,
  path TEXT,
  label TEXT,
  href TEXT
);

`;

db.serialize(() => {
  db.execAsync(schema)
    .catch((e) => {
      log.error('Error initializing database: ', e);
      process.exit(1);
    });
});

module.exports = db;
