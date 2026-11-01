import express from 'express';
import {
  getAdminReviews,
  updateReviewStatus,
  toggleReviewFeature,
  replyToReview,
  deleteReview,
  getAdminReviewStats,
} from '../controllers/adminReviewController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAdmin);

router.get('/', getAdminReviews);
router.get('/stats', getAdminReviewStats);
router.patch('/:reviewId/status', updateReviewStatus);
router.patch('/:reviewId/feature', toggleReviewFeature);
router.post('/:reviewId/reply', replyToReview);
router.delete('/:reviewId', deleteReview);

export default router;

