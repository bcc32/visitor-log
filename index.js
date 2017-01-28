const Promise = require('bluebird');
// const bodyParser = require('body-parser');
const express = require('express');
const level = require('level');
const morgan = require('morgan');
const program = require('commander');

const isProduction = process.env.NODE_ENV === 'production';

Promise.promisifyAll(level.prototype);

program
  .version('0.1.0')
  .option('-p, --port', 'Specify port number')
  .parse(process.argv);

program.port = program.port || (isProduction ? 80 : 8080);

const app = express();

app.set('view engine', 'pug');

app.use(morgan(isProduction ? 'common' : 'dev'));

app.get('/', (req, res) => {
  res.render('index');
});

app.listen(program.port);
