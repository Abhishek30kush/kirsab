import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import {
  generateSecurePin,
  hashPin,
  verifyPin,
  encryptPin,
  decryptPin,
} from '../utils/pinSecurity.js';
import { generateOrderNumber } from '../utils/orderId.js';

test('1. PIN Security: 6-digit generation, keyed HMAC hash, timingSafeEqual verification, AES encryption/decryption', () => {
  // 1. Generation
  const pin1 = generateSecurePin();
  assert.equal(typeof pin1, 'string');
  assert.equal(pin1.length, 6);
  assert.match(pin1, /^\d{6}$/);

  // 2. Keyed HMAC hashing bound to order
  const orderNumA = 'KIR-2026-TEST-A';
  const orderNumB = 'KIR-2026-TEST-B';
  const hashA = hashPin(orderNumA, pin1);
  const hashB = hashPin(orderNumB, pin1);

  assert.equal(typeof hashA, 'string');
  assert.equal(hashA.length, 64); // SHA-256 hex is 64 characters
  // Cross-order collision safety: even with identical PIN, different orders produce different hashes
  assert.notEqual(hashA, hashB);

  // 3. Constant-time verification
  assert.equal(verifyPin(orderNumA, pin1, hashA), true);
  assert.equal(verifyPin(orderNumA, '000000', hashA), false);
  assert.equal(verifyPin(orderNumA, '12345', hashA), false); // Not 6 digits
  // Cross-order replay prevention: PIN from order A cannot verify on order B
  assert.equal(verifyPin(orderNumB, pin1, hashA), false);

  // 4. AES-256-GCM authenticated encryption and decryption
  const encrypted = encryptPin(pin1);
  assert.ok(encrypted.includes(':'));
  const decrypted = decryptPin(encrypted);
  assert.equal(decrypted, pin1);
});

