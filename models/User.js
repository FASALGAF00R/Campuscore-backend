import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin', 'staff', 'counselor'],
      default: 'student',
    },
    phone: String,
    avatar: String,

    // Student specific fields
    studentId: String,
    department: String,
    semester: Number,
    section: String,
    cgpa: Number,

    // Faculty specific fields
    employeeId: String,
    designation: String,

    // Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false, // Faculty needs admin approval after OTP verification
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otpCode: String,
    otpExpiry: Date,

    // Refresh tokens
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Password reset
    resetPasswordToken: String,
    resetPasswordExpiry: Date,

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static method to generate student register number
userSchema.statics.generateStudentId = async function (department) {
  const year = new Date().getFullYear();
  const deptCode = department ? department.substring(0, 3).toUpperCase() : 'GEN';

  // Find the last student with a similar ID format
  const lastUser = await this.findOne({
    role: 'student',
    studentId: new RegExp(`^${year}${deptCode}`),
  }).sort({ createdAt: -1 });

  let sequence = '001';
  if (lastUser && lastUser.studentId) {
    const lastSequence = parseInt(lastUser.studentId.slice(-3));
    sequence = String(lastSequence + 1).padStart(3, '0');
  }

  return `${year}${deptCode}${sequence}`;
};

// Static method to generate faculty employee ID (Register Number)
userSchema.statics.generateEmployeeId = async function () {
  const year = new Date().getFullYear();
  const prefix = 'FAC';

  // Find the last faculty with a similar ID format
  const lastUser = await this.findOne({
    role: 'faculty',
    employeeId: new RegExp(`^${year}${prefix}`),
  }).sort({ createdAt: -1 });

  let sequence = '001';
  if (lastUser && lastUser.employeeId) {
    const lastSequence = parseInt(lastUser.employeeId.slice(-3));
    sequence = String(lastSequence + 1).padStart(3, '0');
  }

  return `${year}${prefix}${sequence}`;
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

export default User;
