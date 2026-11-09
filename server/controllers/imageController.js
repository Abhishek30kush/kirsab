/**
 * KIRSAB Product Image Controller
 * ----------------------------------
 * Admin-only endpoints for uploading, replacing, and removing product images.
 * All operations are authenticated (requireAdmin middleware applied at route level).
 *
 * Endpoints:
 *   POST   /api/products/admin/:id/image        → Upload/replace image from device
 *   PATCH  /api/products/admin/:id/image-url    → Set image from external URL
 *   DELETE /api/products/admin/:id/image        → Remove image (reset to fallback)
 */

import { prisma } from '../config/db.js';
import { broadcastCatalogUpdated } from '../socket.js';
import {
  uploadProductImageToCloudinary,
  deleteImageFromCloudinary,
  validateImageBuffer,
  isCloudinaryConfigured,
} from '../utils/cloudinary.js';

// Default fallback image when no image is set
const DEFAULT_FALLBACK_IMAGE = '';

/**
 * POST /api/products/admin/:id/image
 *
 * Upload an image file from device (gallery/camera/file picker).
 * Accepts multipart/form-data with field "image".
 * Uses Cloudinary for persistent cloud storage.
 *
 * Rules:
 * - If the product already has a Cloudinary image, it is REPLACED (old one deleted after success).
 * - If the product has an external URL, the external URL is replaced by the new Cloudinary URL.
 * - If upload fails, the existing image is NEVER touched.
 */
