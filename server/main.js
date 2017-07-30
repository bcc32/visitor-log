import Promise        from 'bluebird';
import compression    from 'compression';
import express        from 'express';
import expressWinston from 'express-winston';
import fs             from 'fs';
import helmet         from 'helmet';
import http           from 'http';
import https          from 'https';
import program        from 'commander';
import url            from 'url';

import API from './api';
import DB  from './db';
import Log from './log';
import Msg from './msg';
import UrlShortener, { UrlNotFoundError } from './url-shortener';
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

import { version } from '../package.json';

program
  .version(version)
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
const urlShortener = new UrlShortener(log, db);
const api = new API({ log, db, msg, urlShortener });

const app = express();
app.use(helmet());
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

app.use(async (req, res, next) => {
  const ip = req.ip;
  try {
    const id = await db.recordVisitor(ip);
    req.visitor_id = id;
    next();
  } catch (e) {
    log.error(e);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/u', (req, res) => {
  res.render('url-shortener');
});

app.get('/u/:word', async (req, res) => {
  const word = req.params.word;

  try {
    const url = await urlShortener.lookup(word);
    res.redirect(url);
  } catch (e) {
    if (e instanceof UrlNotFoundError) {
      res.status(404).render('url-not-found', { word });
    } else {
      log.error(e);
      res.status(500).end();
    }
  }
});

app.use('/api', api.router);

app.use(expressWinston.errorLogger({ winstonInstance: log }));

const servers = [];

const httpServer = http.createServer(app);
httpServer.listen(program.port, () => {
  log.info('HTTP server started on port %d', program.port);
});
servers.push(httpServer);

let httpsAvailable = true;

try {
  const key = fs.readFileSync(program.keypath);
  const cert = fs.readFileSync(program.certpath);
  const credentials = { key, cert };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(program.httpsPort, () => {
    log.info('HTTPS server started on port %d', program.httpsPort);
  });
  servers.push(httpsServer);
} catch (e) {
  log.error('Could not load SSL key/certificate: %s', e);
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

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  log.info('shutting down');

  const serversClosed = Promise.map(servers, (s) => {
    return Promise.fromCallback((cb) => {
      s.close(cb);
    });
  });

  try {
    servers.forEach((s) => s.close());

    api.close();
    urlShortener.close();
    db.close();

    await serversClosed;

    log.info('good night');
    process.exit(0);
  } catch (e) {
    log.error(e);
    process.exit(1);
  }
}

process.on('message', (msg) => {
  if (msg === 'shutdown') {
    shutdown();
  }
});

process.on('SIGINT', shutdown);
