import mongoose from 'mongoose';

const studyPodMessageSchema = new mongoose.Schema({
  podId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPod',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['student', 'faculty'],
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'poll', 'announcement'],
    default: 'text'
  },
  content: String,
  
  // File attachments
  files: [{
    filename: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  
  // Poll (if messageType is 'poll')
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    endsAt: Date
  },
  
  // Metadata
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // Reactions
  reactions: [{
    emoji: String,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
studyPodMessageSchema.index({ podId: 1, createdAt: -1 });
studyPodMessageSchema.index({ sender: 1 });

export default mongoose.model('StudyPodMessage', studyPodMessageSchema);
