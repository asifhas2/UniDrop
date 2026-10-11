import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment.js';
import { sanitizeFileName, isDisallowedExtension } from '../utils/fileUtils.js';

// Ensure temp upload directory exists
if (!fs.existsSync(config.tempUploadDir)) {
  fs.mkdirSync(config.tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.tempUploadDir);
  },
  filename: (req, file, cb) => {
    const cleanOriginal = sanitizeFileName(file.originalname);
    const ext = path.extname(cleanOriginal);
    const safeDiskName = `${uuidv4()}${ext}`;
    req.cleanFileName = cleanOriginal;
    cb(null, safeDiskName);
  },
});

const fileFilter = (req, file, cb) => {
  const cleanName = sanitizeFileName(file.originalname);
  if (isDisallowedExtension(cleanName)) {
    const error = new Error('Upload rejected: Executable or potentially dangerous file types are blocked by university security policy.');
    error.statusCode = 400;
    error.code = 'BLOCKED_FILE_TYPE';
    return cb(error, false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
    files: 5, // max 5 files in a single batch
  },
  fileFilter,
});
