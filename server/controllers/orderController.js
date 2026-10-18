import { prisma } from '../config/db.js';
import { generateOrderNumber } from '../utils/orderId.js';
import { calculateOrderTotals } from '../utils/pricing.js';
import { getOrCreateSettings } from './settingsController.js';

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

    // Perform strict server-side calculation and price validation
    const {
      subtotal,
      deliveryFee,
      finalTotal,
      verifiedOrderItems,
    } = calculateOrderTotals({
      items,
      products: dbProducts,
      storeSettings,
    });

    const orderNumber = generateOrderNumber();

    // Atomic transaction in PostgreSQL to save Order and immutable OrderItem snapshots
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: fullName.trim(),
          customerPhone: phoneClean,
          address: address.trim(),
          landmark: landmark ? landmark.trim() : null,
          deliverySlot,
          instructions: instructions ? instructions.trim() : null,
          subtotal,
          deliveryFee,
          finalTotal,
          status: 'pending',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          items: {
            create: verifiedOrderItems.map(item => ({
              productId: item.productId,
              productNameEn: item.productNameEn,
              productNameHi: item.productNameHi,
              unit: item.unit,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return order;
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
      whatsappText += `${idx + 1}. *${item.productNameHi}* (${item.productNameEn})\n`;
      whatsappText += `   मात्रा: ${item.quantity} × ${item.unit} @ ₹${item.unitPrice} = *₹${item.lineTotal}*\n`;
    });

    whatsappText += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    whatsappText += `📦 सब्ज़ी योग (Subtotal): ₹${createdOrder.subtotal}\n`;
    whatsappText += `🚚 डिलीवरी शुल्क: ${createdOrder.deliveryFee === 0 ? '*मुफ़्त (FREE)*' : `₹${createdOrder.deliveryFee}`}\n`;
    whatsappText += `💰 *कुल देय राशि: ₹${createdOrder.finalTotal}*\n`;
    whatsappText += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (createdOrder.instructions) {
      whatsappText += `📝 निर्देश: "${createdOrder.instructions}"\n\n`;
    }

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

    return res.status(201).json({
      success: true,
      message: 'ऑर्डर सफलतापूर्वक दर्ज हो गया है (Order placed successfully)',
      order: createdOrder,
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
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      success: true,
      data: orders,
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
 * Admin: Get single order by ID
 */
export const getOrderByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि (Server error)',
      error: error.message,
    });
  }
};

/**
 * Admin: Update order status
 */
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'pending',
      'confirmed',
      'packed',
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

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    // Generate WhatsApp customer update template
    const statusHindiMap = {
      pending: 'स्वीकृति प्रतीक्षारत (Pending)',
      confirmed: 'स्वीकृत हो चुका है (Confirmed)',
      packed: 'पैक हो गया है (Packed)',
      out_for_delivery: 'डिलीवरी के लिए निकल चुका है (Out for Delivery)',
      delivered: 'सफलतापूर्वक डिलीवर हो गया है (Delivered)',
      cancelled: 'रद्द कर दिया गया है (Cancelled)',
    };

    const customerUpdateMessage = `नमस्ते ${updated.customerName} जी,\n` +
      `आपके KIRSAB ऑर्डर *#${updated.orderNumber}* की स्थिति अपडेट होकर *${statusHindiMap[status] || status}* हो गई है।\n` +
      `कुल राशि: ₹${updated.finalTotal} | स्लॉट: ${updated.deliverySlot}\n` +
      `धन्यवाद, KIRSAB (शेरवानी लेगेसी, प्रयागराज)`;

    const customerPhoneClean = updated.customerPhone.replace(/[^0-9]/g, '');
    const notifyWhatsAppUrl = `https://wa.me/91${customerPhoneClean}?text=${encodeURIComponent(customerUpdateMessage)}`;

    return res.json({
      success: true,
      message: `ऑर्डर स्थिति बदलकर '${status}' कर दी गई है`,
      data: updated,
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
 * Admin: Daily sales summary & dashboard statistics
 */
export const getDailySalesStatsAdmin = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      allDelivered,
      todayDelivered,
      productsCount,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'delivered' } }),
      prisma.order.findMany({
        where: { status: { not: 'cancelled' } },
        select: { finalTotal: true },
      }),
      prisma.order.findMany({
        where: {
          status: { not: 'cancelled' },
          createdAt: { gte: startOfToday },
        },
        select: { finalTotal: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
    ]);

    const totalRevenue = allDelivered.reduce((sum, o) => sum + o.finalTotal, 0);
    const todayRevenue = todayDelivered.reduce((sum, o) => sum + o.finalTotal, 0);

    return res.json({
      success: true,
      stats: {
        totalOrders,
        todayOrders,
        pendingOrders,
        deliveredOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        todayRevenue: Number(todayRevenue.toFixed(2)),
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
