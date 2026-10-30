import express from 'express';
import {
  getDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  resetDeliveryPartnerPassword,
  assignOrderDelivery,
  getOrderDeliveryAudit,
} from '../controllers/adminDeliveryController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Delivery Partners Management
router.get('/partners', requireAdmin, getDeliveryPartners);
router.post('/partners', requireAdmin, createDeliveryPartner);
router.patch('/partners/:id', requireAdmin, updateDeliveryPartner);
router.post('/partners/:id/reset-password', requireAdmin, resetDeliveryPartnerPassword);


// Order Assignment & Verification Audit
router.post('/orders/:id/assign', requireAdmin, assignOrderDelivery);
router.post('/assign-order/:id', requireAdmin, assignOrderDelivery);
router.get('/orders/:id/audit', requireAdmin, getOrderDeliveryAudit);

export default router;
