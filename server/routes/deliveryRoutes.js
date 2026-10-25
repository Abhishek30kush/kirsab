import express from 'express';
import {
  getAssignedOrders,
  getDeliveryOrderById,
  acceptOrder,
  pickupOrder,
  markOutForDelivery,
  verifyPinAndDeliver,
} from '../controllers/deliveryController.js';
import { requireDeliveryPartner } from '../middleware/authMiddleware.js';

const router = express.Router();

// Delivery partner assigned orders
router.get('/orders', requireDeliveryPartner, getAssignedOrders);
router.get('/orders/:id', requireDeliveryPartner, getDeliveryOrderById);

// Order status workflow actions
router.post('/orders/:id/accept', requireDeliveryPartner, acceptOrder);
router.post('/orders/:id/pickup', requireDeliveryPartner, pickupOrder);
router.post('/orders/:id/out-for-delivery', requireDeliveryPartner, markOutForDelivery);

// Secure delivery PIN verification & delivery completion
router.post('/orders/:id/verify-pin', requireDeliveryPartner, verifyPinAndDeliver);

export default router;
