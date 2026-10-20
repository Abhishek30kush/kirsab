import { prisma } from '../config/db.js';
import {
  calculateVegetablePricing,
  normalizeCompetitorPrice,
  applyRoundingRule,
} from '../utils/pricingCalculator.js';

/**
 * Preview / Validate calculation without persisting
 * POST /api/pricing/calculate
 */
export const calculatePrice = async (req, res, next) => {
  try {
    const calculation = calculateVegetablePricing(req.body);

    // Normalize competitor prices if provided
    let competitorComparisons = [];
    if (Array.isArray(req.body.competitorPrices)) {
      competitorComparisons = req.body.competitorPrices.map(c => {
        const normalizedPrice = normalizeCompetitorPrice(c.packPrice, c.packQuantity, c.packUnit);
        const diffRupees = calculation.recommendedSellingPrice - normalizedPrice;
        const diffPercent = normalizedPrice > 0 ? (diffRupees / normalizedPrice) * 100 : 0;
        let comparisonStatus = 'comparable';
        if (diffPercent < -2) comparisonStatus = 'cheaper';
        else if (diffPercent > 2) comparisonStatus = 'more_expensive';

        return {
          competitorName: c.competitorName,
          packPrice: Number(c.packPrice) || 0,
          packQuantity: Number(c.packQuantity) || 1,
          packUnit: c.packUnit || 'kg',
          normalizedPricePerKg: normalizedPrice,
          diffRupees: Math.round(diffRupees * 100) / 100,
          diffPercent: Math.round(diffPercent * 10) / 10,
          status: comparisonStatus,
          cityPincode: c.cityPincode || '211011',
        };
      });
    }

    res.json({
      success: true,
      data: {
        ...calculation,
        competitorComparisons,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'मूल्य गणना में त्रुटि हुई (Calculation error)',
    });
  }
};

/**
 * Save pricing calculation record (with optional product price update)
 * POST /api/pricing/save
 */
export const saveCalculation = async (req, res, next) => {
  try {
    const {
      productId,
      productName,
      supplierName,
      purchaseDate,
      unit = '1 kg',
      applyToProduct = false,
      competitorPrices = [],
      notes,
      ...calcInputs
    } = req.body;

    if (!productName && !productId) {
      return res.status(400).json({
        success: false,
        message: 'Product name or ID is required',
      });
    }

    // Always recalculate on server for security & integrity
    const calc = calculateVegetablePricing(calcInputs);

    // Verify product exists if productId given
    let resolvedProductName = productName;
    if (productId) {
      const prod = await prisma.product.findUnique({ where: { id: productId } });
      if (prod) {
        resolvedProductName = `${prod.nameHi} (${prod.nameEn})`;
      }
    }

    // Save calculation and optional competitor observations
    const saved = await prisma.pricingCalculation.create({
      data: {
        productId: productId || null,
        productName: resolvedProductName,
        supplierName: supplierName || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        unit: unit || '1 kg',
        purchasePricePerKg: calc.purchasePricePerKg,
        purchasedQuantity: calc.purchasedQuantity,
        invoiceAmount: Number(calcInputs.invoiceAmount) || null,
        loadingUnloadingCost: Number(calcInputs.loadingUnloadingCost) || 0,
        transportCost: Number(calcInputs.transportCost) || 0,
        otherProcurementCost: Number(calcInputs.otherProcurementCost) || 0,
        wastagePercentage: calc.wastagePercentage,
        actualWastageQty: calcInputs.actualWastageQty ? Number(calcInputs.actualWastageQty) : null,
        packagingCostPerKg: Number(calcInputs.packagingCostPerKg) || 0,
        packagingCostPerOrder: Number(calcInputs.packagingCostPerOrder) || 0,
        avgOrderSizeKg: Number(calcInputs.avgOrderSizeKg) || 2.5,
        handlingLabourCost: Number(calcInputs.handlingLabourCost) || 0,
        isLaborPerKg: Boolean(calcInputs.isLaborPerKg),
        storageElectricityCost: Number(calcInputs.storageElectricityCost) || 0,
        platformOperatingCost: Number(calcInputs.platformOperatingCost) || 0,
        gatewayFeePercent: Number(calcInputs.gatewayFeePercent) || 0,
        otherExpenses: Number(calcInputs.otherExpenses) || 0,
        deliveryMode: calcInputs.deliveryMode || 'free',
        deliverySubsidizedCost: Number(calcInputs.deliverySubsidizedCost) || 0,
        pricingMode: calc.pricingMode,
        targetMargin: calc.targetMargin,
        targetProfitPerKg: calc.targetProfitPerKg,
        roundingRule: calc.roundingRule,
        totalProcurementCost: calc.totalProcurementCost,
        usableQuantity: calc.usableQuantity,
        effectivePurchaseCostPerKg: calc.effectivePurchaseCostPerKg,
        totalBatchCost: calc.totalBatchCost,
        totalUnitCost: calc.totalUnitCost,
        unroundedSellingPrice: calc.unroundedSellingPrice,
        recommendedSellingPrice: calc.recommendedSellingPrice,
        expectedProfitPerKg: calc.expectedProfitPerKg,
        expectedGrossProfit: calc.expectedTotalGrossProfit,
        grossMarginPercent: calc.grossMarginPercent,
        breakEvenSellingPrice: calc.breakEvenSellingPrice,
        appliedToProduct: Boolean(applyToProduct && productId),
        appliedAt: applyToProduct && productId ? new Date() : null,
        notes: notes || null,
        competitorPrices: {
          create: Array.isArray(competitorPrices)
            ? competitorPrices
                .filter(c => c.packPrice && Number(c.packPrice) > 0)
                .map(c => ({
                  productId: productId || null,
                  competitorName: c.competitorName,
                  packQuantity: Number(c.packQuantity) || 1,
                  packUnit: c.packUnit || 'kg',
                  packPrice: Number(c.packPrice) || 0,
                  normalizedPricePerKg: normalizeCompetitorPrice(c.packPrice, c.packQuantity, c.packUnit),
                  cityPincode: c.cityPincode || '211011',
                  notes: c.notes || null,
                }))
            : [],
        },
      },
      include: {
        competitorPrices: true,
      },
    });

    // Update live product price if requested
    if (applyToProduct && productId) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          price: calc.recommendedSellingPrice,
          isConfigured: true,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: applyToProduct
        ? 'मूल्य गणना सुरक्षित की गई एवं उत्पाद का लाइव विक्रय मूल्य अपडेट किया गया!'
        : 'मूल्य गणना इतिहास सुरक्षित किया गया!',
      data: saved,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'गणना सुरक्षित करने में विफल (Failed to save calculation)',
    });
  }
};

