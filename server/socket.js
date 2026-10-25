import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './config/db.js';
import { calculateAuthoritativeStats, getPublicAggregateStats } from './utils/analytics.js';

let io = null;

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';

/**
 * Initialize Socket.IO with HTTP Server
 */
export function initSocket(httpServer, corsConfig = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: corsConfig.allowedOrigins || '*',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Socket Connection Authentication & Room Allocation
  io.on('connection', async (socket) => {
    let authUser = null;

    try {
      // Check for JWT Token in handshake auth or headers
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (rawToken) {
        const decoded = jwt.verify(rawToken, getJwtSecret());

        if (decoded && decoded.userId) {
          // Check AdminUser first
          const admin = await prisma.adminUser.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true },
          });

          if (admin && admin.role === 'admin') {
            authUser = admin;
            socket.data.isAdmin = true;
            socket.data.user = admin;
            socket.join('admin_channel');
          } else {
            // Check unified User table (customer, delivery partner, or admin)
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: { id: true, email: true, phone: true, name: true, role: true, isActive: true },
            });

            if (user && user.isActive) {
              authUser = user;
              socket.data.user = user;

              if (user.role === 'admin') {
                socket.data.isAdmin = true;
                socket.join('admin_channel');
              } else if (user.role === 'delivery_partner') {
                socket.data.isDeliveryPartner = true;
                socket.join(`partner_${user.id}`);
                socket.join('delivery_channel');
              } else if (user.role === 'customer') {
                socket.data.isCustomer = true;
                socket.join(`customer_${user.id}`);
              }
            }
          }
        }
      }
    } catch (err) {
      // Unauthenticated client
      authUser = null;
    }

    // Send immediate snapshot upon connection
    try {
      const stats = await calculateAuthoritativeStats();

      if (socket.data.isAdmin) {
        socket.emit('admin:analytics_snapshot', {
          stats,
          connectedAt: new Date().toISOString(),
        });
      } else {
        socket.emit('public:order_stats', getPublicAggregateStats(stats));
      }
    } catch (err) {
      console.error('Socket snapshot error on connect:', err);
    }

    // Allow authenticated or order-verifying client to track a specific order live
    socket.on('join_order_room', async ({ orderId, orderNumber }) => {
      try {
        const target = orderId || orderNumber;
        if (!target) return;

        const order = await prisma.order.findFirst({
          where: {
            OR: [{ id: target }, { orderNumber: target }],
          },
          select: { id: true, orderNumber: true, customerId: true, deliveryPartnerId: true },
        });

        if (order) {
          // Join room for this specific order
          socket.join(`order_${order.id}`);
          socket.join(`order_${order.orderNumber}`);
          socket.emit('order:joined_room', { orderId: order.id, orderNumber: order.orderNumber });
        }
      } catch (e) {
        console.error('Error joining order room:', e);
      }
    });

    // Handle Admin Refresh Request
    socket.on('admin:request_snapshot', async () => {
      if (!socket.data.isAdmin) return;
      try {
        const stats = await calculateAuthoritativeStats();
        socket.emit('admin:analytics_snapshot', {
          stats,
          refreshedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Admin snapshot refresh error:', err);
      }
    });

    // Handle Public Stat Request
    socket.on('public:request_stats', async () => {
      try {
        const stats = await calculateAuthoritativeStats();
        socket.emit('public:order_stats', getPublicAggregateStats(stats));
      } catch (err) {
        console.error('Public stats refresh error:', err);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO() {
  return io;
}

/**
 * Broadcast event when an order is created (after database transaction succeeds)
 */
export async function broadcastOrderCreated(order, authoritativeStats = null) {
  if (!io) return;
  try {
    const stats = authoritativeStats || (await calculateAuthoritativeStats());

    // Sanitize order for security (never leak PIN secrets)
    const { deliveryPinHash, deliveryPinEncrypted, ...safeOrder } = order;

    // 1. Private event to authorized admins: Full order details + updated stats
    io.to('admin_channel').emit('admin:order_created', {
      order: safeOrder,
      stats,
      timestamp: new Date().toISOString(),
    });

    // 2. Private event to customer room if logged in
    if (order.customerId) {
      io.to(`customer_${order.customerId}`).emit('customer:order_created', {
        order: safeOrder,
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Public aggregate event to all public visitors (zero private details)
    io.emit('public:order_stats', getPublicAggregateStats(stats));
  } catch (err) {
    console.error('Failed to broadcast order created:', err);
  }
}

/**
 * Broadcast event when an order status is updated (after database transaction succeeds)
 */
export async function broadcastOrderStatusUpdated(order, historyEntry = null, authoritativeStats = null) {
  if (!io) return;
  try {
    const stats = authoritativeStats || (await calculateAuthoritativeStats());

    // Sanitize order
    const { deliveryPinHash, deliveryPinEncrypted, ...safeOrder } = order;

    const payload = {
      order: safeOrder,
      historyEntry,
      stats,
      timestamp: new Date().toISOString(),
    };

    // 1. Private event to authorized admins
    io.to('admin_channel').emit('admin:order_status_updated', payload);

    // 2. Private event to assigned delivery partner room
    if (order.deliveryPartnerId) {
      io.to(`partner_${order.deliveryPartnerId}`).emit('partner:order_updated', payload);
    }

    // 3. Private event to customer room
    if (order.customerId) {
      io.to(`customer_${order.customerId}`).emit('customer:order_updated', payload);
    }

    // 4. Dedicated order tracking room
    io.to(`order_${order.id}`).emit('order:live_status', payload);
    io.to(`order_${order.orderNumber}`).emit('order:live_status', payload);

    // 5. Public aggregate event (zero private details)
    io.emit('public:order_stats', getPublicAggregateStats(stats));
  } catch (err) {
    console.error('Failed to broadcast order status update:', err);
  }
}
