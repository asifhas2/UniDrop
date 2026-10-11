import { z } from 'zod';

export const initTransferSchema = z.object({
  sessionId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().trim().max(100).optional(),
  senderDeviceId: z.string().trim().min(3).max(100),
  receiverDeviceId: z.string().trim().min(3).max(100).optional().nullable(),
  transferMode: z.enum(['webrtc_p2p', 'server_relay']).default('webrtc_p2p'),
});

export const updateTransferStatusSchema = z.object({
  status: z.enum(['initialized', 'transferring', 'completed', 'cancelled', 'failed']),
  progressPercent: z.number().min(0).max(100).optional(),
  speedBps: z.number().nonnegative().optional(),
  errorReason: z.string().max(300).optional(),
});
