import EmergencyAssist from '../models/EmergencyAssist.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

/**
 * @desc    Create emergency assist request
 * @route   POST /api/emergency-assist
 * @access  Private (Student)
 */
export const createEmergencyAssist = async (req, res) => {
  try {
    const { category, title, description, location, priority } = req.body;

    const request = await EmergencyAssist.create({
      student: req.user._id,
      category,
      title,
      description,
      location,
      priority: priority || 'medium'
    });

    await request.populate('student', 'firstName lastName email studentId department');

    // Broadcast to all staff via Socket.IO
    try {
      const io = getIO();
      io.to('staff').to('admin').emit('emergency:new-request', {
        request,
        message: `New ${category} assistance request from ${request.student.firstName}`
      });
    } catch (socketError) {
      console.error('Socket.IO error:', socketError);
    }

    // Create notifications for staff and admin
    const staffAndAdmin = await User.find({
      role: { $in: ['staff', 'admin'] },
      isActive: true
    });

    const notifications = staffAndAdmin.map(user => ({
      recipient: user._id,
      type: 'emergency-assist',
      title: `🆘 Emergency Assist: ${category}`,
      message: `${request.student.firstName} needs help with ${category}`,
      relatedEntity: {
        model: 'EmergencyAssist',
        id: request._id
      },
      priority: request.priority
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: 'Assistance request created. A staff member will be assigned soon.',
      data: { request }
    });
  } catch (error) {
    console.error('Create emergency assist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create request'
    });
  }
};

/**
 * @desc    Get all emergency assist requests
 * @route   GET /api/emergency-assist
 * @access  Private (Staff, Admin)
 */
export const getAllRequests = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;

    const requests = await EmergencyAssist.find(filter)
      .populate('student', 'firstName lastName email studentId department phone')
      .populate('assignedTo', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await EmergencyAssist.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
};

/**
 * @desc    Get single emergency assist request
 * @route   GET /api/emergency-assist/:id
 * @access  Private
 */
export const getRequest = async (req, res) => {
  try {
    const request = await EmergencyAssist.findById(req.params.id)
      .populate('student', 'firstName lastName email studentId department phone')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('messages.sender', 'firstName lastName role');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check authorization
    const isStudent = request.student._id.toString() === req.user._id.toString();
    const isAssigned = request.assignedTo?._id.toString() === req.user._id.toString();
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);

    if (!isStudent && !isAssigned && !isStaffOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    res.status(200).json({
      success: true,
      data: { request }
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
};

/**
 * @desc    Get my emergency assist requests (student)
 * @route   GET /api/emergency-assist/my-requests
 * @access  Private (Student)
 */
export const getMyRequests = async (req, res) => {
  try {
    const requests = await EmergencyAssist.find({ student: req.user._id })
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your requests'
    });
  }
};

/**
 * @desc    Get assigned requests (staff)
 * @route   GET /api/emergency-assist/assigned-to-me
 * @access  Private (Staff)
 */
export const getAssignedRequests = async (req, res) => {
  try {
    const requests = await EmergencyAssist.find({ assignedTo: req.user._id })
      .populate('student', 'firstName lastName email studentId department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error('Get assigned requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned requests'
    });
  }
};

/**
 * @desc    Assign request to staff
 * @route   PUT /api/emergency-assist/:id/assign
 * @access  Private (Staff, Admin)
 */
export const assignRequest = async (req, res) => {
  try {
    const { staffId } = req.body;

    const request = await EmergencyAssist.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Allow self-assignment or admin assignment
    const targetStaffId = staffId || req.user._id;

    const staff = await User.findById(targetStaffId);
    if (!staff || !['staff', 'admin'].includes(staff.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff member'
      });
    }

    request.assignedTo = targetStaffId;
    request.assignedAt = Date.now();
    request.status = 'assigned';
    await request.save();

    await request.populate('student', 'firstName lastName');
    await request.populate('assignedTo', 'firstName lastName email');

    // Notify assigned staff
    try {
      const io = getIO();
      io.to(`user:${targetStaffId}`).emit('emergency:assigned', {
        request,
        message: `You've been assigned to help ${request.student.firstName}`
      });
    } catch (socketError) {
      console.error('Socket.IO error:', socketError);
    }

    // Notify student
    await Notification.create({
      recipient: request.student._id,
      type: 'emergency-assist',
      title: 'Assistance Request Assigned',
      message: `${request.assignedTo.firstName} has been assigned to assist you`,
      relatedEntity: {
        model: 'EmergencyAssist',
        id: request._id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Request assigned successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Assign request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign request'
    });
  }
};

/**
 * @desc    Update request status
 * @route   PUT /api/emergency-assist/:id/status
 * @access  Private (Staff, Admin)
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const request = await EmergencyAssist.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    request.status = status;
    if (status === 'completed') {
      request.completedAt = Date.now();
    }

    await request.save();
    await request.populate('student', 'firstName lastName email');

    // Notify student
    try {
      const io = getIO();
      io.to(`user:${request.student._id}`).emit('emergency:update', {
        requestId: request._id,
        status,
        message: `Your assistance request status: ${status}`
      });
    } catch (socketError) {
      console.error('Socket.IO error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

/**
 * @desc    Add message to request thread
 * @route   POST /api/emergency-assist/:id/message
 * @access  Private
 */
export const addMessage = async (req, res) => {
  try {
    const { message } = req.body;

    const request = await EmergencyAssist.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check authorization
    const isStudent = request.student.toString() === req.user._id.toString();
    const isAssigned = request.assignedTo?.toString() === req.user._id.toString();

    if (!isStudent && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    request.messages.push({
      sender: req.user._id,
      message
    });

    if (request.status === 'pending' || request.status === 'assigned') {
      request.status = 'in-progress';
    }

    await request.save();
    await request.populate('messages.sender', 'firstName lastName role');

    // Notify the other party
    const recipientId = isStudent ? request.assignedTo : request.student;
    if (recipientId) {
      try {
        const io = getIO();
        io.to(`user:${recipientId}`).emit('emergency:message', {
          requestId: request._id,
          message: request.messages[request.messages.length - 1]
        });
      } catch (socketError) {
        console.error('Socket.IO error:', socketError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Message sent',
      data: { request }
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

/**
 * @desc    Rate assistance (student)
 * @route   PUT /api/emergency-assist/:id/rate
 * @access  Private (Student)
 */
export const rateAssistance = async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const request = await EmergencyAssist.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed assistance'
      });
    }

    request.rating = rating;
    request.feedback = feedback;
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: { request }
    });
  } catch (error) {
    console.error('Rate assistance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
};
