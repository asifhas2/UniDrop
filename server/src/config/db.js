import mongoose from 'mongoose';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

let mongodInstance = null;

export const connectDatabase = async () => {
  try {
    let uri = config.mongoUri;

    if (!uri) {
      logger.info('[Database] No MONGODB_URI specified. Attempting in-memory MongoDB engine...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        uri = mongodInstance.getUri();
        logger.info(`[Database] In-memory MongoDB initialized at: ${uri}`);
      } catch (err) {
        logger.error('[Database] CRITICAL: MONGODB_URI environment variable is not defined!');
        logger.error('[Database] In production (e.g. Render), please add MONGODB_URI to your Environment Variables dashboard.');
        throw new Error('Missing MONGODB_URI environment variable. Please set MONGODB_URI in Render dashboard.');
      }
    }

    mongoose.set('strictQuery', true);

    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(uri, mongooseOptions);
    logger.info('[Database] Successfully connected to MongoDB.');

    mongoose.connection.on('error', (err) => {
      logger.error('[Database] MongoDB connection error:', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[Database] MongoDB connection disconnected.');
    });

    return mongoose.connection;
  } catch (err) {
    logger.error('[Database] Failed to connect to MongoDB:', { error: err.message });
    throw err;
  }
};

export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
    logger.info('[Database] MongoDB disconnected cleanly.');
  } catch (err) {
    logger.error('[Database] Error during database shutdown:', { error: err.message });
  }
};
