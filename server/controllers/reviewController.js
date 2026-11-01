import { prisma } from '../config/db.js';
import {
  broadcastReviewSubmitted,
  broadcastReviewStatusUpdated,
} from '../socket.js';

/**
 * Format privacy-safe display name (e.g., "Ramesh Kumar" -> "Ramesh K.")
 */
export function formatPrivacySafeName(name) {
  if (!name || typeof name !== 'string') return 'Verified Customer';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() || '';
  return `${firstName} ${lastInitial}.`;
}

/**
 * Sanitize and validate review images
 * Allows only valid image URLs or base64 data URLs for JPEG, PNG, WEBP (disallowing SVGs/HTML)
 */
export function sanitizeReviewImages(images) {
  if (!images || !Array.isArray(images)) return [];
  const cleanImages = [];
  const MAX_IMAGES = 4;
  const MAX_BASE64_CHARS = 7 * 1024 * 1024; // ~5MB max size

  for (const img of images) {
    if (cleanImages.length >= MAX_IMAGES) break;
    if (typeof img !== 'string') continue;
    const trimmed = img.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('data:')) {
      // Validate safe MIME types: jpeg, jpg, png, webp
      const isSafeImage = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
      if (isSafeImage && trimmed.length <= MAX_BASE64_CHARS) {
        cleanImages.push(trimmed);
      }
    } else if (/^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(trimmed)) {
      cleanImages.push(trimmed);
    }
  }

  return cleanImages;
}

/**
 * Compute genuine statistics from approved reviews
 */
export function computeReviewStats(reviews = []) {
  const total = reviews.length;
  if (total === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      starBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      aspectAverages: {
        productQuality: null,
        packaging: null,
        delivery: null,
      },
      positivePercentage: 0,
      hasReviews: false,
    };
  }

  let ratingSum = 0;
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let qualitySum = 0, qualityCount = 0;
  let packagingSum = 0, packagingCount = 0;
  let deliverySum = 0, deliveryCount = 0;

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    starCounts[star] = (starCounts[star] || 0) + 1;
    ratingSum += r.rating;

    if (typeof r.productQualityRating === 'number' && r.productQualityRating >= 1 && r.productQualityRating <= 5) {
      qualitySum += r.productQualityRating;
      qualityCount++;
    }
    if (typeof r.packagingRating === 'number' && r.packagingRating >= 1 && r.packagingRating <= 5) {
      packagingSum += r.packagingRating;
      packagingCount++;
    }
    if (typeof r.deliveryRating === 'number' && r.deliveryRating >= 1 && r.deliveryRating <= 5) {
      deliverySum += r.deliveryRating;
      deliveryCount++;
    }
  }

  const averageRating = Number((ratingSum / total).toFixed(1));
  const positiveCount = (starCounts[5] || 0) + (starCounts[4] || 0);
  const positivePercentage = Math.round((positiveCount / total) * 100);

  return {
    averageRating,
    totalReviews: total,
    starBreakdown: starCounts,
    aspectAverages: {
      productQuality: qualityCount > 0 ? Number((qualitySum / qualityCount).toFixed(1)) : null,
      packaging: packagingCount > 0 ? Number((packagingSum / packagingCount).toFixed(1)) : null,
      delivery: deliveryCount > 0 ? Number((deliverySum / deliveryCount).toFixed(1)) : null,
    },
    positivePercentage,
    hasReviews: true,
  };
}

/**
 * POST /api/reviews
 * Customer submits a review for a delivered order
 */
