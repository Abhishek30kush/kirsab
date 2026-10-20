import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './config/db.js';
import { calculateAuthoritativeStats, getPublicAggregateStats } from './utils/analytics.js';

let io = null;

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
    let isAdmin = false;
    let adminUser = null;

    try {
      // Check for Admin JWT Token in handshake auth or headers
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (rawToken) {
        const secret = process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';
        const decoded = jwt.verify(rawToken, secret);

        if (decoded && decoded.userId) {
          const user = await prisma.adminUser.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true },
          });

          if (user && user.role === 'admin') {
            isAdmin = true;
            adminUser = user;
            socket.data.isAdmin = true;
            socket.data.user = user;
            socket.join('admin_channel');
          }
        }
      }
    } catch (err) {
      // Invalidation drops socket to unauthenticated public client
      isAdmin = false;
    }

    // Send immediate snapshot upon connection
    try {
      const stats = await calculateAuthoritativeStats();

      if (isAdmin) {
        // Send full administrative analytics and active snapshot to admin
        socket.emit('admin:analytics_snapshot', {
          stats,
          connectedAt: new Date().toISOString(),
        });
      } else {
        // Send safe, aggregate-only counters to public customer widget
        socket.emit('public:order_stats', getPublicAggregateStats(stats));
      }
    } catch (err) {
      console.error('Socket snapshot error on connect:', err);
    }

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

    socket.on('disconnect', (reason) => {
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

    // 1. Private event to authorized admins: Full order details + updated stats
    io.to('admin_channel').emit('admin:order_created', {
      order,
      stats,
      timestamp: new Date().toISOString(),
    });

    // 2. Public aggregate event to all public visitors (zero private details)
    io.emit('public:order_stats', getPublicAggregateStats(stats));
  } catch (err) {
    console.error('Failed to broadcast order created:', err);
  }
}

/**
 * Broadcast event when an order status is updated (after database transaction succeeds)
 */
export async function broadcastOrderStatusUpdated(order, historyEntry, authoritativeStats = null) {
  if (!io) return;
  try {
    const stats = authoritativeStats || (await calculateAuthoritativeStats());

    // 1. Private event to authorized admins
    io.to('admin_channel').emit('admin:order_status_updated', {
      order,
      historyEntry,
      stats,
      timestamp: new Date().toISOString(),
    });

    // 2. Public aggregate event (zero private details)
    io.emit('public:order_stats', getPublicAggregateStats(stats));
  } catch (err) {
    console.error('Failed to broadcast order status update:', err);
  }
}
