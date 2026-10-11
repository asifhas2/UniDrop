import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger.js';

// Dangerous executable file extensions that are blocked by default in university lab policy
export const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.scr', '.pif', '.com', '.ps1',
  '.jar', '.vbe', '.wsf', '.wsh', '.reg'
]);

/**
 * Sanitize a user-supplied filename to prevent path traversal and shell injection
 */
export const sanitizeFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return `unidrop_file_${Date.now()}`;
  }

  // Strip null bytes
  let clean = fileName.replace(/\0/g, '');

  // Extract basename only, removing any directory prefixes (../, /)
  clean = path.basename(clean);

  // Replace invalid/dangerous filesystem characters with underscores
  clean = clean.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  // Prevent hidden dotfiles or empty names
  if (clean.startsWith('.')) {
    clean = 'file_' + clean;
  }
  if (!clean || clean === '.') {
    clean = `unidrop_file_${Date.now()}`;
  }

  // Limit filename length to 255 characters
  if (clean.length > 255) {
    const ext = path.extname(clean);
    clean = clean.substring(0, 255 - ext.length) + ext;
  }

  return clean;
};

/**
 * Check if the file extension is disallowed
 */
export const isDisallowedExtension = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
};

/**
 * Format bytes to readable size
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Safely delete an ephemeral file from disk
 */
export const safeUnlink = async (filePath) => {
  try {
    if (!filePath) return;
    await fs.unlink(filePath);
    logger.debug(`[FileUtils] Ephemeral file deleted safely: ${filePath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.error(`[FileUtils] Failed to unlink ephemeral file: ${filePath}`, { error: err.message });
    }
  }
};
