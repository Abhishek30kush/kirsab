import express from 'express';
import {
  getPublicProducts,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  toggleStock,
  deleteProduct,
} from '../controllers/productController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public customer endpoint
router.get('/', getPublicProducts);

// Protected admin endpoints
router.get('/admin/all', requireAdmin, getAllProductsAdmin);
router.get('/admin/:id', requireAdmin, getProductById);
router.post('/admin', requireAdmin, createProduct);
router.put('/admin/:id', requireAdmin, updateProduct);
router.patch('/admin/:id/toggle-stock', requireAdmin, toggleStock);
router.delete('/admin/:id', requireAdmin, deleteProduct);

export default router;
