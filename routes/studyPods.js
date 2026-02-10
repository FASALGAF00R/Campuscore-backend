import express from 'express';
import {
  createStudyPod,
  getAllStudyPods,
  joinStudyPod,
  sendPodMessage,
  getPodMessages
} from '../controllers/studyPodController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getAllStudyPods);
router.post('/', protect, createStudyPod);
router.post('/:id/join', protect, joinStudyPod);
router.get('/:id/messages', protect, getPodMessages);
router.post('/:id/messages', protect, sendPodMessage);

export default router;
