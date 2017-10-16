import Promise     from 'bluebird';
import { dirname } from 'path';
import fs          from 'fs';
import mkdirp      from 'mkdirp';
import sqlite3     from 'sqlite3';

Promise.promisifyAll(sqlite3.Database.prototype);
Promise.promisifyAll(sqlite3.Statement.prototype);

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

    this.connections = [];
    this.maxPoolSize = 5;

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
  }

  connect() {
    let connection = this.connections.shift();
    if (typeof connection === 'undefined') {
      connection = new Connection(this.dbpath, this);
    }
    return Promise.resolve(connection)
      .disposer((conn) => conn.close());
  }

  release(connection) {
    if (this.connections.length < this.maxPoolSize) {
      this.connections.push(connection);
    } else {
      connection.destroy();
    }
  }

  close() {
    this.connections.forEach((conn) => conn.destroy());
    this.connections = [];
  }

  recordVisitor(ip) {
    return Promise.using(this.connect(), async (conn) => {
      const insert = conn.prepare(String.raw`
        INSERT OR IGNORE INTO visitors (ip) VALUES (?)
      `);

      const select = conn.prepare(String.raw`
        SELECT id FROM visitors WHERE ip = ?
      `);

      try {
        await insert.runAsync(ip);
        const { id } = await select.getAsync(ip);
        return id;
      } finally {
        await select.resetAsync();
      }
    });
  }

  recordLinkClick({ visitor_id, path, label, href }) {
    return Promise.using(this.connect(), async (conn) => {
      const stmt = conn.prepare(String.raw`
        INSERT INTO link_clicks (timestamp, visitor_id, path, label, href)
        VALUES ($timestamp, $visitor_id, $path, $label, $href)
      `);

      await stmt.runAsync({
        $visitor_id: visitor_id,
        $path: path,
        $label: label,
        $href: href,
        $timestamp: new Date().toISOString(),
      });
    });
  }
}
