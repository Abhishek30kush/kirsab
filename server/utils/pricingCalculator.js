/**
 * KIRSAB Vegetable Pricing & Profit Calculator Engine
 * Core business math for procurement, wastage adjustments, unit cost allocation,
 * gross margin pricing, competitor price normalization, and bulk recalculation.
 */

/**
 * Normalizes competitor pack price to price per kg (₹/kg)
 * @param {number} packPrice - Stated price in INR
 * @param {number} packQuantity - Quantity amount (e.g. 500, 1)
 * @param {string} packUnit - Unit ('kg', 'g', 'gram', 'piece', 'bunch')
 * @returns {number} Normalized price per kg rounded to 2 decimals
 */
export function normalizeCompetitorPrice(packPrice, packQuantity = 1, packUnit = 'kg') {
  const price = Number(packPrice);
  const qty = Number(packQuantity);

  if (!price || price <= 0 || !qty || qty <= 0) return 0;

  const unit = String(packUnit).toLowerCase().trim();

  let pricePerKg = 0;
  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    pricePerKg = (price / qty) * 1000;
  } else if (unit === 'kg' || unit === 'kilo' || unit === 'kilogram') {
    pricePerKg = price / qty;
  } else {
    // For pieces or bunches, assume 1-to-1 unless specified
    pricePerKg = price / qty;
  }

  return Math.round(pricePerKg * 100) / 100;
}

/**
 * Rounds price according to chosen rule
 * @param {number} price
 * @param {string} rule - 'exact' | '0.50' | '1.00' | 'ceil'
 * @returns {number}
 */
export function applyRoundingRule(price, rule = 'exact') {
  const num = Number(price);
  if (isNaN(num)) return 0;

  switch (rule) {
    case '0.50':
      return Math.round(num * 2) / 2;
    case '1.00':
      return Math.round(num);
    case 'ceil':
      return Math.ceil(num);
    case 'exact':
    default:
      return Math.round(num * 100) / 100;
  }
}

/**
 * Calculates complete single vegetable pricing, costs, margins, and profit breakdown.
 *
 * @param {Object} params - Input parameters
 * @returns {Object} Complete calculation breakdown
 */
