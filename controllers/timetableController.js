import Timetable from '../models/Timetable.js';
import User from '../models/User.js';

/**
 * @desc    Create timetable for student
 * @route   POST /api/timetables
 * @access  Private (Faculty, Admin)
 */
export const createTimetable = async (req, res) => {
  try {
    const { studentId, semester, academicYear, schedule } = req.body;

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if timetable already exists
    const existing = await Timetable.findOne({
      student: studentId,
      semester,
      academicYear
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Timetable already exists for this semester'
      });
    }

    const timetable = await Timetable.create({
      student: studentId,
      semester,
      academicYear,
      schedule,
      createdBy: req.user._id
    });

    await timetable.populate('student', 'firstName lastName email studentId');

    res.status(201).json({
      success: true,
      message: 'Timetable created successfully',
      data: { timetable }
    });
  } catch (error) {
    console.error('Create timetable error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create timetable'
    });
  }
};

/**
 * @desc    Get student's timetable
 * @route   GET /api/timetables/my-timetable
 * @access  Private (Student)
 */
export const getMyTimetable = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const query = { student: req.user._id };
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const timetable = await Timetable.findOne(query)
      .populate('schedule.monday.faculty', 'firstName lastName')
      .populate('schedule.tuesday.faculty', 'firstName lastName')
      .populate('schedule.wednesday.faculty', 'firstName lastName')
      .populate('schedule.thursday.faculty', 'firstName lastName')
      .populate('schedule.friday.faculty', 'firstName lastName')
      .populate('schedule.saturday.faculty', 'firstName lastName');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { timetable }
    });
  } catch (error) {
    console.error('Get my timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
};

/**
 * @desc    Get today's classes for student
 * @route   GET /api/timetables/today
 * @access  Private (Student)
 */
export const getTodayClasses = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({
      student: req.user._id,
      semester: req.user.semester
    })
      .populate('schedule.monday.faculty', 'firstName lastName')
      .populate('schedule.tuesday.faculty', 'firstName lastName')
      .populate('schedule.wednesday.faculty', 'firstName lastName')
      .populate('schedule.thursday.faculty', 'firstName lastName')
      .populate('schedule.friday.faculty', 'firstName lastName')
      .populate('schedule.saturday.faculty', 'firstName lastName');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    // Get current day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];

    const todayClasses = timetable.schedule[today] || [];

    res.status(200).json({
      success: true,
      data: {
        day: today,
        classes: todayClasses,
        totalClasses: todayClasses.length
      }
    });
  } catch (error) {
    console.error('Get today classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s classes'
    });
  }
};

/**
 * @desc    Get timetable by student ID (faculty/admin)
 * @route   GET /api/timetables/student/:studentId
 * @access  Private (Faculty, Admin)
 */
export const getStudentTimetable = async (req, res) => {
  try {
    const timetables = await Timetable.find({ student: req.params.studentId })
      .populate('student', 'firstName lastName email studentId department semester')
      .sort({ academicYear: -1, semester: -1 });

    res.status(200).json({
      success: true,
      data: { timetables }
    });
  } catch (error) {
    console.error('Get student timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
};

/**
 * @desc    Update timetable
 * @route   PUT /api/timetables/:id
 * @access  Private (Faculty, Admin)
 */
export const updateTimetable = async (req, res) => {
  try {
    const { schedule } = req.body;

    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { schedule },
      { new: true, runValidators: true }
    )
      .populate('student', 'firstName lastName email studentId');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable updated successfully',
      data: { timetable }
    });
  } catch (error) {
    console.error('Update timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update timetable'
    });
  }
};

/**
 * @desc    Delete timetable
 * @route   DELETE /api/timetables/:id
 * @access  Private (Admin)
 */
export const deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete timetable'
    });
  }
};

/**
 * @desc    Get all timetables (admin)
 * @route   GET /api/timetables
 * @access  Private (Admin)
 */
export const getAllTimetables = async (req, res) => {
  try {
    const { department, semester, academicYear, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;

    let query = Timetable.find(filter)
      .populate('student', 'firstName lastName email studentId department semester');

    // Filter by department through populated student
    if (department) {
      const students = await User.find({ role: 'student', department });
      const studentIds = students.map(s => s._id);
      query = query.where('student').in(studentIds);
    }

    const timetables = await query
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await Timetable.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        timetables,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all timetables error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetables'
    });
  }
};
