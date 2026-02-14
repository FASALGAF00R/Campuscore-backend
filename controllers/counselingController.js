import CounselingRequest from '../models/CounselingRequest.js';
import CounselingMessage from '../models/CounselingMessage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

// Create counseling request
export const createCounselingRequest = async (req, res) => {
  try {
    const { category, title, description, isAnonymous, priority } = req.body;

    const request = await CounselingRequest.create({
      student: req.user._id,
      category,
      title,
      description, // Will be encrypted on frontend if anonymous
      isAnonymous: isAnonymous || false,
      priority: priority || 'medium',
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
      .populate(
        'student',
        req.user.role === 'counselor' ? 'firstName lastName email -isAnonymous' : ''
      )
      .populate('counselor', 'firstName lastName')
      .sort({ createdAt: -1 });

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

// Reject counseling request
export const rejectRequest = async (req, res) => {
  try {
    const request = await CounselingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'rejected';
    await request.save();

    // Notify student
    await Notification.create({
      recipient: request.student,
      type: 'counseling-request',
      title: 'Counseling Request Rejected',
      message: 'Your counseling request has been rejected',
      relatedEntity: { model: 'CounselingRequest', id: request._id },
    });

    res.status(200).json({ success: true, message: 'Request rejected', data: { request } });
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
      isActive: true, // Only active
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