/**
 * Get pricing calculation history for a vegetable
 * GET /api/pricing/history/:productId
 */
export const getPricingHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const history = await prisma.pricingCalculation.findMany({
      where: productId === 'all' ? {} : { productId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        competitorPrices: true,
      },
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply a recommended price to live product
 * POST /api/pricing/apply-price
 */
export const applyPriceToProduct = async (req, res, next) => {
  try {
    const { productId, price, calculationId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive price is required' });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        price: Math.round(numPrice * 100) / 100,
        isConfigured: true,
      },
    });

    if (calculationId) {
      await prisma.pricingCalculation.update({
        where: { id: calculationId },
        data: {
          appliedToProduct: true,
          appliedAt: new Date(),
        },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `${updated.nameHi} का नया विक्रय मूल्य ₹${updated.price} सफलतापूर्वक लागू किया गया!`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk recalculate prices for multiple vegetables
 * POST /api/pricing/bulk-calculate
 */
export const bulkCalculate = async (req, res, next) => {
  try {
    const { items = [], defaultMargin = 20, defaultRoundingRule = 'exact' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided for bulk calculation' });
    }

    const results = items.map(item => {
      try {
        const calc = calculateVegetablePricing({
          purchasePricePerKg: Number(item.purchasePricePerKg) || 0,
          purchasedQuantity: Number(item.purchasedQuantity) || 10,
          wastagePercentage: Number(item.wastagePercentage) || 5,
          transportCost: Number(item.transportCost) || 0,
          packagingCostPerKg: Number(item.packagingCostPerKg) || 1,
          handlingLabourCost: Number(item.handlingLabourCost) || 0,
          storageElectricityCost: Number(item.storageElectricityCost) || 0,
          platformOperatingCost: Number(item.platformOperatingCost) || 0,
          otherExpenses: Number(item.otherExpenses) || 0,
          pricingMode: item.pricingMode || 'margin',
          targetMargin: Number(item.targetMargin) || Number(defaultMargin) || 20,
          targetProfitPerKg: Number(item.targetProfitPerKg) || 0,
          roundingRule: item.roundingRule || defaultRoundingRule,
        });

        const currentPrice = Number(item.currentPrice) || null;
        let pricingStatus = 'unconfigured';

        if (currentPrice !== null && currentPrice > 0) {
          if (currentPrice < calc.totalUnitCost) {
            pricingStatus = 'below_cost'; // Loss making!
          } else {
            const currentMargin = ((currentPrice - calc.totalUnitCost) / currentPrice) * 100;
            if (currentMargin < calc.targetMargin - 0.5) {
              pricingStatus = 'below_margin';
            } else {
              pricingStatus = 'margin_achieved';
            }
          }
        }

        return {
          productId: item.productId,
          productNameEn: item.productNameEn,
          productNameHi: item.productNameHi,
          categoryId: item.categoryId,
          currentPrice,
          competitorPrice: Number(item.competitorPrice) || null,
          ...calc,
          pricingStatus,
        };
      } catch (err) {
        return {
          productId: item.productId,
          productNameEn: item.productNameEn,
          productNameHi: item.productNameHi,
          categoryId: item.categoryId,
          currentPrice: Number(item.currentPrice) || null,
          error: err.message,
          pricingStatus: 'invalid_inputs',
        };
      }
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk apply updated selling prices to live products
 * POST /api/pricing/bulk-apply
 */
export const bulkApplyPrices = async (req, res, next) => {
  try {
    const { updates = [] } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    const validUpdates = updates.filter(u => u.productId && Number(u.price) > 0);

    if (validUpdates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid price updates found' });
    }

    // Execute in a single atomic transaction
    await prisma.$transaction(
      validUpdates.map(u =>
        prisma.product.update({
          where: { id: u.productId },
          data: {
            price: Math.round(Number(u.price) * 100) / 100,
            isConfigured: true,
          },
        })
      )
    );

    // Save batch calculation records if provided
    for (const u of validUpdates) {
      if (u.calcDetails) {
        try {
          await prisma.pricingCalculation.create({
            data: {
              productId: u.productId,
              productName: u.productName || u.productId,
              unit: u.unit || '1 kg',
              purchasePricePerKg: Number(u.calcDetails.purchasePricePerKg) || 0,
              purchasedQuantity: Number(u.calcDetails.purchasedQuantity) || 1,
              wastagePercentage: Number(u.calcDetails.wastagePercentage) || 0,
              totalProcurementCost: Number(u.calcDetails.totalProcurementCost) || 0,
              usableQuantity: Number(u.calcDetails.usableQuantity) || 1,
              effectivePurchaseCostPerKg: Number(u.calcDetails.effectivePurchaseCostPerKg) || 0,
              totalBatchCost: Number(u.calcDetails.totalBatchCost) || 0,
              totalUnitCost: Number(u.calcDetails.totalUnitCost) || 0,
              unroundedSellingPrice: Number(u.calcDetails.unroundedSellingPrice) || Number(u.price),
              recommendedSellingPrice: Number(u.price),
              expectedProfitPerKg: Number(u.calcDetails.expectedProfitPerKg) || 0,
              expectedGrossProfit: Number(u.calcDetails.expectedTotalGrossProfit) || 0,
              grossMarginPercent: Number(u.calcDetails.grossMarginPercent) || 0,
              breakEvenSellingPrice: Number(u.calcDetails.breakEvenSellingPrice) || 0,
              appliedToProduct: true,
              appliedAt: new Date(),
              notes: 'Bulk price update',
            },
          });
        } catch {
          // Non-critical background logging
        }
      }
    }

    res.json({
      success: true,
      message: `${validUpdates.length} सब्ज़ियों के विक्रय मूल्य सफलतापूर्वक अपडेट किए गए!`,
      updatedCount: validUpdates.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pricing overview, summary insights, and latest calculation records
 * GET /api/pricing/overview
 */
export const getPricingOverview = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        pricingCalculations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { competitorPrices: true },
        },
      },
      orderBy: [{ category: { displayOrder: 'asc' } }, { nameEn: 'asc' }],
    });

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    let totalWithPricing = 0;
    let belowCostCount = 0;
    let belowMarginCount = 0;
    let targetAchievedCount = 0;
    let outdatedCount = 0;
    let potentialGrossProfitTotal = 0;

    const formattedProducts = products.map(p => {
      const latestCalc = p.pricingCalculations[0] || null;
      let status = 'unconfigured';
      let isOutdated = false;

      if (latestCalc) {
        totalWithPricing++;
        isOutdated = new Date(latestCalc.createdAt) < threeDaysAgo;
        if (isOutdated) outdatedCount++;

        if (p.price !== null && p.price > 0) {
          if (p.price < latestCalc.totalUnitCost) {
            status = 'below_cost';
            belowCostCount++;
          } else {
            const currentMargin = ((p.price - latestCalc.totalUnitCost) / p.price) * 100;
            if (currentMargin < latestCalc.targetMargin - 0.5) {
              status = 'below_margin';
              belowMarginCount++;
            } else {
              status = 'margin_achieved';
              targetAchievedCount++;
            }
          }
          // Add potential gross profit based on usable qty in recent batch
          const profitPerKg = p.price - latestCalc.totalUnitCost;
          potentialGrossProfitTotal += profitPerKg * latestCalc.usableQuantity;
        }
      } else {
        outdatedCount++;
      }

      return {
        id: p.id,
        nameEn: p.nameEn,
        nameHi: p.nameHi,
        unit: p.unit,
        unitShort: p.unitShort,
        currentPrice: p.price,
        inStock: p.inStock,
        isConfigured: p.isConfigured,
        category: p.category,
        latestCalculation: latestCalc,
        pricingStatus: status,
        isOutdated,
      };
    });

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        insights: {
          totalVegetables: products.length,
          totalWithPricing,
          belowCostCount,
          belowMarginCount,
          targetAchievedCount,
          outdatedCount,
          potentialGrossProfitTotal: Math.round(potentialGrossProfitTotal * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save competitor price observation
 * POST /api/pricing/competitors
 */
export const saveCompetitorPrice = async (req, res, next) => {
  try {
    const {
      productId,
      pricingCalculationId,
      competitorName,
      packQuantity = 1,
      packUnit = 'kg',
      packPrice,
      cityPincode = '211011',
      notes,
    } = req.body;

    if (!competitorName || !packPrice) {
      return res.status(400).json({ success: false, message: 'Competitor name and price are required' });
    }

    const normalizedPrice = normalizeCompetitorPrice(packPrice, packQuantity, packUnit);

    const saved = await prisma.competitorPrice.create({
      data: {
        productId: productId || null,
        pricingCalculationId: pricingCalculationId || null,
        competitorName,
        packQuantity: Number(packQuantity) || 1,
        packUnit: packUnit || 'kg',
        packPrice: Number(packPrice) || 0,
        normalizedPricePerKg: normalizedPrice,
        cityPincode: cityPincode || '211011',
        notes: notes || null,
      },
    });

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};
