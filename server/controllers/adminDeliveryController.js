import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { broadcastOrderStatusUpdated, broadcastOrderAssignedToPartner } from '../socket.js';


/**
 * Admin: List all delivery partners with order metrics
 */
export const getDeliveryPartners = async (req, res) => {
  try {
    const partners = await prisma.user.findMany({
      where: { role: 'delivery_partner' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        vehicleType: true,
        vehicleNumber: true,
        createdAt: true,
        _count: {
          select: {
            assignedDeliveries: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute active vs completed count for each partner
    const partnerIds = partners.map((p) => p.id);
    const completedCounts = await prisma.order.groupBy({
      by: ['deliveryPartnerId'],
      where: {
        deliveryPartnerId: { in: partnerIds },
        status: 'delivered',
      },
      _count: { _all: true },
    });

    const activeCounts = await prisma.order.groupBy({
      by: ['deliveryPartnerId'],
      where: {
        deliveryPartnerId: { in: partnerIds },
        status: { in: ['confirmed', 'preparing', 'ready_for_dispatch', 'out_for_delivery'] },
      },
      _count: { _all: true },
    });

    const completedMap = Object.fromEntries(
      completedCounts.map((c) => [c.deliveryPartnerId, c._count._all])
    );
    const activeMap = Object.fromEntries(
      activeCounts.map((c) => [c.deliveryPartnerId, c._count._all])
    );

    const enriched = partners.map((p) => ({
      ...p,
      activeOrdersCount: activeMap[p.id] || 0,
      completedOrdersCount: completedMap[p.id] || 0,
    }));

    return res.json({
      success: true,
      partners: enriched,
    });
  } catch (error) {
    console.error('Error fetching delivery partners:', error);
    return res.status(500).json({
      success: false,
      message: 'डिलीवरी पार्टनर्स लोड करने में त्रुटि (Failed to load delivery partners)',
      error: error.message,
    });
  }
};

/**
 * Admin: Create a new delivery partner account
 */
export const createDeliveryPartner = async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType = 'Bike', vehicleNumber } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'पार्टनर का नाम कम से कम 2 अक्षर होना चाहिए (Partner name required)',
      });
    }

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'मान्य 10 अंकों का मोबाइल नंबर आवश्यक है (Valid 10-digit mobile number required)',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be >= 6 characters)',
      });
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, cleanEmail ? { email: cleanEmail } : null].filter(Boolean),
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'यह मोबाइल नंबर या ईमेल पहले से किसी खाते से जुड़ा है (Phone/email already in use)',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const partner = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash,
        role: 'delivery_partner',
        isActive: true,
        vehicleType: vehicleType.trim(),
        vehicleNumber: vehicleNumber ? vehicleNumber.trim() : null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        vehicleType: true,
        vehicleNumber: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'डिलीवरी पार्टनर सफलतापूर्वक बनाया गया (Delivery partner account created)',
      partner,
    });
  } catch (error) {
    console.error('Error creating delivery partner:', error);
    return res.status(500).json({
      success: false,
      message: 'पार्टनर खाता बनाने में त्रुटि (Failed to create partner account)',
      error: error.message,
    });
  }
};

/**
 * Admin: Update delivery partner (toggle active, update details, reset password)
 */
export const updateDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, isActive, vehicleType, vehicleNumber, password } = req.body;

    const partner = await prisma.user.findFirst({
      where: { id, role: 'delivery_partner' },
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'डिलीवरी पार्टनर नहीं मिला (Partner not found)',
      });
    }

    const data = {};
    if (name) data.name = name.trim();
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) data.phone = cleanPhone;
    }
    if (email !== undefined) {
      data.email = email && email.trim() ? email.trim().toLowerCase() : null;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (vehicleType) data.vehicleType = vehicleType.trim();
    if (vehicleNumber !== undefined) {
      data.vehicleNumber = vehicleNumber ? vehicleNumber.trim() : null;
    }
    if (password && password.length >= 6) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        vehicleType: true,
        vehicleNumber: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      message: 'पार्टनर विवरण अपडेट किया गया (Partner details updated)',
      partner: updated,
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    return res.status(500).json({
      success: false,
      message: 'अपडेट करने में त्रुटि (Update failed)',
      error: error.message,
    });
  }
};

/**
 * Admin: Reset or auto-generate delivery partner password
 */
export const resetDeliveryPartnerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    let { password } = req.body;

    const partner = await prisma.user.findFirst({
      where: { id, role: 'delivery_partner' },
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'डिलीवरी पार्टनर नहीं मिला (Partner not found)',
      });
    }

    // Auto-generate 6-digit formatted memorable password if not explicitly provided
    if (!password || String(password).trim().length < 6) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      password = `KIR-${randomDigits}`;
    } else {
      password = String(password).trim();
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: `${partner.name} का नया पासवर्ड सफलतापूर्वक तैयार हो गया (Password reset successful)`,
      partner: {
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
      },
      newPassword: password,
    });
  } catch (error) {
    console.error('Error resetting partner password:', error);
    return res.status(500).json({
      success: false,
      message: 'पासवर्ड रीसेट करने में त्रुटि (Failed to reset password)',
      error: error.message,
    });
  }
};


/**
 * Admin: Assign or reassign order to delivery partner
 */
