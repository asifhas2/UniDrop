import { Server } from 'socket.io';
import { registerSignalingHandlers } from './signalingHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all local LAN or localhost origins in development
        if (!origin || config.env === 'development') {
          return callback(null, true);
        }
        callback(null, origin === config.clientUrl);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.debug(`[Socket] New connection established: ${socket.id}`);
    registerSignalingHandlers(io, socket);
  });

  return io;
};
