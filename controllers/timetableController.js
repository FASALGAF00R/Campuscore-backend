import Timetable from '../models/Timetable.js';

// Create timetable
export const createTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.create(req.body);
    res.status(201).json({ success: true, data: { timetable } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my timetable
export const getMyTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({
      department: req.user.department,
      semester: req.user.semester,
      section: req.user.section,
    });
    res.status(200).json({ success: true, data: { timetable } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get today's classes
export const getTodayClasses = async (req, res) => {
  try {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const timetable = await Timetable.findOne({
      department: req.user.department,
      semester: req.user.semester,
      section: req.user.section,
    });

    const todayClasses = timetable ? timetable.schedule.filter((s) => s.day === day) : [];
    res.status(200).json({ success: true, data: { classes: todayClasses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get student timetable
export const getStudentTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    res.status(200).json({ success: true, data: { timetable } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update timetable
export const updateTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: { timetable } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete timetable
export const deleteTimetable = async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Timetable deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all timetables
export const getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find();
    res.status(200).json({ success: true, data: { timetables } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
