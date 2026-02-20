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
    const {
      title,
      description,
      subject,
      department,
      semester,
      category,
      tags,
      resourceType,
      videoUrl,
      externalLinks,
      podId,
    } = req.body;

    const attachments = (req.files || []).map((file) => ({
      filename: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    }));

    const updateData = {
      title,
      description,
      subject,
      department,
      semester: semester ? parseInt(semester) : undefined,
      category,
      resourceType: resourceType || 'document',
      videoUrl,
      tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
      uploadedBy: req.user._id,
      uploaderRole: req.user.role,
      podId,
      attachments,
    };

    if (externalLinks) {
      try {
        updateData.externalLinks = JSON.parse(externalLinks);
      } catch (e) {
        console.warn('Failed to parse externalLinks:', e);
      }
    }

    // Main file mapping for backward compatibility
    if (attachments.length > 0) {
      updateData.filename = attachments[0].filename;
      updateData.filePath = attachments[0].path;
      updateData.fileSize = attachments[0].size;
      updateData.mimeType = attachments[0].mimetype;
    }

    const material = await StudyMaterial.create(updateData);

    await material.populate('uploadedBy', 'firstName lastName email role');

    res.status(201).json({
      success: true,
      message: 'Study material uploaded successfully',
      data: { material },
    });
  } catch (error) {
    console.error('Upload material error:', error);
    // Delete uploaded files if database save fails
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
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
    const { id, fileIndex = 0 } = req.params;
    const material = await StudyMaterial.findById(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    let filePath, originalName;

    if (material.attachments && material.attachments.length > 0) {
      const index = parseInt(fileIndex);
      if (index >= 0 && index < material.attachments.length) {
        filePath = material.attachments[index].path;
        originalName = material.attachments[index].filename;
      }
    }

    // Fallback to legacy fields if attachments not found or index invalid
    if (!filePath) {
      filePath = material.filePath;
      originalName = material.filename;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server',
      });
    }

    // Increment download count
    material.downloads += 1;
    await material.save();

    res.download(filePath, originalName);
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

    // Delete all attachments from filesystem
    if (material.attachments && material.attachments.length > 0) {
      material.attachments.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    } else if (material.filePath && fs.existsSync(material.filePath)) {
      // Fallback for legacy single file
      fs.unlinkSync(material.filePath);
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
 * @desc    Update study material
 * @route   PUT /api/study-materials/:id
 * @access  Private (Owner, Admin)
 */
export const updateMaterial = async (req, res) => {
  try {
    let material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    // Check authorization
    const isOwner = material.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this material',
      });
    }

    const {
      title,
      description,
      subject,
      department,
      semester,
      category,
      tags,
      resourceType,
      videoUrl,
      externalLinks,
    } = req.body;

    const updateData = {
      title: title || material.title,
      description: description || material.description,
      subject: subject || material.subject,
      department: department || material.department,
      semester: semester ? parseInt(semester) : material.semester,
      category: category || material.category,
      resourceType: resourceType || material.resourceType,
      videoUrl: videoUrl !== undefined ? videoUrl : material.videoUrl,
      tags: tags ? tags.split(',').map((tag) => tag.trim()) : material.tags,
    };

    if (externalLinks) {
      try {
        updateData.externalLinks = JSON.parse(externalLinks);
      } catch (e) {
        console.warn('Failed to parse externalLinks:', e);
      }
    }

    // Handle new file uploads
    if (req.files && req.files.length > 0) {
      // Delete old files
      if (material.attachments && material.attachments.length > 0) {
        material.attachments.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      const attachments = req.files.map((file) => ({
        filename: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      }));

      updateData.attachments = attachments;
      updateData.filename = attachments[0].filename;
      updateData.filePath = attachments[0].path;
      updateData.fileSize = attachments[0].size;
      updateData.mimeType = attachments[0].mimetype;
    }

    material = await StudyMaterial.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('uploadedBy', 'firstName lastName role');

    res.status(200).json({
      success: true,
      message: 'Material updated successfully',
      data: { material },
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update material',
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
