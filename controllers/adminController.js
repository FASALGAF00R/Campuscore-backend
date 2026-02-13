import User from '../models/User.js';
import Event from '../models/Event.js';
import SOSAlert from '../models/SOSAlert.js';
import CounselingRequest from '../models/CounselingRequest.js';
import EmergencyAssist from '../models/EmergencyAssist.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';

// Get system statistics for dashboard
export const getSystemStats = async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' });
    const teacherCount = await User.countDocuments({ role: 'faculty' });
    const counselorCount = await User.countDocuments({ role: 'counselor' });
    const staffCount = await User.countDocuments({ role: 'staff' });
    const pendingFacultyCount = await User.countDocuments({ role: 'faculty', isApproved: false });

    const activeSOSCount = await SOSAlert.countDocuments({ status: 'active' });
    const pendingCounselingCount = await CounselingRequest.countDocuments({ status: 'pending' });
    const pendingHelpCount = await EmergencyAssist.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        users: {
          students: studentCount,
          teachers: teacherCount,
          counselors: counselorCount,
          staff: staffCount,
          pendingFaculty: pendingFacultyCount,
        },
        requests: {
          sos: activeSOSCount,
          counseling: pendingCounselingCount,
          help: pendingHelpCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all students
export const getAllStudents = async (req, res) => {
  try {
    let query = { role: 'student' };

    // If faculty is requesting, only show students from their department
    if (req.user.role === 'faculty') {
      if (!req.user.department) {
        console.warn(
          `[WARN] Faculty ${req.user.email} (ID: ${req.user._id}) has NO department set in DB.`
        );
        return res
          .status(403)
          .json({ success: false, message: 'Faculty department not identified' });
      }
      const dept = req.user.department.trim();
      query.department = { $regex: new RegExp(`^${dept}$`, 'i') };
      console.log(`[QUERY] Faculty Dept: "${dept}"`);
    }

    const students = await User.find(query).sort({ createdAt: -1 });
    console.log(`[RESULT] Found ${students.length} students for query:`, JSON.stringify(query));
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error('[CRITICAL] getAllStudents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all faculty (teachers)
export const getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'faculty' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all counselors
export const getAllCounselors = async (req, res) => {
  try {
    const counselors = await User.find({ role: 'counselor' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: counselors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all staff
export const getAllStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all SOS alerts
export const getAllSOSAlerts = async (req, res) => {
  try {
    const alerts = await SOSAlert.find()
      .populate('student', 'firstName lastName email studentId phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'firstName lastName')
      .sort({ startDate: -1 });
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle user status (Block/Unblock)
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'unblocked' : 'blocked'} successfully`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Login - Direct authentication without OTP
export const adminLoginRequest = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const systemAdminEmail = process.env.ADMIN_EMAIL || 'admin@campuscore.com';
    const systemAdminPassword = process.env.ADMIN_PASSWORD || 'admin12345';

    let user;

    // Check if identified as system admin
    if (identifier === systemAdminEmail && password === systemAdminPassword) {
      user = await User.findOne({ email: systemAdminEmail, role: 'admin' }).select('+password');

      if (!user) {
        // Auto-create system admin if not exists
        user = await User.create({
          firstName: 'System',
          lastName: 'Admin',
          email: systemAdminEmail,
          password: systemAdminPassword,
          role: 'admin',
          isVerified: true,
          isActive: true,
          employeeId: 'ADMIN-001',
        });
        console.log(`\n[SYSTEM] Created initial Admin: ${systemAdminEmail}`);
      }
    } else {
      // Check for Admin, Counselor, or Staff in DB
      user = await User.findOne({
        $or: [{ email: identifier }, { employeeId: identifier }],
        role: { $in: ['admin', 'counselor', 'staff'] },
      }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated. Please contact the administrator.',
        });
      }
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens directly
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    console.log(`\n[ADMIN LOGIN] ${user.email} authenticated successfully\n`);

    res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify Admin OTP and Login
export const verifyAdminOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email, role: 'admin' }).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (user.otpCode !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = Date.now();
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
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
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Pending Faculty (awaiting admin approval)
export const getPendingFaculty = async (req, res) => {
  try {
    const pendingFaculty = await User.find({
      role: 'faculty',
      isVerified: true,
      isApproved: false,
    })
      .select('-password -otpCode -otpExpiry -refreshTokens')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingFaculty.length,
      data: pendingFaculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve Faculty
export const approveFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await User.findById(id);

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    if (faculty.role !== 'faculty') {
      return res.status(400).json({ success: false, message: 'User is not a faculty member' });
    }

    if (faculty.isApproved) {
      return res.status(400).json({ success: false, message: 'Faculty already approved' });
    }

    faculty.isApproved = true;
    await faculty.save();

    // TODO: Send approval email notification
    console.log(`✅ Faculty approved: ${faculty.email}`);

    res.status(200).json({
      success: true,
      message: `${faculty.firstName} ${faculty.lastName} has been approved successfully`,
      data: faculty,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject Faculty
export const rejectFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await User.findById(id);

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    if (faculty.role !== 'faculty') {
      return res.status(400).json({ success: false, message: 'User is not a faculty member' });
    }

    const facultyName = `${faculty.firstName} ${faculty.lastName}`;
    const facultyEmail = faculty.email;

    // Delete the faculty application
    await User.findByIdAndDelete(id);

    // TODO: Send rejection email notification
    console.log(`❌ Faculty rejected and removed: ${facultyEmail}`);

    res.status(200).json({
      success: true,
      message: `${facultyName}'s application has been rejected`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Counselor
export const createCounselor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      specialization,
      phone,
      experience,
      qualification,
      bio,
      maxStudentsPerDay,
      counselingMode,
      availability,
      isActive,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const counselor = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'counselor',
      specialization,
      phone,
      experience,
      qualification,
      bio,
      maxStudentsPerDay,
      counselingMode,
      availability,
      isActive: isActive !== undefined ? isActive : true,
      isVerified: true, // Admin created accounts are verified by default
      isApproved: true, // Admin created accounts are approved by default
    });

    await counselor.save();

    res.status(201).json({
      success: true,
      message: 'Counselor created successfully',
      data: counselor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Staff
export const createStaff = async (req, res) => {
  try {
    const { firstName, lastName, email, password, category, phone, bio, availability, isActive } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const staff = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'staff',
      category,
      phone,
      bio,
      availability,
      isActive: isActive !== undefined ? isActive : true,
      isVerified: true,
      isApproved: true,
    });

    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
