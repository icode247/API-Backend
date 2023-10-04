import winston from 'winston';
import util from 'util';
import TransportStream from 'winston-transport';
import config from '../config';
import rollbar from 'rollbar';

class RollbarTransport extends TransportStream {
  constructor(opts) {
    super(opts);
    if (!opts.rollbarConfig.accessToken) {
      throw "winston-transport-rollbar requires a 'rollbarConfig.accessToken' property";
    }

    const _rollbar = new rollbar(opts.rollbarConfig);

    this.level = opts.level || 'warn';

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.rollbar = _rollbar;
  }

  log(info, callback) {
    const { level } = info;
    process.nextTick(() => {
      const message = util.format(info.message, ...(info.splat || []));
      const meta = info;
      const rollbarLevel = level === 'warn' ? 'warning' : level;

      const cb = err => {
        if (err) {
          this.emit('error', err);
          return callback(err);
        }
        this.emit('logged');
        return callback(null, true);
      };

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const logMethod = this.rollbar[rollbarLevel] || this.rollbar.log;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return logMethod.apply(this.rollbar, [message, meta, cb]);
    });
  }
}

const rollbarConfig = {
  accessToken: config.rollbarAccessToken,
};
const transports = [];
if (process.env.NODE_ENV == 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.cli(), winston.format.splat()),
    }),
  );
} else {
  transports.push(
    new RollbarTransport({
      rollbarConfig,
      level: config.logs.level,
    }),
  );
}

const LoggerInstance = winston.createLogger({
  level: config.logs.level,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  transports,
});

export default LoggerInstance;
