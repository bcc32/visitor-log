const Promise = require('bluebird');

const db = require('./db');

{
  const sql = 'SELECT * FROM messages WHERE id = ?';
  const stmt = db.prepare(sql);

  module.exports.get = (id) => {
    return stmt.getAsync(id)
      .finally(() => stmt.reset());
  };
}

{
  const sql = (direction) => String.raw`
    SELECT * FROM messages
    WHERE $timestamp IS NULL OR timestamp >= $timestamp
    ORDER BY timestamp ${direction}
    LIMIT $limit
  `;
  const stmtAsc = db.prepare(sql('ASC'));
  const stmtDesc = db.prepare(sql('DESC'));

  module.exports.getAll = (opts) => {
    const { limit, reverse, since } = opts || {};

    const values = {};

    if (since != null) {
      values.$timestamp = since.toISOString();
    }

    const stmt = reverse ? stmtDesc : stmtAsc;

    values.$limit = limit || -1; // negative means no limit

    return stmt.allAsync(values);
  };
}

{
  const sql = String.raw`
    INSERT INTO messages (message, visitor_id, timestamp)
    VALUES ($message, $visitor_id, $timestamp)
  `;
  const stmt = db.prepare(sql);

  module.exports.save = ({ message, visitor_id }) => {
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
    });
  };
}
