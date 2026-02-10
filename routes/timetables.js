import express from 'express';
import {
  createTimetable,
  getMyTimetable,
  getTodayClasses,
  getStudentTimetable,
  updateTimetable,
  deleteTimetable,
  getAllTimetables
} from '../controllers/timetableController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.get('/my-timetable', protect, authorize('student'), getMyTimetable);
router.get('/today', protect, authorize('student'), getTodayClasses);

// Faculty & Admin routes
router.post('/', protect, authorize('faculty', 'admin'), createTimetable);
router.get('/', protect, authorize('admin'), getAllTimetables);
router.get('/student/:studentId', protect, authorize('faculty', 'admin'), getStudentTimetable);
router.put('/:id', protect, authorize('faculty', 'admin'), updateTimetable);
router.delete('/:id', protect, authorize('admin'), deleteTimetable);

export default router;
