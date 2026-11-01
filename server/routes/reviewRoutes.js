import express from 'express';
import {
  submitReview,
  getMyReviews,
  updateMyReview,
  getEligibleOrdersForReview,
  getPublicReviews,
  getFeaturedReviews,
  getPublicReviewStats,
  getProductReviews,
} from '../controllers/reviewController.js';
import { requireCustomer } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getPublicReviews);
router.get('/featured', getFeaturedReviews);
router.get('/stats', getPublicReviewStats);
router.get('/product/:productId', getProductReviews);

// Customer authenticated routes
router.post('/', requireCustomer, submitReview);
router.get('/my-reviews', requireCustomer, getMyReviews);
router.get('/eligible-orders', requireCustomer, getEligibleOrdersForReview);
router.patch('/:reviewId', requireCustomer, updateMyReview);

export default router;