export const submitReview = async (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      orderId,
      productId,
      rating,
      title,
      comment,
      productQualityRating,
      packagingRating,
      deliveryRating,
      images,
    } = req.body;

    // 1. Validate required fields
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'ऑर्डर आईडी आवश्यक है (Order ID is required)',
      });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'कृपया 1 से 5 स्टार के बीच रेटिंग दें (Rating must be an integer between 1 and 5 stars)',
      });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'कृपया कम से कम 5 अक्षरों की विस्तृत समीक्षा लिखें (Review comment must be at least 5 characters long)',
      });
    }

    if (comment.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'समीक्षा 2000 अक्षरों से अधिक नहीं हो सकती (Review comment cannot exceed 2000 characters)',
      });
    }

    // 2. Validate aspect ratings if provided
    const parseAspect = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return num >= 1 && num <= 5 ? Math.round(num) : null;
    };

    const cleanQuality = parseAspect(productQualityRating);
    const cleanPackaging = parseAspect(packagingRating);
    const cleanDelivery = parseAspect(deliveryRating);

    // 3. Find and verify order eligibility
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    // Must belong to this customer
    if (order.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'आप केवल अपने स्वयं के ऑर्डर्स की समीक्षा कर सकते हैं (You can only review your own orders)',
      });
    }

    // Order MUST be delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'केवल डिलीवर हो चुके ऑर्डर्स की ही समीक्षा की जा सकती है (Only successfully delivered orders are eligible for review)',
      });
    }

    // 4. Verify product if productId provided
    let verifiedProductId = null;
    if (productId) {
      const itemInOrder = order.items.find(
        (i) => i.productId === productId || i.productId === String(productId)
      );
      if (!itemInOrder) {
        return res.status(400).json({
          success: false,
          message: 'यह उत्पाद इस ऑर्डर में शामिल नहीं था (This product was not part of this order)',
        });
      }
      verifiedProductId = itemInOrder.productId;
    }

    // 5. Prevent duplicate review for the same order (and product)
    const existingReview = await prisma.review.findFirst({
      where: {
        customerId,
        orderId: order.id,
        productId: verifiedProductId,
      },
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'आप इस ऑर्डर की समीक्षा पहले ही दर्ज कर चुके हैं। आप अपनी समीक्षा को एडिट कर सकते हैं। (You have already reviewed this order. You can edit your existing review.)',
        existingReviewId: existingReview.id,
      });
    }

    // 6. Sanitize images
    const cleanImages = sanitizeReviewImages(images);

    // 7. Create review
    const review = await prisma.review.create({
      data: {
        customerId,
        orderId: order.id,
        productId: verifiedProductId,
        rating: Math.round(numericRating),
        title: title ? title.trim().slice(0, 120) : null,
        comment: comment.trim(),
        productQualityRating: cleanQuality,
        packagingRating: cleanPackaging,
        deliveryRating: cleanDelivery,
        images: cleanImages,
        status: 'PENDING',
        isVerifiedPurchase: true,
        isFeatured: false,
      },
      include: {
        product: {
          select: { id: true, nameEn: true, nameHi: true, image: true },
        },
        order: {
          select: { id: true, orderNumber: true, deliveredAt: true },
        },
      },
    });

    // 8. Broadcast realtime alert to admin
    broadcastReviewSubmitted(review, req.user);

    return res.status(201).json({
      success: true,
      message: 'आपकी समीक्षा सफलतापूर्वक दर्ज कर ली गई है! व्यवस्थापक द्वारा अनुमोदन के बाद यह सार्वजनिक होगी। (Thank you! Your review has been submitted for moderation and will appear publicly once approved.)',
      review,
    });
  } catch (error) {
    console.error('Error in submitReview:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षा दर्ज करने में त्रुटि हुई (Failed to submit review)',
      error: error.message,
    });
  }
};

/**
 * GET /api/reviews/my-reviews
 * Authenticated customer views all their own submitted reviews
 */
export const getMyReviews = async (req, res) => {
  try {
    const customerId = req.user.id;

    const reviews = await prisma.review.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, nameEn: true, nameHi: true, image: true, unit: true },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveredAt: true,
            createdAt: true,
            finalTotal: true,
            items: {
              select: { productId: true, productNameEn: true, productNameHi: true, quantity: true },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error('Error in getMyReviews:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षाएं प्राप्त करने में त्रुटि (Failed to fetch your reviews)',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/reviews/:reviewId
 * Customer updates their own review
 */
export const updateMyReview = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { reviewId } = req.params;
    const {
      rating,
      title,
      comment,
      productQualityRating,
      packagingRating,
      deliveryRating,
      images,
    } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'समीक्षा नहीं मिली (Review not found)',
      });
    }

    if (review.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'आप केवल अपनी स्वयं की समीक्षा संपादित कर सकते हैं (Forbidden: You can only edit your own reviews)',
      });
    }

    const updateData = {};

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'रेटिंग 1 से 5 स्टार के बीच होनी चाहिए (Rating must be between 1 and 5)',
        });
      }
      updateData.rating = Math.round(numRating);
    }

    if (comment !== undefined) {
      if (typeof comment !== 'string' || comment.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'समीक्षा कम से कम 5 अक्षरों की होनी चाहिए (Comment must be at least 5 characters long)',
        });
      }
      if (comment.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'समीक्षा 2000 अक्षरों से अधिक नहीं हो सकती (Comment cannot exceed 2000 characters)',
        });
      }
      updateData.comment = comment.trim();
    }

    if (title !== undefined) {
      updateData.title = title ? title.trim().slice(0, 120) : null;
    }

    const parseAspect = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      return num >= 1 && num <= 5 ? Math.round(num) : null;
    };

    if (productQualityRating !== undefined) updateData.productQualityRating = parseAspect(productQualityRating);
    if (packagingRating !== undefined) updateData.packagingRating = parseAspect(packagingRating);
    if (deliveryRating !== undefined) updateData.deliveryRating = parseAspect(deliveryRating);

    if (images !== undefined) {
      updateData.images = sanitizeReviewImages(images);
    }

    // Reset status to PENDING upon edit so moderation policy is preserved
    updateData.status = 'PENDING';

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        product: { select: { id: true, nameEn: true, nameHi: true, image: true } },
        order: { select: { id: true, orderNumber: true, deliveredAt: true } },
      },
    });

    // Notify admins of edited review awaiting re-moderation
    broadcastReviewSubmitted(updatedReview, req.user);

    return res.json({
      success: true,
      message: 'समीक्षा सफलतापूर्वक अपडेट की गई! व्यवस्थापक द्वारा अनुमोदन के बाद यह सार्वजनिक होगी। (Review updated successfully! It will appear publicly once re-approved.)',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error in updateMyReview:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षा अपडेट करने में त्रुटि (Failed to update review)',
      error: error.message,
    });
  }
};

