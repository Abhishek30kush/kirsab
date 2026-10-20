import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import {
  ORDER_STATUSES,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  calculateAuthoritativeStats,
  getPublicAggregateStats,
} from '../utils/analytics.js';

test('1. ORDER_STATUSES and isValidStatusTransition rules', () => {
  assert.ok(ORDER_STATUSES.includes('pending'));
  assert.ok(ORDER_STATUSES.includes('confirmed'));
  assert.ok(ORDER_STATUSES.includes('preparing'));
  assert.ok(ORDER_STATUSES.includes('ready_for_dispatch'));
  assert.ok(ORDER_STATUSES.includes('out_for_delivery'));
  assert.ok(ORDER_STATUSES.includes('delivered'));
  assert.ok(ORDER_STATUSES.includes('cancelled'));

  // Valid forward progressions
  assert.equal(isValidStatusTransition('pending', 'confirmed'), true);
  assert.equal(isValidStatusTransition('confirmed', 'preparing'), true);
  assert.equal(isValidStatusTransition('preparing', 'ready_for_dispatch'), true);
  assert.equal(isValidStatusTransition('ready_for_dispatch', 'out_for_delivery'), true);
  assert.equal(isValidStatusTransition('out_for_delivery', 'delivered'), true);

  // Cancellation is permitted from active stages
  assert.equal(isValidStatusTransition('pending', 'cancelled'), true);
  assert.equal(isValidStatusTransition('confirmed', 'cancelled'), true);
  assert.equal(isValidStatusTransition('preparing', 'cancelled'), true);
  assert.equal(isValidStatusTransition('out_for_delivery', 'cancelled'), true);

  // Terminal state protections: cannot transition out of delivered or cancelled
  assert.equal(isValidStatusTransition('delivered', 'pending'), false);
  assert.equal(isValidStatusTransition('cancelled', 'confirmed'), false);
  assert.equal(isValidStatusTransition('delivered', 'cancelled'), false);

  // Same status transition rejected
  assert.equal(isValidStatusTransition('pending', 'pending'), false);
});

test('2. Public Aggregate Stats Privacy Protection', () => {
  const fullAdminAnalytics = {
    totalOrders: 100,
    completedOrders: 80,
    cancelledOrders: 5,
    pendingOrders: 5,
    confirmedOrders: 5,
    preparingOrders: 3,
    readyForDispatchOrders: 1,
    outForDeliveryOrders: 1,
    activeOrdersCount: 15,
    todayDeliveredOrders: 12,
    todayCancelledOrders: 1,
    todayOrders: 14,
    totalRevenue: 28450,
    // Hypothetical sensitive fields if leaked
    customerName: 'Rahul Sharma',
    customerPhone: '9876543210',
    address: 'Flat 101, Shervani Legacy',
    orderNumber: 'KIR-2026-9999',
  };

  const publicStats = getPublicAggregateStats(fullAdminAnalytics);

  // Ensure ONLY the approved aggregate numbers are present
  assert.equal(publicStats.completedOrders, 80);
  assert.equal(publicStats.activeOrders, 15);
  assert.equal(publicStats.preparingOrders, 3);
  assert.equal(publicStats.outForDeliveryOrders, 1);

  // Strictly verify no PII or administrative data is exposed
  assert.equal(publicStats.customerName, undefined);
  assert.equal(publicStats.customerPhone, undefined);
  assert.equal(publicStats.address, undefined);
  assert.equal(publicStats.orderNumber, undefined);
  assert.equal(publicStats.totalRevenue, undefined);
  assert.equal(publicStats.pendingOrders, undefined);
  assert.equal(Object.keys(publicStats).length, 5); // completedOrders, activeOrders, preparingOrders, outForDeliveryOrders, updatedAt
});

