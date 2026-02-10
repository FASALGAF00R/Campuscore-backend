import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Don't return password by default
  },
  
  // Personal Info
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Role & Department
  role: {
    type: String,
    enum: ['student', 'faculty', 'staff', 'counselor', 'admin'],
    required: true
  },
  department: {
    type: String,
    required: function() {
      return ['student', 'faculty'].includes(this.role);
    }
  },
  
  // Student-specific
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for non-students
    required: function() {
      return this.role === 'student';
    }
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
    required: function() {
      return this.role === 'student';
    }
  },
  cgpa: {
    type: Number,
    min: 0,
    max: 10,
    default: null
  },
  
  // Faculty-specific
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    required: function() {
      return ['faculty', 'staff'].includes(this.role);
    }
  },
  designation: {
    type: String,
    required: function() {
      return ['faculty', 'staff', 'counselor'].includes(this.role);
    }
  },
  
  // Counselor-specific
  specialization: [{
    type: String,
    enum: ['mental-health', 'career', 'personal', 'academic']
  }],
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  otpCode: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Refresh Token
  refreshToken: {
    type: String,
    select: false
  },
  
  // Last Login
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ department: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate student/employee ID
userSchema.methods.generateId = function() {
  if (this.role === 'student') {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `STU${year}${random}`;
  } else if (['faculty', 'staff'].includes(this.role)) {
    const prefix = this.role === 'faculty' ? 'FAC' : 'STF';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
  }
};

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model('User', userSchema);
