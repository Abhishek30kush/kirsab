import { prisma } from '../config/db.js';
import { generateOrderNumber } from '../utils/orderId.js';
import { calculateOrderTotals } from '../utils/pricing.js';
import { getOrCreateSettings } from './settingsController.js';
import {
  calculateAuthoritativeStats,
  getPublicAggregateStats,
  getBusinessDayRange,
  VALID_STATUS_TRANSITIONS,
} from '../utils/analytics.js';
import {
  broadcastOrderCreated,
  broadcastOrderStatusUpdated,
} from '../socket.js';
import {
  generateSecurePin,
  hashPin,
  encryptPin,
} from '../utils/pinSecurity.js';

/**
 * Public: Place a new order with atomic PostgreSQL transaction & master price validation
 */
export const createOrder = async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || typeof customer !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'ग्राहक विवरण आवश्यक है (Customer details are required)',
      });
    }

    const { fullName, phone, address, landmark, deliverySlot, instructions } = customer;

    // Validate customer fields
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'कृपया अपना पूरा नाम लिखें (Customer name must be at least 2 characters)',
      });
    }

    const phoneClean = (phone || '').replace(/[^0-9]/g, '');
    if (!phoneClean || phoneClean.length !== 10 || !/^[6-9]\d{9}$/.test(phoneClean)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (Valid 10-digit mobile number required)',
      });
    }

    if (!address || address.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'कृपया अपना टावर व फ्लैट नंबर लिखें (Tower and flat number required)',
      });
    }

    if (!deliverySlot) {
      return res.status(400).json({
        success: false,
        message: 'कृपया डिलीवरी स्लॉट चुनें (Delivery slot is required)',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'आपकी टोकरी खाली है (Order items cannot be empty)',
      });
    }

    // Fetch store settings from DB
    const storeSettings = await getOrCreateSettings();

    // Fetch master products for all items requested
    const requestedProductIds = items.map(i => i.productId).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: requestedProductIds } },
    });

    // Fetch currently active offers from database
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

    // Perform strict server-side calculation and price validation
    const {
      subtotal,
      discountTotal,
      deliveryFee,
      finalTotal,
      verifiedOrderItems,
      appliedOfferIds,
    } = calculateOrderTotals({
      items,
      products: dbProducts,
      storeSettings,
      offers: activeOffers,
      now,
    });

    const orderNumber = generateOrderNumber();

    // Generate cryptographically secure 6-digit delivery PIN (Module 4)
    const rawDeliveryPin = generateSecurePin();
    const deliveryPinHash = hashPin(orderNumber, rawDeliveryPin);
    const deliveryPinEncrypted = encryptPin(rawDeliveryPin);

    // Resolve authenticated customerId if user is logged in
    const customerId = req.user && req.user.role === 'customer' ? req.user.id : null;

    // Atomic transaction in PostgreSQL to save Order, immutable OrderItem snapshots, update offer usage, and initial history record
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Validate usage limits for applied offers inside transaction
      if (appliedOfferIds && appliedOfferIds.length > 0) {
        const lockedOffers = await tx.offer.findMany({
          where: { id: { in: appliedOfferIds } },
          select: { id: true, title: true, usageLimit: true, usageCount: true },
        });

        for (const off of lockedOffers) {
          if (off.usageLimit != null && off.usageCount >= off.usageLimit) {
            throw new Error(`ऑफ़र '${off.title}' की अधिकतम उपयोग सीमा पूरी हो चुकी है (Offer usage limit reached)`);
          }
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          customerName: fullName.trim(),
          customerPhone: phoneClean,
          address: address.trim(),
          landmark: landmark ? landmark.trim() : null,
          deliverySlot,
          instructions: instructions ? instructions.trim() : null,
          subtotal,
          discountTotal: discountTotal || 0,
          deliveryFee,
          finalTotal,
          status: 'pending',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          deliveryPinHash,
          deliveryPinEncrypted,
          pinGeneratedAt: new Date(),
          items: {
            create: verifiedOrderItems.map(item => ({
              productId: item.productId,
              productNameEn: item.productNameEn,
              productNameHi: item.productNameHi,
              unit: item.unit,
              unitPrice: item.unitPrice,
              originalUnitPrice: item.originalUnitPrice || item.unitPrice,
              discountPerUnit: item.discountPerUnit || 0,
              discountAmount: item.discountAmount || 0,
              offerId: item.offerId || null,
              offerTitle: item.offerTitle || null,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: 'pending',
              changedBy: customerId ? `customer:${customerId}` : 'customer',
              notes: 'Initial order placement by customer',
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
        },
      });

      // Increment usage count for applied offers
      if (appliedOfferIds && appliedOfferIds.length > 0) {
        await tx.offer.updateMany({
          where: { id: { in: appliedOfferIds } },
          data: { usageCount: { increment: 1 } },
        });
      }

      return order;
    });

    // Real-time broadcast after transaction successfully commits
    broadcastOrderCreated(createdOrder).catch(err => {
      console.error('Real-time order creation broadcast error:', err);
    });

    // Format WhatsApp confirmation text for the customer
    let whatsappText = `🛒 *ऑर्डर पुष्टि — ${storeSettings.brandName} (${storeSettings.brandNameHindi})*\n`;
    whatsappText += `━━━━━━━━━━━━━━━━━━━━━\n`;
    whatsappText += `🔖 *ऑर्डर संदर्भ (Order ID):* #${createdOrder.orderNumber}\n`;
    whatsappText += `👤 ग्राहक: ${createdOrder.customerName} (+91 ${createdOrder.customerPhone})\n`;
    whatsappText += `📍 पता: ${createdOrder.address}\n`;
    if (createdOrder.landmark) whatsappText += `📌 लैंडमार्क: ${createdOrder.landmark}\n`;
    whatsappText += `⏰ स्लॉट: ${createdOrder.deliverySlot}\n\n`;

    whatsappText += `🥬 *सब्ज़ियाँ (Items):*\n`;
    createdOrder.items.forEach((item, idx) => {
      const discountNote = item.discountAmount > 0
        ? ` [छूट: ₹${item.discountAmount} (${item.offerTitle || 'ऑफ़र'})]`
        : '';
      const originalPriceNote = item.originalUnitPrice && item.originalUnitPrice > item.unitPrice
        ? ` (मूल: ₹${item.originalUnitPrice})`
        : '';
      whatsappText += `${idx + 1}. *${item.productNameHi}* (${item.productNameEn})\n`;
      whatsappText += `   मात्रा: ${item.quantity} × ${item.unit} @ ₹${item.unitPrice}${originalPriceNote} = *₹${item.lineTotal}*${discountNote}\n`;
    });

    whatsappText += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    whatsappText += `📦 सब्ज़ी योग (Subtotal): ₹${createdOrder.subtotal}\n`;
    if (createdOrder.discountTotal > 0) {
      whatsappText += `🎉 *ऑफ़र बचत (Total Discount): -₹${createdOrder.discountTotal}*\n`;
    }
    whatsappText += `🚚 डिलीवरी शुल्क: ${createdOrder.deliveryFee === 0 ? '*मुफ़्त (FREE)*' : `₹${createdOrder.deliveryFee}`}\n`;
    whatsappText += `💰 *कुल देय राशि: ₹${createdOrder.finalTotal}*\n`;
    whatsappText += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (createdOrder.instructions) {
      whatsappText += `📝 निर्देश: "${createdOrder.instructions}"\n\n`;
    }

    whatsappText += `🔒 *डिलीवरी पिन (Delivery PIN):* ${rawDeliveryPin}\n`;
    whatsappText += `   _(कृपया यह 6-अंकों का पिन केवल डिलीवरी पार्टनर के आपके पते पर पहुँचने के बाद ही साझा करें)_\n\n`;
    whatsappText += `📌 *नोट:* यह ऑर्डर सिस्टम में सुरक्षित दर्ज हो चुका है। कृपया यह संदेश भेजकर पुष्टि करें।\n`;
    whatsappText += `_${storeSettings.tagline}_`;

    let whatsappUrl = null;
    if (
      storeSettings.whatsappNumber &&
      storeSettings.whatsappNumber !== 'REPLACE_WITH_BUSINESS_NUMBER'
    ) {
      const cleanWaNum = storeSettings.whatsappNumber.replace(/[^0-9]/g, '');
      whatsappUrl = `https://wa.me/${cleanWaNum}?text=${encodeURIComponent(whatsappText)}`;
    }

    const { deliveryPinHash: _h, deliveryPinEncrypted: _e, ...sanitizedOrder } = createdOrder;

    return res.status(201).json({
      success: true,
      message: 'ऑर्डर सफलतापूर्वक दर्ज हो गया है (Order placed successfully)',
      order: {
        ...sanitizedOrder,
        deliveryPin: rawDeliveryPin,
      },
      deliveryPin: rawDeliveryPin,
      whatsappUrl,
      whatsappMessage: whatsappText,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'ऑर्डर दर्ज करने में त्रुटि (Failed to place order)',
    });
  }
};

