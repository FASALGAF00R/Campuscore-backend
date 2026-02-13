import StudyMaterial from '../models/StudyMaterial.js';
import Notification from '../models/Notification.js';
import fs from 'fs';

/**
 * @desc    Upload study material
 * @route   POST /api/study-materials
 * @access  Private (Student, Faculty)
 */
export const uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { title, description, subject, department, semester, category, tags } = req.body;

    const material = await StudyMaterial.create({
      title,
      description,
      subject,
      department,
      semester,
      category,
      tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
      uploadedBy: req.user._id,
      uploaderRole: req.user.role,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    await material.populate('uploadedBy', 'firstName lastName email role');

    res.status(201).json({
      success: true,
      message: 'Study material uploaded successfully',
      data: { material },
    });
  } catch (error) {
    console.error('Upload material error:', error);
    // Delete uploaded file if database save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload material',
    });
  }
};

/**
 * @desc    Get all study materials
 * @route   GET /api/study-materials
 * @access  Private
 */
export const getAllMaterials = async (req, res) => {
  try {
    const { department, semester, subject, category, isVerified, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (subject) filter.subject = subject;
    if (category) filter.category = category;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    const materials = await StudyMaterial.find(filter)
      .populate('uploadedBy', 'firstName lastName role')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await StudyMaterial.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        materials,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
    });
  }
};

/**
 * @desc    Get single study material
 * @route   GET /api/study-materials/:id
 * @access  Private
 */
export const getMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material',
    });
  }
};

/**
 * @desc    Download study material
 * @route   GET /api/study-materials/:id/download
 * @access  Private
 */
export const downloadMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    // Check if file exists
    if (!fs.existsSync(material.file.path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server',
      });
    }

    // Increment download count
    material.downloads += 1;
    await material.save();

    // Send file
    res.download(material.file.path, material.file.originalName);
  } catch (error) {
    console.error('Download material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download material',
    });
  }
};

/**
 * @desc    Verify study material (faculty/admin)
 * @route   PUT /api/study-materials/:id/verify
 * @access  Private (Faculty, Admin)
 */
export const verifyMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    material.isVerified = true;
    material.verifiedBy = req.user._id;
    material.verifiedAt = Date.now();
    await material.save();

    await material.populate('uploadedBy', 'firstName lastName');

    // Notify uploader
    await Notification.create({
      recipient: material.uploadedBy._id,
      type: 'study-material',
      title: '✅ Study Material Verified',
      message: `Your material "${material.title}" has been verified`,
      relatedEntity: {
        model: 'StudyMaterial',
        id: material._id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Material verified successfully',
      data: { material },
    });
  } catch (error) {
    console.error('Verify material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify material',
    });
  }
};

/**
 * @desc    Delete study material
 * @route   DELETE /api/study-materials/:id
 * @access  Private (Owner, Admin)
 */
export const deleteMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    // Check authorization (owner or admin)
    const isOwner = material.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this material',
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(material.file.path)) {
      fs.unlinkSync(material.file.path);
    }

    await material.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete material',
    });
  }
};

/**
 * @desc    Get my uploaded materials
 * @route   GET /api/study-materials/my-uploads
 * @access  Private
 */
export const getMyUploads = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ uploadedBy: req.user._id })
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { materials },
    });
  } catch (error) {
    console.error('Get my uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your materials',
    });
  }
};
