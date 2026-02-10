import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from '../utils/sendEmail.js';

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      department,
      semester,
      designation,
      specialization
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user data object
    const userData = {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      otpCode: otp,
      otpExpiry
    };

    // Role-specific fields
    if (role === 'student') {
      userData.department = department;
      userData.semester = semester;
      // Generate student ID before creating user
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      userData.studentId = `STU${year}${random}`;
    } else if (role === 'faculty') {
      userData.department = department;
      userData.designation = designation;
      // Generate employee ID before creating user
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      userData.employeeId = `FAC${random}`;
    } else if (role === 'staff') {
      userData.designation = designation;
      // Generate employee ID before creating user
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      userData.employeeId = `STF${random}`;
    } else if (role === 'counselor') {
      userData.designation = designation;
      userData.specialization = specialization;
    }

    // Create user
    const user = await User.create(userData);

    // Send OTP email
    try {
      await sendOTPEmail(email, firstName, otp);
      console.log(`✅ OTP email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError.message);
      // In development, just log the OTP instead of failing
      console.log('\n⚠️  EMAIL NOT CONFIGURED - Using console OTP for development');
      console.log('━'.repeat(60));
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Expires: ${new Date(otpExpiry).toLocaleString()}`);
      console.log('━'.repeat(60));
      console.log('💡 To enable emails, configure EMAIL_USER and EMAIL_PASSWORD in .env\n');
      // Don't delete user - allow development testing
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP.',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        // Include OTP in development if email failed (remove in production)
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otp })
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user with OTP
    const user = await User.findOne({ 
      email,
      isVerified: false
    }).select('+otpCode +otpExpiry');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or user already verified'
      });
    }

    // Check if OTP is expired
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
        code: 'OTP_EXPIRED'
      });
    }

    // Verify OTP
    if (user.otpCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.firstName, user.role);

    // Generate tokens
    const accessToken = generateAccessToken({ 
      id: user._id, 
      role: user.role 
    });
    const refreshToken = generateRefreshToken({ 
      id: user._id 
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          studentId: user.studentId,
          employeeId: user.employeeId
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ 
      email,
      isVerified: false
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found or already verified'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otpCode = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, user.firstName, otp);
      console.log(`✅ OTP resent to ${email}`);
    } catch (emailError) {
      console.error('Failed to resend OTP email:', emailError.message);
      // In development, log OTP to console
      console.log('\n⚠️  EMAIL NOT CONFIGURED - Using console OTP');
      console.log(`📧 Email: ${email}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Expires: ${new Date(otpExpiry).toLocaleString()}\n`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { devOTP: otp })
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check if active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact admin.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ 
      id: user._id, 
      role: user.role 
    });
    const refreshToken = generateRefreshToken({ 
      id: user._id 
    });

    // Save refresh token and update last login
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          semester: user.semester,
          studentId: user.studentId,
          employeeId: user.employeeId,
          avatar: user.avatar
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({ 
      id: user._id, 
      role: user.role 
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // Clear refresh token from database
    req.user.refreshToken = undefined;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
};
