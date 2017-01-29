const Promise = require('bluebird');
const level = require('level');

// TODO make this configurable
const db = level('./data', {
  keyEncoding: 'binary',
  valueEncoding: 'json',
});

Promise.promisifyAll(db);

module.exports = db;
