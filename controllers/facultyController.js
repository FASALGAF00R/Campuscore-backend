import DeptMessage from '../models/DeptMessage.js';
import User from '../models/User.js';
import GroupChat from '../models/GroupChat.js';
import GroupMessage from '../models/GroupMessage.js';

/**
 * GET /api/faculty/dept-chat?department=xxx&limit=50&before=<iso-date>
 * Fetch chat history for a department (faculty only).
 * Query params:
 *   department – override; defaults to req.user.department
 *   limit      – how many messages (default 50, max 100)
 *   before     – ISO date cursor for pagination (optional)
 */
export const getDeptChatHistory = async (req, res) => {
  try {
    const department = (req.query.department || req.user.department || '').trim();

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const filter = { department };
    if (req.query.before) {
      filter.createdAt = { $lt: new Date(req.query.before) };
    }

    const messages = await DeptMessage.find(filter)
      .populate('sender', 'firstName lastName avatar department')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Return oldest-first so the UI renders naturally
    messages.reverse();

    res.status(200).json({
      success: true,
      data: { messages, department },
    });
  } catch (error) {
    console.error('[facultyController] getDeptChatHistory:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/faculty/dept-chat
 * Save a new department chat message (REST fallback).
 * Body: { content, department? }
 */
export const sendDeptMessage = async (req, res) => {
  try {
    const { content, department: deptOverride } = req.body;
    const department = (deptOverride || req.user.department || '').trim();

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const message = await DeptMessage.create({
      department,
      sender: req.user._id,
      content: content.trim(),
    });

    const populated = await DeptMessage.findById(message._id)
      .populate('sender', 'firstName lastName avatar department')
      .lean();

    res.status(201).json({ success: true, data: { message: populated } });
  } catch (error) {
    console.error('[facultyController] sendDeptMessage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/faculty/dept-members
 * List all faculty teachers in a given department.
 * Query: department (optional; defaults to logged-in user's dept)
 */
export const getDeptMembers = async (req, res) => {
  try {
    const department = (req.query.department || req.user.department || '').trim();

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    const members = await User.find({
      role: 'faculty',
      department,
      isActive: true,
      isApproved: true,
    })
      .select('firstName lastName avatar designation department')
      .sort({ firstName: 1 })
      .lean();

    res.status(200).json({ success: true, data: { members, department } });
  } catch (error) {
    console.error('[facultyController] getDeptMembers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/faculty/groups
 * Create a new custom group chat.
 * Body: { name, members (array of IDs) }
 */
export const createGroupChat = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    // Ensure the creator is included in the members list
    const memberIds = Array.isArray(members)
      ? [...new Set([...members, req.user._id.toString()])]
      : [req.user._id];

    const group = await GroupChat.create({
      name: name.trim(),
      creator: req.user._id,
      department: req.user.department,
      members: memberIds,
    });

    const populatedGroup = await GroupChat.findById(group._id)
      .populate('members', 'firstName lastName avatar role department')
      .populate('creator', 'firstName lastName')
      .lean();

    res.status(201).json({ success: true, data: { group: populatedGroup } });
  } catch (error) {
    console.error('[facultyController] createGroupChat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/faculty/groups
 * Get all group chats the user is a member of.
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[facultyController] Fetching groups for user: ${userId} (${req.user.role})`);

    const groups = await GroupChat.find({
      members: userId,
    })
      .populate('members', 'firstName lastName avatar role')
      .populate('creator', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: { groups } });
  } catch (error) {
    console.error('[facultyController] getMyGroups error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/faculty/groups/:groupId/messages
 * Fetch messages for a specific group.
 */
export const getGroupChatHistory = async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verify membership and fetch group details with members populated
    const group = await GroupChat.findOne({ _id: groupId, members: req.user._id })
      .populate('members', 'firstName lastName avatar role')
      .populate('creator', 'firstName lastName')
      .lean();

    if (!group) {
      return res.status(403).json({ success: false, message: 'Access denied or group not found' });
    }

    const filter = { group: groupId };
    if (req.query.before) {
      filter.createdAt = { $lt: new Date(req.query.before) };
    }

    const messages = await GroupMessage.find(filter)
      .populate('sender', 'firstName lastName avatar role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    res.status(200).json({ success: true, data: { messages, group } });
  } catch (error) {
    console.error('[facultyController] getGroupChatHistory:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/faculty/eligible-students
 * List all students in the teacher's department for group adding.
 */
export const getDeptStudents = async (req, res) => {
  try {
    const department = req.user.department;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Faculty department not identified' });
    }

    const students = await User.find({
      role: 'student',
      department: { $regex: new RegExp(`^${department}$`, 'i') },
      isActive: true,
    })
      .select('firstName lastName avatar studentId email department')
      .sort({ firstName: 1 })
      .lean();

    res.status(200).json({ success: true, data: { students } });
  } catch (error) {
    console.error('[facultyController] getDeptStudents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/faculty/groups/:groupId/members
 * Add members to a group chat (Creator only).
 */
export const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body; // Array of IDs

    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ success: false, message: 'Members list is required' });
    }

    const group = await GroupChat.findOne({ _id: groupId, creator: req.user._id });
    if (!group) {
      return res.status(403).json({ success: false, message: 'Only the creator can add members' });
    }

    // Add unique members
    const newMembers = [...new Set([...group.members.map((m) => m.toString()), ...members])];
    group.members = newMembers;
    await group.save();

    const populatedGroup = await GroupChat.findById(groupId)
      .populate('members', 'firstName lastName avatar role')
      .populate('creator', 'firstName lastName')
      .lean();

    res.status(200).json({ success: true, data: { group: populatedGroup } });
  } catch (error) {
    console.error('[facultyController] addGroupMembers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/faculty/groups/:groupId/members/:userId
 * Remove a member from a group chat (Creator only).
 */
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await GroupChat.findOne({ _id: groupId, creator: req.user._id });
    if (!group) {
      return res
        .status(403)
        .json({ success: false, message: 'Only the creator can remove members' });
    }

    if (userId === group.creator.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove the creator' });
    }

    group.members = group.members.filter((m) => m.toString() !== userId);
    await group.save();

    const populatedGroup = await GroupChat.findById(groupId)
      .populate('members', 'firstName lastName avatar role')
      .populate('creator', 'firstName lastName')
      .lean();

    res.status(200).json({ success: true, data: { group: populatedGroup } });
  } catch (error) {
    console.error('[facultyController] removeGroupMember:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/faculty/groups/upload
 * Generic chat image upload. Returns relative path.
 */
export const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const relativePath = `/uploads/chat/${req.file.filename}`;
    res.status(200).json({ success: true, data: { url: relativePath } });
  } catch (error) {
    console.error('[facultyController] uploadChatFile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
