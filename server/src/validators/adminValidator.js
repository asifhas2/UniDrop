import { z } from 'zod';

export const adminLoginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const labComputerSchema = z.object({
  computerId: z.string().trim().min(2).max(30).toUpperCase(),
  name: z.string().trim().min(2).max(100),
  room: z.string().trim().min(2).max(100),
  ipAddress: z.string().ip().optional().nullable().or(z.literal('')),
  macAddress: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  isEnabled: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export const updateSettingsSchema = z.object({
  settings: z.record(z.any()),
});
