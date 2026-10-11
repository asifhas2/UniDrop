import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/environment.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route imports
import sessionRoutes from './routes/sessionRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Managed per environment or client build
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration supporting local network pairing (mobile phones on Wi-Fi)
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (config.env === 'development') {
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.')
    ) {
      return true;
    }
  }
  return origin === config.clientUrl;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS request from ${origin} blocked by security policy.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// Request payload limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Logging & correlation tracking
app.use(requestLogger);

// Global rate limiting on API endpoints
app.use('/api', apiLimiter);

// API route mounts
app.use('/api/sessions', sessionRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// Static Frontend Delivery for Unified Cloud Deployment (Render / Production)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Fallback API Greeting if frontend bundle not built
  app.get('/', (req, res) => {
    res.json({
      name: 'UniDrop API Gateway',
      version: '1.0.0',
      description: 'Secure QR-Based Peer-to-Peer File Transfer System for University Computer Labs',
      healthCheck: '/api/health',
    });
  });
}

// 404 & Central Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
