import { prisma } from '../config/db.js';

try {
  const updated = await prisma.storeSettings.update({
    where: { id: 'default' },
    data: {
      minOrderValue: 49,
      standardDeliveryFee: 10,
      freeDeliveryThreshold: 99,
    },
  });
  console.log('DB updated:', JSON.stringify({
    minOrderValue: updated.minOrderValue,
    standardDeliveryFee: updated.standardDeliveryFee,
    freeDeliveryThreshold: updated.freeDeliveryThreshold,
  }));
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await prisma.$disconnect();
}

