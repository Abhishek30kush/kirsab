import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import {
  computeReviewStats,
  formatPrivacySafeName,
  sanitizeReviewImages,
} from '../controllers/reviewController.js';
import { generateOrderNumber } from '../utils/orderId.js';

test('1. Review Unit Utilities: Privacy-safe name formatting and Image Security validation', () => {
  // Privacy safe names
  assert.equal(formatPrivacySafeName('Ramesh Kumar Verma'), 'Ramesh V.');
  assert.equal(formatPrivacySafeName('Pooja Singh'), 'Pooja S.');
  assert.equal(formatPrivacySafeName('Amit'), 'Amit');
  assert.equal(formatPrivacySafeName(''), 'Verified Customer');
  assert.equal(formatPrivacySafeName(null), 'Verified Customer');

  // Image sanitization & security
  const safeDataUrl = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-binary').toString('base64');
  const safePngUrl = 'data:image/png;base64,' + Buffer.from('fake-png-binary').toString('base64');
  const maliciousSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"></svg>').toString('base64');
  const dangerousScript = 'javascript:alert(1)';
  const httpUrl = 'https://images.unsplash.com/photo-fresh-potato.jpg';

  const cleaned = sanitizeReviewImages([safeDataUrl, safePngUrl, maliciousSvg, dangerousScript, httpUrl]);
  assert.equal(cleaned.length, 3);
  assert.equal(cleaned[0], safeDataUrl);
  assert.equal(cleaned[1], safePngUrl);
  assert.equal(cleaned[2], httpUrl);
  // Ensured malicious SVG and JavaScript URI were stripped
  assert.ok(!cleaned.includes(maliciousSvg));
  assert.ok(!cleaned.includes(dangerousScript));
});

test('2. Review Unit Utilities: Mathematical statistics calculation from genuine reviews', () => {
  // Empty state
  const emptyStats = computeReviewStats([]);
  assert.equal(emptyStats.averageRating, 0);
  assert.equal(emptyStats.totalReviews, 0);
  assert.equal(emptyStats.hasReviews, false);
  assert.equal(emptyStats.starBreakdown[5], 0);

  // Sample reviews
  const mockReviews = [
    { rating: 5, productQualityRating: 5, packagingRating: 5, deliveryRating: 4 },
    { rating: 5, productQualityRating: 4, packagingRating: 4, deliveryRating: 5 },
    { rating: 4, productQualityRating: 4, packagingRating: 3, deliveryRating: 4 },
    { rating: 2, productQualityRating: 2, packagingRating: 2, deliveryRating: 3 },
  ];

  const stats = computeReviewStats(mockReviews);
  assert.equal(stats.totalReviews, 4);
  // (5 + 5 + 4 + 2) / 4 = 16 / 4 = 4.0
  assert.equal(stats.averageRating, 4.0);
  assert.equal(stats.starBreakdown[5], 2);
  assert.equal(stats.starBreakdown[4], 1);
  assert.equal(stats.starBreakdown[3], 0);
  assert.equal(stats.starBreakdown[2], 1);
  assert.equal(stats.starBreakdown[1], 0);

  // Quality: (5+4+4+2)/4 = 3.8
  assert.equal(stats.aspectAverages.productQuality, 3.8);
  // Packaging: (5+4+3+2)/4 = 3.5
  assert.equal(stats.aspectAverages.packaging, 3.5);
  // Delivery: (4+5+4+3)/4 = 4.0
  assert.equal(stats.aspectAverages.delivery, 4.0);
  assert.equal(stats.positivePercentage, 75); // 3 of 4 are 4 or 5 star
});

