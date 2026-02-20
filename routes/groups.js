import express from 'express';
import {
  createGroupChat,
  getMyGroups,
  getGroupChatHistory,
  getDeptStudents,
  getDeptChatHistory,
  sendDeptMessage,
} from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Create group: Only faculty
router.post('/', authorize('faculty'), createGroupChat);

// Get my groups: Both faculty and student
router.get('/', authorize('faculty', 'student'), getMyGroups);

// Department Forum: Both faculty and student
router.get('/department-forum', authorize('faculty', 'student'), getDeptChatHistory);
router.post('/department-forum', authorize('faculty', 'student'), sendDeptMessage);

// Get history: Both faculty and student
router.get('/:groupId/messages', authorize('faculty', 'student'), getGroupChatHistory);

// Get eligible students for group creation: Only faculty
router.get('/eligible-students', authorize('faculty'), getDeptStudents);

export default router;
