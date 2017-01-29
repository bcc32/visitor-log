const express = require('express');
const morgan = require('morgan');
const moment = require('moment');
global.program = require('commander');

const isProduction = process.env.NODE_ENV === 'production';

program
  .version('0.1.0')
  .option('-p, --port', 'specify port number (default: 80/8080 in prod/dev)')
  .option('-d, --dbpath', 'specify data directory (default: ./data)')
  .parse(process.argv);

program.port = program.port || (isProduction ? 80 : 8080);
program.dbpath = program.dbpath || './data';

const api = require('./api');
const msg = require('./msg');

const app = express();

app.set('view engine', 'pug');

app.use(morgan(isProduction ? 'common' : 'dev'));

app.use(express.static('./public'));

app.get('/', (req, res) => {
  msg.getAll()
    .then((messages) => {
      messages.forEach((m) => {
        m.timestamp = moment(m.timestamp).fromNow();
      });
      res.render('index', { messages });
    })
    .catch((e) => {
      console.error(e);
      res.status(500).end();
    });
});

app.use('/api', api);

// Need to wait for DB to load the last key
msg.lastKeyLoaded.then(() => {
  console.log('Listening on port %d', program.port);
  app.listen(program.port);
});
