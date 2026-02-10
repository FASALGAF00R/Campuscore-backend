import express from 'express';
import {
  createSOSAlert,
  getAllSOSAlerts,
  getSOSAlert,
  getMySOSAlerts,
  updateSOSStatus,
  assignSOSAlert,
  respondToSOS,
  getSOSStats
} from '../controllers/sosController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.post('/', protect, authorize('student'), createSOSAlert);
router.get('/my-alerts', protect, authorize('student'), getMySOSAlerts);

// Faculty & Admin routes
router.get('/', protect, authorize('faculty', 'admin'), getAllSOSAlerts);
router.get('/stats', protect, authorize('admin'), getSOSStats);
router.get('/:id', protect, getSOSAlert);
router.put('/:id/status', protect, authorize('faculty', 'admin'), updateSOSStatus);
router.put('/:id/assign', protect, authorize('faculty', 'admin'), assignSOSAlert);
router.post('/:id/respond', protect, authorize('faculty', 'admin'), respondToSOS);

export default router;
