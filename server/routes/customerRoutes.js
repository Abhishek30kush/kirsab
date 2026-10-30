import express from 'express';
import {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  getCustomerOrders,
  getCustomerOrderById,
  getCustomerOrderDeliveryPartner,
  cancelCustomerOrder,
} from '../controllers/customerController.js';
import { requireCustomer } from '../middleware/authMiddleware.js';

const router = express.Router();

// Profile management
router.get('/profile', requireCustomer, getCustomerProfile);
router.patch('/profile', requireCustomer, updateCustomerProfile);

// Saved addresses management
router.get('/addresses', requireCustomer, getCustomerAddresses);
router.post('/addresses', requireCustomer, createCustomerAddress);
router.patch('/addresses/:id', requireCustomer, updateCustomerAddress);
router.delete('/addresses/:id', requireCustomer, deleteCustomerAddress);

// Order history & single order live details
router.get('/orders', requireCustomer, getCustomerOrders);
router.get('/orders/:id', requireCustomer, getCustomerOrderById);
router.get('/orders/:id/delivery-partner', requireCustomer, getCustomerOrderDeliveryPartner);
router.post('/orders/:id/cancel', requireCustomer, cancelCustomerOrder);

export default router;
