import Promise from 'bluebird';

export default class Msg {
  constructor(db) {
    // FIXME this is a hack to access the underlying SQLite3#Database object.
    db = db.db;

    this.selectMessage = db.prepare(String.raw`
      SELECT * FROM messages WHERE id = ?
    `);

    function getMessagesSinceStmt(direction) {
      return db.prepare(String.raw`
        SELECT * FROM messages
        WHERE $timestamp IS NULL OR timestamp >= $timestamp
        ORDER BY timestamp ${direction}
        LIMIT $limit
      `);
    }

    this.selectMessagesAsc  = getMessagesSinceStmt('ASC');
    this.selectMessagesDesc = getMessagesSinceStmt('DESC');

    this.insertMessage = db.prepare(String.raw`
      INSERT INTO messages (message, visitor_id, timestamp)
      VALUES ($message, $visitor_id, $timestamp)
    `);
  }

  get(id) {
    return this.selectMessage.getAsync(id)
      .finally(() => this.selectMessage.reset());
  }

  getAll(opts) {
    const { limit, reverse, since } = opts || {};

    const values = {};

    if (since != null) {
      values.$timestamp = since.toISOString();
    }

    const stmt = reverse ? this.selectMessagesDesc : this.selectMessagesAsc;

    values.$limit = limit || -1; // negative means no limit

    return stmt.allAsync(values);
  }

  save({ message, visitor_id }) {
    const values = {
      $message: message,
      $visitor_id: visitor_id,
      $timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      this.insertMessage.run(values, function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });
  }
}
