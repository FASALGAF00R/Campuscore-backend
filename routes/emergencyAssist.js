import express from 'express';
import {
  createEmergencyAssist,
  getAllRequests,
  getRequest,
  getMyRequests,
  getAssignedRequests,
  assignRequest,
  updateRequestStatus,
  addMessage,
  rateAssistance
} from '../controllers/emergencyAssistController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.post('/', protect, authorize('student'), createEmergencyAssist);
router.get('/my-requests', protect, authorize('student'), getMyRequests);
router.put('/:id/rate', protect, authorize('student'), rateAssistance);

// Staff routes
router.get('/assigned-to-me', protect, authorize('staff', 'admin'), getAssignedRequests);

// Staff & Admin routes
router.get('/', protect, authorize('staff', 'admin'), getAllRequests);
router.get('/:id', protect, getRequest);
router.put('/:id/assign', protect, authorize('staff', 'admin'), assignRequest);
router.put('/:id/status', protect, authorize('staff', 'admin'), updateRequestStatus);

// Shared routes (student + assigned staff)
router.post('/:id/message', protect, addMessage);

export default router;