/**
 * Admin: Get all orders with status filter, search and pagination
 */
export const getOrdersAdmin = async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          deliveryPartner: {
            select: { id: true, name: true, phone: true, vehicleType: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    // Sanitize any PIN secrets from admin listings
    const sanitizedOrders = orders.map(o => {
      const { deliveryPinHash, deliveryPinEncrypted, ...rest } = o;
      return rest;
    });

    return res.json({
      success: true,
      data: sanitizedOrders,
      pagination: {
        total: totalCount,
        page: Number(page) || 1,
        limit: take,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर्स लोड करने में त्रुटि (Failed to fetch orders)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get single order by ID with items and status audit history
 */
export const getOrderByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        deliveryPartner: {
          select: { id: true, name: true, phone: true, vehicleType: true, vehicleNumber: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        verificationAudits: {
          orderBy: { createdAt: 'desc' },
          include: {
            partner: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = order;

    return res.json({ success: true, data: sanitized });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि (Server error)',
      error: error.message,
    });
  }
};

/**
 * Admin: Update order status with lifecycle validation, audit history & real-time broadcast
 */
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, force = false } = req.body;

    const validStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'packed',
      'ready_for_dispatch',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `अमान्य स्थिति। मान्य स्थितियां: ${validStatuses.join(', ')}`,
      });
    }

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    // Validate lifecycle transition (unless forced by admin)
    if (!force && currentOrder.status !== status) {
      const allowedNext = VALID_STATUS_TRANSITIONS[currentOrder.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `अमान्य स्थिति परिवर्तन: '${currentOrder.status}' से '${status}' में नहीं बदला जा सकता। मान्य स्थितियां: ${allowedNext.join(', ')}`,
        });
      }
    }

    // Execute status change and history creation in an atomic transaction
    const { updatedOrder, historyEntry } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          previousStatus: currentOrder.status,
          newStatus: status,
          changedBy: req.user?.email || 'admin',
          notes: notes ? notes.trim() : null,
        },
      });

      return { updatedOrder: order, historyEntry: history };
    });

    // Real-time broadcast after successful database transaction
    broadcastOrderStatusUpdated(updatedOrder, historyEntry).catch(err => {
      console.error('Real-time status update broadcast error:', err);
    });

    // Generate WhatsApp customer update template
    const statusHindiMap = {
      pending: 'स्वीकृति प्रतीक्षारत (Pending)',
      confirmed: 'स्वीकृत हो चुका है (Confirmed)',
      preparing: 'तैयार किया जा रहा है (Preparing)',
      packed: 'पैक हो गया है (Packed)',
      ready_for_dispatch: 'डिस्पैच हेतु तैयार (Ready for Dispatch)',
      out_for_delivery: 'डिलीवरी के लिए निकल चुका है (Out for Delivery)',
      delivered: 'सफलतापूर्वक डिलीवर हो गया है (Delivered)',
      cancelled: 'रद्द कर दिया गया है (Cancelled)',
    };

    const customerUpdateMessage = `नमस्ते ${updatedOrder.customerName} जी,\n` +
      `आपके KIRSAB ऑर्डर *#${updatedOrder.orderNumber}* की स्थिति अपडेट होकर *${statusHindiMap[status] || status}* हो गई है।\n` +
      `कुल राशि: ₹${updatedOrder.finalTotal} | स्लॉट: ${updatedOrder.deliverySlot}\n` +
      `धन्यवाद, KIRSAB (शेरवानी लेगेसी, प्रयागराज)`;

    const customerPhoneClean = updatedOrder.customerPhone.replace(/[^0-9]/g, '');
    const notifyWhatsAppUrl = `https://wa.me/91${customerPhoneClean}?text=${encodeURIComponent(customerUpdateMessage)}`;

    return res.json({
      success: true,
      message: `ऑर्डर स्थिति बदलकर '${statusHindiMap[status] || status}' कर दी गई है`,
      data: updatedOrder,
      history: historyEntry,
      notifyWhatsAppUrl,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर स्थिति अपडेट करने में त्रुटि',
      error: error.message,
    });
  }
};

