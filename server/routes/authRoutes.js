import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authRateLimiter, login);
router.get('/me', requireAdmin, getMe);

export default router;
