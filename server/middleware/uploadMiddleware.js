/**
 * KIRSAB Multer Upload Middleware
 * ---------------------------------
 * Accepts multipart/form-data image uploads into memory (never touches local disk).
 * Validates file type and size before the buffer reaches the controller.
 */

import multer from 'multer';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '../utils/cloudinary.js';

// Store in memory — no local filesystem dependency
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type "${file.mimetype}". Only JPG, PNG, and WebP images are accepted.`
      ),
      false
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES, // 5 MB
    files: 1,
  },
  fileFilter,
});

/**
 * Single product image upload — field name: "image"
 */
export const uploadSingleImage = uploadMiddleware.single('image');

/**
 * Express error handler for multer errors — wrap this around routes that use uploadSingleImage
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'फ़ाइल बहुत बड़ी है। अधिकतम 5 MB की इमेज अपलोड करें। (File too large. Maximum 5 MB allowed.)',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid file upload',
    });
  }

  next();
};
