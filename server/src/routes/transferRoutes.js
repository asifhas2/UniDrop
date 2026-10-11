import express from 'express';
import * as transferController from '../controllers/transferController.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Initialize metadata for a transfer (P2P or relay)
router.post('/', transferController.initTransfer);

// Update transfer status / progress
router.patch('/:id', transferController.updateTransfer);

// Query transfer metadata
router.get('/:id', transferController.getTransfer);

// Upload fallback server-mediated relay file
router.post('/relay/upload', uploadLimiter, upload.single('file'), transferController.uploadRelay);

// Download fallback server-mediated relay file (with immediate file shredding)
router.get('/:id/download', transferController.downloadRelay);

export default router;
