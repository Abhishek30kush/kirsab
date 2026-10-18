import express from 'express';
import {
  createOrder,
  getOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  getDailySalesStatsAdmin,
} from '../controllers/orderController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public checkout endpoint (no login required for customer)
router.post('/', createOrder);

// Protected admin endpoints
router.get('/admin', requireAdmin, getOrdersAdmin);
router.get('/admin/stats', requireAdmin, getDailySalesStatsAdmin);
router.get('/admin/:id', requireAdmin, getOrderByIdAdmin);
router.patch('/admin/:id/status', requireAdmin, updateOrderStatusAdmin);

export default router;
