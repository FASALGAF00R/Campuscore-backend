import mongoose from 'mongoose';

const studyPodSchema = new mongoose.Schema(
  {
    podId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Pod name is required'],
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    subject: {
      type: String,
      required: true,
    },
    subjectCode: String,
    department: {
      type: String,
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxMembers: {
      type: Number,
      default: 50,
      min: 2,
      max: 500,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [String],
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
studyPodSchema.index({ department: 1, semester: 1 });
studyPodSchema.index({ subject: 1 });
studyPodSchema.index({ isActive: 1 });
studyPodSchema.index({ 'members.user': 1 });

// Generate unique pod ID
studyPodSchema.statics.generatePodId = async function (department, year) {
  const count = await this.countDocuments({
    department,
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    },
  });

  const deptCode = department.substring(0, 3).toUpperCase();
  return `${deptCode}-${year}-${String(count + 1).padStart(4, '0')}`;
};

const StudyPod = mongoose.model('StudyPod', studyPodSchema);

export default StudyPod;
