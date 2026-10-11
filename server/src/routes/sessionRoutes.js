import express from 'express';
import * as sessionController from '../controllers/sessionController.js';
import { pairingLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Create new temporary session (Lab computer or host)
router.post('/', sessionController.createSession);

// Join existing session via QR token or 6-digit PIN (Rate limited against brute forcing)
router.post('/join', pairingLimiter, sessionController.joinSession);
router.post('/:id/join', pairingLimiter, sessionController.joinSession);

// Get session details and status
router.get('/:id', sessionController.getSession);

// Explicitly disconnect / end session
router.post('/:id/disconnect', sessionController.disconnectSession);

export default router;
