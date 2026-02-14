import HelpRequest from '../models/HelpRequest.js';

// Create Help Request
export const createHelpRequest = async (req, res) => {
  console.log(` [HELP_REQUEST] New Attempt by ${req.user.role} (${req.user.email})`);
  try {
    const { staffId, title, description, priority, consent, category, preferredDate } = req.body;

    if (!consent || consent === 'false') {
      console.warn(' [HELP_REQUEST] Validation Failed: Consent required');
      return res
        .status(400)
        .json({ success: false, message: 'Please confirm that the information is correct' });
    }

    if (!staffId) {
      console.warn(' [HELP_REQUEST] Validation Failed: Staff ID missing');
      return res.status(400).json({ success: false, message: 'Assigned staff is required' });
    }

    const attachments = req.files
      ? req.files.map((file) => `/uploads/help-requests/${file.filename}`)
      : [];

    const helpRequest = await HelpRequest.create({
      student: req.user._id,
      staff: staffId,
      category: category || 'Student Support',
      title,
      description,
      priority: priority || 'Medium',
      preferredDate: preferredDate || null,
      consent: consent === 'true' || consent === true,
      attachments,
    });

    console.log(' [HELP_REQUEST] Saved successfully:', helpRequest._id);

    res.status(201).json({
      success: true,
      message: 'Help request submitted successfully',
      data: helpRequest,
    });
  } catch (error) {
    console.error(' [HELP_REQUEST] Critical Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Help Requests for current user (either student or staff)
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    console.log(`[MY_REQUESTS] Fetch attempt by ${userRole} (${req.user.email})`);

    let query = {};
    if (userRole === 'student') {
      query = { student: userId };
    } else if (userRole === 'staff') {
      // Staff sees requests assigned to them
      query = { staff: userId };
      console.log(`[DEBUG] Staff query: assigned to ${userId}`);
    } else if (userRole === 'admin') {
      // Admin sees everything
      query = {};
      console.log('[DEBUG] Admin query: all records');
    } else {
      console.warn(`[AUTH_FAIL] Role ${userRole} denied for getMyRequests`);
      return res.status(403).json({ success: false, message: 'Unauthorized profile type' });
    }

    const requests = await HelpRequest.find(query)
      .populate('student', 'firstName lastName studentId email avatar phone')
      .populate('staff', 'firstName lastName category email phone')
      .sort({ createdAt: -1 });

    console.log(`[SUCCESS] Returned ${requests.length} results for ${userRole}`);

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('[CRITICAL] getMyRequests Failure:', error);
    res
      .status(500)
      .json({ success: false, message: 'Internal Operations Failure: ' + error.message });
  }
};

// Update Help Request Status
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Manual role check since we removed 'authorize' from route to debug
    if (!['staff', 'admin'].includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: 'Only staff and admin can update status' });
    }

    const request = await HelpRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only staff assigned or admin can update status
    if (request.staff.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    request.status = status;
    if (req.body.staffMessage) request.staffMessage = req.body.staffMessage;
    if (req.body.staffContact) request.staffContact = req.body.staffContact;
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
