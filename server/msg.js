import Promise from 'bluebird';

export default class Msg {
  constructor(db) {
    this.db = db;
  }

  get(id) {
    const conn = this.db.connect();

    const selectMessage = conn.prepare(String.raw`
      SELECT * FROM messages WHERE id = ?
    `);

    return selectMessage.getAsync(id)
      .finally(() => selectMessage.reset())
      .finally(() => conn.close());
  }

  getAll(opts) {
    const conn = this.db.connect();

    const { limit, reverse, since } = opts || {};

    const values = {};

    if (since != null) {
      values.$timestamp = since.toISOString();
    }

    const stmt = conn.prepare(String.raw`
      SELECT * FROM messages
      WHERE $timestamp IS NULL OR timestamp >= $timestamp
      ORDER BY timestamp ${reverse ? 'DESC' : 'ASC'}
      LIMIT $limit
    `);

    values.$limit = limit || -1; // negative means no limit

    return stmt.allAsync(values)
      .finally(() => stmt.resetAsync())
      .finally(() => conn.close());
  }

  save({ message, visitor_id }) {
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

    return new Promise((resolve, reject) => {
      stmt.run(values, function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    })
      .finally(() => stmt.resetAsync())
      .finally(() => conn.close());
  }
}
