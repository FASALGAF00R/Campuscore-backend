import express from 'express';
import {
  createStudyPod,
  getAllStudyPods,
  joinStudyPod,
  sendPodMessage,
  getPodMessages,
} from '../controllers/studyPodController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Study pod routes
router.post('/', authorize('student', 'faculty'), createStudyPod);
router.get('/', getAllStudyPods);
router.post('/:id/join', authorize('student', 'faculty'), joinStudyPod);

// Messaging routes
router.post('/:id/messages', sendPodMessage);
router.get('/:id/messages', getPodMessages);

export default router;
