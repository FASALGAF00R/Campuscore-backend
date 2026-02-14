import express from 'express';
import { getPublicStaff } from '../controllers/staffController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public/Student routes to view staff list
router.get('/', protect, getPublicStaff);

export default router;
