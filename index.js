const compression = require('compression');
const express = require('express');
const expressWinston = require('express-winston');
const fs = require('fs');
const http = require('http');
const https = require('https');
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
  .option('--https-port <n>',
          'specify HTTPS port number (default: 443/8443)',
          parsePortNumberExn)
  .option('-d, --dbpath <path>',
          'specify database file (default: ./data.db)')
  .option('-l, --log-dir <dir>',
          'specify log directory (default: ./logs)')
  .option('-k, --keypath <path>',
          'specify SSL private key file (default: ./server.key)')
  .option('-c, --certpath <path>',
          'specify SSL certificate file (default: ./server.pem)')
  .parse(process.argv);

program.port = program.port || (isProduction ? 80 : 8080);
program.httpsPort = program.httpsPort || (isProduction ? 443 : 8443);
program.dbpath = program.dbpath || './data.db';
program.logDir = program.logDir || './logs';
program.keypath = program.keypath || './server.key';
program.certpath = program.certpath || './server.pem';

const api = require('./api');
const db = require('./db');
const log = require('./log');
const msg = require('./msg');

const app = express();
app.use(compression());

app.set('view engine', 'pug');
app.locals.basedir = __dirname;

app.use(expressWinston.logger({ winstonInstance: log }));

app.use(express.static('./dist'));
app.use(express.static('./public'));

app.use((req, res, next) => {
  const ip = req.ip;
  db.recordVisitor(ip)
    .then((id) => { req.visitor_id = id; })
    .then(next)
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

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

let credentials;

try {
  const key = fs.readFileSync(program.keypath);
  const cert = fs.readFileSync(program.certpath);
  credentials = { key, cert };
} catch (e) {
  log.warn('Could not load SSL key/certificate: %s', e);
  log.warn('Accepting HTTP connections only');
}

http.createServer(app).listen(program.port);
log.info('HTTP server started, listening on port %d', program.port);

if (credentials) {
  https.createServer(credentials, app).listen(program.httpsPort);
  log.info('HTTPS server started, listening on port %d', program.httpsPort);
}
