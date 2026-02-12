import EmergencyAssist from '../models/EmergencyAssist.js';
import { getIO } from '../config/socket.js';

// Create emergency assist request
export const createEmergencyAssist = async (req, res) => {
  try {
    const { type, description, location, priority } = req.body;
    const request = await EmergencyAssist.create({
      student: req.user._id,
      type,
      description,
      location,
      priority: priority || 'medium',
    });

    // Notify staff/admin
    try {
      const io = getIO();
      io.to('staff').to('admin').emit('emergency:new-request', { request });
    } catch (err) {
      console.error('Socket error:', err.message);
    }

    res.status(201).json({ success: true, data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all requests
export const getAllRequests = async (req, res) => {
  try {
    const requests = await EmergencyAssist.find()
      .populate('student', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single request
export const getRequest = async (req, res) => {
  try {
    const request = await EmergencyAssist.findById(req.params.id).populate('student assignedTo');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my requests
export const getMyRequests = async (req, res) => {
  try {
    const requests = await EmergencyAssist.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get assigned requests
export const getAssignedRequests = async (req, res) => {
  try {
    const requests = await EmergencyAssist.find({ assignedTo: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign request
export const assignRequest = async (req, res) => {
  try {
    const request = await EmergencyAssist.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: req.body.staffId || req.user._id,
        status: 'assigned',
      },
      { new: true }
    );
    res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update request status
export const updateRequestStatus = async (req, res) => {
  try {
    const request = await EmergencyAssist.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
      },
      { new: true }
    );
    res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject emergency assist request
export const rejectRequest = async (req, res) => {
  try {
    const request = await EmergencyAssist.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.status(200).json({ success: true, message: 'Request cancelled', data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add message
export const addMessage = async (req, res) => {
  try {
    const request = await EmergencyAssist.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.messages.push({
      sender: req.user._id,
      content: req.body.content,
    });
    await request.save();
    res.status(201).json({ success: true, data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Rate assistance
export const rateAssistance = async (req, res) => {
  try {
    const request = await EmergencyAssist.findByIdAndUpdate(
      req.params.id,
      {
        rating: req.body.rating,
        feedback: req.body.feedback,
      },
      { new: true }
    );
    res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
