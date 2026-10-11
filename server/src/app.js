import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
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

// CORS Configuration
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS request blocked by security policy.'));
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

// Root greeting / information endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'UniDrop API Gateway',
    version: '1.0.0',
    description: 'Secure QR-Based Peer-to-Peer File Transfer System for University Computer Labs',
    healthCheck: '/api/health',
  });
});

// 404 & Central Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
