import express from 'express';
import {
  createCounselingRequest,
  getCounselingRequests,
  acceptRequest,
  sendMessage,
  getMessages
} from '../controllers/counselingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('student'), createCounselingRequest);
router.get('/', protect, authorize('counselor', 'admin'), getCounselingRequests);
router.put('/:id/accept', protect, authorize('counselor'), acceptRequest);
router.post('/:id/messages', protect, sendMessage);
router.get('/:id/messages', protect, getMessages);

export default router;
