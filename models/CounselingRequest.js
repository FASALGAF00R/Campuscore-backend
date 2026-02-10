import mongoose from 'mongoose';

const counselingRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['mental-health', 'career', 'personal', 'academic', 'other'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: 150
  },
  description: {
    type: String,
    required: [true, 'Description is required']
    // Will be encrypted on frontend if anonymous
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-session', 'completed', 'declined'],
    default: 'pending'
  },
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: Date,
  sessionStartedAt: Date,
  completedAt: Date,
  declineReason: String,
  
  // Session metadata
  sessionCount: {
    type: Number,
    default: 0
  },
  lastSessionAt: Date,
  
  // Student satisfaction
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String
}, {
  timestamps: true
});

// Indexes
counselingRequestSchema.index({ student: 1 });
counselingRequestSchema.index({ counselor: 1 });
counselingRequestSchema.index({ status: 1 });
counselingRequestSchema.index({ category: 1 });
counselingRequestSchema.index({ isAnonymous: 1 });

export default mongoose.model('CounselingRequest', counselingRequestSchema);
