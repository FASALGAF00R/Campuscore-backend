import Event from '../models/Event.js';

// Create event
export const createEvent = async (req, res) => {
  try {
    const eventData = { ...req.body, organizer: req.user._id };

    if (req.file) {
      eventData.image = `/uploads/events/${req.file.filename}`;
    }

    if (req.body.maxParticipants) {
      eventData.maxParticipants = parseInt(req.body.maxParticipants);
    }

    const event = await Event.create(eventData);
    await event.populate('organizer', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const { status, category, department, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (department) filter.department = department;

    const events = await Event.find(filter)
      .populate('organizer', 'firstName lastName email')
      .sort({ startDate: 1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single event
export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email')
      .populate('registeredParticipants', 'firstName lastName email studentId');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({ success: true, data: { event } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = `/uploads/events/${req.file.filename}`;
    }

    if (req.body.maxParticipants) {
      updateData.maxParticipants = parseInt(req.body.maxParticipants);
    }

    const event = await Event.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({ success: true, data: { event } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check ownership/permissions
    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register for event
export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.registeredParticipants.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already registered' });
    }

    if (event.maxParticipants && event.registeredParticipants.length >= event.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Event is full' });
    }

    event.registeredParticipants.push(req.user._id);
    await event.save();

    res.status(200).json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unregister from event
export const unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    event.registeredParticipants = event.registeredParticipants.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await event.save();

    res.status(200).json({ success: true, message: 'Unregistered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upcoming events
export const getUpcomingEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: 'published',
      startDate: { $gte: new Date() },
    })
      .populate('organizer', 'firstName lastName')
      .sort({ startDate: 1 })
      .limit(10);

    res.status(200).json({ success: true, data: { events } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
