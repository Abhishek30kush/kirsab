import { prisma } from '../config/db.js';
import {
  validateOfferInput,
  calculateOfferDiscount,
  resolveBestOfferForProduct,
  roundMoney,
} from '../utils/discountCalculator.js';
import { broadcastCatalogUpdated } from '../socket.js';


/**
 * Helper to compute dynamic lifecycle status of an offer based on server time
 * @param {object} offer 
 * @param {Date} now 
 * @returns {'active' | 'scheduled' | 'expired' | 'inactive'}
 */
export const getOfferDynamicStatus = (offer, now = new Date()) => {
  if (!offer.isActive) return 'inactive';
  const currentTime = now.getTime();
  const startTime = new Date(offer.startDate).getTime();
  const endTime = new Date(offer.endDate).getTime();

  if (currentTime < startTime) return 'scheduled';
  if (currentTime > endTime) return 'expired';
  if (offer.usageLimit != null && (offer.usageCount || 0) >= offer.usageLimit) return 'expired';
  return 'active';
};

/**
 * Public: Get currently active and valid offers for customer store
 * GET /api/offers/active
 */
export const getPublicActiveOffers = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const now = new Date();
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                nameEn: true,
                nameHi: true,
                price: true,
                unit: true,
                unitHindi: true,
                unitShort: true,
                image: true,
                fallbackEmoji: true,
                inStock: true,
                isActive: true,
                isConfigured: true,
                badge: true,
              },
            },
          },
        },
      },
      orderBy: [
        { endDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Filter out offers that have reached usage limit
    const eligibleOffers = offers.filter(o => o.usageLimit == null || (o.usageCount || 0) < o.usageLimit);

    // Sanitize response
    const sanitized = eligibleOffers.map(o => ({
      id: o.id,
      title: o.title,
      description: o.description,
      discountType: o.discountType,
      discountValue: o.discountValue,
      startDate: o.startDate,
      endDate: o.endDate,
      minQuantity: o.minQuantity || 1,
      maxDiscount: o.maxDiscount,
      products: o.products
        .filter(p => p.product && p.product.isActive && p.product.inStock && p.product.isConfigured)
        .map(p => ({
          productId: p.product.id,
          nameEn: p.product.nameEn,
          nameHi: p.product.nameHi,
          price: p.product.price,
          unit: p.product.unit,
          unitHindi: p.product.unitHindi,
          unitShort: p.product.unitShort,
          image: p.product.image,
          fallbackEmoji: p.product.fallbackEmoji,
          badge: p.product.badge,
        })),
    }));

    return res.json({
      success: true,
      data: sanitized,
      count: sanitized.length,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error('Public active offers fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑफ़र लोड करने में असमर्थ (Failed to fetch active offers)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all offers with search and status filtering
 * GET /api/offers/admin
 */
export const getAllOffersAdmin = async (req, res) => {
  try {
    const { status, search, productId } = req.query;
    const now = new Date();

    const where = {};

    if (productId && productId !== 'all') {
      where.products = {
        some: { productId },
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        {
          products: {
            some: {
              product: {
                OR: [
                  { nameEn: { contains: q, mode: 'insensitive' } },
                  { nameHi: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const offers = await prisma.offer.findMany({
      where,
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                nameEn: true,
                nameHi: true,
                price: true,
                unit: true,
                image: true,
                inStock: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Annotate with dynamic status
    let formatted = offers.map(o => {
      const dynamicStatus = getOfferDynamicStatus(o, now);
      return {
        ...o,
        dynamicStatus,
        isCurrentlyLive: dynamicStatus === 'active',
        productCount: o.products.length,
        orderCount: o._count.orderItems,
      };
    });

    // Apply status filter if provided
    if (status && status !== 'all') {
      formatted = formatted.filter(o => o.dynamicStatus === status);
    }

    // Quick summary counts
    const counts = {
      all: offers.length,
      active: offers.filter(o => getOfferDynamicStatus(o, now) === 'active').length,
      scheduled: offers.filter(o => getOfferDynamicStatus(o, now) === 'scheduled').length,
      expired: offers.filter(o => getOfferDynamicStatus(o, now) === 'expired').length,
      inactive: offers.filter(o => getOfferDynamicStatus(o, now) === 'inactive').length,
    };

    return res.json({
      success: true,
      data: formatted,
      counts,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error('Admin offers fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑफ़र्स लोड करने में त्रुटि (Failed to fetch admin offers)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get single offer by ID
 * GET /api/offers/admin/:id
 */
export const getOfferByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'ऑफ़र नहीं मिला (Offer not found)',
      });
    }

    return res.json({
      success: true,
      data: {
        ...offer,
        dynamicStatus: getOfferDynamicStatus(offer, now),
        productIds: offer.products.map(p => p.productId),
        orderCount: offer._count.orderItems,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि (Server error)',
      error: error.message,
    });
  }
};

/**
 * Admin: Live price preview for offer creation / editing
 * POST /api/offers/admin/preview
 */
export const previewOfferDiscount = async (req, res) => {
  try {
    const { productIds, discountType, discountValue, minQuantity = 1, maxDiscount } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'कम से कम एक उत्पाद चुनें (Select at least one product)',
      });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const mockOffer = {
      id: 'preview',
      title: 'Preview Offer',
      discountType,
      discountValue: Number(discountValue) || 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      minQuantity: minQuantity ? Number(minQuantity) : 1,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      usageLimit: null,
      usageCount: 0,
    };

    const previews = products.map(prod => {
      const calc = calculateOfferDiscount({
        product: prod,
        offer: mockOffer,
        quantity: mockOffer.minQuantity,
      });

      return {
        productId: prod.id,
        nameEn: prod.nameEn,
        nameHi: prod.nameHi,
        unit: prod.unit,
        originalPrice: prod.price != null ? Number(prod.price) : null,
        finalPrice: calc.eligible ? calc.finalUnitPrice : prod.price,
        discountPerUnit: calc.eligible ? calc.discountPerUnit : 0,
        percentageSaved: prod.price && calc.eligible
          ? Math.round((calc.discountPerUnit / Number(prod.price)) * 100)
          : 0,
        eligible: calc.eligible,
        reason: calc.reason || null,
      };
    });

    return res.json({
      success: true,
      data: previews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'पूर्वावलोकन गणना में त्रुटि (Failed to calculate preview)',
      error: error.message,
    });
  }
};

/**
 * Admin: Create new offer
 * POST /api/offers/admin
 */
export const createOfferAdmin = async (req, res) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive = true,
      minQuantity,
      maxDiscount,
      usageLimit,
      productIds = [],
    } = req.body;

    // Fetch products to validate prices
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'कुछ चुने गए उत्पाद अमान्य हैं (Some selected product IDs are invalid)',
      });
    }

    const validation = validateOfferInput(
      {
        title,
        discountType,
        discountValue,
        startDate,
        endDate,
        minQuantity,
        maxDiscount,
        usageLimit,
        productIds,
      },
      products
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const newOffer = await prisma.$transaction(async (tx) => {
      const created = await tx.offer.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          discountType,
          discountValue: Number(discountValue),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: Boolean(isActive),
          minQuantity: minQuantity ? Number(minQuantity) : null,
          maxDiscount: maxDiscount ? Number(maxDiscount) : null,
          usageLimit: usageLimit ? Number(usageLimit) : null,
          products: {
            create: productIds.map(pid => ({
              productId: pid,
            })),
          },
        },
        include: {
          products: {
            include: { product: true },
          },
        },
      });

      return created;
    });

    broadcastCatalogUpdated({ action: 'offer_created', offerId: newOffer.id });

    return res.status(201).json({
      success: true,
      message: 'नया ऑफ़र सफलतापूर्वक बनाया गया (Offer created successfully)',
      data: newOffer,
    });
  } catch (error) {
    console.error('Create offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑफ़र बनाने में त्रुटि (Failed to create offer)',
      error: error.message,
    });
  }
};

/**
 * Admin: Update existing offer
 * PUT /api/offers/admin/:id
 */
export const updateOfferAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive,
      minQuantity,
      maxDiscount,
      usageLimit,
      productIds = [],
    } = req.body;

    const existing = await prisma.offer.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'ऑफ़र नहीं मिला (Offer not found)',
      });
    }

    // Fetch products to validate
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'कुछ चुने गए उत्पाद अमान्य हैं (Some selected products are invalid)',
      });
    }

    const validation = validateOfferInput(
      {
        title,
        discountType,
        discountValue,
        startDate,
        endDate,
        minQuantity,
        maxDiscount,
        usageLimit,
        productIds,
      },
      products
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    const updatedOffer = await prisma.$transaction(async (tx) => {
      // Remove existing product links
      await tx.offerProduct.deleteMany({
        where: { offerId: id },
      });

      // Update offer and re-link products
      const updated = await tx.offer.update({
        where: { id },
        data: {
          title: title.trim(),
          description: description !== undefined ? (description?.trim() || null) : existing.description,
          discountType,
          discountValue: Number(discountValue),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
          minQuantity: minQuantity !== undefined ? (minQuantity ? Number(minQuantity) : null) : existing.minQuantity,
          maxDiscount: maxDiscount !== undefined ? (maxDiscount ? Number(maxDiscount) : null) : existing.maxDiscount,
          usageLimit: usageLimit !== undefined ? (usageLimit ? Number(usageLimit) : null) : existing.usageLimit,
          products: {
            create: productIds.map(pid => ({
              productId: pid,
            })),
          },
        },
        include: {
          products: {
            include: { product: true },
          },
        },
      });

      return updated;
    });

    broadcastCatalogUpdated({ action: 'offer_updated', offerId: updatedOffer.id });

    return res.json({
      success: true,
      message: 'ऑफ़र सफलतापूर्वक अपडेट किया गया (Offer updated successfully)',
      data: updatedOffer,
    });
  } catch (error) {
    console.error('Update offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑफ़र अपडेट करने में त्रुटि (Failed to update offer)',
      error: error.message,
    });
  }
};

