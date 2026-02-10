import mongoose from 'mongoose';

const sosAlertSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['bullying', 'medical', 'safety', 'disaster', 'other'],
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 500
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    building: String,
    room: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in-progress', 'resolved', 'cancelled'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  responses: [{
    responder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  resolvedAt: Date,
  resolutionNotes: String
}, {
  timestamps: true
});

// Index for faster queries
sosAlertSchema.index({ student: 1 });
sosAlertSchema.index({ status: 1 });
sosAlertSchema.index({ priority: 1 });
sosAlertSchema.index({ createdAt: -1 });

export default mongoose.model('SOSAlert', sosAlertSchema);
