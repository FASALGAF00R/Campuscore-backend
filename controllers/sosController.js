import SOSAlert from '../models/SOSAlert.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

/**
 * @desc    Create SOS alert
 * @route   POST /api/sos
 * @access  Private (Student)
 */
export const createSOSAlert = async (req, res) => {
  try {
    const {
      type,
      description,
      location,
      priority
    } = req.body;

    // Create SOS alert
    const sosAlert = await SOSAlert.create({
      student: req.user._id,
      type,
      description,
      location,
      priority: priority || 'high' // Default to high priority
    });

    // Populate student details
    await sosAlert.populate('student', 'firstName lastName email studentId department');

    // Broadcast to all faculty and admin via Socket.IO
    try {
      const io = getIO();
      io.to('faculty').to('admin').emit('sos:new-alert', {
        alert: sosAlert,
        message: `🆘 New ${type} alert from ${sosAlert.student.firstName} ${sosAlert.student.lastName}`
      });
    } catch (socketError) {
      console.error('Socket.IO broadcast error:', socketError);
      // Continue even if socket fails
    }

    // Create notifications for all faculty and admin
    const facultyAndAdmin = await User.find({
      role: { $in: ['faculty', 'admin'] },
      isActive: true
    });

    const notifications = facultyAndAdmin.map(user => ({
      recipient: user._id,
      type: 'sos-alert',
      title: `🆘 SOS Alert: ${type}`,
      message: `${sosAlert.student.firstName} ${sosAlert.student.lastName} needs immediate assistance`,
      relatedEntity: {
        model: 'SOSAlert',
        id: sosAlert._id
      },
      actionUrl: `/sos/${sosAlert._id}`,
      priority: sosAlert.priority,
      icon: '🆘'
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: 'SOS alert created successfully. Help is on the way!',
      data: { alert: sosAlert }
    });
  } catch (error) {
    console.error('Create SOS alert error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create SOS alert'
    });
  }
};

/**
 * @desc    Get all SOS alerts (faculty/admin)
 * @route   GET /api/sos
 * @access  Private (Faculty, Admin)
 */
export const getAllSOSAlerts = async (req, res) => {
  try {
    const { status, priority, type, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const alerts = await SOSAlert.find(filter)
      .populate('student', 'firstName lastName email studentId department semester')
      .populate('assignedTo', 'firstName lastName email role')
      .populate('responses.responder', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SOSAlert.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        alerts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get SOS alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SOS alerts'
    });
  }
};

/**
 * @desc    Get single SOS alert
 * @route   GET /api/sos/:id
 * @access  Private
 */
export const getSOSAlert = async (req, res) => {
  try {
    const alert = await SOSAlert.findById(req.params.id)
      .populate('student', 'firstName lastName email studentId department semester phone')
      .populate('assignedTo', 'firstName lastName email role phone')
      .populate('responses.responder', 'firstName lastName role');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    // Check authorization
    const isStudent = alert.student._id.toString() === req.user._id.toString();
    const isAuthorized = ['faculty', 'admin'].includes(req.user.role) || isStudent;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this alert'
      });
    }

    res.status(200).json({
      success: true,
      data: { alert }
    });
  } catch (error) {
    console.error('Get SOS alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SOS alert'
    });
  }
};

/**
 * @desc    Get my SOS alerts (student)
 * @route   GET /api/sos/my-alerts
 * @access  Private (Student)
 */
export const getMySOSAlerts = async (req, res) => {
  try {
    const alerts = await SOSAlert.find({ student: req.user._id })
      .populate('assignedTo', 'firstName lastName email role')
      .populate('responses.responder', 'firstName lastName role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { alerts }
    });
  } catch (error) {
    console.error('Get my SOS alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your alerts'
    });
  }
};

/**
 * @desc    Update SOS alert status
 * @route   PUT /api/sos/:id/status
 * @access  Private (Faculty, Admin)
 */
