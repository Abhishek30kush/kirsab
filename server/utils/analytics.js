import { prisma } from '../config/db.js';

/**
 * Returns start and end timestamps for the business day in Asia/Kolkata timezone
 */
export function getBusinessDayRange(date = new Date(), timeZone = 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = formatter.format(date); // "YYYY-MM-DD"
    const startOfToday = new Date(`${dateStr}T00:00:00.000+05:30`);
    const endOfToday = new Date(`${dateStr}T23:59:59.999+05:30`);
    return { startOfToday, endOfToday, dateStr };
  } catch (err) {
    // Fallback to UTC day boundaries if Intl timeZone fails
    const startOfToday = new Date(date);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(date);
    endOfToday.setUTCHours(23, 59, 59, 999);
    return { startOfToday, endOfToday, dateStr: startOfToday.toISOString().split('T')[0] };
  }
}

/**
 * All valid order statuses recognized by the platform
 */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'packed',
  'ready_for_dispatch',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

/**
 * Valid order status transitions according to KIRSAB standard lifecycle
 */
export const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'packed', 'ready_for_dispatch', 'cancelled'],
  preparing: ['packed', 'ready_for_dispatch', 'out_for_delivery', 'cancelled'],
  packed: ['ready_for_dispatch', 'out_for_delivery', 'cancelled'],
  ready_for_dispatch: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * Checks if a transition between two statuses is permitted
 */
export function isValidStatusTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus || fromStatus === toStatus) return false;
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

/**
 * Calculates authoritative, permanent order statistics directly from PostgreSQL
 */
export async function calculateAuthoritativeStats() {
  const { startOfToday } = getBusinessDayRange();

  const [
    totalOrders,
    completedOrders,
    cancelledOrders,
    pendingOrders,
    confirmedOrders,
    preparingOrders,
    readyForDispatchOrders,
    outForDeliveryOrders,
    todayDeliveredOrders,
    todayCancelledOrders,
    todayOrdersCount,
    revenueAggregate,
    todayRevenueAggregate,
  ] = await Promise.all([
    // 1. Total orders ever placed
    prisma.order.count(),
    // 2. Total completed orders (delivered)
    prisma.order.count({ where: { status: 'delivered' } }),
    // 3. Total cancelled orders
    prisma.order.count({ where: { status: 'cancelled' } }),
    // 4. Total pending orders
    prisma.order.count({ where: { status: 'pending' } }),
    // 5. Total confirmed orders
    prisma.order.count({ where: { status: 'confirmed' } }),
    // 6. Total orders currently being prepared (including legacy 'packed')
    prisma.order.count({ where: { status: { in: ['preparing', 'packed'] } } }),
    // Ready for dispatch
    prisma.order.count({ where: { status: 'ready_for_dispatch' } }),
    // 7. Total orders out for delivery
    prisma.order.count({ where: { status: 'out_for_delivery' } }),
    // 8. Total orders delivered today
    prisma.order.count({
      where: {
        status: 'delivered',
        updatedAt: { gte: startOfToday },
      },
    }),
    // 9. Total cancellations today
    prisma.order.count({
      where: {
        status: 'cancelled',
        updatedAt: { gte: startOfToday },
      },
    }),
    // Total orders placed today
    prisma.order.count({
      where: { createdAt: { gte: startOfToday } },
    }),
    // 10. Total revenue from successfully completed orders
    prisma.order.aggregate({
      where: { status: 'delivered' },
      _sum: { finalTotal: true },
    }),
    // Today's completed orders revenue
    prisma.order.aggregate({
      where: {
        status: 'delivered',
        updatedAt: { gte: startOfToday },
      },
      _sum: { finalTotal: true },
    }),
  ]);

  // Distinct active orders = pending + confirmed + preparing/packed + ready_for_dispatch + out_for_delivery
  const activeOrdersCount =
    pendingOrders +
    confirmedOrders +
    preparingOrders +
    readyForDispatchOrders +
    outForDeliveryOrders;

  const totalRevenue = Math.round((revenueAggregate._sum.finalTotal || 0) * 100) / 100;
  const todayRevenue = Math.round((todayRevenueAggregate._sum.finalTotal || 0) * 100) / 100;

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    pendingOrders,
    confirmedOrders,
    preparingOrders,
    readyForDispatchOrders,
    outForDeliveryOrders,
    todayDeliveredOrders,
    todayCancelledOrders,
    todayOrders: todayOrdersCount,
    activeOrdersCount,
    totalRevenue,
    todayRevenue,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Filter public-safe aggregate statistics (zero PII, zero private order data)
 */
export function getPublicAggregateStats(fullStats) {
  return {
    completedOrders: fullStats.completedOrders || 0,
    activeOrders: fullStats.activeOrdersCount || 0,
    preparingOrders: fullStats.preparingOrders || 0,
    outForDeliveryOrders: fullStats.outForDeliveryOrders || 0,
    updatedAt: fullStats.updatedAt || new Date().toISOString(),
  };
}

export const calculateOrderAnalytics = calculateAuthoritativeStats;
