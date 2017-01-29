const Promise = require('bluebird');

const db = require('./db');

const keyLB = 'msg:';
const keyUB = 'msg;';
const prefixSize = 4; // needs to be the number of bytes in keyLB
const idSize = 4; // 32-bit integer

let lastKey;

const lastKeyLoaded = new Promise((resolve, reject) => {
  const rs = db.createKeyStream({
    lt: keyUB,
    reverse: true,
  });

  rs.on('readable', () => {
    const key = rs.read();
    rs.pause();

    if (lastKey) return;

    lastKey = key || initKey();
    resolve(lastKey);
  });

  rs.on('error', reject);
});

function idToKey(id) {
  const key = Buffer.allocUnsafe(prefixSize + idSize);
  key.write(keyLB);
  key.writeUInt32BE(id, prefixSize);
  return key;
}

function get(id) {
  return db.getAsync(idToKey(id));
}

function getAll() {
  return new Promise((resolve, reject) => {
    const messages = [];
    const rs = db.createValueStream({
      gte: keyLB,
      lt: keyUB,
    });
    rs.on('data', (data) => messages.push(data))
      .on('end', () => resolve(messages))
      .on('error', reject);
  });
}

function incrementLastId() {
  const id = lastKey.readUInt32BE(prefixSize);
  lastKey.writeUInt32BE(id + 1, prefixSize);
}

function initKey() {
  const buf = Buffer.allocUnsafe(prefixSize + 4);
  buf.write(keyLB);
  buf.writeUInt32BE(0, prefixSize);
  return buf;
}

function makeIdAndKey() {
  incrementLastId();
  const id = lastKey.readUInt32BE(prefixSize);
  const key = lastKey;
  return [id, key];
}

module.exports = {
  get,
  getAll,
  lastKeyLoaded,
  makeIdAndKey,
};
