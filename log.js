const mkdirp = require('mkdirp');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logDir = global.program.logDir;
mkdirp.sync(logDir);

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({ colorize: true }),
    new winston.transports.DailyRotateFile({
      level: global.isProduction ? 'info' : 'debug',
      filename: path.join(logDir, 'log'),
      datePattern: 'yyyy-MM-dd.',
      prepend: true,
    }),
  ],
});

module.exports = logger;
module.exports.stream = {
  write(msg, enc) {
    logger.info(msg.trim());
  }
};