/**
 * Admin: Permanent, authoritative order analytics
 * GET /api/orders/admin/analytics
 */
export const getOrderAnalyticsAdmin = async (req, res) => {
  try {
    const stats = await calculateAuthoritativeStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Order analytics fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'एनालिटिक्स लोड करने में त्रुटि (Failed to load order analytics)',
      error: error.message,
    });
  }
};

/**
 * Admin: Live Orders Monitoring with filtering, searching, and pagination
 * GET /api/orders/admin/live
 */
export const getLiveOrdersAdmin = async (req, res) => {
  try {
    const { status, date, search, page = 1, limit = 25 } = req.query;
    const where = {};

    if (status && status !== 'all') {
      if (status === 'preparing') {
        where.status = { in: ['preparing', 'packed'] };
      } else if (status === 'active') {
        where.status = {
          in: ['pending', 'confirmed', 'preparing', 'packed', 'ready_for_dispatch', 'out_for_delivery'],
        };
      } else {
        where.status = status;
      }
    }

    if (date) {
      const { startOfToday } = getBusinessDayRange();
      if (date === 'today') {
        where.createdAt = { gte: startOfToday };
      } else if (date === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        where.createdAt = { gte: d };
      } else if (date === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        where.createdAt = { gte: d };
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(1, Number(limit) || 25), 100);
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      address: o.address,
      landmark: o.landmark,
      deliverySlot: o.deliverySlot,
      instructions: o.instructions,
      itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      finalTotal: o.finalTotal,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      lastStatusUpdate: o.statusHistory[0]?.createdAt || o.updatedAt,
      items: o.items,
    }));

    return res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Live orders fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'लाइव ऑर्डर्स लोड करने में त्रुटि (Failed to fetch live orders)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get order status audit history
 * GET /api/orders/admin/:id/history
 */
