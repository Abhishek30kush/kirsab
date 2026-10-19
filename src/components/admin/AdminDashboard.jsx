import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Package, 
  Settings, 
  TrendingUp, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertCircle, 
  Search, 
  ExternalLink, 
  LogOut, 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Check, 
  X,
  MessageCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  RefreshCw,
  Calculator
} from 'lucide-react';
import { api, setAdminToken } from '../../utils/api';
import { ProductEditModal } from './ProductEditModal';
import { PricingCalculator } from './PricingCalculator';
import { formatCurrency } from '../../utils/currency';

export const AdminDashboard = ({ adminUser, onExitAdmin, onCatalogChanged }) => {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/+$/, '');
      const hash = window.location.hash;
      if (path === '/admin/pricing-calculator' || hash === '#pricing-calculator') {
        return 'pricing-calculator';
      }
    }
    return 'overview';
  }); // 'overview' | 'products' | 'pricing-calculator' | 'orders' | 'settings'

  // Dashboard Stats
  const [stats, setStats] = useState(null);

  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Settings state
  const [settingsForm, setSettingsForm] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Fetch overview stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getOrderStats();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch admin products
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminProducts();
      if (res.success) {
        setProducts(res.data);
        if (res.categories) setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to fetch admin products:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch admin orders
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch store settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.data) {
        const d = res.data;
        setSettingsForm({
          brandName: d.brandName || 'KIRSAB',
          brandNameHindi: d.brandNameHindi || 'किरसाब',
          tagline: d.tagline || 'सब्ज़ी | किराना | घर तक',
          whatsappNumber: d.whatsappNumber || '',
          serviceAreaPrimary: d.serviceArea?.primary || 'Shervani Legacy',
          serviceAreaCity: d.serviceArea?.city || 'Prayagraj',
          serviceAreaState: d.serviceArea?.state || 'Uttar Pradesh',
          serviceAreaPincode: d.serviceArea?.pincode || '211011',
          serviceAreaDescription: d.serviceArea?.description || '',
          minOrderValue: d.pricingRules?.minOrderValue || 150,
          standardDeliveryFee: d.pricingRules?.standardDeliveryFee || 10,
          freeDeliveryThreshold: d.pricingRules?.freeDeliveryThreshold || 299,
          isStoreOpen: d.isStoreOpen !== false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, []);

  // Load data based on active tab
  useEffect(() => {
    fetchStats();
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab, fetchStats, fetchProducts, fetchOrders, fetchSettings]);

  // Stock toggle
  const handleToggleStock = async (productId) => {
    try {
      const res = await api.toggleProductStock(productId);
      if (res.success) {
        setProducts(prev =>
          prev.map(p => (p.id === productId ? { ...p, inStock: res.data.inStock } : p))
        );
        showFeedback(res.message);
        if (onCatalogChanged) onCatalogChanged();
      }
    } catch (err) {
      alert(err.message || 'Failed to update stock status');
    }
  };

  // Delete product
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete '${product.nameEn || product.nameHi}'?`)) {
      return;
    }
    try {
      const res = await api.deleteProduct(product.id);
      if (res.success) {
        fetchProducts();
        showFeedback(res.message || 'Product deleted successfully');
        if (onCatalogChanged) onCatalogChanged();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Order status update
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        showFeedback(res.message || 'Order status updated successfully');
        fetchStats();
      }
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await api.updateSettings(settingsForm);
      if (res.success) {
        showFeedback('Store settings saved successfully!');
        if (onCatalogChanged) onCatalogChanged();
      }
    } catch (err) {
      alert(err.message || 'Error saving settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setAdminToken(null);
    if (onExitAdmin) onExitAdmin();
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedProductCategory === 'all' || p.categoryId === selectedProductCategory;
    const q = productSearch.trim().toLowerCase();
    const matchesSearch = !q || p.nameEn.toLowerCase().includes(q) || p.nameHi.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesStatus = orderFilterStatus === 'all' || o.status === orderFilterStatus;
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.address.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
    packed: 'bg-purple-100 text-purple-800 border-purple-300',
    out_for_delivery: 'bg-orange-100 text-orange-800 border-orange-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="min-h-screen bg-[#F4F7F4] text-brand-charcoal">
      
      {/* Top Navbar */}
      <header className="bg-brand-dark text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center gap-3">
              <span className="font-black text-xl tracking-tight">KIRSAB</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                Admin Portal
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onExitAdmin}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>View Customer Store</span>
              </button>

              <div className="text-right hidden md:block">
                <span className="block text-xs font-bold leading-tight">{adminUser?.name || 'Store Manager'}</span>
                <span className="text-[10px] text-white/70 block leading-tight">{adminUser?.email}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-600/80 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-t border-white/10 pt-2 text-xs font-bold no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'overview' ? 'bg-white text-brand-dark shadow-xs' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'products' ? 'bg-white text-brand-dark shadow-xs' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span>Products & Inventory</span>
              {products.length > 0 && (
                <span className="text-[10px] bg-brand-soft text-brand-dark px-1.5 py-0.2 rounded-full font-black">
                  {products.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pricing-calculator');
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/pricing-calculator');
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pricing-calculator' ? 'bg-white text-brand-dark shadow-xs' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pricing Calculator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'orders' ? 'bg-white text-brand-dark shadow-xs' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span>Orders & Dispatch</span>
              {stats?.pendingOrders > 0 && (
                <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {stats.pendingOrders}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'settings' ? 'bg-white text-brand-dark shadow-xs' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Store Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button type="button" onClick={() => setFeedbackMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-5 rounded-3xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block">
                  Today's Revenue
                </span>
                <span className="text-2xl sm:text-3xl font-black text-brand-dark mt-2 block">
                  {formatCurrency(stats?.todayRevenue || 0)}
                </span>
                <span className="text-xs text-brand-muted mt-1 block">
                  Total Revenue: {formatCurrency(stats?.totalRevenue || 0)}
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block">
                  Today's Orders
                </span>
                <span className="text-2xl sm:text-3xl font-black text-brand-charcoal mt-2 block">
                  {stats?.todayOrders || 0}
                </span>
                <span className="text-xs text-brand-muted mt-1 block">
                  Lifetime: {stats?.totalOrders || 0} Orders
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
                  Pending Orders
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-2 block">
                  {stats?.pendingOrders || 0}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOrderFilterStatus('pending');
                    setActiveTab('orders');
                  }}
                  className="text-xs font-bold text-brand-dark hover:underline mt-1 block"
                >
                  View Pending Orders →
                </button>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-brand-border shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block">
                  Active Vegetables
                </span>
                <span className="text-2xl sm:text-3xl font-black text-brand-fresh mt-2 block">
                  {stats?.activeProductsCount || 0}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-brand-dark hover:underline mt-1 block"
                >
                  Manage Stock & Prices →
                </button>
              </div>

            </div>

            {/* Quick Action Center */}
            <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-xs space-y-4">
              <h3 className="font-bold text-base text-brand-charcoal">
                Quick Actions for Store Manager
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-brand-soft/60 hover:bg-brand-soft border border-brand-border/80 text-left transition-all"
                >
                  <Plus className="w-5 h-5 text-brand-dark mb-2" />
                  <span className="font-bold text-sm block">Add New Vegetable</span>
                  <span className="text-xs text-brand-muted">Add fresh or seasonal vegetable item</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderFilterStatus('pending');
                    setActiveTab('orders');
                  }}
                  className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-left transition-all"
                >
                  <Clock className="w-5 h-5 text-amber-600 mb-2" />
                  <span className="font-bold text-sm block">Process Pending Orders</span>
                  <span className="text-xs text-brand-muted">{stats?.pendingOrders || 0} orders awaiting dispatch</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pricing-calculator')}
                  className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-left transition-all"
                >
                  <Calculator className="w-5 h-5 text-brand-fresh mb-2" />
                  <span className="font-bold text-sm block">Pricing Calculator</span>
                  <span className="text-xs text-brand-muted">Calculate selling price, wastage & margin</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-3xl border border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              
              {/* Search & Filter */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search vegetables (e.g. Potato, Tomato)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark"
                  />
                </div>

                <select
                  value={selectedProductCategory}
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-brand-border text-xs bg-white font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="daily-essentials">Daily Essentials</option>
                  <option value="fresh-greens">Fresh Greens</option>
                  <option value="aromatics">Aromatics & Herbs</option>
                </select>
              </div>

              {/* Add Product Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="w-full sm:w-auto bg-brand-dark hover:bg-brand-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vegetable</span>
              </button>

            </div>

            {/* Products Table */}
            <div className="bg-white rounded-3xl border border-brand-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-soft/60 text-brand-dark uppercase tracking-wider font-bold border-b border-brand-border">
                    <tr>
                      <th className="p-3.5">Vegetable</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Package Unit</th>
                      <th className="p-3.5">Selling Price</th>
                      <th className="p-3.5 text-center">Stock Status</th>
                      <th className="p-3.5 text-center">Active</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {filteredProducts.map((p) => {
                      const isConfigured = p.isConfigured && p.price !== null;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                          
                          {/* Image & Name */}
                          <td className="p-3.5 flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-brand-border/60">
                              <img
                                src={p.image}
                                alt={p.nameEn}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.target.style.display = 'none')}
                              />
                            </div>
                            <div>
                              <span className="font-bold text-brand-charcoal text-sm block">
                                {p.nameEn}
                              </span>
                              <span className="text-[11px] text-brand-muted block">
                                {p.nameHi} • ID: {p.id}
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3.5">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                              {p.category?.nameEn || p.category?.nameHi || p.categoryId}
                            </span>
                          </td>

                          {/* Unit */}
                          <td className="p-3.5 font-medium text-brand-charcoal">
                            {p.unit} ({p.unitHindi})
                          </td>

                          {/* Price */}
                          <td className="p-3.5">
                            {isConfigured ? (
                              <span className="font-extrabold text-sm text-brand-dark">
                                ₹{p.price}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                Price Pending
                              </span>
                            )}
                          </td>

                          {/* In Stock Toggle */}
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStock(p.id)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                                p.inStock
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              {p.inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>

                          {/* Active / Inactive */}
                          <td className="p-3.5 text-center">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-brand-charcoal"
                                title="Edit Vegetable"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                                title="Delete Vegetable"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 3. ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-3xl border border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by order #, name, phone, flat..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {['all', 'pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      orderFilterStatus === st
                        ? 'bg-brand-dark text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {st === 'out_for_delivery' ? 'Out for Delivery' : st}
                  </button>
                ))}
              </div>

            </div>

            {/* Orders Cards Grid */}
            {filteredOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrders.map((order) => {
                  const customerPhoneClean = order.customerPhone.replace(/[^0-9]/g, '');
                  const waCustomerUrl = `https://wa.me/91${customerPhoneClean}?text=${encodeURIComponent(
                    `Hello ${order.customerName}, regarding your KIRSAB order #${order.orderNumber}:`
                  )}`;

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl border border-brand-border p-5 shadow-xs space-y-3.5"
                    >
                      {/* Top Bar: Order ID & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-black text-sm text-brand-dark block">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[11px] text-brand-muted block">
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Status Dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                            statusColors[order.status] || 'bg-gray-100'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* Customer Details */}
                      <div className="p-3 bg-brand-soft/40 rounded-2xl border border-brand-border/60 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-brand-charcoal">{order.customerName}</strong>
                          <a
                            href={waCustomerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#25D366] font-bold inline-flex items-center gap-1 hover:underline text-[11px]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp Chat</span>
                          </a>
                        </div>
                        <p className="text-brand-muted">
                          📞 +91 {order.customerPhone}
                        </p>
                        <p className="text-brand-charcoal font-medium">
                          📍 {order.address} {order.landmark && `(${order.landmark})`}
                        </p>
                        <p className="text-brand-dark font-semibold">
                          ⏰ Slot: {order.deliverySlot}
                        </p>
                        {order.instructions && (
                          <p className="text-brand-muted italic mt-1">
                            "{order.instructions}"
                          </p>
                        )}
                      </div>

                      {/* Order Items Snapshot */}
                      <div className="space-y-1.5 text-xs">
                        <span className="font-bold text-[11px] text-brand-muted uppercase tracking-wider">
                          Vegetables ({order.items.length}):
                        </span>
                        <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 pr-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="py-1 flex justify-between">
                              <span>
                                {item.productNameEn || item.productNameHi} × {item.quantity} {item.unit}
                              </span>
                              <span className="font-semibold text-brand-charcoal">
                                ₹{item.lineTotal}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total Bar */}
                      <div className="pt-2 border-t border-brand-border flex items-center justify-between text-xs">
                        <span className="text-brand-muted">
                          Items: ₹{order.subtotal} + Delivery: ₹{order.deliveryFee}
                        </span>
                        <span className="font-extrabold text-sm text-brand-dark">
                          Total: ₹{order.finalTotal}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-brand-border p-6">
                <span className="text-3xl block mb-2">📦</span>
                <h4 className="font-bold text-sm text-brand-charcoal">No Orders Found</h4>
                <p className="text-xs text-brand-muted mt-1">There are no orders matching the selected filter or search keyword.</p>
              </div>
            )}

          </div>
        )}

        {/* 4. SETTINGS TAB */}
        {activeTab === 'settings' && settingsForm && (
          <div className="bg-white p-6 rounded-3xl border border-brand-border shadow-xs max-w-3xl mx-auto space-y-6">
            
            <div>
              <h3 className="font-extrabold text-lg text-brand-charcoal">
                Store Configuration & Delivery Rules
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Settings updated here apply directly to the customer website and WhatsApp checkout.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              
              {/* Store Open/Closed Toggle */}
              <div className="p-4 rounded-2xl bg-brand-soft/50 border border-brand-border flex items-center justify-between">
                <div>
                  <strong className="block text-xs text-brand-charcoal">Store Status</strong>
                  <span className="text-[11px] text-brand-muted">
                    When closed, customers will not be able to place new orders.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, isStoreOpen: !settingsForm.isStoreOpen })}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    settingsForm.isStoreOpen
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {settingsForm.isStoreOpen ? 'Store is OPEN' : 'Store is CLOSED'}
                </button>
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Business WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                    placeholder="919876543210 (with country code 91)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                  />
                </div>
                <span className="text-[10px] text-brand-muted mt-1 block">
                  Write 12 digits without '+' or spaces (e.g. 918808481400).
                </span>
              </div>

              {/* Pricing Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settingsForm.minOrderValue}
                    onChange={(e) => setSettingsForm({ ...settingsForm, minOrderValue: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    Standard Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settingsForm.standardDeliveryFee}
                    onChange={(e) => setSettingsForm({ ...settingsForm, standardDeliveryFee: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settingsForm.freeDeliveryThreshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeDeliveryThreshold: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm"
                  />
                </div>
              </div>

              {/* Service Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    Primary Service Area
                  </label>
                  <input
                    type="text"
                    value={settingsForm.serviceAreaPrimary}
                    onChange={(e) => setSettingsForm({ ...settingsForm, serviceAreaPrimary: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={settingsForm.serviceAreaCity}
                    onChange={(e) => setSettingsForm({ ...settingsForm, serviceAreaCity: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm"
                  />
                </div>
              </div>

              {/* Save CTA */}
              <div className="pt-4 border-t border-brand-border">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full bg-brand-dark hover:bg-brand-hover text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingSettings ? 'Saving...' : 'Save Store Settings'}</span>
                </button>
              </div>

            </form>

          </div>
        )}

        {/* 5. VEGETABLE PRICING & PROFIT CALCULATOR TAB */}
        {activeTab === 'pricing-calculator' && (
          <PricingCalculator
            products={products}
            categories={categories}
            onPriceUpdated={() => {
              fetchProducts();
              fetchStats();
              if (onCatalogChanged) onCatalogChanged();
            }}
            showFeedback={showFeedback}
          />
        )}

      </main>

      {/* Product Edit / Add Modal */}
      <ProductEditModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSaved={() => {
          fetchProducts();
          fetchStats();
          showFeedback('Product updated successfully!');
          if (onCatalogChanged) onCatalogChanged();
        }}
      />

    </div>
  );
};
