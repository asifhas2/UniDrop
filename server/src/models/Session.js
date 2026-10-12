import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pairingTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    pinCodeHash: {
      type: String,
      required: true,
      index: true,
    },
    hostDeviceId: {
      type: String,
      required: true,
    },
    connectedDeviceIds: {
      type: [String],
      default: [],
    },
    labComputerId: {
      type: String,
      default: null,
      index: true,
    },
    mode: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
      index: true,
    },
    allowMemberUpload: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'paired', 'active', 'expired', 'terminated'],
      default: 'pending',
      index: true,
    },
    maxFileSize: {
      type: Number,
      default: 104857600, // 100MB
    },
    allowedMimeTypes: {
      type: [String],
      default: [],
    },
    pinAttempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify if session is still valid
sessionSchema.methods.isValid = function () {
  return (
    (this.status === 'pending' || this.status === 'paired' || this.status === 'active') &&
    this.expiresAt > new Date()
  );
};

export const Session = mongoose.model('Session', sessionSchema);
