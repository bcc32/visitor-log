import mkdirp       from 'mkdirp';
import path         from 'path';

// winston exports a 'default' property so we use a namespace import to avoid
// rollup problems.  cf. https://github.com/rollup/rollup/issues/1135
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { isProduction } from './common';

export default function Logger(logDir) {
  mkdirp.sync(logDir);

  return new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ colorize: true }),
      new (winston.transports.DailyRotateFile)({
        level: isProduction ? 'info' : 'debug',
        filename: path.join(logDir, 'log'),
        datePattern: 'yyyy-MM-dd.',
        prepend: true,
      }),
    ],
  });

  // logger.stream = {
  //   write(msg) {
  //     this.logger.info(msg.trim());
  //   }
  // };
}
