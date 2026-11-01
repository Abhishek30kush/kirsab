import { prisma } from '../config/db.js';
import {
  broadcastReviewStatusUpdated,
  broadcastReviewReplied,
} from '../socket.js';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'];

/**
 * GET /api/admin/reviews
 * Admin lists all reviews with rich filtering options
 */
export const getAdminReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { status, rating, productId, search, customerId } = req.query;

    const where = {};

    if (status && status !== 'all') {
      if (VALID_STATUSES.includes(status.toUpperCase())) {
        where.status = status.toUpperCase();
      }
    }

    if (rating && rating !== 'all') {
      const numRating = parseInt(rating);
      if (numRating >= 1 && numRating <= 5) {
        where.rating = numRating;
      }
    }

    if (productId && productId !== 'all') {
      where.productId = productId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { comment: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [reviews, totalCount, statusCounts] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true, createdAt: true },
          },
          product: {
            select: { id: true, nameEn: true, nameHi: true, image: true, unit: true },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              finalTotal: true,
              deliveredAt: true,
              createdAt: true,
              items: {
                select: { productNameEn: true, productNameHi: true, quantity: true, unit: true },
              },
            },
          },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const counts = {
      all: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      HIDDEN: 0,
    };

    for (const item of statusCounts) {
      counts[item.status] = item._count.id;
      counts.all += item._count.id;
    }

    return res.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        hasMore: page * limit < totalCount,
      },
      counts,
    });
  } catch (error) {
    console.error('Error in getAdminReviews:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षाएं प्राप्त करने में त्रुटि (Failed to fetch reviews)',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/reviews/:reviewId/status
 * Update review status: PENDING, APPROVED, REJECTED, HIDDEN
 */
export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `अमान्य स्थिति। मान्य स्थितियां हैं: ${VALID_STATUSES.join(', ')} (Invalid status)`,
      });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'समीक्षा नहीं मिली (Review not found)',
      });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: status.toUpperCase(),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        product: { select: { id: true, nameEn: true, nameHi: true, image: true } },
        order: { select: { id: true, orderNumber: true, deliveredAt: true } },
      },
    });

    // Realtime broadcast to admin and customer rooms
    broadcastReviewStatusUpdated(updatedReview);

    return res.json({
      success: true,
      message: `समीक्षा स्थिति सफलतापूर्वक '${status.toUpperCase()}' कर दी गई। (Review status updated)`,
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error in updateReviewStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षा स्थिति अपडेट करने में त्रुटि (Failed to update review status)',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/reviews/:reviewId/feature
 * Toggle whether this review is featured on homepage
 */
export const toggleReviewFeature = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isFeatured } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'समीक्षा नहीं मिली (Review not found)',
      });
    }

    const targetFeatured =
      typeof isFeatured === 'boolean' ? isFeatured : !review.isFeatured;

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        isFeatured: targetFeatured,
      },
      include: {
        customer: { select: { id: true, name: true } },
        product: { select: { id: true, nameEn: true, nameHi: true } },
      },
    });

    broadcastReviewStatusUpdated(updatedReview);

    return res.json({
      success: true,
      message: targetFeatured
        ? 'समीक्षा होमपेज पर फ़ीचर्ड की गई (Review featured on homepage)'
        : 'समीक्षा होमपेज फ़ीचर्ड से हटा दी गई (Review unfeatured)',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error in toggleReviewFeature:', error);
    return res.status(500).json({
      success: false,
      message: 'फ़ीचर्ड स्थिति बदलने में त्रुटि (Failed to update featured flag)',
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/reviews/:reviewId/reply
 * Post official KIRSAB reply to a customer review
 * Strict rule: Admins cannot alter customer's rating or review text!
 */
export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!reply || typeof reply !== 'string' || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: 'उत्तर सामग्री आवश्यक है (Reply text is required)',
      });
    }

    if (reply.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'उत्तर 1000 अक्षरों से अधिक नहीं हो सकता (Reply cannot exceed 1000 characters)',
      });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'समीक्षा नहीं मिली (Review not found)',
      });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        adminReply: reply.trim(),
        adminRepliedAt: new Date(),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        product: { select: { id: true, nameEn: true, nameHi: true, image: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    // Realtime notification to customer and admin
    broadcastReviewReplied(updatedReview);

    return res.json({
      success: true,
      message: 'आधिकारिक किरसाब उत्तर सफलतापूर्वक पोस्ट किया गया (Official reply posted successfully)',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error in replyToReview:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्तर पोस्ट करने में त्रुटि (Failed to post reply)',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/reviews/:reviewId
 * Remove inappropriate / abusive review
 */
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'समीक्षा नहीं मिली (Review not found)',
      });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Notify rooms of deletion
    broadcastReviewStatusUpdated({ id: reviewId, status: 'DELETED', productId: review.productId });

    return res.json({
      success: true,
      message: 'समीक्षा सफलतापूर्वक हटा दी गई (Review deleted successfully)',
    });
  } catch (error) {
    console.error('Error in deleteReview:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षा हटाने में त्रुटि (Failed to delete review)',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/reviews/stats
 * Detailed statistics for the admin dashboard
 */
export const getAdminReviewStats = async (req, res) => {
  try {
    const [allReviews, statusBreakdown, ratingBreakdown] = await Promise.all([
      prisma.review.findMany({
        select: {
          rating: true,
          status: true,
          adminReply: true,
          productQualityRating: true,
          packagingRating: true,
          deliveryRating: true,
          isFeatured: true,
        },
      }),
      prisma.review.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        _count: { id: true },
      }),
    ]);

    const statusCounts = {
      total: allReviews.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      hidden: 0,
      featured: 0,
      replied: 0,
    };

    for (const s of statusBreakdown) {
      if (s.status === 'PENDING') statusCounts.pending = s._count.id;
      if (s.status === 'APPROVED') statusCounts.approved = s._count.id;
      if (s.status === 'REJECTED') statusCounts.rejected = s._count.id;
      if (s.status === 'HIDDEN') statusCounts.hidden = s._count.id;
    }

    statusCounts.featured = allReviews.filter((r) => r.isFeatured).length;
    statusCounts.replied = allReviews.filter((r) => Boolean(r.adminReply)).length;

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    let qualitySum = 0, qualityCount = 0;
    let packagingSum = 0, packagingCount = 0;
    let deliverySum = 0, deliveryCount = 0;

    for (const r of allReviews) {
      ratingSum += r.rating;
      if (starCounts[r.rating] !== undefined) starCounts[r.rating]++;

      if (r.productQualityRating) {
        qualitySum += r.productQualityRating;
        qualityCount++;
      }
      if (r.packagingRating) {
        packagingSum += r.packagingRating;
        packagingCount++;
      }
      if (r.deliveryRating) {
        deliverySum += r.deliveryRating;
        deliveryCount++;
      }
    }

    const averageRating = allReviews.length > 0 ? Number((ratingSum / allReviews.length).toFixed(1)) : 0;
    const responseRate = allReviews.length > 0 ? Math.round((statusCounts.replied / allReviews.length) * 100) : 0;

    return res.json({
      success: true,
      stats: {
        statusCounts,
        starCounts,
        averageRating,
        responseRate,
        aspectAverages: {
          productQuality: qualityCount > 0 ? Number((qualitySum / qualityCount).toFixed(1)) : null,
          packaging: packagingCount > 0 ? Number((packagingSum / packagingCount).toFixed(1)) : null,
          delivery: deliveryCount > 0 ? Number((deliverySum / deliveryCount).toFixed(1)) : null,
        },
      },
    });
  } catch (error) {
    console.error('Error in getAdminReviewStats:', error);
    return res.status(500).json({
      success: false,
      message: 'सांख्यिकी प्राप्त करने में त्रुटि (Failed to fetch review statistics)',
      error: error.message,
    });
  }
};

