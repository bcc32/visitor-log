const Promise = require('bluebird');
const level = require('level');

const db = level(global.program.dbpath, {
  keyEncoding: 'binary',
  valueEncoding: 'json',
});

Promise.promisifyAll(db);

module.exports = db;