/**
 * GET /api/reviews/eligible-orders
 * Get authenticated customer's delivered orders eligible for review
 */
export const getEligibleOrdersForReview = async (req, res) => {
  try {
    const customerId = req.user.id;

    // Fetch delivered orders for this customer
    const deliveredOrders = await prisma.order.findMany({
      where: {
        customerId,
        status: 'delivered',
      },
      orderBy: { deliveredAt: 'desc' },
      include: {
        items: {
          select: {
            productId: true,
            productNameEn: true,
            productNameHi: true,
            unit: true,
            quantity: true,
            product: {
              select: { id: true, image: true },
            },
          },
        },
        reviews: {
          select: {
            id: true,
            productId: true,
            rating: true,
            title: true,
            comment: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const eligibleOrders = deliveredOrders.map((order) => {
      const orderLevelReview = order.reviews.find((r) => !r.productId) || null;
      const reviewedProductIds = order.reviews
        .filter((r) => r.productId)
        .map((r) => r.productId);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        deliveredAt: order.deliveredAt || order.updatedAt,
        finalTotal: order.finalTotal,
        items: order.items,
        hasOrderReview: Boolean(orderLevelReview),
        orderReview: orderLevelReview,
        reviewedProductIds,
      };
    });

    return res.json({
      success: true,
      eligibleOrders,
    });
  } catch (error) {
    console.error('Error in getEligibleOrdersForReview:', error);
    return res.status(500).json({
      success: false,
      message: 'योग्य ऑर्डर्स लोड करने में त्रुटि (Failed to fetch eligible orders)',
      error: error.message,
    });
  }
};

/**
 * GET /api/reviews
 * Public approved reviews with pagination, star filtering, and sorting
 */
export const getPublicReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const ratingFilter = req.query.rating ? parseInt(req.query.rating) : null;
    const sortBy = req.query.sortBy || 'latest'; // latest, highest, lowest, featured

    const where = {
      status: 'APPROVED',
    };

    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      where.rating = ratingFilter;
    }

    if (req.query.productId) {
      where.productId = req.query.productId;
    }

    let orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    if (sortBy === 'highest') {
      orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
    } else if (sortBy === 'lowest') {
      orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }];
    } else if (sortBy === 'featured') {
      orderBy = [{ isFeatured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          productQualityRating: true,
          packagingRating: true,
          deliveryRating: true,
          images: true,
          isVerifiedPurchase: true,
          isFeatured: true,
          adminReply: true,
          adminRepliedAt: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              nameEn: true,
              nameHi: true,
              image: true,
              unit: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
              deliveredAt: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    // Sanitize customer identity for privacy
    const sanitizedReviews = reviews.map((r) => ({
      ...r,
      customerName: formatPrivacySafeName(r.customer?.name),
      customer: undefined, // Strip raw customer object
    }));

    // Fetch all approved reviews to compute genuine aggregate stats
    const allApproved = await prisma.review.findMany({
      where: { status: 'APPROVED' },
      select: {
        rating: true,
        productQualityRating: true,
        packagingRating: true,
        deliveryRating: true,
      },
    });

    const stats = computeReviewStats(allApproved);

    return res.json({
      success: true,
      reviews: sanitizedReviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        hasMore: page * limit < totalCount,
      },
      stats,
    });
  } catch (error) {
    console.error('Error in getPublicReviews:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षाएं प्राप्त करने में त्रुटि (Failed to fetch reviews)',
      error: error.message,
    });
  }
};

