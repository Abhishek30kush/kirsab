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
import { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import {
  assignOrderDelivery,
  removeOrderDeliveryPartner,
  getOrderDeliveryAudit,
} from '../controllers/adminDeliveryController.js';

const router = express.Router();

// Public endpoints (with optionalAuth to associate customer profile if logged in)
router.post('/', optionalAuth, createOrder);
router.get('/public-stats', getPublicOrderStats);

// Protected admin endpoints
router.get('/admin/analytics', requireAdmin, getOrderAnalyticsAdmin);
router.get('/admin/live', requireAdmin, getLiveOrdersAdmin);
router.get('/admin/stats', requireAdmin, getDailySalesStatsAdmin);
router.get('/admin', requireAdmin, getOrdersAdmin);
router.get('/admin/:id', requireAdmin, getOrderByIdAdmin);
router.get('/admin/:id/history', requireAdmin, getOrderStatusHistoryAdmin);
router.patch('/admin/:id/status', requireAdmin, updateOrderStatusAdmin);

// Admin delivery assignment, unassignment & audit
router.post('/admin/:id/assign-delivery', requireAdmin, assignOrderDelivery);
router.delete('/admin/:id/assign-delivery', requireAdmin, removeOrderDeliveryPartner);
router.delete('/admin/:id/delivery-partner', requireAdmin, removeOrderDeliveryPartner);
router.get('/admin/:id/delivery-history', requireAdmin, getOrderDeliveryAudit);

export default router;
