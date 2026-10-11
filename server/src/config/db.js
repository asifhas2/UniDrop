import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './environment.js';
import { logger } from '../utils/logger.js';

let mongodInstance = null;

export const connectDatabase = async () => {
  try {
    let uri = config.mongoUri;

    if (!uri) {
      logger.info('[Database] No MONGODB_URI specified. Initializing in-memory MongoDB engine for zero-dependency local execution...');
      mongodInstance = await MongoMemoryServer.create();
      uri = mongodInstance.getUri();
      logger.info(`[Database] In-memory MongoDB initialized at: ${uri}`);
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
