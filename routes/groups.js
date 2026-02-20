import express from 'express';
import {
  createGroupChat,
  getMyGroups,
  getGroupChatHistory,
  getDeptStudents,
  getDeptChatHistory,
  sendDeptMessage,
  addGroupMembers,
  removeGroupMember,
  uploadChatFile,
} from '../controllers/facultyController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Create group: Only faculty
router.post('/', authorize('faculty'), createGroupChat);

// Get my groups: Both faculty and student
router.get('/', authorize('faculty', 'student'), getMyGroups);

// Image Upload: Both (logic for storage is in middleware based on URL)
router.post('/upload', authorize('faculty', 'student'), upload.single('file'), uploadChatFile);

// Department Forum: Both faculty and student
router.get('/department-forum', authorize('faculty', 'student'), getDeptChatHistory);
router.post('/department-forum', authorize('faculty', 'student'), sendDeptMessage);

// Member management: Only faculty (Logic inside controller checks if creator)
router.put('/:groupId/members', authorize('faculty'), addGroupMembers);
router.delete('/:groupId/members/:userId', authorize('faculty'), removeGroupMember);

// Get history: Both faculty and student
router.get('/:groupId/messages', authorize('faculty', 'student'), getGroupChatHistory);

// Get eligible students for group creation: Only faculty
router.get('/eligible-students', authorize('faculty'), getDeptStudents);

export default router;
