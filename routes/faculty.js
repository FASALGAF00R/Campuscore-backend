import express from 'express';
import {
  getDeptChatHistory,
  sendDeptMessage,
  getDeptMembers,
} from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication + faculty role
router.use(protect);
router.use(authorize('faculty'));

// Department group chat
router.get('/dept-chat', getDeptChatHistory);
router.post('/dept-chat', sendDeptMessage);

// Department members list
router.get('/dept-members', getDeptMembers);

export default router;
