import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateToken.js';
import { generateOTP, generateOTPExpiry } from '../utils/generateOTP.js';
import transporter from '../config/email.js';

// Register User
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, ...otherFields } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    let studentId;
    let employeeId;

    if (role === 'student') {
      studentId = await User.generateStudentId(req.body.department);
    } else if (role === 'faculty') {
      employeeId = await User.generateEmployeeId();
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      studentId,
      employeeId,
      otpCode: otp,
      otpExpiry,
      ...otherFields,
    });

    // Send email (optional/logged in dev)
    console.log(`\n-----------------------------------------`);
    console.log(`Verification for ${email}:`);
    console.log(`Register Number: ${studentId || employeeId || 'N/A'}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`-----------------------------------------\n`);

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Welcome to Campus Core - Verify your email',
          text: `Welcome ${firstName}! Your student register number is: ${studentId}\n\nYour OTP for verification is: ${otp}\n\nPlease use this register number to login after verification. It expires in 10 minutes.`,
        });
      }
    } catch (err) {
      console.error('Email send error:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to email.',
      data: {
        userId: user._id,
        studentId: user.studentId,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { userId, email, otp } = req.body;

    // Find user by userId or email
    const user = userId ? await User.findById(userId) : await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }

    if (user.otpCode !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { userId, email } = req.body;

    // Find user by userId or email
    const user = userId ? await User.findById(userId) : await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = generateOTP();
    user.otpCode = otp;
    user.otpExpiry = generateOTPExpiry();
    await user.save();

    console.log(`New OTP for ${user.email}: ${otp}`);
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'New OTP - Campus Core',
          text: `Your new OTP is ${otp}. It expires in 10 minutes.`,
        });
      }
    } catch (err) {
      console.error('Email send error:', err.message);
    }

    res.status(200).json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email, studentId, or employeeId
    const user = await User.findOne({
      $or: [{ email: identifier }, { studentId: identifier }, { employeeId: identifier }],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        data: { userId: user._id },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    // Check if faculty is approved by admin
    if (user.role === 'faculty' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval. You will be notified once approved.',
        pendingApproval: true,
        data: { email: user.email },
      });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Refresh Token
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.some((rt) => rt.token === refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    res.status(200).json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Token refresh failed' });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check Active Status
export const checkActiveStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
        isActive: false,
      });
    }

    res.status(200).json({
      success: true,
      isActive: true,
      message: 'Account is active',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check Approval Status (Public)
export const checkApprovalStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      isApproved: user.isApproved,
      isVerified: user.isVerified,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; // Update Profile
export const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      department,
      semester,
      section,
      bio,
      qualification,
      experience,
      specialization,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (semester) user.semester = semester;
    if (section) user.section = section;
    if (bio) user.bio = bio;
    if (qualification) user.qualification = qualification;
    if (experience) user.experience = experience;
    if (specialization) user.specialization = specialization;

    // Handle avatar upload
    if (req.file) {
      user.avatar = `/uploads/profiles/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
