import { Server } from 'socket.io';
import { registerSignalingHandlers } from './signalingHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
