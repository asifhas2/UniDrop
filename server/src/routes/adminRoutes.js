import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import { adminLoginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Admin login (Strict rate limit)
router.post('/login', adminLoginLimiter, adminController.login);

// Protected administration routes
router.use(requireAdminAuth);

router.get('/dashboard', adminController.getDashboard);
router.get('/lab-computers', adminController.getLabComputers);
router.post('/lab-computers', adminController.upsertLabComputer);
router.delete('/lab-computers/:id', adminController.deleteLabComputer);

router.get('/sessions', adminController.getActiveSessions);
router.post('/sessions/:id/end', adminController.endSession);

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.updateSettings);

export default router;
