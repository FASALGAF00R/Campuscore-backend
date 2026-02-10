import mongoose from 'mongoose';

const studyPodSchema = new mongoose.Schema({
  podId: {
    type: String,
    unique: true,
    required: true
    // Format: "POD-CS-2024-001"
  },
  name: {
    type: String,
    required: [true, 'Pod name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  subject: {
    type: String,
    required: true
  },
  subjectCode: String,
  department: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    min: 1,
    max: 8
  },
  
  // Members
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['owner', 'moderator', 'member'],
      default: 'member'
    }
  }],
  maxMembers: {
    type: Number,
    default: 50
  },
  
  // Linked timetable
  timetable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable'
  },
  
  // Settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [String],
  
  // Stats
  messageCount: {
    type: Number,
    default: 0
  },
  materialCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
studyPodSchema.index({ podId: 1 });
studyPodSchema.index({ department: 1, semester: 1 });
studyPodSchema.index({ subject: 1 });
studyPodSchema.index({ 'members.user': 1 });

// Method to generate unique pod ID
studyPodSchema.statics.generatePodId = async function(department, year) {
  const deptCode = department.substring(0, 3).toUpperCase();
  const count = await this.countDocuments({
    department,
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1)
    }
  });
  const podNumber = (count + 1).toString().padStart(3, '0');
  return `POD-${deptCode}-${year}-${podNumber}`;
};

export default mongoose.model('StudyPod', studyPodSchema);