/**
 * GET /api/reviews/featured
 * Public featured testimonials for the homepage
 */
export const getFeaturedReviews = async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6));

    // First fetch featured approved reviews
    let reviews = await prisma.review.findMany({
      where: {
        status: 'APPROVED',
        isFeatured: true,
      },
      take: limit,
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        productQualityRating: true,
        packagingRating: true,
        deliveryRating: true,
        images: true,
        isVerifiedPurchase: true,
        isFeatured: true,
        adminReply: true,
        adminRepliedAt: true,
        createdAt: true,
        customer: {
          select: { name: true },
        },
        product: {
          select: { id: true, nameEn: true, nameHi: true, image: true, unit: true },
        },
        order: {
          select: { orderNumber: true, deliveredAt: true },
        },
      },
    });

    // If fewer than limit, supplement with highest-rated latest approved reviews
    if (reviews.length < limit) {
      const existingIds = reviews.map((r) => r.id);
      const remaining = limit - reviews.length;
      const additional = await prisma.review.findMany({
        where: {
          status: 'APPROVED',
          id: { notIn: existingIds },
        },
        take: remaining,
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          productQualityRating: true,
          packagingRating: true,
          deliveryRating: true,
          images: true,
          isVerifiedPurchase: true,
          isFeatured: true,
          adminReply: true,
          adminRepliedAt: true,
          createdAt: true,
          customer: {
            select: { name: true },
          },
          product: {
            select: { id: true, nameEn: true, nameHi: true, image: true, unit: true },
          },
          order: {
            select: { orderNumber: true, deliveredAt: true },
          },
        },
      });
      reviews = [...reviews, ...additional];
    }

    const sanitizedReviews = reviews.map((r) => ({
      ...r,
      customerName: formatPrivacySafeName(r.customer?.name),
      customer: undefined,
    }));

    // Overall genuine rating statistics
    const allApproved = await prisma.review.findMany({
      where: { status: 'APPROVED' },
      select: {
        rating: true,
        productQualityRating: true,
        packagingRating: true,
        deliveryRating: true,
      },
    });

    const stats = computeReviewStats(allApproved);

    return res.json({
      success: true,
      reviews: sanitizedReviews,
      stats,
    });
  } catch (error) {
    console.error('Error in getFeaturedReviews:', error);
    return res.status(500).json({
      success: false,
      message: 'प्रदर्शित समीक्षाएं प्राप्त करने में त्रुटि (Failed to fetch featured reviews)',
      error: error.message,
    });
  }
};

/**
 * GET /api/reviews/stats
 * Public overall genuine review statistics
 */
export const getPublicReviewStats = async (req, res) => {
  try {
    const allApproved = await prisma.review.findMany({
      where: { status: 'APPROVED' },
      select: {
        rating: true,
        productQualityRating: true,
        packagingRating: true,
        deliveryRating: true,
      },
    });

    const stats = computeReviewStats(allApproved);

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error in getPublicReviewStats:', error);
    return res.status(500).json({
      success: false,
      message: 'समीक्षा सांख्यिकी लोड करने में त्रुटि (Failed to fetch review statistics)',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/:productId/reviews
 * Public approved reviews for a specific product
 */
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const where = {
      productId,
      status: 'APPROVED',
    };

    const [reviews, totalCount, allProductApproved] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          productQualityRating: true,
          packagingRating: true,
          deliveryRating: true,
          images: true,
          isVerifiedPurchase: true,
          isFeatured: true,
          adminReply: true,
          adminRepliedAt: true,
          createdAt: true,
          customer: { select: { name: true } },
          order: { select: { orderNumber: true, deliveredAt: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        select: {
          rating: true,
          productQualityRating: true,
          packagingRating: true,
          deliveryRating: true,
        },
      }),
    ]);

    const sanitizedReviews = reviews.map((r) => ({
      ...r,
      customerName: formatPrivacySafeName(r.customer?.name),
      customer: undefined,
    }));

    const stats = computeReviewStats(allProductApproved);

    return res.json({
      success: true,
      productId,
      reviews: sanitizedReviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
        hasMore: page * limit < totalCount,
      },
      stats,
    });
  } catch (error) {
    console.error('Error in getProductReviews:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्पाद समीक्षाएं प्राप्त करने में त्रुटि (Failed to fetch product reviews)',
      error: error.message,
    });
  }
};
