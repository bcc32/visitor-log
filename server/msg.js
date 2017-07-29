import Promise from 'bluebird';

export default class Msg {
  constructor(db) {
    this.db = db;
  }

  async get(id) {
    const conn = this.db.connect();

    const stmt = conn.prepare(String.raw`
      SELECT * FROM messages WHERE id = ?
    `);

    try {
      return await stmt.getAsync(id);
    } finally {
      await stmt.resetAsync();
      conn.close();
    }
  }

  async getAll(opts) {
    const conn = this.db.connect();

    const { limit, reverse, since } = opts || {};

    const values = {};

    if (since != null) {
      values.$timestamp = since.toISOString();
    }

    const stmt = conn.prepare(String.raw`
      SELECT * FROM messages
      WHERE hidden = 0 AND ($timestamp IS NULL OR timestamp >= $timestamp)
      ORDER BY timestamp ${reverse ? 'DESC' : 'ASC'}
      LIMIT $limit
    `);

    values.$limit = limit || -1; // negative means no limit

    try {
      return await stmt.allAsync(values);
    } finally {
      await stmt.resetAsync();
      conn.close();
    }
  }

  async save({ message, visitor_id }) {
    const conn = this.db.connect();

    const stmt = conn.prepare(String.raw`
      INSERT INTO messages (message, visitor_id, timestamp)
      VALUES ($message, $visitor_id, $timestamp)
    `);

    const values = {
      $message: message,
      $visitor_id: visitor_id,
      $timestamp: new Date().toISOString()
    };

    try {
      return await new Promise((resolve, reject) => {
        stmt.run(values, function (err) {
          if (err != null) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      });
    } finally {
      await stmt.resetAsync();
      conn.close();
    }
  }
}
