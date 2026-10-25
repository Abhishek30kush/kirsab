import express from 'express';
import {
  getDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  assignOrderDelivery,
  getOrderDeliveryAudit,
} from '../controllers/adminDeliveryController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Delivery Partners Management
router.get('/partners', requireAdmin, getDeliveryPartners);
router.post('/partners', requireAdmin, createDeliveryPartner);
router.patch('/partners/:id', requireAdmin, updateDeliveryPartner);

// Order Assignment & Verification Audit
router.post('/orders/:id/assign', requireAdmin, assignOrderDelivery);
router.post('/assign-order/:id', requireAdmin, assignOrderDelivery);
router.get('/orders/:id/audit', requireAdmin, getOrderDeliveryAudit);

export default router;
