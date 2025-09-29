import winston from 'winston';
import chalk from 'chalk';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Log levels with custom colors
 */
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    audit: 3,
    http: 4,
    debug: 5,
    verbose: 6,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    audit: 'cyan',
    http: 'magenta',
    debug: 'white',
    verbose: 'gray',
  },
};

/**
 * Correlation ID management
 */
class CorrelationManager {
  private static correlationId: string | null = null;

  static generateId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  static setId(id: string): void {
    this.correlationId = id;
  }

  static getId(): string | null {
    return this.correlationId;
  }

  static clearId(): void {
    this.correlationId = null;
  }
}

/**
 * Sanitize sensitive data from logs
 */
const sanitizeData = (data: unknown, seen = new WeakSet()): unknown => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (seen.has(data as object)) {
    return '[Circular]';
  }

  seen.add(data as object);

  const sensitiveKeys = [
    'password',
    'client_secret',
    'access_token',
    'refresh_token',
    'id_token',
    'authorization',
    'api_key',
    'private_key',
    'secret',
    'credentials',
    'cookie',
  ];

  const exactMatchKeys = ['token'];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, seen));
  }

  const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();

    const shouldRedact =
      sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive)) ||
      exactMatchKeys.includes(lowerKey);

    if (shouldRedact) {
      const value = sanitized[key];
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] =
          value.length > 8
            ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
            : '***REDACTED***';
      }
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key], seen);
    }
  }

  return sanitized;
};

/**
 * Custom format for console output
 */
const consoleFormat = printf(({ level, message, timestamp, correlationId, ...metadata }) => {
  if (!message || (typeof message === 'string' && message.trim() === '')) {
    return '';
  }

  let output = `${chalk.gray(timestamp)}`;

  if (correlationId) {
    output += ` ${chalk.blue(`[${correlationId}]`)}`;
  }

  output += ` ${level}: ${message}`;

  // Add metadata if present and not empty
  if (metadata && Object.keys(metadata).length > 0) {
    const sanitized = sanitizeData(metadata);
    if (typeof sanitized === 'object' && sanitized !== null && Object.keys(sanitized).length > 0) {
      // Check if metadata object only contains empty nested objects
      const hasActualContent = Object.values(sanitized).some((value) => {
        if (typeof value === 'object' && value !== null) {
          return Object.keys(value).length > 0;
        }
        return value !== undefined && value !== null;
      });

      if (hasActualContent) {
        output += ` ${chalk.gray(JSON.stringify(sanitized, null, 2))}`;
      }
    }
  }

  return output;
});

/**
 * Custom format for file output (JSON)
 */
const fileFormat = winston.format((info) => {
  // Add correlation ID if available
  const correlationId = CorrelationManager.getId();
  if (correlationId) {
    info.correlationId = correlationId;
  }

  // Sanitize sensitive data
  if (info.metadata) {
    info.metadata = sanitizeData(info.metadata);
  }

  return info;
});

/**
 * Create logging directory if it doesn't exist
 */
const ensureLogDirectory = (): string => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

/**
 * Main logger instance
 */
export const logger = winston.createLogger({
  levels: logLevels.levels,
  level: process.env.LOG_LEVEL || (process.env.DEBUG === 'true' ? 'debug' : 'info'),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    fileFormat(),
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(colorize({ all: true, colors: logLevels.colors }), consoleFormat),
      silent: process.env.SILENT === 'true',
    }),
  ],
  exitOnError: false,
});

// Add file transport for production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  const logDir = ensureLogDirectory();

  // General application log
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'oauth-client.log'),
      format: combine(timestamp(), json()),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );

  // Error log
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: combine(timestamp(), json()),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );
}

// Add audit log transport
if (process.env.ENABLE_AUDIT_LOG === 'true') {
  const logDir = ensureLogDirectory();

  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'audit',
      format: combine(
        timestamp(),
        json(),
        winston.format((info) => {
          // Only log audit level messages to this file
          return info.level === 'audit' ? info : false;
        })(),
      ),
      maxsize: 50 * 1024 * 1024, // 50MB for audit logs
      maxFiles: 10,
      tailable: true,
    }),
  );
}

/**
 * Audit logger for security events
 */
export class AuditLogger {
  static logAuth(event: string, details: Record<string, unknown>): void {
    logger.log('audit', `AUTH_EVENT: ${event}`, {
      category: 'authentication',
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  static logTokenOperation(operation: string, details: Record<string, unknown>): void {
    logger.log('audit', `TOKEN_OPERATION: ${operation}`, {
      category: 'token',
      operation,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  static logSecurityEvent(event: string, details: Record<string, unknown>): void {
    logger.log('audit', `SECURITY_EVENT: ${event}`, {
      category: 'security',
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  static logConfigChange(change: string, details: Record<string, unknown>): void {
    logger.log('audit', `CONFIG_CHANGE: ${change}`, {
      category: 'configuration',
      change,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  static logAccessControl(
    action: string,
    resource: string,
    details: Record<string, unknown>,
  ): void {
    logger.log('audit', `ACCESS_CONTROL: ${action} on ${resource}`, {
      category: 'access_control',
      action,
      resource,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * HTTP request logger middleware helper
 */
export class HttpLogger {
  static logRequest(method: string, url: string, details?: Record<string, unknown>): void {
    const correlationId = CorrelationManager.getId() || CorrelationManager.generateId();
    CorrelationManager.setId(correlationId);

    logger.log('http', `${method} ${url}`, {
      method,
      url,
      correlationId,
      ...details,
    });
  }

  static logResponse(status: number, duration: number, details?: Record<string, unknown>): void {
    logger.log('http', `Response: ${status} (${duration}ms)`, {
      status,
      duration,
      correlationId: CorrelationManager.getId(),
      ...details,
    });
  }
}

/**
 * Performance logger for metrics
 */
export class PerformanceLogger {
  private static timers: Map<string, number> = new Map();

  static start(operation: string): void {
    this.timers.set(operation, Date.now());
    logger.debug(`Performance timer started: ${operation}`);
  }

  static end(operation: string, details?: Record<string, unknown>): void {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn(`Performance timer not found: ${operation}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    logger.debug(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      ...details,
    });

    // Log slow operations as warnings
    if (duration > 5000) {
      logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }
}

/**
 * Debug mode helper
 */
export const setDebugMode = (enabled: boolean): void => {
  if (enabled) {
    logger.level = 'debug';
    logger.debug('Debug mode enabled');
  } else {
    logger.level = process.env.LOG_LEVEL || 'info';
    logger.info('Debug mode disabled');
  }
};

/**
 * Export correlation manager for middleware use
 */
export { CorrelationManager };

// Add custom colors to Winston
winston.addColors(logLevels.colors);

export default logger;
