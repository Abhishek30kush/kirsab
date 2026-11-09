/**
 * KIRSAB Cloudinary Image Storage Utility
 * -----------------------------------------
 * Handles all product image uploads, replacements, and deletions via Cloudinary.
 * Credentials are NEVER exposed to clients — all operations run server-side only.
 *
 * Required environment variables (server/.env):
 *   CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   CLOUDINARY_API_KEY=your_api_key
 *   CLOUDINARY_API_SECRET=your_api_secret
 */

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Max file size: 5 MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Allowed file extensions (secondary check)
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Cloudinary folder for all KIRSAB product images
const KIRSAB_FOLDER = 'kirsab/products';

/**
 * Check if Cloudinary credentials are configured
 */
export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
  );
};

/**
 * Configure Cloudinary (called once)
 */
export const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    console.warn(
      '⚠️  Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in server/.env'
    );
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return true;
};

/**
 * Validate file buffer — checks file signature (magic bytes) for genuine MIME type
 * This is more secure than trusting file extension or Content-Type header alone.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType - as reported by multer
 * @returns {{ valid: boolean, reason?: string }}
 */
export const validateImageBuffer = (buffer, mimeType) => {
  if (!buffer || buffer.length === 0) {
    return { valid: false, reason: 'Empty file received' };
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      reason: `File too large (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Maximum allowed: 5 MB`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      reason: `Invalid file type "${mimeType}". Allowed: JPG, PNG, WebP`,
    };
  }

  // Check file magic bytes (file signature)
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const webp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50;  // P

  const isValidSignature = jpeg || png || webp;

  if (!isValidSignature) {
    return {
      valid: false,
      reason: 'File signature does not match declared type. Upload a genuine JPG, PNG, or WebP image.',
    };
  }

  // Cross-check: MIME vs magic bytes
  if (mimeType === 'image/webp' && !webp) {
    return { valid: false, reason: 'File claims to be WebP but is not a valid WebP image.' };
  }
  if ((mimeType === 'image/jpeg' || mimeType === 'image/jpg') && !jpeg) {
    return { valid: false, reason: 'File claims to be JPEG but is not a valid JPEG image.' };
  }
  if (mimeType === 'image/png' && !png) {
    return { valid: false, reason: 'File claims to be PNG but is not a valid PNG image.' };
  }

  return { valid: true };
};

/**
 * Upload a product image buffer to Cloudinary.
 * Images are stored under kirsab/products/{productId}
 * and automatically optimized (quality auto, format auto → WebP when supported).
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} productId - Used to generate a stable public_id
 * @param {string} [existingPublicId] - If provided, replaces (overwrites) this asset
 * @returns {Promise<{ url: string, publicId: string, provider: 'cloudinary' }>}
 */
export const uploadProductImageToCloudinary = async (buffer, productId, existingPublicId = null) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured on the server. Please contact the administrator.');
  }

  // If we have an existing Cloudinary-managed image, use the same public_id to overwrite it
  const publicId = existingPublicId || `${KIRSAB_FOLDER}/${productId}-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: existingPublicId ? undefined : KIRSAB_FOLDER, // Don't re-append folder if public_id already includes it
        overwrite: true,
        // Optimization: auto quality and auto format (Cloudinary delivers WebP/AVIF where supported)
        quality: 'auto:good',
        fetch_format: 'auto',
        // Resize oversized images to max 800×800 while keeping aspect ratio
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
        ],
        resource_type: 'image',
        // Tag for easy management
        tags: ['kirsab', 'product', productId],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(`Image upload failed: ${error.message}`));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary',
        });
      }
    );

    // Stream the buffer into the upload stream
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Delete a product image from Cloudinary.
 * Only called when it's a Cloudinary-managed image (provider === 'cloudinary').
 * Never deletes external URLs that KIRSAB doesn't own.
 *
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<boolean>} true if deleted, false if not found
 */
export const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return result.result === 'ok';
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    return false;
  }
};
