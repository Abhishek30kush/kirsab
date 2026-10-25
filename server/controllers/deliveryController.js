import { prisma } from '../config/db.js';
import { verifyPin } from '../utils/pinSecurity.js';
import { broadcastOrderStatusUpdated } from '../socket.js';

/**
 * Get assigned orders for the authenticated delivery partner
 */
export const getAssignedOrders = async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const partnerId = req.user.id;

    const where = {
      deliveryPartnerId: partnerId,
    };

    if (status === 'active') {
      where.status = {
        in: ['confirmed', 'preparing', 'ready_for_dispatch', 'out_for_delivery'],
      };
    } else if (status === 'delivered') {
      where.status = 'delivered';
    } else if (status === 'cancelled') {
      where.status = 'cancelled';
    } else if (status !== 'all') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Strip out all PIN secrets before responding to delivery partner
    const sanitized = orders.map((o) => {
      const { deliveryPinHash, deliveryPinEncrypted, ...rest } = o;
      return rest;
    });

    return res.json({
      success: true,
      orders: sanitized,
    });
  } catch (error) {
    console.error('Error fetching partner orders:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर्स लोड करने में त्रुटि (Failed to load partner orders)',
      error: error.message,
    });
  }
};

/**
 * Get single assigned order details for delivery partner
 */
export const getDeliveryOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deliveryPartnerId: partnerId,
      },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        verificationAudits: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला या आपको यह ऑर्डर आवंटित नहीं है (Order not assigned to you)',
      });
    }

    // Strip PIN secrets
    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = order;

    return res.json({
      success: true,
      order: sanitized,
    });
  } catch (error) {
    console.error('Error fetching delivery order details:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर विवरण लोड करने में त्रुटि (Failed to load order)',
      error: error.message,
    });
  }
};

/**
 * Partner accepts the order assignment
 */
export const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deliveryPartnerId: partnerId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not assigned to you)',
      });
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `ऑर्डर '${order.status}' स्थिति में स्वीकार नहीं किया जा सकता (Cannot accept order in current status)`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          acceptedAt: new Date(),
        },
        include: { items: true },
      });

      const audit = await tx.deliveryVerificationAudit.create({
        data: {
          orderId: order.id,
          partnerId,
          actionType: 'order_accepted',
          success: true,
          notes: `Accepted by partner ${req.user.name}`,
        },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: order.status,
          changedBy: `delivery_partner:${req.user.name}`,
          notes: `Assignment accepted by delivery partner ${req.user.name}`,
        },
      });

      return { updatedOrder, history };
    });

    broadcastOrderStatusUpdated(updated.updatedOrder, updated.history).catch((e) =>
      console.error('Socket broadcast error:', e)
    );

    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = updated.updatedOrder;

    return res.json({
      success: true,
      message: 'ऑर्डर सफलतापूर्वक स्वीकार किया गया (Order accepted)',
      order: sanitized,
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर स्वीकार करने में त्रुटि (Failed to accept order)',
      error: error.message,
    });
  }
};

/**
 * Partner marks order as picked up / ready
 */
export const pickupOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deliveryPartnerId: partnerId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'यह ऑर्डर पिकअप के लिए उपलब्ध नहीं है (Order not eligible for pickup)',
      });
    }

    const nextStatus = order.status === 'out_for_delivery' ? 'out_for_delivery' : 'ready_for_dispatch';

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          pickedUpAt: new Date(),
          status: nextStatus,
        },
        include: { items: true },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: nextStatus,
          changedBy: `delivery_partner:${req.user.name}`,
          notes: `Picked up by partner ${req.user.name}`,
        },
      });

      await tx.deliveryVerificationAudit.create({
        data: {
          orderId: order.id,
          partnerId,
          actionType: 'order_picked_up',
          success: true,
          notes: `Order items picked up from hub/store`,
        },
      });

      return { updatedOrder, history };
    });

    broadcastOrderStatusUpdated(updated.updatedOrder, updated.history).catch((e) =>
      console.error('Socket broadcast error:', e)
    );

    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = updated.updatedOrder;

    return res.json({
      success: true,
      message: 'ऑर्डर पिकअप दर्ज किया गया (Order marked as picked up)',
      order: sanitized,
    });
  } catch (error) {
    console.error('Error marking order picked up:', error);
    return res.status(500).json({
      success: false,
      message: 'पिकअप दर्ज करने में त्रुटि (Failed to mark picked up)',
      error: error.message,
    });
  }
};

