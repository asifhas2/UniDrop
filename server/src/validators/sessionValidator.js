import { z } from 'zod';

export const createSessionSchema = z.object({
  labComputerId: z.string().trim().max(50).optional().nullable(),
  hostDeviceId: z.string().trim().min(3).max(100),
  mode: z.enum(['direct', 'group']).optional().default('direct'),
  allowMemberUpload: z.boolean().optional().default(false),
  deviceInfo: z.object({
    browser: z.string().optional(),
    os: z.string().optional(),
    isMobile: z.boolean().optional(),
  }).optional(),
});

export const joinSessionSchema = z.object({
  sessionId: z.string().trim().optional(),
  qrToken: z.string().trim().length(64).optional(),
  pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN must be exactly 6 digits').optional(),
  peerDeviceId: z.string().trim().min(3).max(100),
  deviceInfo: z.object({
    browser: z.string().optional(),
    os: z.string().optional(),
    isMobile: z.boolean().optional(),
  }).optional(),
}).refine(data => data.qrToken || data.pinCode, {
  message: 'Either a valid qrToken or a 6-digit pinCode must be provided to join.',
});

export const disconnectSessionSchema = z.object({
  deviceId: z.string().trim().min(3).max(100),
  reason: z.string().trim().max(200).optional(),
});

export const updatePermissionsSchema = z.object({
  hostDeviceId: z.string().trim().min(3).max(100),
  allowMemberUpload: z.boolean(),
});

