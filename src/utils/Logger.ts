import winston from 'winston';
import chalk from 'chalk';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format for console output
 */
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let output = `${chalk.gray(timestamp)} ${level}: ${message}`;

  if (Object.keys(metadata).length > 0) {
    output += ` ${chalk.gray(JSON.stringify(metadata, null, 2))}`;
  }

  return output;
});

/**
 * Create and configure Winston logger
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'oauth-client.log',
      format: combine(timestamp(), winston.format.json()),
    }),
  );
}

export default logger;
