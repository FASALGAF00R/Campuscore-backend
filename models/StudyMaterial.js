import mongoose from 'mongoose';

const studyMaterialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  description: String,
  subject: {
    type: String,
    required: true
  },
  subjectCode: String,
  department: {
    type: String,
    required: true
  },
  semester: Number,
  
  // File details
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  
  // Uploaded by
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderRole: {
    type: String,
    enum: ['student', 'faculty'],
    required: true
  },
  
  // Association
  podId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPod'
  },
  
  // Category
  category: {
    type: String,
    enum: ['notes', 'assignment', 'previous-papers', 'reference', 'syllabus', 'other'],
    required: true
  },
  
  // Metadata
  tags: [String],
  
  // Stats
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  
  // Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
studyMaterialSchema.index({ department: 1, semester: 1 });
studyMaterialSchema.index({ subject: 1 });
studyMaterialSchema.index({ podId: 1 });
studyMaterialSchema.index({ uploadedBy: 1 });
studyMaterialSchema.index({ category: 1 });

export default mongoose.model('StudyMaterial', studyMaterialSchema);
