const Promise = require('bluebird');
const dirname = require('path').dirname;
const fs      = require('fs');
const mkdirp  = require('mkdirp');
const sqlite3 = require('sqlite3');

const log = require('./log');

Promise.promisifyAll(sqlite3.Database.prototype);
Promise.promisifyAll(sqlite3.Statement.prototype);

mkdirp.sync(dirname(global.program.dbpath));

const db = new sqlite3.Database(global.program.dbpath);
module.exports = db;

const schema = fs.readFileSync('schema.sql');

const init = String.raw`

PRAGMA foreign_keys = ON;

${ schema }

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
      .get('id')
      .finally(() => selectStmt.reset());
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

{
  function NoAvailableWordsError() {
    this.message = 'No words are available for short URLs';
    this.name = 'NoAvailableWordsError';
    Error.captureStackTrace(this, NoAvailableWordsError);
  }
  db.NoAvailableWordsError = NoAvailableWordsError;

  NoAvailableWordsError.prototype = Object.create(Error.prototype);
  NoAvailableWordsError.prototype.constructor = NoAvailableWordsError;

  const beginTransaction = db.prepare(String.raw`
    BEGIN TRANSACTION
  `);

  const selectWord = db.prepare(String.raw`
    SELECT word FROM (SELECT word FROM words LIMIT 100)
    ORDER BY RANDOM()
    LIMIT 1
  `);

  const deleteWord = db.prepare(String.raw`
    DELETE FROM words WHERE word = $word
  `);

  const insertNewUrl = db.prepare(String.raw`
    INSERT INTO urls (short_url, url, expiry)
    VALUES ($short_url, $url, $expiry)
  `);

  const commitTransaction = db.prepare(String.raw`
    COMMIT TRANSACTION
  `);

  const rollbackTransaction = db.prepare(String.raw`
    ROLLBACK TRANSACTION
  `);

  db.makeShortUrl = (url) => {
    let expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    expiry = expiry.toISOString();

    return beginTransaction.runAsync()
      .then(() => selectWord.getAsync())
      .then((row) => {
        if (row == null) {
          throw new NoAvailableWordsError();
        }
        return row.word;
      })
      .tap((word) => deleteWord.runAsync({ $word: word }))
      .tap((word) => insertNewUrl.runAsync({
        $short_url: word,
        $url: url,
        $expiry: expiry,
      }))
      .tap(() => commitTransaction.runAsync())
      .tapCatch((e) => {
        log.error('rolling back transaction', e);
        rollbackTransaction.runAsync();
      })
      .then((word) => {
        return {
          word,
          url,
          expiry,
        };
      })
      .finally(() => selectWord.resetAsync())
      .finally(() => deleteWord.resetAsync());
  };
}

{
  function UrlNotFoundError(word) {
    this.message = `No URL was found for "${word}"`;
    this.name = 'UrlNotFoundError';
    Error.captureStackTrace(this, UrlNotFoundError);
  }
  db.UrlNotFoundError = UrlNotFoundError;

  UrlNotFoundError.prototype = Object.create(Error.prototype);
  UrlNotFoundError.prototype.constructor = UrlNotFoundError;

  const selectUrl = db.prepare(String.raw`
    SELECT url FROM urls
    WHERE short_url = $short_url AND expiry >= $now
  `);

  db.getShortUrl = (word) => {
    return selectUrl.getAsync({
      $short_url: word,
      $now: new Date().toISOString(),
    })
      .then((row) => {
        if (row == null) {
          throw new UrlNotFoundError(word);
        }
        return row.url;
      })
      .finally(() => selectUrl.resetAsync());
  };
}
