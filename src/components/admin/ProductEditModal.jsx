import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../../utils/api';

const PRESET_UNITS = [
  { unit: '1 kg', unitHindi: 'प्रति किलो', unitShort: 'kg' },
  { unit: '500 g', unitHindi: 'प्रति 500 ग्राम', unitShort: '500g' },
  { unit: '250 g', unitHindi: 'प्रति 250 ग्राम', unitShort: '250g' },
  { unit: '100 g', unitHindi: 'प्रति 100 ग्राम', unitShort: '100g' },
  { unit: '1 bunch', unitHindi: 'प्रति गड्डी', unitShort: 'bunch' },
  { unit: '1 piece', unitHindi: 'प्रति पीस', unitShort: 'piece' },
  { unit: '4 pieces', unitHindi: '4 पीस का सेट', unitShort: '4 pcs' },
];

export const ProductEditModal = ({ isOpen, onClose, product, categories = [], onSaved }) => {
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState({
    id: '',
    nameEn: '',
    nameHi: '',
    categoryId: 'daily-essentials',
    unit: '1 kg',
    unitHindi: 'प्रति किलो',
    unitShort: 'kg',
    price: '',
    inStock: true,
    isActive: true,
    stockQuantity: 50,
    badge: '',
    description: '',
    image: '',
    fallbackEmoji: '🥬',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id || '',
        nameEn: product.nameEn || '',
        nameHi: product.nameHi || '',
        categoryId: product.categoryId || 'daily-essentials',
        unit: product.unit || '1 kg',
        unitHindi: product.unitHindi || 'प्रति किलो',
        unitShort: product.unitShort || 'kg',
        price: product.price !== null && product.price !== undefined ? String(product.price) : '',
        inStock: product.inStock !== false,
        isActive: product.isActive !== false,
        stockQuantity: product.stockQuantity || 50,
        badge: product.badge || '',
        description: product.description || '',
        image: product.image || '',
        fallbackEmoji: product.fallbackEmoji || '🥬',
      });
    } else {
      setFormData({
        id: '',
        nameEn: '',
        nameHi: '',
        categoryId: categories[0]?.id || 'daily-essentials',
        unit: '1 kg',
        unitHindi: 'प्रति किलो',
        unitShort: 'kg',
        price: '',
        inStock: true,
        isActive: true,
        stockQuantity: 50,
        badge: '',
        description: '',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        fallbackEmoji: '🥬',
      });
    }
    setError(null);
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const handleUnitPresetChange = (e) => {
    const selected = PRESET_UNITS.find(u => u.unit === e.target.value);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        unit: selected.unit,
        unitHindi: selected.unitHindi,
        unitShort: selected.unitShort,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.nameEn.trim() || !formData.nameHi.trim() || !formData.image.trim()) {
      setError('Please provide English Name, Hindi Name, and Image URL.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        price: formData.price.trim() !== '' ? Number(formData.price) : null,
        stockQuantity: Number(formData.stockQuantity) || 50,
      };

      if (isEditing) {
        await api.updateProduct(product.id, payload);
      } else {
        await api.createProduct(payload);
      }

      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err) {
      console.error('Save product error:', err);
      setError(err.message || 'Error saving product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 text-center">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl text-left overflow-hidden transform transition-all my-6 relative border border-brand-border">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-brand-dark text-white flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold">
              {isEditing ? `Edit: ${product.nameEn} (${product.nameHi})` : 'Add New Vegetable Product'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Hindi Name (हिंदी नाम) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nameHi}
                  onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
                  placeholder="e.g. पालक / शिमला मिर्च"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  English Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="e.g. Spinach / Capsicum"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>
            </div>

            {/* Category and Unique Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-dark"
                >
                  <option value="daily-essentials">Daily Essentials (रोज़ाना ज़रूरी)</option>
                  <option value="fresh-greens">Fresh Greens (ताज़ी हरी सब्ज़ियाँ)</option>
                  <option value="aromatics">Aromatics & Herbs (अदरक, मिर्च व तड़का)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Product ID / Slug (Unique ID) {!isEditing && '*'}
                </label>
                <input
                  type="text"
                  disabled={isEditing}
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder={formData.nameEn ? formData.nameEn.toLowerCase().replace(/\s+/g, '-') : 'e.g. spinach'}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:opacity-60"
                />
              </div>
            </div>

            {/* Unit Specification & Consistent Model */}
            <div className="p-3.5 bg-brand-soft/40 rounded-2xl border border-brand-border space-y-3">
              <span className="block text-xs font-bold text-brand-dark">
                Package Unit & Weight Model
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal mb-1">
                    Preset Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={handleUnitPresetChange}
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs bg-white"
                  >
                    {PRESET_UNITS.map(u => (
                      <option key={u.unit} value={u.unit}>{u.unit} ({u.unitHindi})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal mb-1">
                    Hindi Unit Label
                  </label>
                  <input
                    type="text"
                    value={formData.unitHindi}
                    onChange={(e) => setFormData({ ...formData, unitHindi: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal mb-1">
                    Short Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unitShort}
                    onChange={(e) => setFormData({ ...formData, unitShort: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Price and Stock Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Leave empty if pending"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
                <span className="text-[10px] text-brand-muted mt-0.5 block">
                  Unset price displays as 'Price Pending' on store.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Badge (Optional)
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g. Fresh Stock / Farm Fresh"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>
            </div>

            {/* Image URL & Live Preview */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-brand-charcoal">
                  Product Image URL *
                </label>
                <span className="text-[11px] text-brand-muted">
                  Tip: Right-click image &rarr; "Copy image address"
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value });
                    setPreviewError(false);
                  }}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-brand-border flex items-center justify-center">
                  {formData.image && !previewError ? (
                    <img
                      src={formData.image}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewError(true)}
                    />
                  ) : previewError ? (
                    <span className="text-xl" title="Image failed to load">⚠️</span>
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Warning if user pasted Unsplash page link */}
              {formData.image.includes('unsplash.com/photos/') && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Unsplash Page URL डिटेक्ट हुआ (इमेज शो नहीं होगी):</span>
                    <span>
                      आपने वेबपेज का लिंक पेस्ट किया है। कृपया Unsplash पर इमेज पर <strong>Right Click</strong> करके <strong>"Copy image address"</strong> (इमेज का पता कॉपी करें) चुनें। लिंक <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">https://images.unsplash.com/...</code> होना चाहिए।
                    </span>
                  </div>
                </div>
              )}

              {/* Warning if preview failed */}
              {formData.image && previewError && !formData.image.includes('unsplash.com/photos/') && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  इमेज लोड नहीं हो सकी। कृपया सुनिश्चित करें कि यह एक मान्य डायरेक्ट इमेज URL है।
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the vegetable..."
                className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
              />
            </div>

            {/* Stock & Active Toggles */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-charcoal">
                <input
                  type="checkbox"
                  checked={formData.inStock}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  className="w-4 h-4 text-brand-dark rounded"
                />
                <span>In Stock</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-charcoal">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-dark rounded"
                />
                <span>Active on Store</span>
              </label>
            </div>

            {/* Submit CTA */}
            <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-brand-dark hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save Product'}</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
