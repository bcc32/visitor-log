import Promise        from 'bluebird';
import express        from 'express';
import expressWinston from 'express-winston';
import helmet         from 'helmet';
import http           from 'http';
import program        from 'commander';
import socket         from 'socket.io';

import API from './api';
import DB  from './db';
import Log from './log';
import Msg from './msg';
import SocketAPI from './socket-api';
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

function defaultPort(env, def) {
  if (process.env[env] != null) {
    return parsePortNumberExn(process.env[env]);
  }
  return def;
}

program
  .version(version)
  .option('-p --port <n>'       , 'specify port number (default: 80/8080)'              , parsePortNumberExn, defaultPort('PORT', 8080))
  .option('-d --dbpath <path>'  , 'specify database file (default: ./data.db)'          , 'data.db')
  .option('-l --log-dir <dir>'  , 'specify log directory (default: ./logs)'             , './logs')
  .parse(process.argv);

const log = new Log(program.logDir);
const db  = new DB(log, program.dbpath);
const msg = new Msg(db);
const urlShortener = new UrlShortener(log, db);
const api = new API({ log, db, msg, urlShortener });

const app = express();
app.use(helmet({
  hsts: {
    includeSubDomains: false,
  },
}));

app.set('view engine', 'pug');
app.set('trust proxy', true);
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

const httpServer = http.createServer(app);
httpServer.listen(program.port, () => {
  log.info('HTTP server started on port %d', program.port);
});

const io = socket(httpServer);

new SocketAPI({ api, io, msg });

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  log.info('shutting down');

  const serversClosed = Promise.fromCallback((cb) => {
    httpServer.close(cb);
  });

  try {
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
process.on('SIGUSR2', shutdown); // nodemon
