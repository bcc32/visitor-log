const express = require('express');
const morgan = require('morgan');
const moment = require('moment');
const program = require('commander');

global.program = program;

function parseIntExn(input) {
  const n = parseInt(input, 10);
  if (!Number.isInteger(n)) {
    throw new Error(`must be an integer: ${input}`);
  } else if (!(0 <= n && n <= 65535)) {
    throw new Error(`port number out of range: ${n}`);
  }
  return n;
}

const isProduction = process.env.NODE_ENV === 'production';

program
  .version('0.1.0')
  .option('-p, --port <n>',
          'specify port number (default: 80/8080)',
          parseIntExn)
  .option('-d, --dbpath <path>',
          'specify database file (default: ./data/data.db)')
  .parse(process.argv);

program.port = program.port || (isProduction ? 80 : 8080);
program.dbpath = program.dbpath || './data/data.db';

const api = require('./api');
const msg = require('./msg');

const app = express();

app.set('view engine', 'pug');

app.use(morgan(isProduction ? 'common' : 'dev'));

app.use(express.static('./dist'));
app.use(express.static('./public'));

app.get('/', (req, res) => {
  msg.getAll({ limit: 20, reverse: true })
    .then((messages) => {
      messages.forEach((m) => m.time = moment(m.timestamp).fromNow());
      res.render('index', { messages });
    })
    .catch((e) => {
      console.error(e);
      res.status(500).end();
    });
});

app.use('/api', api);

console.log('Listening on port %d', program.port);
app.listen(program.port);
