import express from 'express';
import {
  getDeliveryPartners,
  createDeliveryPartner,
  updateDeliveryPartner,
  resetDeliveryPartnerPassword,
  assignOrderDelivery,
  removeOrderDeliveryPartner,
  getOrderDeliveryAudit,
} from '../controllers/adminDeliveryController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Delivery Partners Management
router.get('/partners', requireAdmin, getDeliveryPartners);
router.post('/partners', requireAdmin, createDeliveryPartner);
router.patch('/partners/:id', requireAdmin, updateDeliveryPartner);
router.post('/partners/:id/reset-password', requireAdmin, resetDeliveryPartnerPassword);

// Order Assignment, Reassignment & Removal
router.post('/orders/:id/assign', requireAdmin, assignOrderDelivery);
router.post('/assign-order/:id', requireAdmin, assignOrderDelivery);
router.post('/orders/:id/assign-delivery-partner', requireAdmin, assignOrderDelivery);
router.patch('/orders/:id/reassign-delivery-partner', requireAdmin, assignOrderDelivery);
router.delete('/orders/:id/delivery-partner', requireAdmin, removeOrderDeliveryPartner);
router.delete('/orders/:id/unassign', requireAdmin, removeOrderDeliveryPartner);
router.delete('/orders/:id/assign', requireAdmin, removeOrderDeliveryPartner);

// Assignment & Verification Audit Trail
router.get('/orders/:id/audit', requireAdmin, getOrderDeliveryAudit);
router.get('/orders/:id/assignment-history', requireAdmin, getOrderDeliveryAudit);


export default router;