export const updateSOSStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;

    const alert = await SOSAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    alert.status = status;
    
    if (status === 'resolved') {
      alert.resolvedAt = Date.now();
      alert.resolutionNotes = resolutionNotes;
    }

    await alert.save();
    await alert.populate('student', 'firstName lastName email');
    await alert.populate('assignedTo', 'firstName lastName');

    // Notify student via Socket.IO
    try {
      const io = getIO();
      io.to(`user:${alert.student._id}`).emit('sos:status-update', {
        alertId: alert._id,
        status: alert.status,
        message: `Your SOS alert status updated to: ${status}`
      });
    } catch (socketError) {
      console.error('Socket.IO error:', socketError);
    }

    // Create notification for student
    await Notification.create({
      recipient: alert.student._id,
      type: 'sos-alert',
      title: 'SOS Alert Update',
      message: `Your alert status has been updated to ${status}`,
      relatedEntity: {
        model: 'SOSAlert',
        id: alert._id
      },
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'SOS alert status updated',
      data: { alert }
    });
  } catch (error) {
    console.error('Update SOS status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert status'
    });
  }
};

/**
 * @desc    Assign SOS alert to faculty/admin
 * @route   PUT /api/sos/:id/assign
 * @access  Private (Faculty, Admin)
 */
export const assignSOSAlert = async (req, res) => {
  try {
    const { assignedToId } = req.body;

    const alert = await SOSAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    // Verify assigned user exists and has correct role
    const assignedUser = await User.findById(assignedToId);
    if (!assignedUser || !['faculty', 'admin'].includes(assignedUser.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user for assignment'
      });
    }

    alert.assignedTo = assignedToId;
    alert.status = 'acknowledged';
    await alert.save();

    await alert.populate('student', 'firstName lastName');
    await alert.populate('assignedTo', 'firstName lastName email');

    // Notify assigned user
    try {
      const io = getIO();
      io.to(`user:${assignedToId}`).emit('sos:assigned', {
        alert,
        message: `You've been assigned to handle an SOS alert`
      });
    } catch (socketError) {
      console.error('Socket.IO error:', socketError);
    }

    // Create notification
    await Notification.create({
      recipient: assignedToId,
      type: 'sos-alert',
      title: '🆘 SOS Alert Assigned',
      message: `You've been assigned to handle ${alert.student.firstName}'s SOS alert`,
      relatedEntity: {
        model: 'SOSAlert',
        id: alert._id
      },
      priority: 'urgent'
    });

    res.status(200).json({
      success: true,
      message: 'SOS alert assigned successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Assign SOS alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign alert'
    });
  }
};

/**
 * @desc    Add response to SOS alert
 * @route   POST /api/sos/:id/respond
 * @access  Private (Faculty, Admin)
 */
export const respondToSOS = async (req, res) => {
  try {
    const { message } = req.body;

    const alert = await SOSAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'SOS alert not found'
      });
    }

    alert.responses.push({
      responder: req.user._id,
      message
    });

    if (alert.status === 'pending') {
      alert.status = 'acknowledged';
    }

    await alert.save();
    await alert.populate('student', 'firstName lastName');
    await alert.populate('responses.responder', 'firstName lastName role');

    // Notify student
    try {
      const io = getIO();
      io.to(`user:${alert.student._id}`).emit('sos:response', {
        alertId: alert._id,
        response: alert.responses[alert.responses.length - 1]
      });
    } catch (socketError) {
      console.error('Socket.IO error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Respond to SOS error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
};

/**
 * @desc    Get SOS statistics (admin)
 * @route   GET /api/sos/stats
 * @access  Private (Admin)
 */
export const getSOSStats = async (req, res) => {
  try {
    const total = await SOSAlert.countDocuments();
    const pending = await SOSAlert.countDocuments({ status: 'pending' });
    const resolved = await SOSAlert.countDocuments({ status: 'resolved' });
    const byType = await SOSAlert.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const byPriority = await SOSAlert.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        resolved,
        byType,
        byPriority
      }
    });
  } catch (error) {
    console.error('Get SOS stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};
