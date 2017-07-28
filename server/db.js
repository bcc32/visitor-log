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

class Connection {
  constructor(dbpath, pool) {
    this.db         = new sqlite3.Database(dbpath);
    this.pool       = pool;
    this.statements = new Map();
  }

  prepare(sql) {
    let stmt = this.statements.get(sql);

    if (typeof stmt === 'undefined') {
      stmt = this.db.prepare(sql);
      this.statements.set(sql, stmt);
    }

    return stmt;
  }

  destroy() {
    this.statements.forEach((stmt) => {
      stmt.finalize();
    });
    this.db.close();
  }

  close() {
    this.pool.release(this);
  }
}

export default class DB {
  constructor(log, dbpath) {
    this.log    = log;
    this.dbpath = dbpath;
    this.maxConnections = 5;

    mkdirp.sync(dirname(dbpath));

    const db = new sqlite3.Database(dbpath);
    const schema = fs.readFileSync('schema.sql');

    db.execAsync(String.raw`
      PRAGMA foreign_keys = ON;

      ${ schema }

      VACUUM;
      ANALYZE;
    `).catch((e) => {
      this.log.error('Error initializing database: ', e);
      throw e;
    });

    db.close();

    this.connections = [];
  }

  connect() {
    let connection = this.connections.shift();
    if (typeof connection === 'undefined') {
      connection = new Connection(this.dbpath, this);
    }
    return connection;
  }

  release(connection) {
    if (this.connections.size >= this.maxConnections) {
      connection.destroy();
      return;
    }
    this.connections.push(connection);
  }

  recordVisitor(ip) {
    const conn = this.connect();

    const insert = conn.prepare(String.raw`
      INSERT OR IGNORE INTO visitors (ip) VALUES (?)
    `);

    const select = conn.prepare(String.raw`
      SELECT id FROM visitors WHERE ip = ?
    `);

    return insert.runAsync(ip)
      .then(() => select.getAsync(ip))
      .get('id')
      .finally(() => select.resetAsync())
      .finally(() => conn.close());
  }

  recordLinkClick({ visitor_id, path, label, href }) {
    const conn = this.connect();

    const stmt = conn.prepare(String.raw`
      INSERT INTO link_clicks (timestamp, visitor_id, path, label, href)
      VALUES ($timestamp, $visitor_id, $path, $label, $href)
    `);

    return stmt.runAsync({
      $visitor_id: visitor_id,
      $path: path,
      $label: label,
      $href: href,
      $timestamp: new Date().toISOString(),
    }).finally(() => conn.close());
  }

  // TODO separate url shortener stuff into another module?

  makeShortUrl(url) {
    const conn = this.connect();

    const begin = conn.prepare(String.raw`
      BEGIN TRANSACTION
    `);

    const selectWord = conn.prepare(String.raw`
      SELECT word FROM (SELECT word FROM words LIMIT 100)
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const deleteWord = conn.prepare(String.raw`
      DELETE FROM words WHERE word = $word
    `);

    const insertNewUrl = conn.prepare(String.raw`
      INSERT INTO urls (short_url, url, expiry)
      VALUES ($short_url, $url, $expiry)
    `);

    const commit = conn.prepare(String.raw`
      COMMIT TRANSACTION
    `);

    const rollback = conn.prepare(String.raw`
      ROLLBACK TRANSACTION
    `);

    let expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);
    expiry = expiry.toISOString();

    return begin.runAsync()
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
      .tap(() => commit.runAsync())
      .tapCatch((e) => {
        this.log.error('rolling back transaction', e);
        rollback.runAsync();
      })
      .then((word) => {
        return {
          word,
          url,
          expiry,
        };
      })
      .finally(() => selectWord.resetAsync())
      .finally(() => deleteWord.resetAsync())
      .finally(() => conn.close());
  }

  lookupShortUrl(word) {
    const conn = this.connect();

    const stmt = conn.prepare(String.raw`
      SELECT url FROM urls
      WHERE short_url = $short_url AND expiry >= $now
    `);

    return stmt.getAsync({
      $short_url: word,
      $now: new Date().toISOString(),
    })
      .then((row) => {
        if (row == null) {
          throw new UrlNotFoundError(word);
        }
        return row.url;
      })
      .finally(() => stmt.resetAsync())
      .finally(() => conn.close());
  }

  // TODO add a recurring worker that cleans up expired links and returns words to
  // the [words] table
}
