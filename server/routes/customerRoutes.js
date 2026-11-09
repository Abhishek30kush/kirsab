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
  getCustomerWishlist,
  toggleCustomerWishlist,
  updateCustomerPushToken,
  getAdminCustomersList,
  getAdminCustomerDetails,
} from '../controllers/customerController.js';
import { requireCustomer, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Profile management
router.get('/profile', requireCustomer, getCustomerProfile);
router.patch('/profile', requireCustomer, updateCustomerProfile);

// Saved addresses management
router.get('/addresses', requireCustomer, getCustomerAddresses);
router.post('/addresses', requireCustomer, createCustomerAddress);
router.patch('/addresses/:id', requireCustomer, updateCustomerAddress);
router.delete('/addresses/:id', requireCustomer, deleteCustomerAddress);

// Wishlist management
router.get('/wishlist', requireCustomer, getCustomerWishlist);
router.post('/wishlist/toggle', requireCustomer, toggleCustomerWishlist);

// Push token registration
router.post('/push-token', requireCustomer, updateCustomerPushToken);

// Order history & single order live details
router.get('/orders', requireCustomer, getCustomerOrders);
router.get('/orders/:id', requireCustomer, getCustomerOrderById);
router.get('/orders/:id/delivery-partner', requireCustomer, getCustomerOrderDeliveryPartner);
router.post('/orders/:id/cancel', requireCustomer, cancelCustomerOrder);

// Admin customer management
router.get('/admin/list', requireAdmin, getAdminCustomersList);
router.get('/admin/:id', requireAdmin, getAdminCustomerDetails);

export default router;
