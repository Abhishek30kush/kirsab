import { prisma } from '../config/db.js';
import { resolveBestOfferForProduct, roundMoney } from '../utils/discountCalculator.js';
import { broadcastCatalogUpdated } from '../socket.js';

// Allowed standard package units to prevent mixing units
export const ALLOWED_UNITS = [
  { unit: '1 kg', unitHindi: 'प्रति किलो', unitShort: 'kg' },
  { unit: '500 g', unitHindi: 'प्रति 500 ग्राम', unitShort: '500g' },
  { unit: '250 g', unitHindi: 'प्रति 250 ग्राम', unitShort: '250g' },
  { unit: '100 g', unitHindi: 'प्रति 100 ग्राम', unitShort: '100g' },
  { unit: '1 bunch', unitHindi: 'प्रति गड्डी', unitShort: 'bunch' },
  { unit: '1 piece', unitHindi: 'प्रति पीस', unitShort: 'piece' },
  { unit: '4 pieces', unitHindi: '4 पीस का सेट', unitShort: '4 pcs' },
];

/**
 * Public: Get active products for customer shop
 */
export const getPublicProducts = async (req, res) => {
  try {
    // Ensure browsers & reverse proxies never serve stale product data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            nameHi: true,
            nameEn: true,
            displayOrder: true,
          },
        },
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    const now = new Date();
    const activeOffers = await prisma.offer.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        products: true,
      },
    });

    const eligibleOffers = activeOffers.filter(
      o => o.usageLimit == null || (o.usageCount || 0) < o.usageLimit
    );

    const enrichedProducts = products.map(prod => {
      const bestOffer = resolveBestOfferForProduct({
        product: prod,
        activeOffers: eligibleOffers,
        quantity: 1,
        now,
      });

      if (bestOffer && bestOffer.eligible && bestOffer.discountPerUnit > 0) {
        return {
          ...prod,
          originalPrice: prod.price,
          discountedPrice: bestOffer.finalUnitPrice,
          discountPerUnit: bestOffer.discountPerUnit,
          discountPercentage: prod.price ? Math.round((bestOffer.discountPerUnit / Number(prod.price)) * 100) : 0,
          activeOffer: {
            id: bestOffer.offerId,
            title: bestOffer.offerTitle,
            description: bestOffer.offerDescription,
            discountType: bestOffer.discountType,
            discountValue: bestOffer.discountValue,
            endDate: bestOffer.endDate,
            minQuantity: bestOffer.minQuantity,
          },
        };
      }

      return {
        ...prod,
        originalPrice: prod.price,
        discountedPrice: prod.price,
        discountPerUnit: 0,
        discountPercentage: 0,
        activeOffer: null,
      };
    });

    return res.json({
      success: true,
      data: enrichedProducts,
      count: enrichedProducts.length,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching public products:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्पाद लोड करने में असमर्थ (Failed to fetch products)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all products (including inactive and unconfigured)
 */
export const getAllProductsAdmin = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { category, search } = req.query;

    const where = {};
    if (category && category !== 'all') {
      where.categoryId = category;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameHi: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { nameEn: 'asc' },
      ],
    });

    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return res.json({
      success: true,
      data: products,
      categories,
      count: products.length,
    });
  } catch (error) {
    console.error('Admin products fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्पाद लोड करने में त्रुटि (Failed to fetch admin products)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get single product
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'उत्पाद नहीं मिला (Product not found)',
      });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि (Server error)',
      error: error.message,
    });
  }
};

/**
 * Admin: Create new product
 */
