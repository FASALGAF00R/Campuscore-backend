import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: true // e.g., "2024-2025"
  },
  
  // Weekly schedule
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true
    },
    periods: [{
      subject: {
        type: String,
        required: true
      },
      subjectCode: String,
      faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      startTime: {
        type: String,
        required: true // Format: "09:00"
      },
      endTime: {
        type: String,
        required: true // Format: "10:00"
      },
      room: String,
      building: String,
      type: {
        type: String,
        enum: ['lecture', 'lab', 'tutorial', 'practical'],
        default: 'lecture'
      }
    }]
  }],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
timetableSchema.index({ student: 1 });
timetableSchema.index({ department: 1, semester: 1 });
timetableSchema.index({ academicYear: 1 });

export default mongoose.model('Timetable', timetableSchema);