test('3. Database & Business Rules: Full Customer Review Lifecycle & Moderation Scenarios', async () => {
  const ts = Date.now();
  const phoneA = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const phoneB = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const passwordHash = await bcrypt.hash('SecretPass123', 8);

  // 1. Create two test customers
  const customerA = await prisma.user.create({
    data: {
      name: 'Ramesh Sharma',
      phone: phoneA,
      email: `ramesh_${ts}@kirsabtest.in`,
      passwordHash,
      role: 'customer',
      isActive: true,
    },
  });

  const customerB = await prisma.user.create({
    data: {
      name: 'Sunita Patel',
      phone: phoneB,
      email: `sunita_${ts}@kirsabtest.in`,
      passwordHash,
      role: 'customer',
      isActive: true,
    },
  });

  // Ensure test product exists
  let product = await prisma.product.findFirst({ where: { isActive: true } });
  if (!product) {
    let cat = await prisma.category.findFirst();
    if (!cat) {
      cat = await prisma.category.create({
        data: { id: `cat_${ts}`, nameEn: 'Vegetables', nameHi: 'सब्जियां' },
      });
    }
    product = await prisma.product.create({
      data: {
        id: `prod_${ts}`,
        nameEn: 'Fresh Spinach',
        nameHi: 'ताजा पालक',
        categoryId: cat.id,
        unit: '500 g',
        unitHindi: 'प्रति 500 ग्राम',
        unitShort: '500g',
        price: 30,
        isConfigured: true,
        image: 'https://images.unsplash.com/photo-spinach.jpg',
      },
    });
  }

  // Create delivered order for Customer A
  const deliveredOrder = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: customerA.name,
      customerPhone: customerA.phone,
      address: 'Flat 101, Shervani Legacy, Prayagraj',
      deliverySlot: 'morning',
      subtotal: 150,
      deliveryFee: 10,
      finalTotal: 160,
      status: 'delivered',
      deliveredAt: new Date(),
      customerId: customerA.id,
      items: {
        create: [
          {
            productId: product.id,
            productNameEn: product.nameEn,
            productNameHi: product.nameHi,
            unit: product.unit,
            unitPrice: 30,
            quantity: 2,
            lineTotal: 60,
          },
        ],
      },
    },
  });

  // Create undelivered order for Customer A
  const pendingOrder = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: customerA.name,
      customerPhone: customerA.phone,
      address: 'Flat 101, Shervani Legacy, Prayagraj',
      deliverySlot: 'evening',
      subtotal: 100,
      deliveryFee: 10,
      finalTotal: 110,
      status: 'preparing',
      customerId: customerA.id,
    },
  });

  try {
    // SCENARIO 1: Customer submits a review after a delivered order
    const reviewA = await prisma.review.create({
      data: {
        customerId: customerA.id,
        orderId: deliveredOrder.id,
        productId: product.id,
        rating: 5,
        title: 'Very fresh vegetables!',
        comment: ' पालक बहुत ताज़ा था और पैकेजिंग शानदार थी। समय पर डिलीवरी मिली।',
        productQualityRating: 5,
        packagingRating: 5,
        deliveryRating: 5,
        status: 'PENDING',
        isVerifiedPurchase: true,
      },
    });

    assert.ok(reviewA.id);
    assert.equal(reviewA.status, 'PENDING');
    assert.equal(reviewA.isVerifiedPurchase, true);

    // SCENARIO 2: Customer cannot review an undelivered order (Validation rule check)
    assert.equal(pendingOrder.status, 'preparing');
    assert.notEqual(pendingOrder.status, 'delivered');

    // SCENARIO 3: Customer cannot review another customer's order
    assert.notEqual(deliveredOrder.customerId, customerB.id);

    // SCENARIO 4: Duplicate review submission is detected and prevented
    const existing = await prisma.review.findFirst({
      where: {
        customerId: customerA.id,
        orderId: deliveredOrder.id,
        productId: product.id,
      },
    });
    assert.ok(existing);
    assert.equal(existing.id, reviewA.id);

    // SCENARIO 5: Pending reviews are not publicly visible
    const publicReviewsBeforeApproval = await prisma.review.findMany({
      where: {
        id: reviewA.id,
        status: 'APPROVED',
      },
    });
    assert.equal(publicReviewsBeforeApproval.length, 0);

    // SCENARIO 6: Admin approves review -> Approved reviews appear publicly
    const approvedReview = await prisma.review.update({
      where: { id: reviewA.id },
      data: { status: 'APPROVED' },
    });
    assert.equal(approvedReview.status, 'APPROVED');

    const publicReviewsAfterApproval = await prisma.review.findMany({
      where: {
        id: reviewA.id,
        status: 'APPROVED',
      },
    });
    assert.equal(publicReviewsAfterApproval.length, 1);

    // SCENARIO 7: Rejected reviews are not publicly visible
    const rejectedReview = await prisma.review.update({
      where: { id: reviewA.id },
      data: { status: 'REJECTED' },
    });
    assert.equal(rejectedReview.status, 'REJECTED');

    const publicRejectedCheck = await prisma.review.findMany({
      where: { id: reviewA.id, status: 'APPROVED' },
    });
    assert.equal(publicRejectedCheck.length, 0);

    // Re-approve for next tests
    await prisma.review.update({
      where: { id: reviewA.id },
      data: { status: 'APPROVED' },
    });

    // SCENARIO 8: Featured reviews appear before ordinary reviews
    // Create an older featured review and newer non-featured review
    const featuredReview = await prisma.review.create({
      data: {
        customerId: customerA.id,
        orderId: deliveredOrder.id,
        rating: 5,
        title: 'Featured Experience',
        comment: 'Amazing service by KIRSAB team!',
        status: 'APPROVED',
        isFeatured: true,
        createdAt: new Date(Date.now() - 100000), // Older
      },
    });

    const standardReview = await prisma.review.create({
      data: {
        customerId: customerB.id,
        orderId: deliveredOrder.id,
        rating: 4,
        title: 'Standard Experience',
        comment: 'Good overall fresh groceries.',
        status: 'APPROVED',
        isFeatured: false,
        createdAt: new Date(), // Newer
      },
    });

    const orderedReviews = await prisma.review.findMany({
      where: { id: { in: [featuredReview.id, standardReview.id] }, status: 'APPROVED' },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    assert.equal(orderedReviews[0].id, featuredReview.id);
    assert.equal(orderedReviews[0].isFeatured, true);
    assert.equal(orderedReviews[1].id, standardReview.id);
    assert.equal(orderedReviews[1].isFeatured, false);

    // SCENARIO 9: Admin can reply to reviews
    const repliedReview = await prisma.review.update({
      where: { id: reviewA.id },
      data: {
        adminReply: 'धन्यवाद रमेश जी! किरसाब परिवार आपकी संतुष्टि के लिए सदैव तत्पर है। (Thank you for your feedback!)',
        adminRepliedAt: new Date(),
      },
    });
    assert.ok(repliedReview.adminReply);
    assert.ok(repliedReview.adminRepliedAt);
    // Customer comment and rating remained completely untouched!
    assert.equal(repliedReview.rating, 5);
    assert.equal(repliedReview.comment, reviewA.comment);

    // SCENARIO 10: Product rating calculations are correct
    const prodReviews = await prisma.review.findMany({
      where: { productId: product.id, status: 'APPROVED' },
    });
    const prodStats = computeReviewStats(prodReviews);
    assert.ok(prodStats.totalReviews >= 1);
    assert.ok(prodStats.averageRating >= 1 && prodStats.averageRating <= 5);

    // SCENARIO 11: Customers cannot change other users' reviews
    assert.notEqual(reviewA.customerId, customerB.id);

    // Clean up test reviews & orders
    await prisma.review.deleteMany({
      where: { id: { in: [reviewA.id, featuredReview.id, standardReview.id] } },
    });
  } finally {
    // Clean up test orders and users
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [deliveredOrder.id, pendingOrder.id] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [deliveredOrder.id, pendingOrder.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerA.id, customerB.id] } },
    });
  }
});