export const createProduct = async (req, res) => {
  try {
    const {
      id,
      nameEn,
      nameHi,
      categoryId,
      unit,
      unitHindi,
      unitShort,
      price,
      inStock = true,
      isActive = true,
      stockQuantity = 50,
      badge,
      description,
      image,
      fallbackEmoji,
    } = req.body;

    if (!nameEn || !nameHi || !categoryId || !unit || !image) {
      return res.status(400).json({
        success: false,
        message: 'सभी अनिवार्य फ़ील्ड भरें (Name, category, unit and image are required)',
      });
    }

    const productId = id
      ? id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : nameEn.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    // Check if ID exists
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `उत्पाद ID '${productId}' पहले से मौजूद है (Product ID already exists)`,
      });
    }

    // Verify category exists
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return res.status(400).json({
        success: false,
        message: 'अमान्य श्रेणी (Invalid category)',
      });
    }

    const parsedPrice = price !== undefined && price !== null && price !== '' ? Number(price) : null;
    const isConfigured = parsedPrice !== null && parsedPrice > 0;

    const newProduct = await prisma.product.create({
      data: {
        id: productId,
        nameEn: nameEn.trim(),
        nameHi: nameHi.trim(),
        categoryId,
        unit: unit.trim(),
        unitHindi: unitHindi?.trim() || unit.trim(),
        unitShort: unitShort?.trim() || unit.trim(),
        price: parsedPrice,
        isConfigured,
        inStock: Boolean(inStock),
        isActive: Boolean(isActive),
        stockQuantity: Number(stockQuantity) || 50,
        badge: badge?.trim() || null,
        description: description?.trim() || null,
        image: image.trim(),
        fallbackEmoji: fallbackEmoji?.trim() || '🥬',
      },
      include: { category: true },
    });

    // Instantly broadcast catalog update with new product & image to all clients
    broadcastCatalogUpdated({
      action: 'created',
      productId: newProduct.id,
      image: newProduct.image,
      product: newProduct,
    });

    return res.status(201).json({
      success: true,
      message: 'नया उत्पाद सफलतापूर्वक जोड़ा गया (Product created successfully)',
      data: newProduct,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्पाद जोड़ने में त्रुटि (Failed to create product)',
      error: error.message,
    });
  }
};

/**
 * Admin: Update existing product
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nameEn,
      nameHi,
      categoryId,
      unit,
      unitHindi,
      unitShort,
      price,
      inStock,
      isActive,
      stockQuantity,
      badge,
      description,
      image,
      fallbackEmoji,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'उत्पाद नहीं मिला (Product not found)',
      });
    }

    const updateData = {};
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim();
    if (nameHi !== undefined) updateData.nameHi = nameHi.trim();
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (unit !== undefined) updateData.unit = unit.trim();
    if (unitHindi !== undefined) updateData.unitHindi = unitHindi.trim();
    if (unitShort !== undefined) updateData.unitShort = unitShort.trim();

    if (price !== undefined) {
      if (price === null || price === '' || isNaN(Number(price))) {
        updateData.price = null;
        updateData.isConfigured = false;
      } else {
        const numPrice = Number(price);
        updateData.price = numPrice > 0 ? numPrice : null;
        updateData.isConfigured = numPrice > 0;
      }
    }

    if (inStock !== undefined) updateData.inStock = Boolean(inStock);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (stockQuantity !== undefined) updateData.stockQuantity = Number(stockQuantity);
    if (badge !== undefined) updateData.badge = badge ? badge.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (image !== undefined) updateData.image = image.trim();
    if (fallbackEmoji !== undefined) updateData.fallbackEmoji = fallbackEmoji ? fallbackEmoji.trim() : '🥬';

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    // Instantly broadcast catalog update with newly updated image and details to all clients
    broadcastCatalogUpdated({
      action: 'updated',
      productId: updated.id,
      image: updated.image,
      product: updated,
    });

    return res.json({
      success: true,
      message: 'उत्पाद सफलतापूर्वक अपडेट किया गया (Product updated successfully)',
      data: updated,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्पाद अपडेट करने में त्रुटि (Failed to update product)',
      error: error.message,
    });
  }
};

/**
 * Admin: Quick toggle in-stock / out-of-stock
 */
export const toggleStock = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'उत्पाद नहीं मिला (Product not found)',
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { inStock: !existing.inStock },
    });

    // Broadcast stock change
    broadcastCatalogUpdated({
      action: 'stock_toggled',
      productId: updated.id,
      inStock: updated.inStock,
      product: updated,
    });

    return res.json({
      success: true,
      message: `स्टॉक स्थिति: ${updated.inStock ? 'उपलब्ध (In Stock)' : 'समाप्त (Out of Stock)'}`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'स्टॉक बदलने में त्रुटि (Failed to toggle stock)',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete product
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product is in any existing orders
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemCount > 0) {
      // Soft-delete to preserve order history integrity
      await prisma.product.update({
        where: { id },
        data: { isActive: false, inStock: false },
      });

      broadcastCatalogUpdated({
        action: 'deactivated',
        productId: id,
      });

      return res.json({
        success: true,
        message: 'उत्पाद को निष्क्रिय कर दिया गया क्योंकि यह पुराने ऑर्डर्स में दर्ज है (Product deactivated to protect historical order integrity)',
      });
    }

    await prisma.product.delete({ where: { id } });

    broadcastCatalogUpdated({
      action: 'deleted',
      productId: id,
    });

    return res.json({
      success: true,
      message: 'उत्पाद सफलतापूर्वक हटा दिया गया (Product deleted successfully)',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'उत्पाद हटाने में त्रुटि (Failed to delete product)',
      error: error.message,
    });
  }
};

