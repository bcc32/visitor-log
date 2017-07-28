import Promise     from 'bluebird';
import { dirname } from 'path';
import fs          from 'fs';
import mkdirp      from 'mkdirp';
import sqlite3     from 'sqlite3';

Promise.promisifyAll(sqlite3.Database.prototype);
Promise.promisifyAll(sqlite3.Statement.prototype);

export class NoAvailableWordsError extends Error {
  constructor() {
    super();
    this.message = 'No words are available for short URLs';
    this.name = 'NoAvailableWordsError';
    Error.captureStackTrace(this, NoAvailableWordsError);
  }
}

export class UrlNotFoundError extends Error {
  constructor(word) {
    super();
    this.message = `No URL was found for "${word}"`;
    this.name = 'UrlNotFoundError';
    Error.captureStackTrace(this, UrlNotFoundError);
  }
}

export default class DB {
  constructor(log, dbpath) {
    mkdirp.sync(dirname(dbpath));
    const db = this.db = new sqlite3.Database(dbpath);

    this.log = log;

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
          this.log.error('Error initializing database: ', e);
          process.exit(1);
        });
    });

    this.insertVisitor = db.prepare(String.raw`
      INSERT OR IGNORE INTO visitors (ip) VALUES (?)
    `);

    this.selectVisitor = db.prepare(String.raw`
      SELECT id FROM visitors WHERE ip = ?
    `);

    this.insertLinkClick = db.prepare(String.raw`
      INSERT INTO link_clicks (timestamp, visitor_id, path, label, href)
      VALUES ($timestamp, $visitor_id, $path, $label, $href)
    `);

    // TODO separate url shortener stuff into another module?

    this.beginTransaction = db.prepare(String.raw`
      BEGIN TRANSACTION
    `);

    this.selectWord = db.prepare(String.raw`
      SELECT word FROM (SELECT word FROM words LIMIT 100)
      ORDER BY RANDOM()
      LIMIT 1
    `);

    this.deleteWord = db.prepare(String.raw`
      DELETE FROM words WHERE word = $word
    `);

    this.insertNewUrl = db.prepare(String.raw`
      INSERT INTO urls (short_url, url, expiry)
      VALUES ($short_url, $url, $expiry)
    `);

    this.commitTransaction = db.prepare(String.raw`
      COMMIT TRANSACTION
    `);

    this.rollbackTransaction = db.prepare(String.raw`
      ROLLBACK TRANSACTION
    `);

    this.selectUrl = db.prepare(String.raw`
      SELECT url FROM urls
      WHERE short_url = $short_url AND expiry >= $now
    `);
  }

  recordVisitor(ip) {
    return this.insertVisitor.runAsync(ip)
      .then(() => this.selectVisitor.getAsync(ip))
      .get('id')
      .finally(() => this.selectVisitor.reset());
  }

  recordLinkClick({ visitor_id, path, label, href }) {
    const values = {
      $visitor_id: visitor_id,
      $path: path,
      $label: label,
      $href: href,
      $timestamp: new Date().toISOString(),
    };

    return this.insertLinkClick.runAsync(values);
  }

  makeShortUrl(url) {
    let expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    expiry = expiry.toISOString();

    return this.beginTransaction.runAsync()
      .then(() => this.selectWord.getAsync())
      .then((row) => {
        if (row == null) {
          throw new NoAvailableWordsError();
        }
        return row.word;
      })
      .tap((word) => this.deleteWord.runAsync({ $word: word }))
      .tap((word) => this.insertNewUrl.runAsync({
        $short_url: word,
        $url: url,
        $expiry: expiry,
      }))
      .tap(() => this.commitTransaction.runAsync())
      .tapCatch((e) => {
        this.log.error('rolling back transaction', e);
        this.rollbackTransaction.runAsync();
      })
      .then((word) => {
        return {
          word,
          url,
          expiry,
        };
      })
      .finally(() => this.selectWord.resetAsync())
      .finally(() => this.deleteWord.resetAsync());
  }

  lookupShortUrl(word) {
    return this.selectUrl.getAsync({
      $short_url: word,
      $now: new Date().toISOString(),
    })
      .then((row) => {
        if (row == null) {
          throw new UrlNotFoundError(word);
        }
        return row.url;
      })
      .finally(() => this.selectUrl.resetAsync());
  }

  // TODO add a recurring worker that cleans up expired links and returns words to
  // the [words] table

  // FIXME use a different connection for each request to avoid sending queries
  // to another request's txn. consider pooling connections for reuse.
}
