import express from 'express';
import {
  getPublicProducts,
  getPublicCategories,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  toggleStock,
  deleteProduct,
} from '../controllers/productController.js';
import {
  uploadProductImage,
  setProductImageUrl,
  removeProductImage,
  getCloudinaryStatus,
} from '../controllers/imageController.js';
import { getProductReviews } from '../controllers/reviewController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { uploadSingleImage, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public customer endpoint
router.get('/', getPublicProducts);
router.get('/categories', getPublicCategories);
router.get('/:productId/reviews', getProductReviews);

// Protected admin endpoints
router.get('/admin/all', requireAdmin, getAllProductsAdmin);
router.get('/admin/cloudinary-status', requireAdmin, getCloudinaryStatus);
router.get('/admin/:id', requireAdmin, getProductById);
router.post('/admin', requireAdmin, createProduct);
router.put('/admin/:id', requireAdmin, updateProduct);
router.patch('/admin/:id/toggle-stock', requireAdmin, toggleStock);
router.delete('/admin/:id', requireAdmin, deleteProduct);

// Image management endpoints (admin-only)
// POST   /api/products/admin/:id/image        → Upload from device (multipart/form-data)
// PATCH  /api/products/admin/:id/image-url    → Set external URL
// DELETE /api/products/admin/:id/image        → Remove image
router.post(
  '/admin/:id/image',
  requireAdmin,
  uploadSingleImage,
  handleUploadError,
  uploadProductImage
);
router.patch('/admin/:id/image-url', requireAdmin, setProductImageUrl);
router.delete('/admin/:id/image', requireAdmin, removeProductImage);

export default router;
