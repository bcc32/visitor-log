const compression    = require('compression');
const express        = require('express');
const expressWinston = require('express-winston');
const fs             = require('fs');
const http           = require('http');
const https          = require('https');
const moment         = require('moment');
const program        = global.program = require('commander');
const url            = require('url');

function parsePortNumberExn(input) {
  const n = parseInt(input, 10);
  if (!Number.isInteger(n)) {
    throw new Error(`must be an integer: ${input}`);
  } else if (!(0 <= n && n <= 65535)) {
    throw new Error(`port number out of range: ${n}`);
  }
  return n;
}

const isProduction = global.isProduction = process.env.NODE_ENV === 'production';

program
  .version('0.1.2')
  .option('-p --port <n>'       , 'specify port number (default: 80/8080)'              , parsePortNumberExn, isProduction ?  80 : 8080)
  .option('-s --https-port <n>' , 'specify HTTPS port number (default: 443/8443)'       , parsePortNumberExn, isProduction ? 443 : 8443)
  .option('-d --dbpath <path>'  , 'specify database file (default: ./data.db)'          , 'data.db')
  .option('-l --log-dir <dir>'  , 'specify log directory (default: ./logs)'             , './logs')
  .option('-k --keypath <path>' , 'specify SSL private key file (default: ./server.key)', './server.key')
  .option('-c --certpath <path>', 'specify SSL certificate file (default: ./server.pem)', './server.pem')
  .parse(process.argv);

const api = require('./api');
const db  = require('./db');
const log = require('./log');
const msg = require('./msg');

const app = express();
app.use(requireHTTPS);
app.use(compression());

app.set('view engine', 'pug');
app.locals.basedir = __dirname;

app.use(expressWinston.logger({ winstonInstance: log }));

const staticOpts = {
  index: false,
  maxAge: '90d',
};
app.use(express.static('./dist', staticOpts));
app.use(express.static('./public', staticOpts));

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
  res.render('index');
});

app.use('/api', api);

app.use(expressWinston.errorLogger({ winstonInstance: log }));

http.createServer(app).listen(program.port);
log.info('HTTP server started, listening on port %d', program.port);

try {
  const key = fs.readFileSync(program.keypath);
  const cert = fs.readFileSync(program.certpath);
  const credentials = { key, cert };
  https.createServer(credentials, app).listen(program.httpsPort);
  log.info('HTTPS server started, listening on port %d', program.httpsPort);
} catch (e) {
  log.warn('Could not load SSL key/certificate: %s', e);
  log.warn('Accepting HTTP connections only');
}

function requireHTTPS(req, res, next) {
  if (!req.secure) {
    const target = {
      protocol: 'https:',
      hostname: req.hostname,
      path: req.url,
      port: program.httpsPort,
    };
    res.redirect(301, url.format(target));
    return;
  }
  next();
}
