import CounselingRequest from '../models/CounselingRequest.js';
import CounselingMessage from '../models/CounselingMessage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

// Create counseling request
export const createCounselingRequest = async (req, res) => {
  try {
    const {
      category,
      title,
      description,
      isAnonymous,
      priority,
      preferredMode,
      preferredCounselor,
      hadPreviousCounseling,
      preferredSlot,
    } = req.body;

    const request = await CounselingRequest.create({
      student: req.user._id,
      category,
      title,
      description,
      isAnonymous: isAnonymous || false,
      priority: priority || 'medium',
      preferredMode: preferredMode || 'either',
      preferredCounselor,
      hadPreviousCounseling: hadPreviousCounseling || false,
      preferredSlot,
    });

    // Broadcast to counselors
    try {
      const io = getIO();
      io.to('counselor')
        .to('admin')
        .emit('counseling:new-request', {
          request,
          message: isAnonymous
            ? 'New anonymous counseling request'
            : `New request from ${req.user.firstName}`,
        });
    } catch (error) {
      console.error('Socket.IO error:', error);
    }

    res.status(201).json({ success: true, message: 'Request submitted', data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get counseling requests (counselor)
export const getCounselingRequests = async (req, res) => {
  try {
    const { status, category } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const requests = await CounselingRequest.find(filter)
      .populate('student', 'firstName lastName email phone department semester studentId avatar')
      .populate('counselor', 'firstName lastName')
      .populate('preferredCounselor', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get student's own counseling requests
export const getMyCounselingRequests = async (req, res) => {
  try {
    const requests = await CounselingRequest.find({ student: req.user._id })
      .populate('counselor', 'firstName lastName email specialization qualification avatar')
      .populate('preferredCounselor', 'firstName lastName')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Accept counseling request
export const acceptRequest = async (req, res) => {
  try {
    const request = await CounselingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.counselor = req.user._id;
    request.status = 'accepted';
    request.acceptedAt = Date.now();
    await request.save();

    // Notify student
    await Notification.create({
      recipient: request.student,
      type: 'counseling-request',
      title: 'Counseling Request Accepted',
      message: 'Your counseling request has been accepted',
      relatedEntity: { model: 'CounselingRequest', id: request._id },
    });

    res.status(200).json({ success: true, message: 'Request accepted', data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manage/Update counseling request (Counselor only)
export const manageRequest = async (req, res) => {
  try {
    const {
      status,
      assignedSlot,
      location,
      meetingLink,
      internalNotes,
      counselorResponse,
      declineReason,
    } = req.body;
    const request = await CounselingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Ensure only the assigned counselor or an admin can manage the request if it's already assigned
    if (
      request.counselor &&
      request.counselor.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to manage this request' });
    }

    if (status) {
      request.status = status;
      if (status === 'accepted' && !request.counselor) {
        request.counselor = req.user._id;
        request.acceptedAt = Date.now();
      }
      if (status === 'completed') request.completedAt = Date.now();
      if (status === 'in-session' && !request.sessionStartedAt)
        request.sessionStartedAt = Date.now();
    }

    if (assignedSlot) request.assignedSlot = assignedSlot;
    if (location) request.location = location;
    if (meetingLink) request.meetingLink = meetingLink;
    if (internalNotes) request.internalNotes = internalNotes;
    if (counselorResponse) {
      console.log('[MANAGE REQUEST] Saving counselorResponse:', counselorResponse);
      request.counselorResponse = counselorResponse;
    }
    if (declineReason) request.declineReason = declineReason;

    console.log('[MANAGE REQUEST] Request before save:', {
      id: request._id,
      counselorResponse: request.counselorResponse,
      status: request.status,
    });

    await request.save();

    console.log('[MANAGE REQUEST] Request after save:', {
      id: request._id,
      counselorResponse: request.counselorResponse,
      status: request.status,
    });

    // Notify student if status changed or session details updated
    if (status || assignedSlot || location || meetingLink || counselorResponse) {
      await Notification.create({
        recipient: request.student,
        type: 'counseling-request',
        title: `Counseling Request Updated`,
        message: `Your counseling request status is now: ${status || request.status}`,
        relatedEntity: { model: 'CounselingRequest', id: request._id },
      });
    }

    res.status(200).json({ success: true, message: 'Request updated', data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject counseling request
export const rejectRequest = async (req, res) => {
  try {
    const request = await CounselingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'declined';
    await request.save();

    // Notify student
    await Notification.create({
      recipient: request.student,
      type: 'counseling-request',
      title: 'Counseling Request Declined',
      message: 'Your counseling request has been declined',
      relatedEntity: { model: 'CounselingRequest', id: request._id },
    });

    res.status(200).json({ success: true, message: 'Request declined', data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send counseling message
export const sendMessage = async (req, res) => {
  try {
    const { content, isEncrypted, encryptedContent } = req.body;

    const message = await CounselingMessage.create({
      requestId: req.params.id,
      sender: req.user._id,
      senderRole: req.user.role === 'counselor' ? 'counselor' : 'student',
      plainContent: content,
      encryptedContent,
      isEncrypted: isEncrypted || false,
    });

    res.status(201).json({ success: true, data: { message } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get counseling messages
export const getMessages = async (req, res) => {
  try {
    const messages = await CounselingMessage.find({ requestId: req.params.id })
      .populate('sender', 'firstName lastName role')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: { messages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get public list of counselors
export const getPublicCounselors = async (req, res) => {
  try {
    const counselors = await User.find({
      role: 'counselor',
      isActive: true,
      isVerified: true,
      isApproved: true,
    })
      .select(
        'firstName lastName email qualification specialization experience bio availability counselingMode maxStudentsPerDay'
      )
      .sort({ firstName: 1 });

    res.status(200).json({ success: true, data: { counselors } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get availability/timeslots for a specific counselor
export const getCounselorAvailability = async (req, res) => {
  try {
    const counselor = await User.findById(req.params.id).select(
      'firstName lastName availability maxStudentsPerDay'
    );

    if (!counselor || counselor.role !== 'counselor') {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }

    // Optionally check for scheduled requests today to show "Busy" slots
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const requestsToday = await CounselingRequest.countDocuments({
      preferredCounselor: req.params.id,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'accepted', 'in-session'] },
    });

    res.status(200).json({
      success: true,
      data: {
        availability: counselor.availability,
        isBusy: requestsToday >= (counselor.maxStudentsPerDay || 5),
        requestsToday,
        maxStudentsPerDay: counselor.maxStudentsPerDay || 5,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
