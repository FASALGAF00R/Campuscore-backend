import express from 'express';
import {
  createHelpRequest,
  getMyRequests,
  updateRequestStatus,
} from '../controllers/helpRequestController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Student creates help request
router.post('/', upload.array('attachments', 5), createHelpRequest);

// Everyone gets their own requests
router.get('/', getMyRequests);
router.get('/my', getMyRequests);

// Staff/Admin updates status
router.patch('/:id/status', updateRequestStatus);

export default router;
