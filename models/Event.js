import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  category: {
    type: String,
    enum: ['academic', 'cultural', 'sports', 'workshop', 'seminar', 'fest', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  location: {
    venue: String,
    building: String,
    room: String,
    isOnline: {
      type: Boolean,
      default: false
    },
    onlineLink: String
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: String,
  targetAudience: [{
    type: String,
    enum: ['all', 'students', 'faculty', 'staff', 'specific-department', 'specific-semester']
  }],
  specificDepartments: [String],
  specificSemesters: [Number],
  
  // Registration
  requiresRegistration: {
    type: Boolean,
    default: false
  },
  maxParticipants: Number,
  registeredParticipants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  registrationDeadline: Date,
  
  // Media
  poster: String,
  images: [String],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Contact
  contactPerson: String,
  contactEmail: String,
  contactPhone: String
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ startDate: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ department: 1 });

export default mongoose.model('Event', eventSchema);
