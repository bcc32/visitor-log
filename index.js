const express = require('express');
const morgan = require('morgan');
const program = require('commander');

const api = require('./api');
const msg = require('./msg');

const isProduction = process.env.NODE_ENV === 'production';

program
  .version('0.1.0')
  .option('-p, --port', 'Specify port number')
  .parse(process.argv);

program.port = program.port || (isProduction ? 80 : 8080);

const app = express();

app.set('view engine', 'pug');

app.use(morgan(isProduction ? 'common' : 'dev'));

app.use(express.static('./public'));

app.get('/', (req, res) => {
  msg.getAll()
    .then((messages) => {
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
