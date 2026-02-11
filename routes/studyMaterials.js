import express from 'express';
import {
  uploadMaterial,
  getAllMaterials,
  getMaterial,
  downloadMaterial,
  verifyMaterial,
  deleteMaterial,
  getMyUploads,
} from '../controllers/studyMaterialController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public/Protected routes
router.get('/', protect, getAllMaterials);
router.get('/my-uploads', protect, getMyUploads);
router.get('/:id', protect, getMaterial);
router.get('/:id/download', protect, downloadMaterial);

// Upload (Student, Faculty)
router.post('/', protect, authorize('student', 'faculty'), upload.single('file'), uploadMaterial);

// Verify (Faculty, Admin)
router.put('/:id/verify', protect, authorize('faculty', 'admin'), verifyMaterial);

// Delete (Owner or Admin)
router.delete('/:id', protect, deleteMaterial);

export default router;
