import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVegetablePricing,
  normalizeCompetitorPrice,
  applyRoundingRule,
} from '../utils/pricingCalculator.js';
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';

test('1. Basic purchase-cost and procurement expenses calculation', () => {
  const result = calculateVegetablePricing({
    purchasePricePerKg: 20,
    purchasedQuantity: 100,
    loadingUnloadingCost: 50,
    transportCost: 150,
    otherProcurementCost: 100,
    wastagePercentage: 0,
    targetMargin: 20,
  });

  // Purchase Amount = 20 * 100 = 2000
  assert.equal(result.purchaseAmount, 2000);
  // Procurement expenses = 50 + 150 + 100 = 300
  assert.equal(result.totalProcurementExpenses, 300);
  // Total Procurement Cost = 2300
  assert.equal(result.totalProcurementCost, 2300);
  assert.equal(result.usableQuantity, 100);
  assert.equal(result.effectivePurchaseCostPerKg, 23);
});

test('2. Invoice amount derivation (prevents double-counting)', () => {
  const result = calculateVegetablePricing({
    invoiceAmount: 2500,
    purchasedQuantity: 50,
    loadingUnloadingCost: 100,
    wastagePercentage: 0,
    targetMargin: 20,
  });

  // Effective purchase price per kg = 2500 / 50 = 50
  assert.equal(result.purchasePricePerKg, 50);
  assert.equal(result.purchaseAmount, 2500);
  assert.equal(result.totalProcurementCost, 2600);
});

test('3. Wastage-adjusted effective cost & prompt example calculation', () => {
  // Example from prompt:
  // Purchase price: ₹20/kg, Quantity: 100 kg, Wastage: 5%
  // Procurement & other allocated costs: ₹300 per batch
  // Additional packaging and operating costs: ₹2/kg of saleable quantity
  // Target gross margin: 20%
  const result = calculateVegetablePricing({
    purchasePricePerKg: 20,
    purchasedQuantity: 100,
    transportCost: 300, // Procurement batch cost
    wastagePercentage: 5, // 5 kg wasted, 95 kg usable
    packagingCostPerKg: 2, // ₹2/kg of saleable quantity
    targetMargin: 20,
  });

  // Usable qty = 100 - 5 = 95 kg
  assert.equal(result.usableQuantity, 95);
  // Total procurement cost = (20 * 100) + 300 = 2300
  assert.equal(result.totalProcurementCost, 2300);
  // Effective purchase cost per kg = 2300 / 95 = 24.21
  assert.equal(result.effectivePurchaseCostPerKg, 24.21);
  // Additional packaging = 2/kg => total unit cost = 24.21 + 2 = 26.21
  assert.equal(result.totalUnitCost, 26.21);
  // Recommended selling price at 20% margin: 26.21 / (1 - 0.20) = 32.76
  assert.equal(result.recommendedSellingPrice, 32.76);
  // Margin check: (32.76 - 26.21) / 32.76 = ~20%
  assert.ok(Math.abs(result.grossMarginPercent - 20) < 0.2);
});

test('4. Mode 2: Target profit per kg calculation', () => {
  const result = calculateVegetablePricing({
    purchasePricePerKg: 30,
    purchasedQuantity: 50,
    wastagePercentage: 0,
    packagingCostPerKg: 2,
    pricingMode: 'profit_per_kg',
    targetProfitPerKg: 10,
  });

  // Total Unit Cost = 30 + 2 = 32
  assert.equal(result.totalUnitCost, 32);
  // Recommended Selling Price = 32 + 10 = 42
  assert.equal(result.recommendedSellingPrice, 42);
  assert.equal(result.expectedProfitPerKg, 10);
  // Gross margin % = (10 / 42) * 100 = 23.81%
  assert.equal(result.grossMarginPercent, 23.81);
});

test('5. Competitor price normalization', () => {
  // 500g at ₹30 should normalize to ₹60/kg
  const price500g = normalizeCompetitorPrice(30, 500, 'g');
  assert.equal(price500g, 60);

  // 250g at ₹15 should normalize to ₹60/kg
  const price250g = normalizeCompetitorPrice(15, 250, 'gram');
  assert.equal(price250g, 60);

  // 1 kg at ₹45 should normalize to ₹45/kg
  const price1kg = normalizeCompetitorPrice(45, 1, 'kg');
  assert.equal(price1kg, 45);

  // 2 kg at ₹80 should normalize to ₹40/kg
  const price2kg = normalizeCompetitorPrice(80, 2, 'kg');
  assert.equal(price2kg, 40);
});

test('6. Delivery subsidization handling', () => {
  // Case A: Customer paid delivery => 0 cost to batch
  const resultPaid = calculateVegetablePricing({
    purchasePricePerKg: 20,
    purchasedQuantity: 10,
    deliveryMode: 'customer_paid',
    deliverySubsidizedCost: 50,
    targetMargin: 20,
  });
  assert.equal(resultPaid.fixedOverheadCostPerKg, 0);

  // Case B: Subsidized delivery => Only business-funded portion allocated
  const resultSubsidized = calculateVegetablePricing({
    purchasePricePerKg: 20,
    purchasedQuantity: 10,
    deliveryMode: 'subsidized',
    deliverySubsidizedCost: 30,
    targetMargin: 20,
  });
  // 30 / 10 = 3/kg allocated
  assert.equal(resultSubsidized.fixedOverheadCostPerKg, 3);
});