export function calculateVegetablePricing(params = {}) {
  const {
    // Purchase Inputs
    purchasePricePerKg = 0,
    purchasedQuantity = 0,
    invoiceAmount = 0,
    loadingUnloadingCost = 0,
    transportCost = 0,
    otherProcurementCost = 0,

    // Wastage Inputs
    wastagePercentage = 0,
    actualWastageQty = null,

    // Additional Costs
    packagingCostPerKg = 0,
    packagingCostPerOrder = 0,
    avgOrderSizeKg = 2.5, // Used to allocate per-order packaging to per-kg basis
    handlingLabourCost = 0, // Batch or per-kg depending on isLaborPerKg
    isLaborPerKg = false,
    storageElectricityCost = 0, // Fixed batch
    platformOperatingCost = 0, // Fixed batch
    gatewayFeePercent = 0, // Percentage fee on selling price
    otherExpenses = 0, // Fixed batch

    // Delivery subsidization
    deliveryMode = 'free', // 'free' | 'customer_paid' | 'subsidized'
    deliverySubsidizedCost = 0, // Business funded portion for batch

    // Pricing Mode
    pricingMode = 'margin', // 'margin' | 'profit_per_kg'
    targetMargin = 20, // Gross margin percentage (0 < m < 100)
    targetProfitPerKg = 0, // INR profit per saleable kg
    roundingRule = 'exact', // 'exact' | '0.50' | '1.00' | 'ceil'
  } = params;

  // 1. Validate Purchased Quantity
  const qtyPurchased = Number(purchasedQuantity) || 0;
  if (qtyPurchased <= 0) {
    throw new Error('Purchased quantity must be greater than zero.');
  }

  // 2. Derive Purchase Price and Purchase Amount (prevent double counting)
  let effectiveMandiPricePerKg = Number(purchasePricePerKg) || 0;
  let purchaseAmount = 0;
  const invAmt = Number(invoiceAmount) || 0;

  if (invAmt > 0) {
    purchaseAmount = invAmt;
    effectiveMandiPricePerKg = invAmt / qtyPurchased;
  } else {
    if (effectiveMandiPricePerKg < 0) {
      throw new Error('Purchase price cannot be negative.');
    }
    purchaseAmount = effectiveMandiPricePerKg * qtyPurchased;
  }

  // 3. Procurement Expenses
  const loadUnload = Math.max(0, Number(loadingUnloadingCost) || 0);
  const transport = Math.max(0, Number(transportCost) || 0);
  const otherProc = Math.max(0, Number(otherProcurementCost) || 0);
  const totalProcurementExpenses = loadUnload + transport + otherProc;
  const totalProcurementCost = purchaseAmount + totalProcurementExpenses;

  // 4. Wastage & Usable Quantity
  let wastedQty = 0;
  let wastagePct = 0;

  if (actualWastageQty !== null && actualWastageQty !== undefined && actualWastageQty !== '') {
    wastedQty = Math.max(0, Number(actualWastageQty) || 0);
    wastagePct = qtyPurchased > 0 ? (wastedQty / qtyPurchased) * 100 : 0;
  } else {
    wastagePct = Math.max(0, Number(wastagePercentage) || 0);
    if (wastagePct >= 100) {
      throw new Error('Wastage percentage cannot be 100% or greater.');
    }
    wastedQty = (qtyPurchased * wastagePct) / 100;
  }

  const usableQuantity = qtyPurchased - wastedQty;
  if (usableQuantity <= 0) {
    throw new Error('Usable quantity must be greater than zero. Wasted quantity cannot equal or exceed purchased quantity.');
  }

  // Effective Purchase Cost per usable kg
  const effectivePurchaseCostPerKg = totalProcurementCost / usableQuantity;
  const wastageCost = wastedQty * effectiveMandiPricePerKg;

  // 5. Additional Costs & Conversion to common basis
  const pkgPerKg = Math.max(0, Number(packagingCostPerKg) || 0);
  const pkgPerOrder = Math.max(0, Number(packagingCostPerOrder) || 0);
  const orderSize = Math.max(0.5, Number(avgOrderSizeKg) || 2.5);
  const effectivePkgPerKg = pkgPerKg + (pkgPerOrder > 0 ? pkgPerOrder / orderSize : 0);

  const rawLabor = Math.max(0, Number(handlingLabourCost) || 0);
  const laborBatchTotal = isLaborPerKg ? rawLabor * usableQuantity : rawLabor;
  const laborPerKg = isLaborPerKg ? rawLabor : laborBatchTotal / usableQuantity;

  const storageBatch = Math.max(0, Number(storageElectricityCost) || 0);
  const platformBatch = Math.max(0, Number(platformOperatingCost) || 0);
  const miscBatch = Math.max(0, Number(otherExpenses) || 0);

  // Delivery subsidization allocation
  let deliveryBatchCost = 0;
  if (deliveryMode === 'subsidized') {
    deliveryBatchCost = Math.max(0, Number(deliverySubsidizedCost) || 0);
  } else if (deliveryMode === 'free') {
    deliveryBatchCost = Math.max(0, Number(deliverySubsidizedCost) || 0);
  } else {
    // customer_paid => 0 cost to store vegetable batch
    deliveryBatchCost = 0;
  }

  const fixedBatchTotal = storageBatch + platformBatch + miscBatch + deliveryBatchCost;
  const fixedPerKg = fixedBatchTotal / usableQuantity;

  const unitAdditionalCost = effectivePkgPerKg + laborPerKg + fixedPerKg;
  const totalBatchAdditionalCost = (effectivePkgPerKg * usableQuantity) + laborBatchTotal + fixedBatchTotal;

  // Total Unit Cost & Total Batch Cost
  const totalUnitCost = effectivePurchaseCostPerKg + unitAdditionalCost;
  const totalBatchCost = totalProcurementCost + totalBatchAdditionalCost;

  // 6. Pricing Calculation
  const gwFeePct = Math.max(0, Math.min(50, Number(gatewayFeePercent) || 0));
  let unroundedSellingPrice = 0;

  if (pricingMode === 'profit_per_kg') {
    const targetProfit = Number(targetProfitPerKg) || 0;
    if (targetProfit < 0) {
      throw new Error('Target profit per kg cannot be negative.');
    }
    const targetBase = totalUnitCost + targetProfit;
    const netMultiplier = 1 - (gwFeePct / 100);
    if (netMultiplier <= 0) {
      throw new Error('Payment gateway fee percentage must be less than 100%.');
    }
    unroundedSellingPrice = targetBase / netMultiplier;
  } else {
    // Mode 1: Target Profit Margin
    const marginPct = Number(targetMargin) || 0;
    if (marginPct <= 0 || marginPct >= 100) {
      throw new Error('Target gross margin percentage must be greater than 0% and less than 100%.');
    }

    const netMarginAvailable = 1 - ((marginPct + gwFeePct) / 100);
    if (netMarginAvailable <= 0) {
      throw new Error('Combined target margin and gateway fee cannot equal or exceed 100%.');
    }

    unroundedSellingPrice = totalUnitCost / netMarginAvailable;
  }

  const roundedSellingPrice = applyRoundingRule(unroundedSellingPrice, roundingRule);

  // 7. Expected Realized Profit and Margins based on the rounded selling price
  const sellingPrice = roundedSellingPrice;
  const gatewayDeductionPerKg = (sellingPrice * gwFeePct) / 100;
  const netRevenuePerKg = sellingPrice - gatewayDeductionPerKg;
  const expectedProfitPerKg = netRevenuePerKg - totalUnitCost;
  const expectedTotalGrossProfit = expectedProfitPerKg * usableQuantity;
  const totalRevenue = sellingPrice * usableQuantity;
  const grossMarginPercent = totalRevenue > 0 ? ((netRevenuePerKg - totalUnitCost) / sellingPrice) * 100 : 0;

  // Break-even selling price (accounting for gateway fee)
  const breakEvenPrice = gwFeePct < 100 ? totalUnitCost / (1 - gwFeePct / 100) : totalUnitCost;

  return {
    // Procurement Summary
    purchasePricePerKg: round2(effectiveMandiPricePerKg),
    purchasedQuantity: round2(qtyPurchased),
    purchaseAmount: round2(purchaseAmount),
    totalProcurementExpenses: round2(totalProcurementExpenses),
    totalProcurementCost: round2(totalProcurementCost),

    // Wastage Summary
    wastagePercentage: round2(wastagePct),
    wastedQuantity: round2(wastedQty),
    usableQuantity: round2(usableQuantity),
    wastageCost: round2(wastageCost),
    effectivePurchaseCostPerKg: round2(effectivePurchaseCostPerKg),

    // Additional Costs Breakdown
    packagingCostPerKg: round2(effectivePkgPerKg),
    handlingLabourCostPerKg: round2(laborPerKg),
    fixedOverheadCostPerKg: round2(fixedPerKg),
    totalUnitAdditionalCost: round2(unitAdditionalCost),
    totalBatchAdditionalCost: round2(totalBatchAdditionalCost),

    // Total Batch & Unit Cost
    totalUnitCost: round2(totalUnitCost),
    totalBatchCost: round2(totalBatchCost),

    // Pricing Recommendations
    pricingMode,
    targetMargin: round2(Number(targetMargin) || 0),
    targetProfitPerKg: round2(Number(targetProfitPerKg) || 0),
    roundingRule,
    unroundedSellingPrice: round2(unroundedSellingPrice),
    recommendedSellingPrice: round2(roundedSellingPrice),
    breakEvenSellingPrice: round2(applyRoundingRule(breakEvenPrice, roundingRule)),

    // Profit & Margin Analysis
    expectedProfitPerKg: round2(expectedProfitPerKg),
    expectedTotalGrossProfit: round2(expectedTotalGrossProfit),
    grossMarginPercent: round2(grossMarginPercent),
    estimatedTotalRevenue: round2(totalRevenue),
  };
}

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}