export const getOrderStatusHistoryAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      order,
      history,
    });
  } catch (error) {
    console.error('Order history fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर इतिहास लोड करने में त्रुटि (Failed to fetch order history)',
      error: error.message,
    });
  }
};

/**
 * Public: Aggregate live order counter (Strictly privacy safe, zero PII, zero private data)
 * GET /api/orders/public-stats
 */
export const getPublicOrderStats = async (req, res) => {
  try {
    const stats = await calculateAuthoritativeStats();
    return res.json({
      success: true,
      stats: getPublicAggregateStats(stats),
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'सांख्यिकी लोड करने में त्रुटि',
      error: error.message,
    });
  }
};

/**
 * Admin: Daily sales summary & dashboard statistics (Backward compatibility for existing Overview tab)
 */
export const getDailySalesStatsAdmin = async (req, res) => {
  try {
    const [stats, productsCount] = await Promise.all([
      calculateAuthoritativeStats(),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    return res.json({
      success: true,
      stats: {
        totalOrders: stats.totalOrders,
        todayOrders: stats.todayOrders,
        pendingOrders: stats.pendingOrders,
        deliveredOrders: stats.completedOrders,
        totalRevenue: stats.totalRevenue,
        todayRevenue: stats.todayRevenue,
        activeProductsCount: productsCount,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'सांख्यिकी लोड करने में त्रुटि',
      error: error.message,
    });
  }
};
