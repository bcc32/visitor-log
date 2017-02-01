const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({ colorize: true }),
    new winston.transports.DailyRotateFile({
      level: global.isProduction ? 'info' : 'debug',
      filename: path.join(global.program.logDir, 'log'),
      datePattern: 'yyyy-MM-dd.',
      prepend: true,
    }),
  ],
});

module.exports = logger;
module.exports.stream = {
  write(msg, enc) {
    logger.info(msg);
  }
};