test('7. Validation & Rejections: negative price, zero quantity, 100% wastage', () => {
  // Negative price
  assert.throws(() => {
    calculateVegetablePricing({ purchasePricePerKg: -10, purchasedQuantity: 10 });
  }, { message: /Purchase price cannot be negative/ });

  // Zero quantity
  assert.throws(() => {
    calculateVegetablePricing({ purchasePricePerKg: 20, purchasedQuantity: 0 });
  }, { message: /Purchased quantity must be greater than zero/ });

  // 100% wastage
  assert.throws(() => {
    calculateVegetablePricing({ purchasePricePerKg: 20, purchasedQuantity: 10, wastagePercentage: 100 });
  }, { message: /Wastage percentage cannot be 100%/ });

  // Actual wastage equals purchased quantity
  assert.throws(() => {
    calculateVegetablePricing({ purchasePricePerKg: 20, purchasedQuantity: 10, actualWastageQty: 10 });
  }, { message: /Usable quantity must be greater than zero/ });

  // Invalid margin
  assert.throws(() => {
    calculateVegetablePricing({ purchasePricePerKg: 20, purchasedQuantity: 10, targetMargin: 100 });
  }, { message: /Target gross margin percentage must be greater than 0% and less than 100%/ });
});

test('8. Price Rounding Rules', () => {
  assert.equal(applyRoundingRule(32.44, 'exact'), 32.44);
  assert.equal(applyRoundingRule(32.44, '0.50'), 32.5);
  assert.equal(applyRoundingRule(32.22, '0.50'), 32);
  assert.equal(applyRoundingRule(32.44, '1.00'), 32);
  assert.equal(applyRoundingRule(32.74, '1.00'), 33);
  assert.equal(applyRoundingRule(32.10, 'ceil'), 33);
});

test('9. Database Integration: save calculation and verify historical record', async () => {
  const calculation = calculateVegetablePricing({
    purchasePricePerKg: 25,
    purchasedQuantity: 40,
    transportCost: 100,
    wastagePercentage: 5,
    targetMargin: 25,
  });

  const record = await prisma.pricingCalculation.create({
    data: {
      productName: 'Test Tomato (टमाटर)',
      unit: '1 kg',
      purchasePricePerKg: calculation.purchasePricePerKg,
      purchasedQuantity: calculation.purchasedQuantity,
      totalProcurementCost: calculation.totalProcurementCost,
      usableQuantity: calculation.usableQuantity,
      effectivePurchaseCostPerKg: calculation.effectivePurchaseCostPerKg,
      totalBatchCost: calculation.totalBatchCost,
      totalUnitCost: calculation.totalUnitCost,
      unroundedSellingPrice: calculation.unroundedSellingPrice,
      recommendedSellingPrice: calculation.recommendedSellingPrice,
      expectedProfitPerKg: calculation.expectedProfitPerKg,
      expectedGrossProfit: calculation.expectedTotalGrossProfit,
      grossMarginPercent: calculation.grossMarginPercent,
      breakEvenSellingPrice: calculation.breakEvenSellingPrice,
      notes: 'Automated test calculation',
      competitorPrices: {
        create: [
          {
            competitorName: 'Blinkit',
            packQuantity: 1,
            packUnit: 'kg',
            packPrice: 48,
            normalizedPricePerKg: 48,
            cityPincode: '211011',
          },
        ],
      },
    },
    include: {
      competitorPrices: true,
    },
  });

  assert.ok(record.id);
  assert.equal(record.competitorPrices.length, 1);
  assert.equal(record.competitorPrices[0].competitorName, 'Blinkit');

  // Clean up test record
  await prisma.pricingCalculation.delete({ where: { id: record.id } });
});

test('10. Fixed batch costs vs per-kg cost allocation', () => {
  const result = calculateVegetablePricing({
    purchasePricePerKg: 30,
    purchasedQuantity: 100,
    wastagePercentage: 10, // 90 kg usable
    handlingLabourCost: 180, // Fixed batch cost ₹180 => 180 / 90 = ₹2/kg
    isLaborPerKg: false,
    packagingCostPerKg: 1.5, // Per-kg cost = ₹1.5/kg
    targetMargin: 20,
  });

  // Effective purchase cost = 3000 / 90 = 33.33
  assert.equal(result.usableQuantity, 90);
  assert.equal(result.effectivePurchaseCostPerKg, 33.33);
  // Handling labour per kg = 180 / 90 = 2
  assert.equal(result.handlingLabourCostPerKg, 2);
  // Packaging per kg = 1.5
  assert.equal(result.packagingCostPerKg, 1.5);
  // Total unit additional cost = 2 + 1.5 = 3.5
  assert.equal(result.totalUnitAdditionalCost, 3.5);
  // Total unit cost = 33.33 + 3.5 = 36.83
  assert.equal(result.totalUnitCost, 36.83);
});

test('11. Zero usable quantity rejection', () => {
  assert.throws(() => {
    calculateVegetablePricing({
      purchasePricePerKg: 20,
      purchasedQuantity: 50,
      actualWastageQty: 50, // 100% loss
    });
  }, { message: /Usable quantity must be greater than zero/ });
});