/**
 * Admin: Quick toggle offer status (Activate / Deactivate)
 * PATCH /api/offers/admin/:id/toggle-status
 */
export const toggleOfferStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.offer.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'ऑफ़र नहीं मिला (Offer not found)',
      });
    }

    const nextStatus = !existing.isActive;
    const updated = await prisma.offer.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    broadcastCatalogUpdated({ action: 'offer_toggled', offerId: updated.id, isActive: nextStatus });

    return res.json({
      success: true,
      message: `ऑफ़र अब ${nextStatus ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'} है`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'स्थिति बदलने में त्रुटि (Failed to toggle offer status)',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete offer safely
 * DELETE /api/offers/admin/:id
 */
export const deleteOfferAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.offer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'ऑफ़र नहीं मिला (Offer not found)',
      });
    }

    // Prisma OrderItem relation is onDelete: SetNull, so historical orders keep snapshots.
    // However, if the offer was applied to past orders, we can also soft-deactivate or delete safely.
    await prisma.offer.delete({
      where: { id },
    });

    broadcastCatalogUpdated({ action: 'offer_deleted', offerId: id });

    return res.json({
      success: true,
      message: 'ऑफ़र सफलतापूर्वक हटा दिया गया (Offer deleted successfully)',
    });
  } catch (error) {
    console.error('Delete offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑफ़र हटाने में त्रुटि (Failed to delete offer)',
      error: error.message,
    });
  }
};
