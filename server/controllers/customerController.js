import { prisma } from '../config/db.js';
import { decryptPin } from '../utils/pinSecurity.js';
import { broadcastOrderStatusUpdated } from '../socket.js';
import { calculateAuthoritativeStats } from '../utils/analytics.js';

/**
 * Get customer profile with addresses
 */
export const getCustomerProfile = async (req, res) => {
  try {
    const customer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ग्राहक प्रोफ़ाइल नहीं मिली (Customer profile not found)',
      });
    }

    const orderCount = await prisma.order.count({
      where: {
        OR: [{ customerId: req.user.id }, { customerPhone: req.user.phone || '' }],
      },
    });

    return res.json({
      success: true,
      profile: {
        ...customer,
        orderCount,
      },
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return res.status(500).json({
      success: false,
      message: 'प्रोफ़ाइल लोड करने में त्रुटि (Failed to load profile)',
      error: error.message,
    });
  }
};

/**
 * Update customer profile details (name, email)
 */
export const updateCustomerProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const data = {};
    if (name && name.trim().length >= 2) {
      data.name = name.trim();
    }

    if (email !== undefined) {
      const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
      if (cleanEmail) {
        // Check uniqueness if changed
        const existing = await prisma.user.findFirst({
          where: { email: cleanEmail, NOT: { id: req.user.id } },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'यह ईमेल किसी अन्य खाते द्वारा उपयोग में है (Email already taken)',
          });
        }
      }
      data.email = cleanEmail;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    return res.json({
      success: true,
      message: 'प्रोफ़ाइल सफलतापूर्वक अपडेट की गई (Profile updated)',
      user: updated,
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return res.status(500).json({
      success: false,
      message: 'प्रोफ़ाइल अपडेट करने में त्रुटि (Update failed)',
      error: error.message,
    });
  }
};

/**
 * Get all saved addresses for authenticated customer
 */
export const getCustomerAddresses = async (req, res) => {
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error('Error fetching customer addresses:', error);
    return res.status(500).json({
      success: false,
      message: 'पते लोड करने में त्रुटि (Failed to fetch addresses)',
      error: error.message,
    });
  }
};

/**
 * Add a new saved address
 */
export const createCustomerAddress = async (req, res) => {
  try {
    const {
      label = 'Home',
      flatNumber,
      street,
      locality = 'Shervani Legacy',
      city = 'Prayagraj',
      state = 'Uttar Pradesh',
      pincode = '211011',
      landmark,
      deliveryInstructions,
      isDefault = false,
    } = req.body;

    if (!flatNumber || flatNumber.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'कृपया फ्लैट / हाउस नंबर दर्ज करें (Flat/House number required)',
      });
    }

    if (!street || street.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'कृपया गली / सोसाइटी का नाम दर्ज करें (Street/society name required)',
      });
    }

    // Check if user already has addresses
    const existingCount = await prisma.customerAddress.count({
      where: { userId: req.user.id },
    });

    const shouldBeDefault = isDefault || existingCount === 0;

    // Run in transaction if setting as default
    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.customerAddress.updateMany({
          where: { userId: req.user.id },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          userId: req.user.id,
          label: label.trim() || 'Home',
          flatNumber: flatNumber.trim(),
          street: street.trim(),
          locality: locality.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: (pincode || '211011').trim(),
          landmark: landmark ? landmark.trim() : null,
          deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : null,
          isDefault: shouldBeDefault,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: 'पता सफलतापूर्वक सहेजा गया (Address saved successfully)',
      address,
    });
  } catch (error) {
    console.error('Error creating address:', error);
    return res.status(500).json({
      success: false,
      message: 'पता सहेजने में त्रुटि (Failed to save address)',
      error: error.message,
    });
  }
};

/**
 * Update an existing address
 */