test('3. Database Persistence: Real-time Order creation, status lifecycle, and OrderStatusHistory audit log', async () => {
  // 1. Fetch initial statistics
  const initialStats = await calculateAuthoritativeStats();
  const initialTotal = initialStats.totalOrders;
  const initialPending = initialStats.pendingOrders;
  const initialActive = initialStats.activeOrdersCount;
  const initialCompleted = initialStats.completedOrders;

  // 2. Create test order with status history inside transaction
  const testOrderNumber = `TEST-RT-${Date.now()}`;
  const order = await prisma.$transaction(async (tx) => {
    const newOrd = await tx.order.create({
      data: {
        orderNumber: testOrderNumber,
        customerName: 'Test Automation Customer',
        customerPhone: '9999999999',
        address: 'Tower A Flat 402, Shervani Legacy',
        deliverySlot: 'Morning (07:00 AM - 10:00 AM)',
        instructions: 'Real-time test order',
        subtotal: 150,
        deliveryFee: 10,
        finalTotal: 160,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cod',
        items: {
          create: [
            {
              productNameEn: 'Potato',
              productNameHi: 'आलू',
              unit: '1 kg',
              unitPrice: 30,
              quantity: 5,
              lineTotal: 150,
            },
          ],
        },
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: newOrd.id,
        previousStatus: null,
        newStatus: 'pending',
        changedBy: 'system',
        notes: 'Initial test order placed',
      },
    });

    return newOrd;
  });

  try {
    // 3. Verify analytics incremented for pending and total
    const afterCreateStats = await calculateAuthoritativeStats();
    assert.equal(afterCreateStats.totalOrders, initialTotal + 1, 'Total orders should increment by 1');
    assert.equal(afterCreateStats.pendingOrders, initialPending + 1, 'Pending orders should increment by 1');
    assert.equal(afterCreateStats.activeOrdersCount, initialActive + 1, 'Active orders should increment by 1');

    // 4. Transition order: pending -> confirmed
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'confirmed' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: 'pending',
          newStatus: 'confirmed',
          changedBy: 'admin-tester',
          notes: 'Order confirmed by operator',
        },
      });
    });

    const afterConfirmStats = await calculateAuthoritativeStats();
    assert.equal(afterConfirmStats.pendingOrders, initialPending, 'Pending orders back to initial');
    assert.equal(afterConfirmStats.confirmedOrders, initialStats.confirmedOrders + 1, 'Confirmed orders incremented');
    assert.equal(afterConfirmStats.activeOrdersCount, initialActive + 1, 'Active orders remains +1');

    // 5. Transition order: confirmed -> preparing
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'preparing' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: 'confirmed',
          newStatus: 'preparing',
          changedBy: 'admin-tester',
          notes: 'Packing vegetables in crate',
        },
      });
    });

    const afterPrepStats = await calculateAuthoritativeStats();
    assert.equal(afterPrepStats.preparingOrders, initialStats.preparingOrders + 1);

    // 6. Transition order: preparing -> out_for_delivery
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'out_for_delivery' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: 'preparing',
          newStatus: 'out_for_delivery',
          changedBy: 'admin-tester',
          notes: 'Dispatched with delivery rider',
        },
      });
    });

    const afterDispatchStats = await calculateAuthoritativeStats();
    assert.equal(afterDispatchStats.outForDeliveryOrders, initialStats.outForDeliveryOrders + 1);
    assert.equal(afterDispatchStats.activeOrdersCount, initialActive + 1);

    // 7. Transition order: out_for_delivery -> delivered
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'delivered', paymentStatus: 'completed' },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: 'out_for_delivery',
          newStatus: 'delivered',
          changedBy: 'admin-tester',
          notes: 'Delivered at customer doorstep',
        },
      });
    });

    const afterDeliveredStats = await calculateAuthoritativeStats();
    assert.equal(afterDeliveredStats.completedOrders, initialCompleted + 1, 'Completed orders incremented');
    assert.equal(afterDeliveredStats.activeOrdersCount, initialActive, 'Delivered order exits active count');
    assert.ok(afterDeliveredStats.todayDeliveredOrders >= 1, 'Delivered today count reflects order');

    // 8. Audit trail verification: orderStatusHistory must contain all transition entries
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });

    assert.equal(history.length, 5, 'Should have 5 history logs: initial pending + 4 transitions');
    assert.equal(history[0].newStatus, 'pending');
    assert.equal(history[1].newStatus, 'confirmed');
    assert.equal(history[2].newStatus, 'preparing');
    assert.equal(history[3].newStatus, 'out_for_delivery');
    assert.equal(history[4].newStatus, 'delivered');
    assert.equal(history[4].changedBy, 'admin-tester');

  } finally {
    // Cleanup test records
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
  }
});
