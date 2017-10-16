import Promise from 'bluebird';

export default class Msg {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    return Promise.using(this.db.connect(), async (conn) => {
      const stmt = conn.prepare(String.raw`
        SELECT * FROM messages WHERE id = ?
      `);

      try {
        return await stmt.getAsync(id);
      } finally {
        await stmt.resetAsync();
      }
    });
  }

  getAll(opts) {
    const { limit, reverse, since } = opts || {};

    const values = {};

    if (since != null) {
      values.$timestamp = since.toISOString();
    }

    values.$limit = limit || -1; // negative means no limit

    return Promise.using(this.db.connect(), async (conn) => {
      const stmt = conn.prepare(String.raw`
        SELECT * FROM messages
        WHERE hidden = 0 AND ($timestamp IS NULL OR timestamp >= $timestamp)
        ORDER BY timestamp ${reverse ? 'DESC' : 'ASC'}
        LIMIT $limit
      `);

      try {
        return await stmt.allAsync(values);
      } finally {
        await stmt.resetAsync();
      }
    });
  }

  save({ message, visitor_id }) {
    return Promise.using(this.db.connect(), async (conn) => {
      const stmt = conn.prepare(String.raw`
        INSERT INTO messages (message, visitor_id, timestamp)
        VALUES ($message, $visitor_id, $timestamp)
      `);

      try {
        const timestamp = new Date().toISOString();

        await stmt.runAsync({
          $message: message,
          $visitor_id: visitor_id,
          $timestamp: timestamp,
        });

        return {
          id: stmt.lastID,
          timestamp,
          visitor_id,
          message,
        };
      } finally {
        await stmt.resetAsync();
      }
    });
  }
}
