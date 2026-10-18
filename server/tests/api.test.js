import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { calculateOrderTotals } from '../utils/pricing.js';
import { generateOrderNumber } from '../utils/orderId.js';
import { prisma } from '../config/db.js';

test('1. calculateOrderTotals: correct totals and free delivery calculation', () => {
  const storeSettings = {
    minOrderValue: 150,
    standardDeliveryFee: 10,
    freeDeliveryThreshold: 299,
    isStoreOpen: true,
  };

  const products = [
    { id: 'potato', nameEn: 'Potato', nameHi: 'आलू', unit: '1 kg', price: 30, isConfigured: true, inStock: true, isActive: true },
    { id: 'onion', nameEn: 'Onion', nameHi: 'प्याज़', unit: '1 kg', price: 35, isConfigured: true, inStock: true, isActive: true },
  ];

  // Case A: Subtotal = (30 * 4) + (35 * 2) = 120 + 70 = 190. Standard fee = 10. Total = 200.
  const resultA = calculateOrderTotals({
    items: [
      { productId: 'potato', quantity: 4 },
      { productId: 'onion', quantity: 2 },
    ],
    products,
    storeSettings,
  });

  assert.equal(resultA.subtotal, 190);
  assert.equal(resultA.deliveryFee, 10);
  assert.equal(resultA.finalTotal, 200);
  assert.equal(resultA.verifiedOrderItems.length, 2);

  // Case B: Free Delivery on >= 299: (30 * 10) = 300. Fee = 0.
  const resultB = calculateOrderTotals({
    items: [{ productId: 'potato', quantity: 10 }],
    products,
    storeSettings,
  });

  assert.equal(resultB.subtotal, 300);
  assert.equal(resultB.deliveryFee, 0);
  assert.equal(resultB.finalTotal, 300);
});

test('2. calculateOrderTotals: rejects unconfigured or null-price products', () => {
  const storeSettings = { minOrderValue: 150, standardDeliveryFee: 10, freeDeliveryThreshold: 299, isStoreOpen: true };
  const products = [
    { id: 'lemon', nameEn: 'Lemon', nameHi: 'नींबू', unit: '4 pieces', price: null, isConfigured: false, inStock: true, isActive: true },
  ];

  assert.throws(
    () => {
      calculateOrderTotals({
        items: [{ productId: 'lemon', quantity: 1 }],
        products,
        storeSettings,
      });
    },
    { message: /भाव अभी निर्धारित नहीं है/ }
  );
});

test('3. calculateOrderTotals: rejects orders below minimum order value', () => {
  const storeSettings = { minOrderValue: 150, standardDeliveryFee: 10, freeDeliveryThreshold: 299, isStoreOpen: true };
  const products = [
    { id: 'potato', nameEn: 'Potato', nameHi: 'आलू', unit: '1 kg', price: 30, isConfigured: true, inStock: true, isActive: true },
  ];

  // 30 * 2 = 60 < 150
  assert.throws(
    () => {
      calculateOrderTotals({
        items: [{ productId: 'potato', quantity: 2 }],
        products,
        storeSettings,
      });
    },
    { message: /न्यूनतम ऑर्डर मूल्य ₹150 है/ }
  );
});

test('4. calculateOrderTotals: rejects invalid or negative quantities', () => {
  const storeSettings = { minOrderValue: 150, standardDeliveryFee: 10, freeDeliveryThreshold: 299, isStoreOpen: true };
  const products = [
    { id: 'potato', nameEn: 'Potato', nameHi: 'आलू', unit: '1 kg', price: 30, isConfigured: true, inStock: true, isActive: true },
  ];

  assert.throws(
    () => {
      calculateOrderTotals({
        items: [{ productId: 'potato', quantity: -2 }],
        products,
        storeSettings,
      });
    },
    { message: /मात्रा सकारात्मक पूर्णांक होनी चाहिए/ }
  );
});

test('5. generateOrderNumber: formats unique reference with year prefix', () => {
  const id1 = generateOrderNumber();
  const id2 = generateOrderNumber();
  assert.match(id1, /^KIR-\d{4}-[A-Z0-9]+$/);
  assert.notEqual(id1, id2);
});

test('6. Database & Auth: verify admin login hash check and JWT creation', async () => {
  const admin = await prisma.adminUser.findUnique({
    where: { email: 'admin@kirsab.in' },
  });

  assert.ok(admin, 'Admin user should exist in PostgreSQL');
  assert.equal(admin.email, 'admin@kirsab.in');

  const validPassword = await bcrypt.compare('KirsabAdmin@2026', admin.passwordHash);
  assert.equal(validPassword, true, 'Password should match bcrypt hash');

  const invalidPassword = await bcrypt.compare('WrongPassword', admin.passwordHash);
  assert.equal(invalidPassword, false, 'Invalid password should be rejected');

  // Verify JWT signing
  const secret = process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';
  const token = jwt.sign({ userId: admin.id, email: admin.email, role: admin.role }, secret, { expiresIn: '1h' });
  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.userId, admin.id);
});

test('7. PostgreSQL Persistent Orders: create, verify snapshot, and update status', async () => {
  // Test persistent order creation in PostgreSQL
  const testOrderNumber = `TEST-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber: testOrderNumber,
      customerName: 'परीक्षण ग्राहक (Test Customer)',
      customerPhone: '9876543210',
      address: 'Tower 2, Flat 401, Shervani Legacy',
      deliverySlot: 'morning',
      subtotal: 180,
      deliveryFee: 10,
      finalTotal: 190,
      status: 'pending',
      items: {
        create: [
          {
            productId: 'potato',
            productNameEn: 'Potato',
            productNameHi: 'आलू',
            unit: '1 kg',
            unitPrice: 30,
            quantity: 6,
            lineTotal: 180,
          },
        ],
      },
    },
    include: { items: true },
  });

  assert.ok(order.id);
  assert.equal(order.status, 'pending');
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].productNameHi, 'आलू');
  assert.equal(order.items[0].lineTotal, 180);

  // Status update
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'confirmed' },
  });
  assert.equal(updated.status, 'confirmed');

  // Clean up test order
  await prisma.order.delete({ where: { id: order.id } });
});

test('8. Stock Toggle: update product inStock flag in PostgreSQL', async () => {
  const product = await prisma.product.findUnique({ where: { id: 'potato' } });
  assert.ok(product);

  const originalStock = product.inStock;
  const toggled = await prisma.product.update({
    where: { id: 'potato' },
    data: { inStock: !originalStock },
  });
  assert.equal(toggled.inStock, !originalStock);

  // Restore
  await prisma.product.update({
    where: { id: 'potato' },
    data: { inStock: originalStock },
  });
});
