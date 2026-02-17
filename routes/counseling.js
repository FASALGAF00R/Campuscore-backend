import express from 'express';
import {
  createCounselingRequest,
  getCounselingRequests,
  acceptRequest,
  sendMessage,
  getMessages,
  rejectRequest,
  getPublicCounselors,
  manageRequest,
  getCounselorAvailability,
  getMyCounselingRequests,
} from '../controllers/counselingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public/Student routes to view active counselors
router.get('/counselors', getPublicCounselors);
router.get('/counselors/:id/availability', getCounselorAvailability);

// Student routes
router.post('/requests', createCounselingRequest);
router.get('/my-requests', getMyCounselingRequests);

// Counselor/Admin routes
router.get('/requests', authorize('counselor', 'admin'), getCounselingRequests);
router.patch('/requests/:id/accept', authorize('counselor', 'admin'), acceptRequest);
router.patch('/requests/:id/reject', authorize('counselor', 'admin'), rejectRequest);
router.patch('/requests/:id/manage', authorize('counselor', 'admin'), manageRequest);

// Messaging routes
router.post('/requests/:id/messages', sendMessage);
router.get('/requests/:id/messages', getMessages);

export default router;
