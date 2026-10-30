import express from 'express';
import {
  getPublicActiveOffers,
  getAllOffersAdmin,
  getOfferByIdAdmin,
  createOfferAdmin,
  updateOfferAdmin,
  toggleOfferStatusAdmin,
  deleteOfferAdmin,
  previewOfferDiscount,
} from '../controllers/offerController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/active', getPublicActiveOffers);

// Admin routes (Protected by requireAdmin)
router.get('/admin', requireAdmin, getAllOffersAdmin);
router.get('/admin/:id', requireAdmin, getOfferByIdAdmin);
router.post('/admin/preview', requireAdmin, previewOfferDiscount);
router.post('/admin', requireAdmin, createOfferAdmin);
router.put('/admin/:id', requireAdmin, updateOfferAdmin);
router.patch('/admin/:id/toggle-status', requireAdmin, toggleOfferStatusAdmin);
router.delete('/admin/:id', requireAdmin, deleteOfferAdmin);

export default router;
