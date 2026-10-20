import express from 'express';
import {
  createOrder,
  getOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  getDailySalesStatsAdmin,
  getOrderAnalyticsAdmin,
  getLiveOrdersAdmin,
  getOrderStatusHistoryAdmin,
  getPublicOrderStats,
} from '../controllers/orderController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public endpoints
router.post('/', createOrder);
router.get('/public-stats', getPublicOrderStats);

// Protected admin endpoints
router.get('/admin/analytics', requireAdmin, getOrderAnalyticsAdmin);
router.get('/admin/live', requireAdmin, getLiveOrdersAdmin);
router.get('/admin/stats', requireAdmin, getDailySalesStatsAdmin);
router.get('/admin', requireAdmin, getOrdersAdmin);
router.get('/admin/:id', requireAdmin, getOrderByIdAdmin);
router.get('/admin/:id/history', requireAdmin, getOrderStatusHistoryAdmin);
router.patch('/admin/:id/status', requireAdmin, updateOrderStatusAdmin);

export default router;
