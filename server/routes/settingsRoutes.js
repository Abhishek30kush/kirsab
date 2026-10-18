import express from 'express';
import {
  getPublicSettings,
  updateSettingsAdmin,
} from '../controllers/settingsController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public customer endpoint
router.get('/', getPublicSettings);

// Protected admin endpoint
router.put('/admin', requireAdmin, updateSettingsAdmin);

export default router;
