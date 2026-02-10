import mongoose from 'mongoose';

const counselingMessageSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CounselingRequest',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['student', 'counselor'],
    required: true
  },
  
  // Encrypted message content (if anonymous mode)
  encryptedContent: String,
  
  // Plain text message (if not anonymous)
  plainContent: String,
  
  isEncrypted: {
    type: Boolean,
    default: false
  },
  
  // Message metadata
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Attachments (optional)
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    mimeType: String
  }]
}, {
  timestamps: true
});

// Indexes
counselingMessageSchema.index({ requestId: 1, createdAt: -1 });
counselingMessageSchema.index({ sender: 1 });

export default mongoose.model('CounselingMessage', counselingMessageSchema);