export const uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          'Image upload service is not configured. Please add Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) to server/.env and restart the server.',
        setupRequired: true,
      });
    }

    // Fetch the product
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        nameEn: true,
        image: true,
        imageStorageKey: true,
        imageProvider: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Multer already placed the file in req.file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'कोई इमेज फ़ाइल नहीं मिली। कृपया "image" फ़ील्ड में फ़ाइल भेजें। (No image file received)',
      });
    }

    const { buffer, mimetype, size } = req.file;

    // Deep validation: check file signature (magic bytes)
    const validation = validateImageBuffer(buffer, mimetype);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
      });
    }

    // --- UPLOAD to Cloudinary ---
    // If the product already has a Cloudinary-managed image, overwrite it in-place (same public_id)
    const existingPublicId =
      product.imageProvider === 'cloudinary' && product.imageStorageKey
        ? product.imageStorageKey
        : null;

    let uploadResult;
    try {
      uploadResult = await uploadProductImageToCloudinary(buffer, id, existingPublicId);
    } catch (uploadError) {
      console.error(`Image upload to Cloudinary failed for product ${id}:`, uploadError);
      return res.status(502).json({
        success: false,
        message: `इमेज अपलोड विफल हुई। पुरानी इमेज सुरक्षित है। (Upload failed — existing image preserved. ${uploadError.message})`,
      });
    }

    // --- Upload SUCCESS: now update the database ---
    const updated = await prisma.product.update({
      where: { id },
      data: {
        image: uploadResult.url,
        imageStorageKey: uploadResult.publicId,
        imageProvider: 'cloudinary',
        imageUpdatedAt: new Date(),
      },
      include: { category: true },
    });

    // --- Optionally delete old Cloudinary image if it was different ---
    // (If existingPublicId is set, we overwrote in-place, so no separate deletion needed)
    // If the old image was a different Cloudinary asset that couldn't be overwritten, clean it up:
    if (
      product.imageProvider === 'cloudinary' &&
      product.imageStorageKey &&
      product.imageStorageKey !== uploadResult.publicId
    ) {
      // Best-effort delete, do not block response
      deleteImageFromCloudinary(product.imageStorageKey).catch((err) =>
        console.warn('Could not delete old Cloudinary image:', err)
      );
    }

    // Broadcast to all connected clients so the new image appears instantly
    broadcastCatalogUpdated({
      action: 'image_updated',
      productId: updated.id,
      image: updated.image,
      imageProvider: updated.imageProvider,
      product: updated,
    });

    return res.json({
      success: true,
      message: `✅ इमेज सफलतापूर्वक अपलोड और सहेजी गई (Image uploaded and saved permanently)`,
      data: {
        imageUrl: updated.image,
        imageStorageKey: updated.imageStorageKey,
        imageProvider: updated.imageProvider,
        imageUpdatedAt: updated.imageUpdatedAt,
        product: updated,
      },
    });
  } catch (error) {
    console.error('uploadProductImage controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'इमेज अपलोड में त्रुटि (Server error during image upload)',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/products/admin/:id/image-url
 *
 * Set product image from an external URL (typed/pasted URL — Unsplash, etc.)
 * No upload involved — just saves the URL as the image source.
 * Provider is set to 'external' so we know KIRSAB doesn't manage deletion.
 *
 * Body: { imageUrl: string }
 */
export const setProductImageUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required',
      });
    }

    const trimmedUrl = imageUrl.trim();

    // Basic URL format validation
    try {
      new URL(trimmedUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'अमान्य URL। कृपया एक पूर्ण URL दर्ज करें जो http:// या https:// से शुरू हो। (Invalid URL format)',
      });
    }

    // Reject blob: URLs — these are temporary browser-side URLs
    if (trimmedUrl.startsWith('blob:') || trimmedUrl.startsWith('data:')) {
      return res.status(400).json({
        success: false,
        message:
          'Blob/data URLs are not allowed. Please upload the image file directly instead of using a blob URL.',
      });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // If product had a Cloudinary image, clean up the old Cloudinary asset
    if (product.imageProvider === 'cloudinary' && product.imageStorageKey) {
      deleteImageFromCloudinary(product.imageStorageKey).catch((err) =>
        console.warn('Could not delete old Cloudinary image on URL switch:', err)
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        image: trimmedUrl,
        imageStorageKey: null, // No storage key for external URLs
        imageProvider: 'external',
        imageUpdatedAt: new Date(),
      },
      include: { category: true },
    });

    broadcastCatalogUpdated({
      action: 'image_updated',
      productId: updated.id,
      image: updated.image,
      imageProvider: 'external',
      product: updated,
    });

    return res.json({
      success: true,
      message: 'इमेज URL सफलतापूर्वक सेट किया गया (External image URL saved)',
      data: { imageUrl: updated.image, imageProvider: 'external', product: updated },
    });
  } catch (error) {
    console.error('setProductImageUrl error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating image URL',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/products/admin/:id/image
 *
 * Remove the product image (reset to no image — will show emoji fallback on frontend).
 * If the image is Cloudinary-managed, it is deleted from Cloudinary too.
 * External images are NOT deleted (KIRSAB doesn't own them).
 *
 * Body: { confirm: true } — explicit confirmation required
 */
export const removeProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm image removal by passing { confirm: true } in the request body.',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, nameEn: true, image: true, imageStorageKey: true, imageProvider: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete from Cloudinary if it's a managed image
    if (product.imageProvider === 'cloudinary' && product.imageStorageKey) {
      await deleteImageFromCloudinary(product.imageStorageKey);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        image: DEFAULT_FALLBACK_IMAGE,
        imageStorageKey: null,
        imageProvider: null,
        imageUpdatedAt: new Date(),
      },
      include: { category: true },
    });

    broadcastCatalogUpdated({
      action: 'image_removed',
      productId: updated.id,
      product: updated,
    });

    return res.json({
      success: true,
      message: 'इमेज हटा दी गई। उत्पाद अब इमोजी फॉलबैक दिखाएगा। (Image removed. Emoji fallback will now display.)',
      data: { product: updated },
    });
  } catch (error) {
    console.error('removeProductImage error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during image removal',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/admin/cloudinary-status
 * Check whether Cloudinary is configured and ready
 */
export const getCloudinaryStatus = async (req, res) => {
  return res.json({
    success: true,
    configured: isCloudinaryConfigured(),
    message: isCloudinaryConfigured()
      ? '✅ Cloudinary is configured. Image uploads are available.'
      : '⚠️ Cloudinary is not configured. Add credentials to server/.env to enable uploads.',
  });
};