export const updateCustomerAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      flatNumber,
      street,
      locality,
      city,
      state,
      pincode,
      landmark,
      deliveryInstructions,
      isDefault,
    } = req.body;

    const existing = await prisma.customerAddress.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'पता नहीं मिला (Address not found)',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { userId: req.user.id, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id },
        data: {
          ...(label !== undefined ? { label: label.trim() } : {}),
          ...(flatNumber !== undefined ? { flatNumber: flatNumber.trim() } : {}),
          ...(street !== undefined ? { street: street.trim() } : {}),
          ...(locality !== undefined ? { locality: locality.trim() } : {}),
          ...(city !== undefined ? { city: city.trim() } : {}),
          ...(state !== undefined ? { state: state.trim() } : {}),
          ...(pincode !== undefined ? { pincode: pincode.trim() } : {}),
          ...(landmark !== undefined ? { landmark: landmark ? landmark.trim() : null } : {}),
          ...(deliveryInstructions !== undefined
            ? { deliveryInstructions: deliveryInstructions ? deliveryInstructions.trim() : null }
            : {}),
          ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        },
      });
    });

    return res.json({
      success: true,
      message: 'पता सफलतापूर्वक अपडेट किया गया (Address updated)',
      address: updated,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return res.status(500).json({
      success: false,
      message: 'पता अपडेट करने में त्रुटि (Failed to update address)',
      error: error.message,
    });
  }
};

/**
 * Delete a saved address
 */
export const deleteCustomerAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customerAddress.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'पता नहीं मिला (Address not found)',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerAddress.delete({ where: { id } });

      // If deleted was default, make remaining first address default
      if (existing.isDefault) {
        const remaining = await tx.customerAddress.findFirst({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' },
        });
        if (remaining) {
          await tx.customerAddress.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return res.json({
      success: true,
      message: 'पता हटा दिया गया (Address removed)',
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    return res.status(500).json({
      success: false,
      message: 'पता हटाने में त्रुटि (Failed to delete address)',
      error: error.message,
    });
  }
};

/**
 * Get customer orders list (My Orders)
 */
export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [{ customerId: req.user.id }, { customerPhone: req.user.phone || '' }],
      },
      include: {
        items: true,
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt delivery PIN so customer can safely view and share only upon delivery
    const sanitizedOrders = orders.map((o) => {
      let pin = null;
      if (o.deliveryPinEncrypted) {
        pin = decryptPin(o.deliveryPinEncrypted);
      }

      return {
        ...o,
        deliveryPin: pin,
        deliveryPinEncrypted: undefined,
        deliveryPinHash: undefined, // Never expose raw hash
      };
    });

    return res.json({
      success: true,
      orders: sanitizedOrders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर्स लोड करने में त्रुटि (Failed to fetch orders)',
      error: error.message,
    });
  }
};

/**
 * Get single order details for authenticated customer
 */
export const getCustomerOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        AND: {
          OR: [{ customerId: req.user.id }, { customerPhone: req.user.phone || '' }],
        },
      },
      include: {
        items: true,
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehicleNumber: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    let pin = null;
    if (order.deliveryPinEncrypted) {
      pin = decryptPin(order.deliveryPinEncrypted);
    }

    return res.json({
      success: true,
      order: {
        ...order,
        deliveryPin: pin,
        deliveryPinEncrypted: undefined,
        deliveryPinHash: undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching single order:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर विवरण लोड करने में त्रुटि (Failed to load order details)',
      error: error.message,
    });
  }
};

/**
 * Cancel order by customer (allowed only when pending or confirmed)
 */
export const cancelCustomerOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'ग्राहक द्वारा रद्द किया गया (Cancelled by customer)' } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        AND: {
          OR: [{ customerId: req.user.id }, { customerPhone: req.user.phone || '' }],
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला (Order not found)',
      });
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `ऑर्डर '${order.status}' स्थिति में रद्द नहीं किया जा सकता। (Order cannot be cancelled in current status)`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
        },
        include: { items: true },
      });

      const history = await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: 'cancelled',
          changedBy: `customer:${req.user.name || req.user.phone}`,
          notes: reason,
        },
      });

      return { updatedOrder, history };
    });

    // Broadcast update
    broadcastOrderStatusUpdated(updated.updatedOrder, updated.history).catch((err) => {
      console.error('Real-time broadcast error after cancel:', err);
    });

    return res.json({
      success: true,
      message: 'ऑर्डर सफलतापूर्वक रद्द कर दिया गया (Order cancelled successfully)',
      order: updated.updatedOrder,
    });
  } catch (error) {
    console.error('Error cancelling customer order:', error);
    return res.status(500).json({
      success: false,
      message: 'ऑर्डर रद्द करने में त्रुटि (Cancellation failed)',
      error: error.message,
    });
  }
};

/**
 * Get assigned delivery partner details for customer order
 */
