const Promise = require('bluebird');
const level = require('level');

const db = level(program.dbpath, {
  keyEncoding: 'binary',
  valueEncoding: 'json',
});

Promise.promisifyAll(db);

module.exports = db;
