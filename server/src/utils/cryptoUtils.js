import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a cryptographically secure random session ID
 */
export const generateSessionId = () => {
  return uuidv4();
};

/**
 * Generate a high-entropy pairing token for QR code pairing
 */
export const generatePairingToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a pairing token using SHA-256 so raw tokens are never stored in the DB
 */
export const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a 6-digit cryptographic numeric PIN
 */
export const generatePin = () => {
  // Generate random integer between 100000 and 999999
  const min = 100000;
  const max = 999999;
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Hash PIN using SHA-256
 */
export const hashPin = (pin) => {
  if (!pin) return '';
  return crypto.createHash('sha256').update(pin.toString()).digest('hex');
};

/**
 * Anonymize client IP address for privacy in audit logs
 */
export const hashIp = (ip) => {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip + 'unidrop_salt').digest('hex').substring(0, 16);
};
