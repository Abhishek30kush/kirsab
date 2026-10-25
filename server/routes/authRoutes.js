import express from 'express';
import {
  login,
  getMe,
  customerRegister,
  customerLogin,
  deliveryLogin,
} from '../controllers/authController.js';
import { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Existing admin & general login
router.post('/login', authRateLimiter, login);
router.get('/me', requireAdmin, getMe);

// Customer Authentication
router.post('/customer/register', authRateLimiter, customerRegister);
router.post('/customer/login', authRateLimiter, customerLogin);

// Delivery Partner Authentication
router.post('/delivery/login', authRateLimiter, deliveryLogin);

export default router;
