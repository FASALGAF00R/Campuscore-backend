import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure directories exist
const folders = ['uploads/events', 'uploads/materials', 'uploads/profiles'];
folders.forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
});

// Generic storage
const genericStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder based on route or fieldname
    if (req.originalUrl.includes('/events')) {
      cb(null, 'uploads/events');
    } else if (req.originalUrl.includes('/study-materials')) {
      cb(null, 'uploads/materials');
    } else {
      cb(null, 'uploads');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  if (allowedImageTypes.includes(file.mimetype) || allowedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Protocol rejected.'), false);
  }
};

// Generic upload middleware (Default Export)
const upload = multer({
  storage: genericStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Named export for event-specific if needed (though generic handles it now)
export const uploadEventImage = upload;

export default upload;
