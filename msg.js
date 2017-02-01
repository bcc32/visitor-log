const Promise = require('bluebird');

const db = require('./db');

function get(id) {
  const sql = 'SELECT * FROM messages WHERE id = ?';
  return db.getAsync(sql, id);
}

function getAll(opts) {
  const { limit, reverse, since } = opts || {};

  const parts = ['SELECT * FROM messages'];
  const values = {};

  if (since != null) {
    parts.push('WHERE timestamp >= $timestamp');
    values.$timestamp = since.toISOString();
  }

  parts.push('ORDER BY timestamp ' + (reverse ? 'DESC' : 'ASC'));

  if (limit != null) {
    parts.push('LIMIT $limit');
    values.$limit = limit;
  }

  const sql = parts.join(' ');

  return db.allAsync(sql, values);
}

function save({ message, ip, timestamp }) {
  const sql = 'INSERT INTO messages (message, ip, timestamp) VALUES (?, ?, ?)';
  const values = [message, ip, timestamp.toISOString()];

  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

module.exports = {
  get,
  getAll,
  save,
};
