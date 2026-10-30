import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Percent,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  X,
  Check,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

export const OffersManagement = ({ onCatalogChanged }) => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, scheduled: 0, expired: 0, inactive: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // all | active | scheduled | expired | inactive
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  // Form View state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'percentage', // percentage | fixed
    discountValue: '',
    startDate: '',
    endDate: '',
    minQuantity: '',
    maxDiscount: '',
    usageLimit: '',
    productIds: [],
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmActivateModal, setConfirmActivateModal] = useState({ isOpen: false, pendingPayload: null });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, offer: null });

  // Live Preview Data
  const [previewProducts, setPreviewProducts] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Helper: format datetime for input[type="datetime-local"]
  const toLocalDatetimeInput = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Fetch all offers from backend
  const fetchOffers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminOffers();
      if (res.success) {
        setOffers(res.data);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err) {
      console.error('Failed to fetch admin offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch admin products list for selection
  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.getAdminProducts();
      if (res.success && res.data) {
        setProducts(res.data);
        if (res.categories) setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to fetch products for offers:', err);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, [fetchOffers, fetchProducts]);

  // Open creation form with sensible defaults
  const handleOpenCreate = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setEditingOfferId(null);
    setFormData({
      title: '',
      description: '',
      discountType: 'percentage',
      discountValue: '15',
      startDate: toLocalDatetimeInput(now),
      endDate: toLocalDatetimeInput(nextWeek),
      minQuantity: '',
      maxDiscount: '',
      usageLimit: '',
      productIds: products.length > 0 ? [products[0].id] : [],
      isActive: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open edit form for existing offer
  const handleOpenEdit = (offer) => {
    setEditingOfferId(offer.id);
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      discountType: offer.discountType || 'percentage',
      discountValue: String(offer.discountValue ?? ''),
      startDate: toLocalDatetimeInput(offer.startDate),
      endDate: toLocalDatetimeInput(offer.endDate),
      minQuantity: offer.minQuantity ? String(offer.minQuantity) : '',
      maxDiscount: offer.maxDiscount ? String(offer.maxDiscount) : '',
      usageLimit: offer.usageLimit ? String(offer.usageLimit) : '',
      productIds: Array.isArray(offer.products) ? offer.products.map(p => p.productId || p.id) : [],
      isActive: offer.isActive !== false,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Quick Toggle Active/Inactive
  const handleToggleStatus = async (offerId) => {
    try {
      const res = await api.toggleOfferStatus(offerId);
      if (res.success) {
        showFeedback(res.message);
        fetchOffers();
        if (onCatalogChanged) onCatalogChanged();
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle offer status');
    }
  };

  // Confirm delete
  const handleDeleteOffer = async () => {
    if (!deleteConfirmModal.offer) return;
    try {
      const res = await api.deleteOffer(deleteConfirmModal.offer.id);
      if (res.success) {
        showFeedback(res.message);
        setDeleteConfirmModal({ isOpen: false, offer: null });
        fetchOffers();
        if (onCatalogChanged) onCatalogChanged();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete offer');
    }
  };

  // Fetch live price preview whenever form pricing or product selections change
  useEffect(() => {
    if (!isFormOpen || formData.productIds.length === 0 || !formData.discountValue) {
      setPreviewProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsPreviewLoading(true);
        const res = await api.previewOffer({
          productIds: formData.productIds,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          minQuantity: formData.minQuantity || 1,
          maxDiscount: formData.maxDiscount || null,
        });
        if (res.success) {
          setPreviewProducts(res.data);
        }
      } catch (err) {
        console.warn('Preview error:', err);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    isFormOpen,
    formData.productIds,
    formData.discountType,
    formData.discountValue,
    formData.minQuantity,
    formData.maxDiscount,
  ]);

  // Form validation before save
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim() || formData.title.trim().length < 2) {
      errors.title = 'Offer name must be at least 2 characters';
    }

    const val = Number(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      errors.discountValue = 'Discount value must be greater than 0';
    } else if (formData.discountType === 'percentage' && val >= 100) {
      errors.discountValue = 'Percentage discount must be less than 100%';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    const start = new Date(formData.startDate).getTime();
    const end = new Date(formData.endDate).getTime();
    if (!isNaN(start) && !isNaN(end) && end <= start) {
      errors.endDate = 'End date and time must be after start date and time';
    }

    if (!formData.productIds || formData.productIds.length === 0) {
      errors.productIds = 'Please select at least one eligible vegetable';
    }

    if (formData.minQuantity) {
      const q = Number(formData.minQuantity);
      if (!Number.isInteger(q) || q < 1) {
        errors.minQuantity = 'Min quantity must be an integer >= 1';
      }
    }

    if (formData.maxDiscount) {
      const md = Number(formData.maxDiscount);
      if (isNaN(md) || md <= 0) {
        errors.maxDiscount = 'Max discount cap must be greater than 0';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save (Draft or Activate)
  const handleSave = async (explicitActivate = false) => {
    if (!validateForm()) return;

    const payload = {
      ...formData,
      isActive: explicitActivate ? true : formData.isActive,
    };

    // If activating right now, ask for confirmation
    if (explicitActivate && !formData.isActive) {
      setConfirmActivateModal({ isOpen: true, pendingPayload: payload });
      return;
    }

    executeSave(payload);
  };

  const executeSave = async (payload) => {
    try {
      setIsSaving(true);
      let res;
      if (editingOfferId) {
        res = await api.updateOffer(editingOfferId, payload);
      } else {
        res = await api.createOffer(payload);
      }

      if (res.success) {
        showFeedback(res.message);
        setIsFormOpen(false);
        setConfirmActivateModal({ isOpen: false, pendingPayload: null });
        fetchOffers();
        if (onCatalogChanged) onCatalogChanged();
      }
    } catch (err) {
      alert(err.message || 'Failed to save offer');
    } finally {
      setIsSaving(false);
    }
  };

  // Product multi-select toggling
  const toggleSelectProduct = (productId) => {
    setFormData(prev => {
      const exists = prev.productIds.includes(productId);
      const next = exists
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds: next };
    });
  };

  const selectAllProducts = () => {
    setFormData(prev => ({
      ...prev,
      productIds: products.map(p => p.id),
    }));
  };

  const deselectAllProducts = () => {
    setFormData(prev => ({
      ...prev,
      productIds: [],
    }));
  };

  // Filter offers for display
  const filteredOffers = useMemo(() => {
    return offers.filter(offer => {
      // Status filter
      if (activeFilter !== 'all' && offer.dynamicStatus !== activeFilter) {
        return false;
      }

      // Product filter
      if (selectedProductFilter !== 'all') {
        const matchesProduct = offer.products.some(
          p => (p.productId || p.id) === selectedProductFilter
        );
        if (!matchesProduct) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesTitle = offer.title.toLowerCase().includes(q);
        const matchesDesc = (offer.description || '').toLowerCase().includes(q);
        const matchesVeg = offer.products.some(p => {
          const nameEn = (p.product?.nameEn || '').toLowerCase();
          const nameHi = (p.product?.nameHi || '').toLowerCase();
          return nameEn.includes(q) || nameHi.includes(q);
        });
        return matchesTitle || matchesDesc || matchesVeg;
      }

      return true;
    });
  }, [offers, activeFilter, selectedProductFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Toast alert */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-800 text-white text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header section with Create CTA */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-brand-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Vegetable Offers & Discounts Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">
            Offers & Discounts Management (सब्ज़ी ऑफ़र)
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-2xl">
            Create percentage or fixed-amount vegetable discounts with server-enforced validity, minimum purchase requirements, and maximum discount caps.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchOffers}
            className="p-2.5 rounded-xl border border-brand-border text-brand-muted hover:text-brand-dark hover:bg-brand-soft transition-all"
            title="Refresh Offers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-brand-dark hover:bg-brand-hover text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Offer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats & Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'all', label: 'All Offers', count: counts.all, color: 'text-brand-dark', bg: 'bg-white' },
          { id: 'active', label: 'Active Now', count: counts.active, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { id: 'scheduled', label: 'Scheduled', count: counts.scheduled, color: 'text-blue-700', bg: 'bg-blue-50' },
          { id: 'expired', label: 'Expired', count: counts.expired, color: 'text-gray-600', bg: 'bg-gray-50' },
          { id: 'inactive', label: 'Draft / Inactive', count: counts.inactive, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map((tab) => {
          const isSelected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-brand-dark bg-white shadow-md ring-2 ring-brand-dark/10'
                  : 'border-brand-border bg-white hover:border-brand-dark/40 shadow-xs'
              }`}
            >
              <span className="text-[11px] font-bold text-brand-muted block uppercase tracking-wider">
                {tab.label}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${tab.color}`}>
                  {tab.count}
                </span>
                {tab.id === 'active' && tab.count > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offers by name, description, or vegetable..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-brand-border text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-muted shrink-0">Vegetable:</span>
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark"
          >
            <option value="all">All Vegetables ({products.length})</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.nameEn} ({p.nameHi})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Offers List */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-brand-border p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto text-3xl">
            🏷️
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-charcoal">
              No Offers Found
            </h3>
            <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
              {searchQuery || activeFilter !== 'all' || selectedProductFilter !== 'all'
                ? 'No offers match your current search and filter criteria.'
                : 'You have not created any vegetable offers yet. Click the button below to launch your first promotional discount!'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-brand-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-brand-hover"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Offer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => {
            const statusBadgeMap = {
              active: { label: 'Active Now', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
              scheduled: { label: 'Scheduled', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
              expired: { label: 'Expired', bg: 'bg-gray-100 text-gray-700 border-gray-300' },
              inactive: { label: 'Inactive / Draft', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            };
            const badge = statusBadgeMap[offer.dynamicStatus] || statusBadgeMap.inactive;

            return (
              <div
                key={offer.id}
                className="bg-white rounded-3xl border border-brand-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-5 space-y-4"
              >
                <div>
                  {/* Top Status & Discount Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>

                    <span className="text-base font-black text-brand-dark bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}% OFF`
                        : `₹${offer.discountValue} OFF`}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-extrabold text-base text-brand-charcoal mt-3 leading-snug">
                    {offer.title}
                  </h3>
                  {offer.description && (
                    <p className="text-xs text-brand-muted mt-1 line-clamp-2">
                      {offer.description}
                    </p>
                  )}

                  {/* Rules Summary Pills */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    {offer.minQuantity && (
                      <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded-lg">
                        Min Qty: {offer.minQuantity}
                      </span>
                    )}
                    {offer.maxDiscount && (
                      <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded-lg">
                        Max Cap: ₹{offer.maxDiscount}
                      </span>
                    )}
                    {offer.usageLimit && (
                      <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded-lg">
                        Usage: {offer.usageCount} / {offer.usageLimit}
                      </span>
                    )}
                  </div>

                  {/* Validity Dates */}
                  <div className="mt-3 pt-3 border-t border-brand-border/60 text-xs text-brand-muted space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                      <span>Starts: {new Date(offer.startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                      <span>Ends: {new Date(offer.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  {/* Eligible Vegetables Tags */}
                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider block mb-1">
                      Eligible Vegetables ({offer.products.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                      {offer.products.map(p => (
                        <span
                          key={p.productId || p.id}
                          className="bg-brand-soft text-brand-dark text-xs font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1"
                        >
                          <span>{p.product?.nameHi || p.product?.nameEn || p.productId}</span>
                          {p.product?.price && (
                            <span className="text-[10px] text-brand-muted">
                              (₹{p.product.price})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-brand-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(offer.id)}
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                        offer.isActive
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      }`}
                      title={offer.isActive ? 'Deactivate this offer' : 'Activate this offer'}
                    >
                      {offer.isActive ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                          <span>Deactivated</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(offer)}
                      className="p-2 rounded-xl text-brand-muted hover:text-brand-dark hover:bg-brand-soft border border-brand-border transition-colors"
                      title="Edit Offer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmModal({ isOpen: true, offer })}
                      className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 border border-brand-border transition-colors"
                      title="Delete Offer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFER CREATION & EDIT MODAL / DRAWER                                     */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-brand-border max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-brand-dark text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {editingOfferId ? 'Edit Vegetable Offer' : 'Create New Vegetable Offer'}
                  </h3>
                  <p className="text-xs text-white/80">
                    Set up discount percentage, eligible vegetables, validity windows, and conditions
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 2 Columns (Form & Live Database Preview) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    Offer Name / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Weekend Fresh Potato Discount (आलू पर विशेष छूट)"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark ${
                      formErrors.title ? 'border-red-500 bg-red-50/20' : 'border-brand-border'
                    }`}
                  />
                  {formErrors.title && (
                    <span className="text-[11px] text-red-600 mt-1 block">{formErrors.title}</span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    Promotional Tagline / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Save ₹10 per kg on all potatoes this weekend only"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                  />
                </div>

                {/* Discount Type & Value Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      Discount Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-dark"
                    >
                      <option value="percentage">Percentage Discount (%)</option>
                      <option value="fixed">Fixed Amount Off (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      Discount Value ({formData.discountType === 'percentage' ? '%' : '₹'}) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={formData.discountValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                        placeholder={formData.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 10'}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark ${
                          formErrors.discountValue ? 'border-red-500 bg-red-50/20' : 'border-brand-border'
                        }`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-muted">
                        {formData.discountType === 'percentage' ? '%' : '₹'}
                      </span>
                    </div>
                    {formErrors.discountValue && (
                      <span className="text-[11px] text-red-600 mt-1 block">{formErrors.discountValue}</span>
                    )}
                  </div>
                </div>

                {/* Start & End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark ${
                        formErrors.startDate ? 'border-red-500 bg-red-50/20' : 'border-brand-border'
                      }`}
                    />
                    {formErrors.startDate && (
                      <span className="text-[11px] text-red-600 mt-1 block">{formErrors.startDate}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      End Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark ${
                        formErrors.endDate ? 'border-red-500 bg-red-50/20' : 'border-brand-border'
                      }`}
                    />
                    {formErrors.endDate && (
                      <span className="text-[11px] text-red-600 mt-1 block">{formErrors.endDate}</span>
                    )}
                  </div>
                </div>

                {/* Conditions Row: Min Qty, Max Discount Cap, Usage Limit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      Min Qty (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: e.target.value }))}
                      placeholder="e.g. 2"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark"
                    />
                    <span className="text-[10px] text-brand-muted mt-0.5 block">Applies only if quantity ≥ X</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      Max Discount (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxDiscount: e.target.value }))}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-muted">
                        ₹
                      </span>
                    </div>
                    <span className="text-[10px] text-brand-muted mt-0.5 block">Caps total discount amount</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-charcoal mb-1">
                      Usage Limit (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark"
                    />
                    <span className="text-[10px] text-brand-muted mt-0.5 block">Maximum orders total</span>
                  </div>
                </div>

                {/* Eligible Vegetables Multi-Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-brand-charcoal">
                      Eligible Vegetables ({formData.productIds.length} selected) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllProducts}
                        className="text-brand-dark hover:underline font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAllProducts}
                        className="text-gray-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="border border-brand-border rounded-2xl p-3 max-h-48 overflow-y-auto space-y-1.5 bg-gray-50/50">
                    {products.map((p) => {
                      const isSelected = formData.productIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-white border-brand-border/60 text-brand-charcoal hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduct(p.id)}
                              className="rounded text-brand-dark focus:ring-brand-dark w-4 h-4"
                            />
                            <span className="text-xs">
                              {p.nameEn} ({p.nameHi})
                            </span>
                          </div>
                          <span className="text-xs text-brand-muted">
                            ₹{p.price || 0} / {p.unit}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {formErrors.productIds && (
                    <span className="text-[11px] text-red-600 mt-1 block">{formErrors.productIds}</span>
                  )}
                </div>

                {/* Active Status Checkbox */}
                <div className="p-3.5 bg-brand-soft rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-brand-dark block">
                      Active Status
                    </span>
                    <span className="text-[11px] text-brand-muted block">
                      Inactive offers save as drafts and will not apply to customer orders
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-5 h-5 text-brand-dark rounded focus:ring-brand-dark"
                  />
                </div>

              </div>

              {/* Right Column: Live Actual Price Preview */}
              <div className="lg:col-span-5 bg-gray-50 p-4 sm:p-5 rounded-2xl border border-brand-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-dark">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Live Price Preview</span>
                    </div>
                    {isPreviewLoading && (
                      <span className="text-[10px] text-brand-muted animate-pulse">Calculating...</span>
                    )}
                  </div>

                  <p className="text-[11px] text-brand-muted mt-2">
                    Actual calculated selling price using product prices from the database:
                  </p>

                  <div className="mt-3 space-y-2 max-h-[350px] overflow-y-auto no-scrollbar">
                    {previewProducts.length === 0 ? (
                      <div className="text-center py-10 text-xs text-brand-muted">
                        Select vegetables and enter discount value to view live price preview
                      </div>
                    ) : (
                      previewProducts.map((prev) => (
                        <div
                          key={prev.productId}
                          className="bg-white p-3 rounded-xl border border-brand-border shadow-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-xs text-brand-charcoal block">
                              {prev.nameEn} ({prev.nameHi})
                            </span>
                            <span className="text-[10px] text-brand-muted">
                              Unit: {prev.unit}
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="flex items-baseline gap-1.5 justify-end">
                              <span className="text-xs text-gray-400 line-through">
                                ₹{prev.originalPrice}
                              </span>
                              <span className="text-sm font-black text-brand-dark">
                                ₹{prev.finalPrice}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              Save ₹{prev.discountPerUnit} ({prev.percentageSaved}%)
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border text-[11px] text-brand-muted flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-dark shrink-0 mt-0.5" />
                  <span>
                    Discounts will never reduce price below ₹0.01. Client-submitted prices are always verified on server.
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-brand-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-muted hover:text-brand-charcoal hover:bg-white transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {/* Save Draft */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-brand-border text-xs font-bold text-brand-charcoal hover:bg-gray-100 transition-colors shadow-xs"
                >
                  Save as Draft
                </button>

                {/* Activate / Save */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-dark hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Activate & Publish Offer'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRM ACTIVATION MODAL                                                  */}
      {/* ========================================================================= */}
      {confirmActivateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-brand-border shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-brand-charcoal">
                Confirm Offer Activation
              </h4>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                Are you sure you want to activate <strong>'{confirmActivateModal.pendingPayload?.title}'</strong>?
                It will immediately apply to eligible vegetable purchases on the website as per its validity window.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmActivateModal({ isOpen: false, pendingPayload: null })}
                className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => executeSave(confirmActivateModal.pendingPayload)}
                className="px-4 py-2 rounded-xl bg-brand-dark hover:bg-brand-hover text-white text-xs font-bold shadow-sm"
              >
                Yes, Activate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRM DELETE MODAL                                                      */}
      {/* ========================================================================= */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-brand-border shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-brand-charcoal">
                Delete Offer
              </h4>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                Are you sure you want to permanently delete <strong>'{deleteConfirmModal.offer?.title}'</strong>?
                Historical orders will safely preserve their applied discounts and prices.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, offer: null })}
                className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOffer}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
              >
                Delete Offer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
