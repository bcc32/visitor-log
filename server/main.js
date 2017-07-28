import compression    from 'compression';
import express        from 'express';
import expressWinston from 'express-winston';
import fs             from 'fs';
import http           from 'http';
import https          from 'https';
import program        from 'commander';
import url            from 'url';

import API from './api';
import DB, { UrlNotFoundError } from './db';
import Log from './log';
import Msg from './msg';
import { isProduction } from './common';

function parsePortNumberExn(input) {
  const n = parseInt(input, 10);
  if (!Number.isInteger(n)) {
    throw new Error(`must be an integer: ${input}`);
  } else if (!(0 <= n && n <= 65535)) {
    throw new Error(`port number out of range: ${n}`);
  }
  return n;
}

program
  .version('0.1.2')
  .option('-p --port <n>'       , 'specify port number (default: 80/8080)'              , parsePortNumberExn, isProduction ?  80 : 8080)
  .option('-s --https-port <n>' , 'specify HTTPS port number (default: 443/8443)'       , parsePortNumberExn, isProduction ? 443 : 8443)
  .option('-d --dbpath <path>'  , 'specify database file (default: ./data.db)'          , 'data.db')
  .option('-l --log-dir <dir>'  , 'specify log directory (default: ./logs)'             , './logs')
  .option('-k --keypath <path>' , 'specify SSL private key file (default: ./server.key)', './server.key')
  .option('-c --certpath <path>', 'specify SSL certificate file (default: ./server.pem)', './server.pem')
  .parse(process.argv);

const log = new Log(program.logDir);
const db  = new DB(log, program.dbpath);
const msg = new Msg(db);
const api = new API({ log, db, msg });

const app = express();
app.use(compression());

const staticOpts = {
  index: false,
  maxAge: '90d',
};
app.use(express.static('./dist', staticOpts));
app.use(express.static('./public', staticOpts));

app.use(redirectToHTTPS);

app.set('view engine', 'pug');
app.locals.basedir = __dirname;

app.use(expressWinston.logger({ winstonInstance: log }));

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

app.get('/u', (req, res) => {
  res.render('url-shortener');
});

app.get('/u/:word', (req, res) => {
  const word = req.params.word;

  db.lookupShortUrl(word)
    .then((url) => {
      res.redirect(url);
    })
    .catch(UrlNotFoundError, () => {
      res.status(404).render('url-not-found', { word });
    })
    .catch((e) => {
      log.error(e);
      res.status(500).end();
    });
});

app.use('/api', api);

app.use(expressWinston.errorLogger({ winstonInstance: log }));

http.createServer(app).listen(program.port);
log.info('HTTP server started, listening on port %d', program.port);

let httpsAvailable = true;

try {
  const key = fs.readFileSync(program.keypath);
  const cert = fs.readFileSync(program.certpath);
  const credentials = { key, cert };
  https.createServer(credentials, app).listen(program.httpsPort);
  log.info('HTTPS server started, listening on port %d', program.httpsPort);
} catch (e) {
  log.warn('Could not load SSL key/certificate: %s', e);
  log.warn('Accepting HTTP connections only');
  httpsAvailable = false;
}

function redirectToHTTPS(req, res, next) {
  if (httpsAvailable && !req.secure) {
    const target = {
      protocol: 'https:',
      hostname: req.hostname,
      pathname: req.originalUrl,
      port: program.httpsPort,
    };
    res.redirect(url.format(target));
    return;
  }
  next();
}