test('2. Customer & Delivery Partner Database Models and Lifecycle', async () => {
  const testPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const testPartnerPhone = '8' + Math.floor(100000000 + Math.random() * 900000000);

  // 1. Create customer user
  const passwordHash = await bcrypt.hash('TestCustomer@123', 10);
  const customer = await prisma.user.create({
    data: {
      name: 'Ramesh Verma',
      phone: testPhone,
      email: `ramesh_${Date.now()}@example.com`,
      passwordHash,
      role: 'customer',
      isActive: true,
    },
  });
  assert.ok(customer.id);
  assert.equal(customer.role, 'customer');

  // 2. Saved addresses: create default and secondary address
  const addr1 = await prisma.customerAddress.create({
    data: {
      userId: customer.id,
      label: 'Home',
      flatNumber: 'Flat 402, Tower B',
      street: 'Shervani Legacy, Dhoomanganj',
      locality: 'Shervani Legacy',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      pincode: '211011',
      isDefault: true,
    },
  });
  assert.ok(addr1.id);
  assert.equal(addr1.isDefault, true);

  const addr2 = await prisma.customerAddress.create({
    data: {
      userId: customer.id,
      label: 'Work',
      flatNumber: 'Cabin 12, Tech Park',
      street: 'Civil Lines',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      pincode: '211001',
      isDefault: false,
    },
  });
  assert.ok(addr2.id);
  assert.equal(addr2.isDefault, false);

  // 3. Create delivery partner user
  const partnerPasswordHash = await bcrypt.hash('PartnerSecret@123', 10);
  const partner = await prisma.user.create({
    data: {
      name: 'Amit Kumar Rider',
      phone: testPartnerPhone,
      email: `amit_rider_${Date.now()}@example.com`,
      passwordHash: partnerPasswordHash,
      role: 'delivery_partner',
      isActive: true,
      vehicleType: 'Hero Splendor',
      vehicleNumber: 'UP 70 AB 1234',
    },
  });
  assert.ok(partner.id);
  assert.equal(partner.role, 'delivery_partner');

  // 4. Create Order linked to customer with secure delivery PIN
  const orderNumber = generateOrderNumber();
  const rawPin = generateSecurePin();
  const pinHash = hashPin(orderNumber, rawPin);
  const pinEncrypted = encryptPin(rawPin);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      address: addr1.flatNumber + ', ' + addr1.street,
      deliverySlot: 'morning',
      subtotal: 350,
      deliveryFee: 0,
      finalTotal: 350,
      status: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      deliveryPinHash: pinHash,
      deliveryPinEncrypted: pinEncrypted,
      pinGeneratedAt: new Date(),
      items: {
        create: [
          {
            productNameEn: 'Fresh Potato',
            productNameHi: 'ताज़ा आलू',
            unit: '1 kg',
            unitPrice: 35,
            quantity: 10,
            lineTotal: 350,
          },
        ],
      },
      statusHistory: {
        create: {
          previousStatus: null,
          newStatus: 'pending',
          changedBy: `customer:${customer.id}`,
          notes: 'Customer order placement',
        },
      },
    },
    include: {
      items: true,
      statusHistory: true,
    },
  });

  assert.ok(order.id);
  assert.equal(order.status, 'pending');
  assert.equal(order.customerId, customer.id);
  assert.ok(order.deliveryPinHash);
  assert.equal(decryptPin(order.deliveryPinEncrypted), rawPin);

  // 5. Admin assigns delivery partner
  const assignedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      deliveryPartnerId: partner.id,
      assignedAt: new Date(),
      status: 'confirmed',
    },
    include: { deliveryPartner: true },
  });
  assert.equal(assignedOrder.deliveryPartnerId, partner.id);
  assert.equal(assignedOrder.deliveryPartner.name, partner.name);

  // 6. Delivery partner marks picked up and moves to out_for_delivery
  const outForDeliveryOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'out_for_delivery',
      pickedUpAt: new Date(),
      outForDeliveryAt: new Date(),
    },
  });
  assert.equal(outForDeliveryOrder.status, 'out_for_delivery');

  // 7. PIN Verification Failure handling: wrong PIN entered
  const wrongPin = '000000';
  const isWrongValid = verifyPin(order.orderNumber, wrongPin, order.deliveryPinHash);
  assert.equal(isWrongValid, false);

  // Record failed attempt audit
  await prisma.order.update({
    where: { id: order.id },
    data: { pinFailedAttempts: { increment: 1 } },
  });
  await prisma.deliveryVerificationAudit.create({
    data: {
      orderId: order.id,
      partnerId: partner.id,
      actionType: 'pin_failed',
      success: false,
      attemptCount: 1,
      notes: 'Invalid PIN entered',
    },
  });

  const orderAfterFail = await prisma.order.findUnique({ where: { id: order.id } });
  assert.equal(orderAfterFail.status, 'out_for_delivery'); // Still undelivered!
  assert.equal(orderAfterFail.pinFailedAttempts, 1);

  // 8. PIN Verification Success: correct PIN entered
  const isCorrectValid = verifyPin(order.orderNumber, rawPin, order.deliveryPinHash);
  assert.equal(isCorrectValid, true);

  // Atomic completion transaction
  const deliveredOrder = await prisma.$transaction(async (tx) => {
    const completed = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
        pinConsumedAt: new Date(),
        pinFailedAttempts: 0,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: 'out_for_delivery',
        newStatus: 'delivered',
        changedBy: `delivery_partner:${partner.name}`,
        notes: 'PIN verified successfully and order handed over',
      },
    });

    await tx.deliveryVerificationAudit.create({
      data: {
        orderId: order.id,
        partnerId: partner.id,
        actionType: 'pin_verified',
        success: true,
        attemptCount: 1,
        notes: 'PIN verified successfully',
      },
    });

    return completed;
  });

  assert.equal(deliveredOrder.status, 'delivered');
  assert.ok(deliveredOrder.deliveredAt);
  assert.ok(deliveredOrder.pinConsumedAt);

  // Clean up test data
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
  await prisma.deliveryVerificationAudit.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.customerAddress.deleteMany({ where: { userId: customer.id } });
  await prisma.user.delete({ where: { id: customer.id } });
  await prisma.user.delete({ where: { id: partner.id } });
});