/**
 * Partner marks order as Out for Delivery
 */
export const markOutForDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deliveryPartnerId: partnerId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'यह ऑर्डर पहले ही डिलीवर हो चुका है (Order already delivered)',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'यह ऑर्डर रद्द है (Order is cancelled)',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'out_for_delivery',
          outForDeliveryAt: new Date(),
          pickedUpAt: order.pickedUpAt || new Date(),
        },
        include: { items: true },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: 'out_for_delivery',
          changedBy: `delivery_partner:${req.user.name}`,
          notes: `Out for delivery by partner ${req.user.name}`,
        },
      });

      await tx.deliveryVerificationAudit.create({
        data: {
          orderId: order.id,
          partnerId,
          actionType: 'order_out_for_delivery',
          success: true,
          notes: 'Marked out for delivery to customer address',
        },
      });

      return { updatedOrder, history };
    });

    broadcastOrderStatusUpdated(updated.updatedOrder, updated.history).catch((e) =>
      console.error('Socket broadcast error:', e)
    );

    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = updated.updatedOrder;

    return res.json({
      success: true,
      message: 'ऑर्डर डिलीवरी के लिए निकल चुका है (Order is now Out for Delivery)',
      order: sanitized,
    });
  } catch (error) {
    console.error('Error marking out for delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'स्थिति बदलने में त्रुटि (Failed to set out for delivery)',
      error: error.message,
    });
  }
};

/**
 * Secure 6-Digit Delivery PIN Verification and Order Completion
 * Atomically verifies PIN, marks delivered, writes audit trail, updates status
 */
