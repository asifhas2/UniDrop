import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to cwd

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  sessionSecret: process.env.SESSION_SECRET || 'unidrop-dev-session-secret-key-32chars-min',
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || 'unidrop-dev-jwt-secret-key-32chars-min',
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h',
  
  // Default Admin Seed (only seeded if no admin exists)
  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'UniDropAdmin2026!',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@unidrop.local',
  },

  // Security Policies
  maxFileSize: parseInt(process.env.FILE_MAX_SIZE_BYTES || '104857600', 10), // 100MB default
  sessionTtlMinutes: parseInt(process.env.SESSION_TTL_MINUTES || '10', 10),
  tempFileTtlMinutes: parseInt(process.env.TEMP_FILE_TTL_MINUTES || '15', 10),
  pinTtlMinutes: parseInt(process.env.PAIRING_PIN_TTL_MINUTES || '5', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10),

  // WebRTC ICE / STUN configuration
  stunServers: (process.env.STUN_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
    .split(',')
    .map(url => ({ urls: url.trim() })),

  // Temporary storage directory for fallback relay transfers
  tempUploadDir: path.resolve(__dirname, '../../uploads/temp'),
};
