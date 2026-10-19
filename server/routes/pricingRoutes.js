import express from 'express';
import {
  calculatePrice,
  saveCalculation,
  getPricingHistory,
  getPricingOverview,
  applyPriceToProduct,
  bulkCalculate,
  bulkApplyPrices,
  saveCompetitorPrice,
} from '../controllers/pricingController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all pricing endpoints with requireAdmin middleware
router.use(requireAdmin);

router.post('/calculate', calculatePrice);
router.post('/save', saveCalculation);
router.get('/overview', getPricingOverview);
router.get('/history/:productId', getPricingHistory);
router.post('/apply-price', applyPriceToProduct);
router.post('/bulk-calculate', bulkCalculate);
router.post('/bulk-apply', bulkApplyPrices);
router.post('/competitors', saveCompetitorPrice);

export default router;
