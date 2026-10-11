import winston from 'winston';
import { config } from '../config/environment.js';

const sanitizeFormat = winston.format((info) => {
  // Strip out sensitive properties if accidentally passed
  const sanitized = { ...info };
  const sensitiveKeys = ['password', 'token', 'pairingToken', 'secret', 'authorization', 'cookie', 'jwt'];
  
  const cleanObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        cleanObject(obj[key]);
      }
    }
    return obj;
  };

  return cleanObject(sanitized);
});

export const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    sanitizeFormat(),
    winston.format.errors({ stack: true }),
    config.env === 'development'
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, stack, correlationId, ...meta }) => {
            const corr = correlationId ? ` [cid:${correlationId}]` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}]${corr}: ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
          })
        )
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});
