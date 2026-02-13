import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getUpcomingEvents,
} from '../controllers/eventController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadEventImage } from '../middleware/upload.js';

const router = express.Router();

router.get('/upcoming', getUpcomingEvents);
router.get('/', getAllEvents);
router.get('/:id', getEvent);

router.post(
  '/',
  protect,
  authorize('faculty', 'admin'),
  uploadEventImage.single('image'),
  createEvent
);
router.put(
  '/:id',
  protect,
  authorize('faculty', 'admin'),
  uploadEventImage.single('image'),
  updateEvent
);
router.delete('/:id', protect, authorize('admin', 'faculty'), deleteEvent);

router.post('/:id/register', protect, registerForEvent);
router.delete('/:id/unregister', protect, unregisterFromEvent);

export default router;
