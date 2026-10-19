import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  Percent,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Save,
  Download,
  Search,
  Filter,
  Check,
  X,
  Store,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Scale
} from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

export const PricingCalculator = ({ products = [], categories = [], onPriceUpdated, showFeedback }) => {
  const [activeSubTab, setActiveSubTab] = useState('single'); // 'single' | 'bulk' | 'history'

  // Overview insights from server
  const [insights, setInsights] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  // Single Calculator Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isManualProduct, setIsManualProduct] = useState(false);
  const [manualProductName, setManualProductName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [unitType, setUnitType] = useState('1 kg');

  // Purchase Inputs
  const [inputMode, setInputMode] = useState('unit_price'); // 'unit_price' | 'invoice_total'
  const [purchasePricePerKg, setPurchasePricePerKg] = useState('20');
  const [purchasedQuantity, setPurchasedQuantity] = useState('100');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [loadingUnloadingCost, setLoadingUnloadingCost] = useState('50');
  const [transportCost, setTransportCost] = useState('150');
  const [otherProcurementCost, setOtherProcurementCost] = useState('100');

  // Wastage Inputs
  const [wastageMode, setWastageMode] = useState('percent'); // 'percent' | 'actual_kg'
  const [wastagePercentage, setWastagePercentage] = useState('5');
  const [actualWastageQty, setActualWastageQty] = useState('');

  // Additional Costs
  const [packagingCostPerKg, setPackagingCostPerKg] = useState('1.5');
  const [packagingCostPerOrder, setPackagingCostPerOrder] = useState('0');
  const [avgOrderSizeKg, setAvgOrderSizeKg] = useState('2.5');
  const [handlingLabourCost, setHandlingLabourCost] = useState('100');
  const [isLaborPerKg, setIsLaborPerKg] = useState(false);
  const [storageElectricityCost, setStorageElectricityCost] = useState('50');
  const [platformOperatingCost, setPlatformOperatingCost] = useState('50');
  const [gatewayFeePercent, setGatewayFeePercent] = useState('0');
  const [otherExpenses, setOtherExpenses] = useState('0');

  // Delivery subsidization
  const [deliveryMode, setDeliveryMode] = useState('free'); // 'free' | 'customer_paid' | 'subsidized'
  const [deliverySubsidizedCost, setDeliverySubsidizedCost] = useState('0');

  // Pricing mode & targets
  const [pricingMode, setPricingMode] = useState('margin'); // 'margin' | 'profit_per_kg'
  const [targetMargin, setTargetMargin] = useState('20');
  const [targetProfitPerKg, setTargetProfitPerKg] = useState('8');
  const [roundingRule, setRoundingRule] = useState('exact'); // 'exact' | '0.50' | '1.00' | 'ceil'
  const [calculationNotes, setCalculationNotes] = useState('');

  // Competitor Inputs
  const [competitors, setCompetitors] = useState([
    { competitorName: 'Blinkit', packQuantity: '1', packUnit: 'kg', packPrice: '', cityPincode: '211011' },
    { competitorName: 'Zepto', packQuantity: '1', packUnit: 'kg', packPrice: '', cityPincode: '211011' },
    { competitorName: 'Flipkart Minutes', packQuantity: '1', packUnit: 'kg', packPrice: '', cityPincode: '211011' },
    { competitorName: 'Local Mandi / Ret.', packQuantity: '1', packUnit: 'kg', packPrice: '', cityPincode: '211011' },
  ]);

  // Live preview & server calculation response
  const [liveCalc, setLiveCalc] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // Confirmation Modal for price change
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, data: null, type: 'single' });

  // Bulk Calculator State
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkCategory, setBulkCategory] = useState('all');
  const [bulkSort, setBulkSort] = useState('name'); // 'name' | 'margin_desc' | 'margin_asc' | 'price_desc'
  const [defaultBulkMargin, setDefaultBulkMargin] = useState('20');
  const [selectedBulkIds, setSelectedBulkIds] = useState(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // History State
  const [pricingHistory, setPricingHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load overview insights
  const fetchOverview = useCallback(async () => {
    try {
      setIsLoadingOverview(true);
      const res = await api.getPricingOverview();
      if (res.success) {
        setInsights(res.data.insights);
      }
    } catch (err) {
      console.error('Failed to load pricing overview:', err);
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  // Load history
  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const res = await api.getPricingHistory('all');
      if (res.success) {
        setPricingHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab, fetchHistory]);

  // Initial bulk rows setup from products
  useEffect(() => {
    if (products.length > 0 && bulkRows.length === 0) {
      const initial = products.map(p => ({
        productId: p.id,
        productNameEn: p.nameEn,
        productNameHi: p.nameHi,
        categoryId: p.categoryId,
        unit: p.unit,
        currentPrice: p.price,
        purchasePricePerKg: p.price ? Math.max(10, Math.round(p.price * 0.7)) : 20,
        purchasedQuantity: 50,
        wastagePercentage: 5,
        transportCost: 50,
        packagingCostPerKg: 1.5,
        handlingLabourCost: 50,
        targetMargin: 20,
        pricingMode: 'margin',
        roundingRule: 'exact',
        competitorPrice: '',
      }));
      setBulkRows(initial);
    }
  }, [products, bulkRows.length]);

  // Auto-populate when vegetable selected
  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    if (!productId) return;
    setIsManualProduct(false);

    const product = products.find(p => p.id === productId);
    if (product) {
      setUnitType(product.unit || '1 kg');
      // If product has a configured price, suggest reasonable initial mandi purchase
      if (product.price && product.price > 0) {
        setPurchasePricePerKg(String(Math.round(product.price * 0.72)));
      }
    }
  };

  // Trigger Client & Server Calculation
  const runCalculation = useCallback(async () => {
    setCalcError(null);
    const qty = Number(purchasedQuantity) || 0;
    if (qty <= 0) {
      setCalcError('कृपया मान्य खरीद मात्रा (Quantity > 0 kg) दर्ज करें।');
      setLiveCalc(null);
      return;
    }

    const payload = {
      purchasePricePerKg: inputMode === 'unit_price' ? Number(purchasePricePerKg) : 0,
      invoiceAmount: inputMode === 'invoice_total' ? Number(invoiceAmount) : null,
      purchasedQuantity: qty,
      loadingUnloadingCost: Number(loadingUnloadingCost) || 0,
      transportCost: Number(transportCost) || 0,
      otherProcurementCost: Number(otherProcurementCost) || 0,
      wastagePercentage: wastageMode === 'percent' ? Number(wastagePercentage) : 0,
      actualWastageQty: wastageMode === 'actual_kg' ? Number(actualWastageQty) : null,
      packagingCostPerKg: Number(packagingCostPerKg) || 0,
      packagingCostPerOrder: Number(packagingCostPerOrder) || 0,
      avgOrderSizeKg: Number(avgOrderSizeKg) || 2.5,
      handlingLabourCost: Number(handlingLabourCost) || 0,
      isLaborPerKg,
      storageElectricityCost: Number(storageElectricityCost) || 0,
      platformOperatingCost: Number(platformOperatingCost) || 0,
      gatewayFeePercent: Number(gatewayFeePercent) || 0,
      otherExpenses: Number(otherExpenses) || 0,
      deliveryMode,
      deliverySubsidizedCost: Number(deliverySubsidizedCost) || 0,
      pricingMode,
      targetMargin: Number(targetMargin) || 20,
      targetProfitPerKg: Number(targetProfitPerKg) || 0,
      roundingRule,
      competitorPrices: competitors.filter(c => c.packPrice && Number(c.packPrice) > 0),
    };

    try {
      setIsCalculating(true);
      const res = await api.calculatePricing(payload);
      if (res.success) {
        setLiveCalc(res.data);
      }
    } catch (err) {
      setCalcError(err.message || 'मूल्य गणना में त्रुटि');
      setLiveCalc(null);
    } finally {
      setIsCalculating(false);
    }
  }, [
    purchasedQuantity,
    inputMode,
    purchasePricePerKg,
    invoiceAmount,
    loadingUnloadingCost,
    transportCost,
    otherProcurementCost,
    wastageMode,
    wastagePercentage,
    actualWastageQty,
    packagingCostPerKg,
    packagingCostPerOrder,
    avgOrderSizeKg,
    handlingLabourCost,
    isLaborPerKg,
    storageElectricityCost,
    platformOperatingCost,
    gatewayFeePercent,
    otherExpenses,
    deliveryMode,
    deliverySubsidizedCost,
    pricingMode,
    targetMargin,
    targetProfitPerKg,
    roundingRule,
    competitors,
  ]);

  // Recalculate whenever inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      runCalculation();
    }, 250);
    return () => clearTimeout(timer);
  }, [runCalculation]);

  // Save calculation record
  const handleSaveCalculation = async (applyToLiveProduct = false) => {
    if (!liveCalc) {
      alert('कृपया पहले मान्य गणना पूर्ण करें।');
      return;
    }

    const currentProd = products.find(p => p.id === selectedProductId);
    const prodName = isManualProduct
      ? manualProductName || 'अनाम सब्ज़ी (Custom)'
      : currentProd
      ? `${currentProd.nameHi} (${currentProd.nameEn})`
      : 'अनाम सब्ज़ी';

    const payload = {
      productId: isManualProduct ? null : selectedProductId || null,
      productName: prodName,
      supplierName,
      purchaseDate,
      unit: unitType,
      applyToProduct: applyToLiveProduct,
      notes: calculationNotes,
      // Inputs
      purchasePricePerKg: inputMode === 'unit_price' ? Number(purchasePricePerKg) : 0,
      invoiceAmount: inputMode === 'invoice_total' ? Number(invoiceAmount) : null,
      purchasedQuantity: Number(purchasedQuantity),
      loadingUnloadingCost: Number(loadingUnloadingCost) || 0,
      transportCost: Number(transportCost) || 0,
      otherProcurementCost: Number(otherProcurementCost) || 0,
      wastagePercentage: wastageMode === 'percent' ? Number(wastagePercentage) : 0,
      actualWastageQty: wastageMode === 'actual_kg' ? Number(actualWastageQty) : null,
      packagingCostPerKg: Number(packagingCostPerKg) || 0,
      packagingCostPerOrder: Number(packagingCostPerOrder) || 0,
      avgOrderSizeKg: Number(avgOrderSizeKg) || 2.5,
      handlingLabourCost: Number(handlingLabourCost) || 0,
      isLaborPerKg,
      storageElectricityCost: Number(storageElectricityCost) || 0,
      platformOperatingCost: Number(platformOperatingCost) || 0,
      gatewayFeePercent: Number(gatewayFeePercent) || 0,
      otherExpenses: Number(otherExpenses) || 0,
      deliveryMode,
      deliverySubsidizedCost: Number(deliverySubsidizedCost) || 0,
      pricingMode,
      targetMargin: Number(targetMargin) || 20,
      targetProfitPerKg: Number(targetProfitPerKg) || 0,
      roundingRule,
      competitorPrices: competitors.filter(c => c.packPrice && Number(c.packPrice) > 0),
    };

    try {
      const res = await api.savePricingCalculation(payload);
      if (res.success) {
        showFeedback(res.message);
        setConfirmModal({ isOpen: false, data: null, type: 'single' });
        fetchOverview();
        if (applyToLiveProduct && onPriceUpdated) {
          onPriceUpdated();
        }
      }
    } catch (err) {
      alert(err.message || 'गणना सुरक्षित करने में त्रुटि');
    }
  };

  // Bulk recalculate on changes
  const [bulkCalculatedResults, setBulkCalculatedResults] = useState([]);
  const [isBulkCalculating, setIsBulkCalculating] = useState(false);

  const runBulkCalculation = useCallback(async () => {
    if (bulkRows.length === 0) return;
    try {
      setIsBulkCalculating(true);
      const res = await api.bulkCalculatePricing({
        items: bulkRows,
        defaultMargin: Number(defaultBulkMargin) || 20,
        defaultRoundingRule: 'exact',
      });
      if (res.success) {
        setBulkCalculatedResults(res.data);
      }
    } catch (err) {
      console.error('Bulk calc error:', err);
    } finally {
      setIsBulkCalculating(false);
    }
  }, [bulkRows, defaultBulkMargin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runBulkCalculation();
    }, 400);
    return () => clearTimeout(timer);
  }, [runBulkCalculation]);

  // Update a single bulk row field
  const updateBulkRow = (productId, field, value) => {
    setBulkRows(prev =>
      prev.map(row => (row.productId === productId ? { ...row, [field]: value } : row))
    );
  };

  // Apply default margin to all visible rows
  const handleApplyDefaultMarginToAll = () => {
    const margin = Number(defaultBulkMargin) || 20;
    setBulkRows(prev => prev.map(row => ({ ...row, targetMargin: margin })));
    showFeedback(`सभी पंक्तियों पर ${margin}% लक्ष्य मार्जिन लागू किया गया।`);
  };

  // Bulk Apply Prices with Confirmation
  const handleBulkApplyPrices = async () => {
    const toUpdate = bulkCalculatedResults.filter(
      r => selectedBulkIds.size === 0 || selectedBulkIds.has(r.productId)
    );

    if (toUpdate.length === 0) {
      alert('अपडेट करने हेतु कोई सब्ज़ी चयनित नहीं है।');
      return;
    }

    const updates = toUpdate.map(item => ({
      productId: item.productId,
      productName: `${item.productNameHi} (${item.productNameEn})`,
      price: item.recommendedSellingPrice,
      unit: item.unit || '1 kg',
      calcDetails: item,
    }));

    try {
      setIsBulkSaving(true);
      const res = await api.bulkApplyPricing({ updates });
      if (res.success) {
        showFeedback(res.message);
        setConfirmModal({ isOpen: false, data: null, type: 'bulk' });
        fetchOverview();
        if (onPriceUpdated) onPriceUpdated();
      }
    } catch (err) {
      alert(err.message || 'थोक मूल्य अपडेट करने में विफलता');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Export to CSV
  const exportBulkToCSV = () => {
    if (bulkCalculatedResults.length === 0) {
      alert('एक्सपोर्ट के लिए कोई डेटा नहीं है।');
      return;
    }

    const headers = [
      'Product ID',
      'Hindi Name',
      'English Name',
      'Mandi Price (₹/kg)',
      'Purchased Qty (kg)',
      'Wastage %',
      'Effective Cost (₹/kg)',
      'Total Unit Cost (₹/kg)',
      'Target Margin %',
      'Recommended Price (₹)',
      'Current Price (₹)',
      'Expected Profit (₹/kg)',
      'Pricing Status',
    ];

    const rows = bulkCalculatedResults.map(r => [
      `"${r.productId}"`,
      `"${r.productNameHi || ''}"`,
      `"${r.productNameEn || ''}"`,
      r.purchasePricePerKg || 0,
      r.purchasedQuantity || 0,
      r.wastagePercentage || 0,
      r.effectivePurchaseCostPerKg || 0,
      r.totalUnitCost || 0,
      r.targetMargin || 0,
      r.recommendedSellingPrice || 0,
      r.currentPrice || '',
      r.expectedProfitPerKg || 0,
      `"${r.pricingStatus || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kirsab_vegetable_pricing_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & sort bulk calculation results
  const filteredBulkResults = useMemo(() => {
    return bulkCalculatedResults
      .filter(row => {
        const matchesCat = bulkCategory === 'all' || row.categoryId === bulkCategory;
        const q = bulkSearch.trim().toLowerCase();
        const matchesSearch =
          !q ||
          row.productNameEn?.toLowerCase().includes(q) ||
          row.productNameHi?.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        if (bulkSort === 'margin_desc') return (b.grossMarginPercent || 0) - (a.grossMarginPercent || 0);
        if (bulkSort === 'margin_asc') return (a.grossMarginPercent || 0) - (b.grossMarginPercent || 0);
        if (bulkSort === 'price_desc') return (b.recommendedSellingPrice || 0) - (a.recommendedSellingPrice || 0);
        return (a.productNameEn || '').localeCompare(b.productNameEn || '');
      });
  }, [bulkCalculatedResults, bulkCategory, bulkSearch, bulkSort]);

  const toggleSelectAllBulk = () => {
    if (selectedBulkIds.size === filteredBulkResults.length) {
      setSelectedBulkIds(new Set());
    } else {
      setSelectedBulkIds(new Set(filteredBulkResults.map(r => r.productId)));
    }
  };

  const toggleSelectBulkRow = (id) => {
    setSelectedBulkIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-dark mb-1">
            <Calculator className="w-6 h-6 text-brand-primary" />
            <h2 className="text-xl font-black tracking-tight">सब्ज़ी भाव व मुनाफ़ा कैलकुलेटर</h2>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
              KIRSAB Pricing Engine v2.0
            </span>
          </div>
          <p className="text-xs text-gray-500">
            मंडी खरीद भाव, परिवहन, तुलाई-उतराई, छंटाई वेस्टेज एवं अतिरिक्त लागतों को जोड़कर सही विक्रय मूल्य एवं वास्तविक मुनाफ़ा तय करें।
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 text-xs font-bold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('single')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'single'
                ? 'bg-white text-brand-dark shadow-xs'
                : 'text-gray-600 hover:text-brand-dark'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>एकल सब्ज़ी कैलकुलेटर</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bulk')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'bulk'
                ? 'bg-white text-brand-dark shadow-xs'
                : 'text-gray-600 hover:text-brand-dark'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>थोक मूल्य कैलकुलेटर (Bulk)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-white text-brand-dark shadow-xs'
                : 'text-gray-600 hover:text-brand-dark'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>गणना इतिहास व रिकॉर्ड</span>
          </button>
        </div>
      </div>

      {/* Section 6: Dashboard Insights Cards */}
      {insights && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              मूल्य निर्धारण स्थिति
            </div>
            <div className="text-xl font-black text-brand-dark">
              {insights.totalWithPricing} <span className="text-xs font-normal text-gray-400">/ {insights.totalVegetables}</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">कुल सक्रिय सब्ज़ियां</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-red-100 shadow-2xs bg-gradient-to-br from-red-50/40 to-white">
            <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              लागत से कम मूल्य
            </div>
            <div className="text-xl font-black text-red-600">
              {insights.belowCostCount}
            </div>
            <div className="text-[10px] text-red-600/80 mt-1">नुकसान वाली सब्ज़ियां (Selling &lt; Cost)</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-2xs bg-gradient-to-br from-amber-50/40 to-white">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              लक्ष्य से कम मार्जिन
            </div>
            <div className="text-xl font-black text-amber-600">
              {insights.belowMarginCount}
            </div>
            <div className="text-[10px] text-amber-700/80 mt-1">मार्जिन बढ़ाने की आवश्यकता</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-emerald-100 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              लक्ष्य मार्जिन पूर्ण
            </div>
            <div className="text-xl font-black text-emerald-700">
              {insights.targetAchievedCount}
            </div>
            <div className="text-[10px] text-emerald-700/80 mt-1">स्वस्थ लाभ स्थिति</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs bg-gradient-to-br from-blue-50/40 to-white col-span-2 md:col-span-1">
            <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">
              अनुमानित संभावित सकल लाभ
            </div>
            <div className="text-xl font-black text-blue-700">
              ₹{insights.potentialGrossProfitTotal.toLocaleString('en-IN')}
            </div>
            <div className="text-[9px] text-gray-400 mt-1 leading-tight">
              वर्तमान बैच पर आधारित (बिक्री उपरांत वास्तविक)
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: SINGLE VEGETABLE PRICING CALCULATOR */}
      {activeSubTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Inputs (7 Columns) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Section A: Vegetable Selection */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
              <h3 className="text-sm font-black text-brand-dark mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] flex items-center justify-center font-bold">1</span>
                सब्ज़ी विवरण (Vegetable Information)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    सब्ज़ी चुनें (Select from Store)
                  </label>
                  <select
                    value={isManualProduct ? '__manual__' : selectedProductId}
                    onChange={(e) => {
                      if (e.target.value === '__manual__') {
                        setIsManualProduct(true);
                        setSelectedProductId('');
                      } else {
                        handleProductSelect(e.target.value);
                      }
                    }}
                    className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  >
                    <option value="">-- उपलब्ध सब्ज़ी चुनें --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameHi} ({p.nameEn}) {p.price ? `— वर्तमान: ₹${p.price}` : '— (अनिर्धारित)'}
                      </option>
                    ))}
                    <option value="__manual__">➕ अन्य / नई सब्ज़ी (Manual Entry)</option>
                  </select>
                </div>

                {isManualProduct && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      सब्ज़ी का नाम (Manual Entry)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. शिमला मिर्च (Capsicum)"
                      value={manualProductName}
                      onChange={(e) => setManualProductName(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    इकाई (Unit)
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50 focus:bg-white"
                  >
                    <option value="1 kg">1 kg (किलोग्राम)</option>
                    <option value="500 g">500 g (आधा किलो)</option>
                    <option value="250 g">250 g (पाव भर)</option>
                    <option value="1 bunch">1 bunch (गड्डी)</option>
                    <option value="1 piece">1 piece (पीस / नग)</option>
                    <option value="1 crate">1 crate (क्रेट)</option>
                    <option value="1 bag">1 bag (बोरी / कट्टा)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    सप्लायर / मंडी आढ़तिया (वैकल्पिक)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. मुंडेरा मंडी, प्रयागराज"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    खरीद दिनांक (Purchase Date)
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Purchase Information */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-brand-dark flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] flex items-center justify-center font-bold">2</span>
                  खरीद व आवक लागत (Mandi Purchase Information)
                </h3>

                {/* Toggle Input Mode */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setInputMode('unit_price')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      inputMode === 'unit_price' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    दर/किलो से (Per kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('invoice_total')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      inputMode === 'invoice_total' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    बिल राशि से (Invoice Total)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {inputMode === 'unit_price' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      मंडी खरीद दर (₹ प्रति किलो) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={purchasePricePerKg}
                        onChange={(e) => setPurchasePricePerKg(e.target.value)}
                        className="w-full text-xs font-bold pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                        placeholder="20"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      कुल इनवॉइस / बिल राशि (₹ Invoice Amount) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        className="w-full text-xs font-bold pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                        placeholder="2000"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">दर स्वतः प्राप्त होगी (Invoice / Qty)</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    कुल खरीदी गई मात्रा (Total Qty in kg) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="1"
                      value={purchasedQuantity}
                      onChange={(e) => setPurchasedQuantity(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="100"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-xs font-bold">kg</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    पल्लेदारी / तुलाई-उतराई (Loading/Unloading ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={loadingUnloadingCost}
                      onChange={(e) => setLoadingUnloadingCost(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    मंडी से गोदाम भाड़ा (Transportation ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={transportCost}
                      onChange={(e) => setTransportCost(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="150"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    अन्य आवक खर्च (चुंगी / मंडी टैक्स / आढ़त आदि ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={otherProcurementCost}
                      onChange={(e) => setOtherProcurementCost(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: Wastage & Usable Quantity */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-brand-dark flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] flex items-center justify-center font-bold">3</span>
                  छंटाई वेस्टेज व बिक्री योग्य मात्रा (Wastage & Usable Qty)
                </h3>

                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setWastageMode('percent')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      wastageMode === 'percent' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    प्रतिशत में (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWastageMode('actual_kg')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      wastageMode === 'actual_kg' ? 'bg-white text-brand-dark shadow-2xs' : 'text-gray-500'
                    }`}
                  >
                    किलो में (Actual kg)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {wastageMode === 'percent' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      अनुमानित वेस्टेज प्रतिशत (Expected Wastage %)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        step="0.5"
                        value={wastagePercentage}
                        onChange={(e) => setWastagePercentage(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2.5 border border-gray-200 rounded-xl"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 font-bold text-xs">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      वास्तविक ख़राब / कटी-फटी मात्रा (Actual Wasted kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={actualWastageQty}
                        onChange={(e) => setActualWastageQty(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2.5 border border-gray-200 rounded-xl"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-400 font-bold text-xs">kg</span>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    बिक्री योग्य शुद्ध मात्रा (Saleable Usable Stock)
                  </div>
                  <div className="text-lg font-black text-amber-900 mt-0.5">
                    {liveCalc ? `${liveCalc.usableQuantity} kg` : '--'}
                  </div>
                  <div className="text-[10px] text-amber-700">
                    वेस्टेज प्रभाव: +₹{liveCalc ? (liveCalc.effectivePurchaseCostPerKg - liveCalc.purchasePricePerKg).toFixed(2) : 0}/kg
                  </div>
                </div>
              </div>
            </div>

            {/* Section D: Additional Operating & Packaging Costs */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
              <h3 className="text-sm font-black text-brand-dark mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] flex items-center justify-center font-bold">4</span>
                अतिरिक्त परिचालन व पैकेजिंग खर्च (Additional Costs)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    पैकेजिंग थैली / ट्रे (₹/kg)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={packagingCostPerKg}
                      onChange={(e) => setPackagingCostPerKg(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    सॉर्टिंग व मजदूरी (Labour ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={handlingLabourCost}
                      onChange={(e) => setHandlingLabourCost(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="100"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-medium">
                    <input
                      type="checkbox"
                      checked={isLaborPerKg}
                      onChange={(e) => setIsLaborPerKg(e.target.checked)}
                      className="rounded text-brand-primary"
                    />
                    प्रति किलो मजदूरी है
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    बिजली व कोल्ड स्टोरेज (₹ Batch)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={storageElectricityCost}
                      onChange={(e) => setStorageElectricityCost(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    प्लेटफ़ॉर्म / संचालन (₹ Batch)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={platformOperatingCost}
                      onChange={(e) => setPlatformOperatingCost(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    पेमेंट गेटवे शुल्क (% PG Fee)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={gatewayFeePercent}
                      onChange={(e) => setGatewayFeePercent(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400 font-bold text-xs">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    डिलीवरी व्यवस्था (Delivery Cost)
                  </label>
                  <select
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-200 rounded-xl px-2.5 py-2.5 bg-gray-50/50"
                  >
                    <option value="customer_paid">ग्राहक देता है (₹0 Store Cost)</option>
                    <option value="free">किरसाब वहन करता है (Free)</option>
                    <option value="subsidized">सब्सिडी युक्त (Partially Paid)</option>
                  </select>
                </div>
              </div>

              {(deliveryMode === 'free' || deliveryMode === 'subsidized') && (
                <div className="mt-3 bg-blue-50/60 border border-blue-200/60 rounded-xl p-3">
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    KIRSAB द्वारा वहन की जाने वाली डिलीवरी सब्सिडी (कुल ₹ इस लॉट पर)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliverySubsidizedCost}
                    onChange={(e) => setDeliverySubsidizedCost(e.target.value)}
                    className="w-full sm:w-1/2 text-xs border border-blue-200 rounded-xl px-3 py-2 bg-white"
                    placeholder="उदा. 40"
                  />
                  <p className="text-[10px] text-blue-700 mt-1">
                    * मल्टी-प्रोडक्ट डिलीवरी में केवल आनुपातिक बिज़नेस सब्सिडी लागत शामिल की जाती है।
                  </p>
                </div>
              )}
            </div>

            {/* Section E: Profit Margin & Pricing Mode */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
              <h3 className="text-sm font-black text-brand-dark mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] flex items-center justify-center font-bold">5</span>
                मुनाफ़ा नीति एवं राउंडिंग नियम (Profit & Pricing Mode)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    प्राइसिंग मोड (Pricing Mode)
                  </label>
                  <select
                    value={pricingMode}
                    onChange={(e) => setPricingMode(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50"
                  >
                    <option value="margin">मोड 1: ग्रॉस मार्जिन % (Gross Margin)</option>
                    <option value="profit_per_kg">मोड 2: प्रति किलो मुनाफ़ा (₹/kg Markup)</option>
                  </select>
                </div>

                {pricingMode === 'margin' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      लक्ष्य ग्रॉस मार्जिन (Target Margin %) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        step="1"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(e.target.value)}
                        className="w-full text-xs font-black px-3 py-2.5 border border-brand-primary/40 rounded-xl bg-brand-light/30"
                        placeholder="20"
                      />
                      <span className="absolute right-3 top-2.5 text-brand-primary font-bold text-xs">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      लक्ष्य लाभ (Target Profit ₹/kg) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-brand-primary font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={targetProfitPerKg}
                        onChange={(e) => setTargetProfitPerKg(e.target.value)}
                        className="w-full text-xs font-black pl-7 pr-3 py-2.5 border border-brand-primary/40 rounded-xl bg-brand-light/30"
                        placeholder="8"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    विक्रय मूल्य राउंडिंग (Rounding Rule)
                  </label>
                  <select
                    value={roundingRule}
                    onChange={(e) => setRoundingRule(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50"
                  >
                    <option value="exact">यथार्थ दशमलव (₹32.76)</option>
                    <option value="0.50">निकटतम 50 पैसे (₹32.50 / ₹33.00)</option>
                    <option value="1.00">निकटतम पूर्ण रुपया (₹33.00)</option>
                    <option value="ceil">ऊपरी पूर्ण रुपया (Ceil ₹33.00)</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-gray-400">
                * <strong>ग्रॉस मार्जिन:</strong> विक्रय मूल्य में लाभ का हिस्सा (Profit ÷ Revenue × 100).
                | <strong>मार्कअप:</strong> लागत पर जोड़ा गया अतिरिक्त लाभ (Profit ÷ Cost × 100).
              </div>
            </div>

            {/* Section F: Competitor Comparison Inputs */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100">
              <h3 className="text-sm font-black text-brand-dark mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] flex items-center justify-center font-bold">6</span>
                प्रतिस्पर्धी बाज़ार भाव तुलना (Competitor Benchmarking)
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                ब्लिंकिट, ज़ेप्टो या स्थानीय मंडी भाव दर्ज करें। ग्राम पैक को ऑटोमैटिक ₹/kg में बदल दिया जाएगा।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {competitors.map((comp, idx) => (
                  <div key={comp.competitorName} className="p-3 bg-gray-50/70 border border-gray-200/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-brand-charcoal">
                      <span>{comp.competitorName}</span>
                      <span className="text-[10px] text-gray-400">पिनकोड: {comp.cityPincode}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-gray-400 text-xs font-bold">₹</span>
                          <input
                            type="number"
                            placeholder="भाव"
                            value={comp.packPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCompetitors(prev =>
                                prev.map((c, i) => (i === idx ? { ...c, packPrice: val } : c))
                              );
                            }}
                            className="w-full text-xs pl-6 pr-2 py-1.5 border border-gray-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <select
                          value={comp.packQuantity + '_' + comp.packUnit}
                          onChange={(e) => {
                            const [q, u] = e.target.value.split('_');
                            setCompetitors(prev =>
                              prev.map((c, i) => (i === idx ? { ...c, packQuantity: q, packUnit: u } : c))
                            );
                          }}
                          className="w-full text-[11px] py-1.5 px-1 border border-gray-200 rounded-lg bg-white"
                        >
                          <option value="1_kg">1 kg</option>
                          <option value="500_g">500 g</option>
                          <option value="250_g">250 g</option>
                          <option value="100_g">100 g</option>
                          <option value="1_pc">1 pc</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Summary Panel: Live Results (5 Columns Sticky) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-gradient-to-br from-brand-dark to-[#0F4725] text-white rounded-2xl p-6 shadow-lg sticky top-20 border border-brand-accent/20">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/10">
                    <TrendingUp className="w-5 h-5 text-brand-soft" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">मूल्य एवं मुनाफ़ा सारांश</h4>
                    <span className="text-[10px] text-white/70">Live Dynamic Calculation</span>
                  </div>
                </div>

                {isCalculating && (
                  <RefreshCw className="w-4 h-4 text-brand-soft animate-spin" />
                )}
              </div>

              {calcError ? (
                <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                  <span>{calcError}</span>
                </div>
              ) : liveCalc ? (
                <div className="space-y-4">
                  
                  {/* Hero Metric: Recommended Selling Price */}
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-white/80 font-bold mb-0.5">
                      अनुशंसित विक्रय मूल्य (Recommended Selling Price)
                    </div>
                    <div className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-1">
                      <span>₹{liveCalc.recommendedSellingPrice}</span>
                      <span className="text-sm font-medium text-white/70">/ {unitType}</span>
                    </div>

                    <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-white/80">
                      <span>यथार्थ: ₹{liveCalc.unroundedSellingPrice}</span>
                      <span>•</span>
                      <span>लागत (Break-even): ₹{liveCalc.breakEvenSellingPrice}</span>
                    </div>
                  </div>

                  {/* Financial Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <div className="text-[10px] text-white/60 font-semibold uppercase">कुल खरीद लागत</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{liveCalc.purchaseAmount}</div>
                      <div className="text-[10px] text-white/50">{liveCalc.purchasedQuantity} kg @ ₹{liveCalc.purchasePricePerKg}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <div className="text-[10px] text-white/60 font-semibold uppercase">आवक व परिवहन खर्च</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{liveCalc.totalProcurementExpenses}</div>
                      <div className="text-[10px] text-white/50">भाड़ा, तुलाई व टैक्स</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <div className="text-[10px] text-white/60 font-semibold uppercase">छंटाई वेस्टेज नुकसान</div>
                      <div className="text-sm font-bold text-amber-300 mt-0.5">₹{liveCalc.wastageCost}</div>
                      <div className="text-[10px] text-white/50">{liveCalc.wastedQuantity} kg ({liveCalc.wastagePercentage}%)</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <div className="text-[10px] text-white/60 font-semibold uppercase">बिक्री योग्य प्रभावी दर</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{liveCalc.effectivePurchaseCostPerKg} / kg</div>
                      <div className="text-[10px] text-white/50">वेस्टेज उपरांत वास्तविक खरीद</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <div className="text-[10px] text-white/60 font-semibold uppercase">अतिरिक्त यूनिट खर्च</div>
                      <div className="text-sm font-bold text-white mt-0.5">₹{liveCalc.totalUnitAdditionalCost} / kg</div>
                      <div className="text-[10px] text-white/50">थैली, मजदूरी व ओवरहेड</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <div className="text-[10px] text-white/60 font-semibold uppercase">कुल यूनिट लागत (Cost/kg)</div>
                      <div className="text-sm font-bold text-emerald-300 mt-0.5">₹{liveCalc.totalUnitCost} / kg</div>
                      <div className="text-[10px] text-white/50">पूर्ण वास्तविक लागत</div>
                    </div>
                  </div>

                  {/* Profit & Margin Highlights */}
                  <div className="bg-emerald-950/60 rounded-xl p-3.5 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-200">अपेक्षित प्रति किलो मुनाफ़ा:</span>
                      <span className="text-base text-emerald-300 font-black">+₹{liveCalc.expectedProfitPerKg}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-200">ग्रॉस मार्जिन प्रतिशत (Gross Margin):</span>
                      <span className="text-base text-emerald-300 font-black">{liveCalc.grossMarginPercent}%</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-emerald-500/20">
                      <span className="text-emerald-200">पूरे बैच पर अनुमानित सकल लाभ:</span>
                      <span className="text-base text-white font-black">₹{liveCalc.expectedTotalGrossProfit}</span>
                    </div>
                  </div>

                  {/* Competitor Price Comparison Output */}
                  {liveCalc.competitorComparisons && liveCalc.competitorComparisons.length > 0 && (
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
                      <div className="text-[10px] uppercase font-bold text-white/70">
                        प्रतिस्पर्धी तुलना (₹ प्रति किलो दर)
                      </div>
                      {liveCalc.competitorComparisons.map(comp => (
                        <div key={comp.competitorName} className="flex items-center justify-between text-xs">
                          <span className="text-white/80 font-medium">{comp.competitorName}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">₹{comp.normalizedPricePerKg}/kg</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                comp.status === 'cheaper'
                                  ? 'bg-emerald-400 text-emerald-950'
                                  : comp.status === 'more_expensive'
                                  ? 'bg-red-400 text-red-950'
                                  : 'bg-amber-400 text-amber-950'
                              }`}
                            >
                              {comp.status === 'cheaper'
                                ? `किरसाब ₹${Math.abs(comp.diffRupees)} सस्ता`
                                : comp.status === 'more_expensive'
                                ? `किरसाब ₹${comp.diffRupees} महंगा`
                                : 'समान भाव'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSaveCalculation(false)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>केवल गणना इतिहास सुरक्षित करें (Save History)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedProductId || isManualProduct}
                      onClick={() => setConfirmModal({ isOpen: true, data: liveCalc, type: 'single' })}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black bg-brand-primary hover:bg-emerald-600 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Store className="w-4 h-4" />
                      <span>लाइव स्टोर पर यह भाव लागू करें (Update Product Price)</span>
                    </button>
                    {!selectedProductId && !isManualProduct && (
                      <p className="text-[10px] text-center text-white/50">
                        * लाइव स्टोर मूल्य बदलने हेतु ऊपर ड्रॉपडाउन से सब्ज़ी चुनें।
                      </p>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-8 text-center text-xs text-white/60">
                  कृपया बाईं ओर खरीद व वेस्टेज विवरण दर्ज करें...
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BULK PRICING CALCULATOR */}
      {activeSubTab === 'bulk' && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4">
          
          {/* Bulk Controls Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-brand-dark flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-primary" />
                थोक मूल्य निर्धारण (Bulk Price Calculator)
              </h3>
              <p className="text-xs text-gray-500">
                सभी सब्ज़ियों की खरीद दर, वेस्टेज एवं मार्जिन एक साथ देखें, त्वरित एडिट करें और सीधे स्टोर पर लागू करें।
              </p>
            </div>

            {/* Quick Bulk Margin Applicator & Export */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-gray-700">डिफ़ॉल्ट मार्जिन:</span>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={defaultBulkMargin}
                  onChange={(e) => setDefaultBulkMargin(e.target.value)}
                  className="w-14 text-xs font-bold px-1.5 py-0.5 border border-gray-300 rounded bg-white text-center"
                />
                <span className="font-bold text-gray-500">%</span>
                <button
                  type="button"
                  onClick={handleApplyDefaultMarginToAll}
                  className="ml-1 px-2 py-0.5 text-[11px] font-bold bg-brand-dark text-white rounded hover:bg-black transition-all"
                >
                  सभी पर लगाएं
                </button>
              </div>

              <button
                type="button"
                onClick={exportBulkToCSV}
                className="px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all flex items-center gap-1.5"
                title="CSV शीट में एक्सपोर्ट करें"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Export</span>
              </button>

              <button
                type="button"
                disabled={isBulkSaving || selectedBulkIds.size === 0}
                onClick={() => setConfirmModal({ isOpen: true, data: null, type: 'bulk' })}
                className="px-4 py-2 text-xs font-black text-white bg-brand-primary hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                <span>चयनित भाव लागू करें ({selectedBulkIds.size})</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="सब्ज़ी का नाम खोजें (उदा. आलू, टमाटर)..."
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl"
              />
            </div>

            <div>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50"
              >
                <option value="all">सभी श्रेणियां (All Categories)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nameHi} ({c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={bulkSort}
                onChange={(e) => setBulkSort(e.target.value)}
                className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50"
              >
                <option value="name">नाम अनुसार (A to Z)</option>
                <option value="margin_desc">अधिकतम मार्जिन % (High to Low)</option>
                <option value="margin_asc">न्यूनतम मार्जिन % (Low to High)</option>
                <option value="price_desc">अधिकतम विक्रय मूल्य</option>
              </select>
            </div>
          </div>

          {/* Bulk Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedBulkIds.size > 0 && selectedBulkIds.size === filteredBulkResults.length}
                      onChange={toggleSelectAllBulk}
                      className="rounded text-brand-primary"
                    />
                  </th>
                  <th className="p-3">सब्ज़ी का नाम</th>
                  <th className="p-3">खरीद दर (₹/kg)</th>
                  <th className="p-3">मात्रा (kg)</th>
                  <th className="p-3">वेस्टेज %</th>
                  <th className="p-3">यूनिट लागत (₹/kg)</th>
                  <th className="p-3">मार्जिन %</th>
                  <th className="p-3">नया भाव (₹)</th>
                  <th className="p-3">वर्तमान भाव (₹)</th>
                  <th className="p-3">मुनाफ़ा (₹/kg)</th>
                  <th className="p-3">स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBulkResults.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400">
                      कोई सब्ज़ी नहीं मिली।
                    </td>
                  </tr>
                ) : (
                  filteredBulkResults.map(row => {
                    const isSelected = selectedBulkIds.has(row.productId);
                    return (
                      <tr
                        key={row.productId}
                        className={`hover:bg-brand-light/30 transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBulkRow(row.productId)}
                            className="rounded text-brand-primary"
                          />
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-brand-dark">{row.productNameHi}</div>
                          <div className="text-[10px] text-gray-400">{row.productNameEn} ({row.unit || '1 kg'})</div>
                        </td>

                        <td className="p-3 w-28">
                          <input
                            type="number"
                            min="1"
                            step="0.5"
                            value={bulkRows.find(r => r.productId === row.productId)?.purchasePricePerKg || ''}
                            onChange={(e) => updateBulkRow(row.productId, 'purchasePricePerKg', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 bg-white"
                          />
                        </td>

                        <td className="p-3 w-24">
                          <input
                            type="number"
                            min="1"
                            value={bulkRows.find(r => r.productId === row.productId)?.purchasedQuantity || ''}
                            onChange={(e) => updateBulkRow(row.productId, 'purchasedQuantity', e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 bg-white"
                          />
                        </td>

                        <td className="p-3 w-20">
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={bulkRows.find(r => r.productId === row.productId)?.wastagePercentage || ''}
                            onChange={(e) => updateBulkRow(row.productId, 'wastagePercentage', e.target.value)}
                            className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 bg-white text-center"
                          />
                        </td>

                        <td className="p-3 font-semibold text-gray-700">
                          ₹{row.totalUnitCost || 0}
                        </td>

                        <td className="p-3 w-20">
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={bulkRows.find(r => r.productId === row.productId)?.targetMargin || ''}
                            onChange={(e) => updateBulkRow(row.productId, 'targetMargin', e.target.value)}
                            className="w-14 px-2 py-1 border border-brand-primary/40 rounded-lg text-xs font-black text-brand-dark bg-brand-light/30 text-center"
                          />
                        </td>

                        <td className="p-3">
                          <div className="text-sm font-black text-brand-primary">
                            ₹{row.recommendedSellingPrice || 0}
                          </div>
                        </td>

                        <td className="p-3 text-gray-500 font-semibold">
                          {row.currentPrice ? `₹${row.currentPrice}` : <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">अनिर्धारित</span>}
                        </td>

                        <td className="p-3 font-black text-emerald-700">
                          +₹{row.expectedProfitPerKg || 0}
                        </td>

                        <td className="p-3">
                          {row.pricingStatus === 'margin_achieved' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              मार्जिन पूर्ण
                            </span>
                          )}
                          {row.pricingStatus === 'below_margin' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              कम मार्जिन
                            </span>
                          )}
                          {row.pricingStatus === 'below_cost' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              लागत से कम
                            </span>
                          )}
                          {row.pricingStatus === 'unconfigured' && (
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              अनिर्धारित
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: PRICING HISTORY & COMPETITOR RECORDS */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-black text-brand-dark flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-primary" />
                मूल्य निर्धारण इतिहास (Past Calculations & Records)
              </h3>
              <p className="text-xs text-gray-500">
                अतीत में सहेजी गई खरीद लागत, वेस्टेज, एवं लागू किए गए विक्रय मूल्यों का विवरण।
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHistory}
              className="p-2 text-gray-500 hover:text-brand-dark rounded-xl hover:bg-gray-100 transition-all"
              title="रिफ्रेश करें"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3">दिनांक</th>
                  <th className="p-3">सब्ज़ी</th>
                  <th className="p-3">खरीद दर</th>
                  <th className="p-3">मात्रा व वेस्टेज</th>
                  <th className="p-3">यूनिट लागत</th>
                  <th className="p-3">अनुशंसित भाव</th>
                  <th className="p-3">मार्जिन %</th>
                  <th className="p-3">प्रतिस्पर्धी भाव</th>
                  <th className="p-3">स्टोर पर लागू</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pricingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      कोई इतिहास रिकॉर्ड उपलब्ध नहीं है।
                    </td>
                  </tr>
                ) : (
                  pricingHistory.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50/60">
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(record.createdAt).toLocaleDateString('hi-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="p-3 font-bold text-brand-dark">
                        {record.productName}
                      </td>

                      <td className="p-3 font-semibold text-gray-700">
                        ₹{record.purchasePricePerKg}/kg
                      </td>

                      <td className="p-3 text-gray-600">
                        {record.purchasedQuantity} kg ({record.wastagePercentage}% वेस्टेज)
                      </td>

                      <td className="p-3 font-semibold text-gray-700">
                        ₹{record.totalUnitCost}/kg
                      </td>

                      <td className="p-3 font-black text-brand-primary">
                        ₹{record.recommendedSellingPrice}
                      </td>

                      <td className="p-3 font-bold text-emerald-700">
                        {record.grossMarginPercent}%
                      </td>

                      <td className="p-3">
                        {record.competitorPrices?.length > 0 ? (
                          <div className="space-y-0.5">
                            {record.competitorPrices.map(c => (
                              <div key={c.id} className="text-[10px] text-gray-500">
                                {c.competitorName}: ₹{c.normalizedPricePerKg}/kg
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">--</span>
                        )}
                      </td>

                      <td className="p-3">
                        {record.appliedToProduct ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                            <Check className="w-3 h-3 text-emerald-600" />
                            लागू किया गया
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">केवल सहेजा गया</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL (Strict Price Update Guard) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-brand-dark">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-800">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black">लाइव स्टोर विक्रय मूल्य अपडेट की पुष्टि</h4>
                <p className="text-xs text-gray-500">कृपया नया मूल्य जांच कर पुष्टि करें।</p>
              </div>
            </div>

            {confirmModal.type === 'single' && confirmModal.data && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between font-bold text-brand-dark">
                  <span>सब्ज़ी:</span>
                  <span>{products.find(p => p.id === selectedProductId)?.nameHi || 'चयनित सब्ज़ी'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>वर्तमान विक्रय मूल्य:</span>
                  <span className="font-bold">
                    {products.find(p => p.id === selectedProductId)?.price
                      ? `₹${products.find(p => p.id === selectedProductId).price}`
                      : 'अनिर्धारित'}
                  </span>
                </div>
                <div className="flex justify-between text-brand-primary text-sm font-black pt-1 border-t border-gray-200">
                  <span>नया लाइव विक्रय मूल्य:</span>
                  <span>₹{confirmModal.data.recommendedSellingPrice} / {unitType}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                  <span>अनुमानित ग्रॉस मार्जिन:</span>
                  <span>{confirmModal.data.grossMarginPercent}% (+₹{confirmModal.data.expectedProfitPerKg}/kg)</span>
                </div>
              </div>
            )}

            {confirmModal.type === 'bulk' && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs space-y-1.5">
                <div className="font-bold text-brand-dark">
                  कुल {selectedBulkIds.size} सब्ज़ियों के मूल्य एक साथ स्टोर पर अपडेट होंगे।
                </div>
                <p className="text-[11px] text-gray-500">
                  यह क्रिया तुरंत ग्राहकों के लिए नया भाव सक्रिय कर देगी।
                </p>
              </div>
            )}

            <p className="text-[11px] text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              ⚠️ पुष्टि करने के बाद ग्राहकों को तुरंत यही नया भाव दिखेगा।
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, data: null, type: 'single' })}
                className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                रद्द करें
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'single') {
                    handleSaveCalculation(true);
                  } else {
                    handleBulkApplyPrices();
                  }
                }}
                className="flex-1 py-2.5 text-xs font-black text-white bg-brand-primary hover:bg-emerald-700 rounded-xl shadow-md transition-all"
              >
                हाँ, लाइव मूल्य अपडेट करें
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