export const assignOrderDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerId, notes } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'कृपया डिलीवरी पार्टनर चुनें (Delivery partner ID is required)',
      });
    }

    // Verify order
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { deliveryPartner: true },
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
        message: 'डिलीवर हो चुके ऑर्डर को पुनः असाइन नहीं किया जा सकता (Cannot reassign delivered order)',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'रद्द किए गए ऑर्डर को असाइन नहीं किया जा सकता (Cannot assign cancelled order)',
      });
    }

    // Verify partner
    const partner = await prisma.user.findFirst({
      where: { id: partnerId, role: 'delivery_partner', isActive: true },
    });

    if (!partner) {
      return res.status(400).json({
        success: false,
        message: 'चयनित पार्टनर सक्रिय नहीं है या मौजूद नहीं है (Partner not active or does not exist)',
      });
    }

    const isReassignment = Boolean(order.deliveryPartnerId && order.deliveryPartnerId !== partnerId);
    const actionType = isReassignment ? 'order_reassigned' : 'order_assigned';
    const auditNotes = isReassignment
      ? `Reassigned from ${order.deliveryPartner?.name || 'previous partner'} to ${partner.name}. ${notes || ''}`
      : `Assigned to delivery partner ${partner.name}. ${notes || ''}`;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          deliveryPartnerId: partner.id,
          assignedAt: new Date(),
          // If order is still pending, move to confirmed
          ...(order.status === 'pending' ? { status: 'confirmed' } : {}),
        },
        include: {
          items: true,
          deliveryPartner: {
            select: { id: true, name: true, phone: true, vehicleType: true },
          },
        },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: updatedOrder.status,
          changedBy: `admin:${req.user.name || 'Admin'}`,
          notes: auditNotes,
        },
      });

      await tx.deliveryVerificationAudit.create({
        data: {
          orderId: order.id,
          partnerId: partner.id,
          actionType,
          success: true,
          notes: auditNotes,
        },
      });

      return { updatedOrder, history };
    });

    broadcastOrderStatusUpdated(updated.updatedOrder, updated.history).catch((e) =>
      console.error('Socket broadcast error on assignment:', e)
    );

    broadcastOrderAssignedToPartner(partner.id, updated.updatedOrder, {
      isReassignment,
      notes: auditNotes,
      assignedBy: req.user?.name || 'Admin',
    }).catch((e) =>
      console.error('Socket broadcast error on partner assignment:', e)
    );

    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = updated.updatedOrder;

    return res.json({
      success: true,
      message: `ऑर्डर सफलतापूर्वक ${partner.name} को सौंपा गया (Order assigned to ${partner.name})`,
      order: sanitized,
    });
  } catch (error) {
    console.error('Error assigning order:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर असाइन करने में त्रुटि (Assignment failed)',
      error: error.message,
    });
  }
};

/**
 * Admin: Get delivery verification and status audit history for single order
 */
export const getOrderDeliveryAudit = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        assignedAt: true,
        acceptedAt: true,
        pickedUpAt: true,
        outForDeliveryAt: true,
        deliveredAt: true,
        pinConsumedAt: true,
        pinFailedAttempts: true,
        pinLockedUntil: true,
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
          },
        },
        verificationAudits: {
          orderBy: { createdAt: 'desc' },
          include: {
            partner: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order delivery audit:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑडिट इतिहास लोड करने में त्रुटि (Failed to load audit history)',
      error: error.message,
    });
  }
};

/**
 * Admin: Remove / Unassign delivery partner from an order
 */
export const removeOrderDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: {
        deliveryPartner: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    if (!order.deliveryPartnerId) {
      return res.status(400).json({
        success: false,
        message: 'इस ऑर्डर पर पहले से कोई डिलीवरी पार्टनर असाइन नहीं है (No delivery partner currently assigned)',
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'डिलीवर हो चुके ऑर्डर से पार्टनर नहीं हटाया जा सकता (Cannot remove partner from delivered order)',
      });
    }

    const previousPartner = order.deliveryPartner;
    const previousPartnerId = order.deliveryPartnerId;
    const auditNotes = `Delivery partner ${previousPartner?.name || previousPartnerId} removed by admin ${req.user.name || 'Admin'}. ${reason || ''}`.trim();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          deliveryPartnerId: null,
          assignedAt: null,
          acceptedAt: null,
          // If order was out for delivery, move status back to confirmed
          ...(order.status === 'out_for_delivery' || order.status === 'ready_for_dispatch' ? { status: 'confirmed' } : {}),
        },
        include: {
          items: true,
        },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: updatedOrder.status,
          changedBy: `admin:${req.user.name || 'Admin'}`,
          notes: auditNotes,
        },
      });

      await tx.deliveryVerificationAudit.create({
        data: {
          orderId: order.id,
          partnerId: previousPartnerId,
          actionType: 'order_unassigned',
          success: true,
          notes: auditNotes,
        },
      });

      return { updatedOrder, history };
    });

    // Broadcast status update to all connected clients & rooms
    broadcastOrderStatusUpdated(updated.updatedOrder, updated.history).catch((e) =>
      console.error('Socket broadcast error on unassign:', e)
    );

    const { deliveryPinHash, deliveryPinEncrypted, ...sanitized } = updated.updatedOrder;

    return res.json({
      success: true,
      message: `डिलीवरी पार्टनर असाइनमेंट सफलतापूर्वक हटा दिया गया (${previousPartner?.name || 'Partner'} unassigned)`,
      order: sanitized,
    });
  } catch (error) {
    console.error('Error removing delivery partner:', error);
    return res.status(500).json({
      success: false,
      message: 'पार्टनर हटाने में त्रुटि (Failed to remove delivery partner)',
      error: error.message,
    });
  }
};

