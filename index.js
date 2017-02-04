const express = require('express');
const expressWinston = require('express-winston');
const moment = require('moment');
const program = require('commander');

global.program = program;

function parsePortNumberExn(input) {
  const n = parseInt(input, 10);
  if (!Number.isInteger(n)) {
    throw new Error(`must be an integer: ${input}`);
  } else if (!(0 <= n && n <= 65535)) {
    throw new Error(`port number out of range: ${n}`);
  }
  return n;
}

const isProduction = process.env.NODE_ENV === 'production';
global.isProduction = isProduction;

program
  .version('0.1.0')
  .option('-p, --port <n>',
          'specify port number (default: 80/8080)',
          parsePortNumberExn)
  .option('-d, --dbpath <path>',
          'specify database file (default: ./data.db)')
  .option('-l, --log-dir <dir>',
          'specify log directory (default: ./logs)')
  .parse(process.argv);

program.port = program.port || (isProduction ? 80 : 8080);
program.dbpath = program.dbpath || './data.db';
program.logDir = program.logDir || './logs';

const api = require('./api');
const log = require('./log');
const msg = require('./msg');

const app = express();

app.set('view engine', 'pug');
app.locals.basedir = __dirname;

app.use(expressWinston.logger({ winstonInstance: log }));

app.use(express.static('./dist'));
app.use(express.static('./public'));

app.get('/', (req, res) => {
  msg.getAll({ limit: 20, reverse: true })
    .then((messages) => {
      messages.forEach((m) => m.time = moment(m.timestamp).fromNow());
      res.render('index', { messages });
    })
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

app.use('/api', api);

app.use(expressWinston.errorLogger({ winstonInstance: log }));

app.listen(program.port);
log.info('Server started, listening on port %d', program.port);
