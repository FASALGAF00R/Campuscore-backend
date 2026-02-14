import express from 'express';
import {
  createCounselingRequest,
  getCounselingRequests,
  acceptRequest,
  sendMessage,
  getMessages,
  rejectRequest,
  getPublicCounselors,
} from '../controllers/counselingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public/Student routes to view active counselors
router.get('/counselors', getPublicCounselors);

// Student routes
router.post('/requests', createCounselingRequest);

// Counselor/Admin routes
router.get('/requests', getCounselingRequests);
router.patch('/requests/:id/accept', acceptRequest);
router.patch('/requests/:id/reject', rejectRequest);

// Messaging routes
router.post('/requests/:id/messages', sendMessage);
router.get('/requests/:id/messages', getMessages);

export default router;