export const verifyPinAndDeliver = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const partnerId = req.user.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'कृपया ग्राहक से 6 अंकों का डिलीवरी पिन पूछकर दर्ज करें (6-digit delivery PIN is required)',
      });
    }

    const cleanPin = String(pin).trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      return res.status(400).json({
        success: false,
        message: 'पिन केवल 6 अंकों का होना चाहिए (PIN must be exactly 6 digits)',
      });
    }

    // Atomic transaction for concurrency safety and anti-race protection
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          OR: [{ id }, { orderNumber: id }],
        },
        include: { items: true },
      });

      if (!order) {
        return {
          status: 404,
          data: {
            success: false,
            message: 'ऑर्डर नहीं मिला (Order not found)',
          },
        };
      }

      // Check authorization
      if (order.deliveryPartnerId !== partnerId && req.user.role !== 'admin') {
        return {
          status: 403,
          data: {
            success: false,
            message: 'आपको इस ऑर्डर को डिलीवर करने का अधिकार नहीं है (Not authorized to deliver this order)',
          },
        };
      }

      // Idempotency: if already delivered, return success cleanly
      if (order.status === 'delivered') {
        return {
          status: 200,
          data: {
            success: true,
            alreadyDelivered: true,
            message: 'यह ऑर्डर पहले ही सफलतापूर्वक डिलीवर हो चुका है (Order already delivered)',
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              deliveredAt: order.deliveredAt,
            },
          },
        };
      }

      // Eligibility checks
      if (order.status === 'cancelled') {
        return {
          status: 400,
          data: {
            success: false,
            message: 'रद्द किए गए ऑर्डर को डिलीवर नहीं किया जा सकता (Cannot deliver cancelled order)',
          },
        };
      }

      if (order.status !== 'out_for_delivery') {
        return {
          status: 400,
          data: {
            success: false,
            message: 'पिन सत्यापन से पूर्व ऑर्डर स्थिति "Out for Delivery" होनी चाहिए (Order must be Out for Delivery before PIN verification)',
          },
        };
      }

      if (order.pinConsumedAt) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'इस ऑर्डर का डिलीवरी पिन पहले ही उपयोग किया जा चुका है (PIN already consumed)',
          },
        };
      }

      // Lockout check
      const now = new Date();
      if (order.pinLockedUntil && order.pinLockedUntil > now) {
        const remainingMinutes = Math.ceil((order.pinLockedUntil - now) / 60000);
        return {
          status: 429,
          data: {
            success: false,
            message: `अत्यधिक गलत प्रयासों के कारण पिन सत्यापन ${remainingMinutes} मिनट के लिए लॉक है। (Too many failed attempts. Locked for ${remainingMinutes} min)`,
          },
        };
      }

      if (!order.deliveryPinHash) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'इस ऑर्डर के लिए कोई डिलीवरी पिन कॉन्फ़िगर नहीं है (No PIN configured for order)',
          },
        };
      }

      // Constant-time HMAC comparison (tested with orderNumber as salt)
      const isValid =
        verifyPin(order.orderNumber, cleanPin, order.deliveryPinHash) ||
        verifyPin(order.id, cleanPin, order.deliveryPinHash);

      if (!isValid) {
        const nextFailedAttempts = order.pinFailedAttempts + 1;
        const isLocked = nextFailedAttempts >= order.pinMaxAttempts;
        const lockUntil = isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await tx.order.update({
          where: { id: order.id },
          data: {
            pinFailedAttempts: nextFailedAttempts,
            pinLockedUntil: lockUntil,
          },
        });

        await tx.deliveryVerificationAudit.create({
          data: {
            orderId: order.id,
            partnerId,
            actionType: isLocked ? 'pin_locked' : 'pin_failed',
            success: false,
            attemptCount: nextFailedAttempts,
            notes: isLocked
              ? `Max PIN attempts (${order.pinMaxAttempts}) reached. Locked for 15 mins.`
              : `Incorrect PIN attempt #${nextFailedAttempts}`,
            ipAddress,
            userAgent,
          },
        });

        const attemptsLeft = Math.max(0, order.pinMaxAttempts - nextFailedAttempts);
        return {
          status: 400,
          data: {
            success: false,
            message: isLocked
              ? 'अधिक गलत प्रयासों के कारण पिन सत्यापन 15 मिनट के लिए लॉक हो गया है। (Account locked for 15 minutes)'
              : `गलत डिलीवरी पिन। कृपया ग्राहक से 6 अंकों का सही पिन पूछें। (${attemptsLeft} प्रयास शेष)`,
            attemptsLeft,
          },
        };
      }

      // PIN IS VALID! Complete order atomically
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          pinConsumedAt: new Date(),
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
        include: { items: true },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: 'delivered',
          changedBy: `delivery_partner:${req.user.name}`,
          notes: `Successfully delivered by partner ${req.user.name} via secure 6-digit PIN verification`,
        },
      });

      await tx.deliveryVerificationAudit.create({
        data: {
          orderId: order.id,
          partnerId,
          actionType: 'pin_verified',
          success: true,
          attemptCount: order.pinFailedAttempts,
          notes: 'PIN verified successfully. Delivery confirmed.',
          ipAddress,
          userAgent,
        },
      });

      return {
        status: 200,
        data: {
          success: true,
          message: 'पिन सत्यापित! ऑर्डर सफलतापूर्वक डिलीवर हो गया है। (PIN verified! Order delivered successfully)',
          order: {
            id: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            deliveredAt: updatedOrder.deliveredAt,
            customerName: updatedOrder.customerName,
            finalTotal: updatedOrder.finalTotal,
            paymentStatus: updatedOrder.paymentStatus,
          },
        },
        broadcast: {
          order: updatedOrder,
          history,
        },
      };
    });

    // If verification succeeded and broadcast payload is present, emit Socket.IO events
    if (result.broadcast) {
      broadcastOrderStatusUpdated(result.broadcast.order, result.broadcast.history).catch((e) =>
        console.error('Socket broadcast error after delivery verification:', e)
      );
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('PIN verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'पिन सत्यापन में तकनीकी त्रुटि (Verification failed due to server error)',
      error: error.message,
    });
  }
};
