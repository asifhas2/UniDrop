import http from 'http';
import app from './app.js';
import { config } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { initSocketServer } from './sockets/socketHandler.js';
import { seedDefaultAdminAndSettings } from './services/adminService.js';
import { startCleanupScheduler } from './jobs/cleanupJob.js';
import { logger } from './utils/logger.js';

const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initSocketServer(httpServer);
app.set('io', io);

let cleanupInterval = null;

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Seed Default Admin & System Settings if not already initialized
    await seedDefaultAdminAndSettings();

    // 3. Start Background Cleanup Scheduler
    cleanupInterval = startCleanupScheduler();

    // 4. Start HTTP & WebSocket Server
    httpServer.listen(config.port, () => {
      logger.info(`=======================================================`);
      logger.info(` UniDrop Server running on http://localhost:${config.port}`);
      logger.info(` Environment: ${config.env}`);
      logger.info(` Health Check: http://localhost:${config.port}/api/health`);
      logger.info(` WebSocket Signaling ready`);
      logger.info(`=======================================================`);
    });
  } catch (err) {
    logger.error('[Server] Fatal startup failure:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Graceful Shutdown
const handleShutdown = async (signal) => {
  logger.info(`[Server] Received ${signal}. Initiating graceful shutdown...`);

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  httpServer.close(async () => {
    logger.info('[Server] HTTP server closed.');
    await disconnectDatabase();
    logger.info('[Server] Graceful shutdown complete.');
    process.exit(0);
  });

  // Force close after 10s if dangling connections linger
  setTimeout(() => {
    logger.error('[Server] Forced shutdown timeout exceeded. Exiting immediately.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
