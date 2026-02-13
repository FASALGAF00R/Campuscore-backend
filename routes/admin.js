import express from 'express';
import {
  getAllStudents,
  getAllTeachers,
  getAllCounselors,
  getAllStaff,
  getAllSOSAlerts,
  getAllEvents,
  toggleUserStatus,
  adminLoginRequest,
  verifyAdminOTP,
  getPendingFaculty,
  approveFaculty,
  rejectFaculty,
  createCounselor,
  createStaff,
  getSystemStats,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes for admin login
router.post('/login-request', adminLoginRequest);
router.post('/verify-otp', verifyAdminOTP);

// Protected admin routes
router.get('/stats', protect, authorize('admin'), getSystemStats);
router.get(
  '/students',
  protect,
  authorize('admin', 'counselor', 'staff', 'faculty'),
  getAllStudents
);
router.get('/teachers', protect, authorize('admin', 'counselor', 'staff'), getAllTeachers);
router.get('/counselors', protect, authorize('admin', 'faculty'), getAllCounselors);
router.get('/staff', protect, authorize('admin', 'faculty'), getAllStaff);
router.get('/sos', protect, authorize('admin', 'counselor', 'staff'), getAllSOSAlerts);
router.get('/events', protect, authorize('admin', 'faculty'), getAllEvents);

// Faculty approval routes
router.get('/pending-faculty', protect, authorize('admin'), getPendingFaculty);
router.post('/approve-faculty/:id', protect, authorize('admin'), approveFaculty);
router.post('/reject-faculty/:id', protect, authorize('admin'), rejectFaculty);

// Counselor creation
router.post('/create-counselor', protect, authorize('admin'), createCounselor);

// Staff creation
router.post('/create-staff', protect, authorize('admin'), createStaff);

router.patch('/users/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);

export default router;
