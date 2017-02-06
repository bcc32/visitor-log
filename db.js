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

const init = String.raw`

PRAGMA foreign_keys = ON;
VACUUM;
ANALYZE;

`;

db.serialize(() => {
  db.execAsync(init)
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
