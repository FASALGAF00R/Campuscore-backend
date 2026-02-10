import mongoose from 'mongoose';

const emergencyAssistSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['navigation', 'facilities', 'forms', 'procedures', 'general', 'other'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 500
  },
  location: {
    current: String,
    destination: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Non-teaching staff
  },
  assignedAt: Date,
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: Date,
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
emergencyAssistSchema.index({ student: 1 });
emergencyAssistSchema.index({ status: 1 });
emergencyAssistSchema.index({ assignedTo: 1 });
emergencyAssistSchema.index({ category: 1 });

export default mongoose.model('EmergencyAssist', emergencyAssistSchema);
