import mongoose from 'mongoose';

const labComputerSchema = new mongoose.Schema(
  {
    computerId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    macAddress: {
      type: String,
      default: null,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available',
      index: true,
    },
    currentSessionId: {
      type: String,
      default: null,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const LabComputer = mongoose.model('LabComputer', labComputerSchema);
