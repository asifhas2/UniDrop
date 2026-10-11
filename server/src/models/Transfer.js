import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema(
  {
    transferId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    senderDeviceId: {
      type: String,
      required: true,
    },
    receiverDeviceId: {
      type: String,
      default: null,
    },
    transferMode: {
      type: String,
      enum: ['webrtc_p2p', 'server_relay'],
      default: 'webrtc_p2p',
    },
    status: {
      type: String,
      enum: ['initialized', 'transferring', 'completed', 'cancelled', 'failed'],
      default: 'initialized',
      index: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    speedBps: {
      type: Number,
      default: 0,
    },
    tempFilePath: {
      type: String,
      default: null,
    },
    errorReason: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index for automatic cleanup
    },
  },
  {
    timestamps: true,
  }
);

export const Transfer = mongoose.model('Transfer', transferSchema);
