import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'sos-alert',
      'emergency-assist',
      'counseling-request',
      'counseling-message',
      'event-reminder',
      'event-registration',
      'pod-invitation',
      'pod-message',
      'material-uploaded',
      'assignment-reminder',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 150
  },
  message: {
    type: String,
    required: true
  },
  
  // Reference to related entity
  relatedEntity: {
    model: {
      type: String,
      enum: ['SOSAlert', 'EmergencyAssist', 'CounselingRequest', 'Event', 'StudyPod', 'StudyMaterial']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  
  // Action link
  actionUrl: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Icon/Emoji
  icon: String,
  
  // Expiry
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ type: 1 });

// Auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Notification', notificationSchema);
