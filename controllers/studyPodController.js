import StudyPod from '../models/StudyPod.js';

// Create study pod
export const createStudyPod = async (req, res) => {
  try {
    const { name, description, subject, subjectCode, department, semester, maxMembers, isPrivate } =
      req.body;

    const podId = await StudyPod.generatePodId(department, new Date().getFullYear());

    const pod = await StudyPod.create({
      podId,
      name,
      description,
      subject,
      subjectCode,
      department,
      semester,
      faculty: req.user.role === 'faculty' ? req.user._id : undefined,
      maxMembers,
      isPrivate,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    await pod.populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, message: 'Study pod created', data: { pod } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all study pods
export const getAllStudyPods = async (req, res) => {
  try {
    const { department, semester, subject, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (subject) filter.subject = subject;

    const pods = await StudyPod.find(filter)
      .populate('faculty', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await StudyPod.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: { pods, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Join study pod
export const joinStudyPod = async (req, res) => {
  try {
    const pod = await StudyPod.findById(req.params.id);

    if (!pod) {
      return res.status(404).json({ success: false, message: 'Pod not found' });
    }

    if (pod.members.some((m) => m.user.toString() === req.user._id.toString())) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    if (pod.members.length >= pod.maxMembers) {
      return res.status(400).json({ success: false, message: 'Pod is full' });
    }

    pod.members.push({ user: req.user._id });
    await pod.save();

    res.status(200).json({ success: true, message: 'Joined pod successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