export const getCustomerOrderDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        AND: {
          OR: [{ customerId: req.user.id }, { customerPhone: req.user.phone || '' }],
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        assignedAt: true,
        acceptedAt: true,
        pickedUpAt: true,
        outForDeliveryAt: true,
        deliveredAt: true,
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ऑर्डर नहीं मिला या आपको अनुमति नहीं है (Order not found or unauthorized)',
      });
    }

    const isAssigned = Boolean(order.deliveryPartner);

    return res.json({
      success: true,
      orderNumber: order.orderNumber,
      isAssigned,
      status: order.status,
      deliveryPartner: order.deliveryPartner,
      assignedAt: order.assignedAt,
      acceptedAt: order.acceptedAt,
      pickedUpAt: order.pickedUpAt,
      outForDeliveryAt: order.outForDeliveryAt,
      deliveredAt: order.deliveredAt,
      message: isAssigned
        ? 'डिलीवरी पार्टनर की जानकारी उपलब्ध है'
        : 'डिलीवरी पार्टनर जल्द ही असाइन किया जाएगा (Delivery partner will be assigned soon)',
    });
  } catch (error) {
    console.error('Error fetching customer order delivery partner:', error);
    return res.status(500).json({
      success: false,
      message: 'डिलीवरी पार्टनर जानकारी लोड करने में त्रुटि',
      error: error.message,
    });
  }
};

/**
 * Get customer wishlist items with full product details
 */
export const getCustomerWishlist = async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            category: true,
            reviews: {
              where: { status: 'APPROVED' },
              select: { rating: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = items.map((item) => {
      const p = item.product;
      const ratings = p.reviews?.map((r) => r.rating) || [];
      const reviewsCount = ratings.length;
      const averageRating = reviewsCount > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / reviewsCount) * 10) / 10
        : null;

      return {
        ...p,
        wishlistId: item.id,
        wishlistedAt: item.createdAt,
        averageRating,
        reviewsCount,
      };
    });

    return res.json({
      success: true,
      items: products,
      productIds: products.map((p) => p.id),
    });
  } catch (error) {
    console.error('Error fetching customer wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'विशलिस्ट लोड करने में त्रुटि (Failed to load wishlist)',
      error: error.message,
    });
  }
};

/**
 * Toggle item in customer wishlist
 */
export const toggleCustomerWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'उत्पाद आईडी आवश्यक है (Product ID is required)',
      });
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.wishlistItem.delete({
        where: { id: existing.id },
      });
      return res.json({
        success: true,
        isWishlisted: false,
        message: 'विशलिस्ट से हटा दिया गया (Removed from wishlist)',
      });
    } else {
      await prisma.wishlistItem.create({
        data: {
          userId: req.user.id,
          productId,
        },
      });
      return res.json({
        success: true,
        isWishlisted: true,
        message: 'विशलिस्ट में जोड़ा गया (Added to wishlist)',
      });
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'विशलिस्ट अपडेट करने में त्रुटि',
      error: error.message,
    });
  }
};

/**
 * Register / Update customer Expo push token
 */
export const updateCustomerPushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pushToken: pushToken || null },
    });
    return res.json({
      success: true,
      message: 'पुश नोटिफिकेशन टोकन सहेजा गया (Push token updated)',
    });
  } catch (error) {
    console.error('Error updating push token:', error);
    return res.status(500).json({
      success: false,
      message: 'टोकन अपडेट विफल',
      error: error.message,
    });
  }
};

/**
 * Admin: View registered customers with aggregate stats
 */
export const getAdminCustomersList = async (req, res) => {
  try {
    const { search = '' } = req.query;

    const where = {
      role: 'customer',
    };

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim() } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            addresses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      customers,
      total: customers.length,
    });
  } catch (error) {
    console.error('Error fetching admin customers:', error);
    return res.status(500).json({
      success: false,
      message: 'ग्राहक सूची लोड करने में त्रुटि',
      error: error.message,
    });
  }
};

/**
 * Admin: View single customer details with order history & reviews
 */
export const getAdminCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.user.findFirst({
      where: { id, role: 'customer' },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: { nameEn: true, nameHi: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ग्राहक नहीं मिला (Customer not found)',
      });
    }

    const { passwordHash, ...sanitized } = customer;

    return res.json({
      success: true,
      customer: sanitized,
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return res.status(500).json({
      success: false,
      message: 'ग्राहक विवरण लोड करने में त्रुटि',
      error: error.message,
    });
  }
};


