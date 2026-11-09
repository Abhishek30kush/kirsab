import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Save, AlertCircle, Upload, Link, Image as ImageIcon,
  Trash2, CheckCircle, Loader2, Camera, RefreshCw,
} from 'lucide-react';
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

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Image management tab: 'upload' | 'url'
const IMG_TAB_UPLOAD = 'upload';
const IMG_TAB_URL = 'url';

export const ProductEditModal = ({ isOpen, onClose, product, categories = [], onSaved }) => {
  const isEditing = Boolean(product);
  const fileInputRef = useRef(null);

  // ─── Form State ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    id: '', nameEn: '', nameHi: '',
    categoryId: 'daily-essentials',
    unit: '1 kg', unitHindi: 'प्रति किलो', unitShort: 'kg',
    price: '', inStock: true, isActive: true,
    stockQuantity: 50, badge: '', description: '',
    image: '', fallbackEmoji: '🥬',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // ─── Image State ─────────────────────────────────────────────────────
  const [imgTab, setImgTab] = useState(IMG_TAB_UPLOAD);           // active image panel tab
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');     // what's shown in the preview
  const [imageLoadError, setImageLoadError] = useState(false);    // preview load failure
  const [urlInputValue, setUrlInputValue] = useState('');         // text in URL input
  const [uploadStatus, setUploadStatus] = useState('idle');       // idle | uploading | success | error
  const [uploadProgress, setUploadProgress] = useState(0);        // 0-100
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);         // File object from picker
  const [fileStagedForUpload, setFileStagedForUpload] = useState(null); // staged, not yet uploaded
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(null); // null=unknown, true/false
  const [isDragOver, setIsDragOver] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // ─── Populate form when editing ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

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
      setImagePreviewUrl(product.image || '');
      setUrlInputValue(product.image || '');
    } else {
      const defaultImage = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
      setFormData({
        id: '', nameEn: '', nameHi: '',
        categoryId: categories[0]?.id || 'daily-essentials',
        unit: '1 kg', unitHindi: 'प्रति किलो', unitShort: 'kg',
        price: '', inStock: true, isActive: true,
        stockQuantity: 50, badge: '', description: '',
        image: defaultImage, fallbackEmoji: '🥬',
      });
      setImagePreviewUrl(defaultImage);
      setUrlInputValue(defaultImage);
    }

    // Reset image UI state
    setImgTab(IMG_TAB_UPLOAD);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadMessage('');
    setSelectedFile(null);
    setFileStagedForUpload(null);
    setImageLoadError(false);
    setError(null);
    setSuccessMsg(null);
    setShowRemoveConfirm(false);

    // Check Cloudinary config
    api.getCloudinaryStatus().then((res) => {
      setCloudinaryConfigured(res.configured);
    }).catch(() => {
      setCloudinaryConfigured(false);
    });
  }, [product, categories, isOpen]);

  // ─── File validation ──────────────────────────────────────────────────
  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected';

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type "${ext}". Allowed: JPG, PNG, WebP`;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE_MB} MB`;
    }

    if (!file.type.startsWith('image/')) {
      return 'File must be an image';
    }

    return null; // valid
  }, []);

  // ─── File selected from input or drop ────────────────────────────────
  const handleFileSelected = useCallback((file) => {
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadStatus('error');
      setUploadMessage(error);
      return;
    }

    // Create a local preview URL
    const localUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setFileStagedForUpload(file);
    setImagePreviewUrl(localUrl);
    setImageLoadError(false);
    setUploadStatus('staged');
    setUploadMessage(`📁 ${file.name} (${(file.size / 1024).toFixed(0)} KB) — ready to upload`);
  }, [validateFile]);

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Drag & drop ─────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  // ─── Upload staged file to Cloudinary ────────────────────────────────
  const handleUploadNow = async () => {
    if (!fileStagedForUpload || !isEditing) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('इमेज अपलोड हो रही है… (Uploading image...)');

    try {
      const result = await api.uploadProductImage(
        product.id,
        fileStagedForUpload,
        (progress) => {
          setUploadProgress(progress);
          setUploadMessage(`अपलोड हो रहा है: ${progress}% (Uploading: ${progress}%)`);
        }
      );

      // Success
      const newUrl = result.data?.imageUrl || result.data?.product?.image;
      setUploadStatus('success');
      setUploadMessage('✅ इमेज सफलतापूर्वक अपलोड हुई! (Image uploaded successfully!)');
      setImagePreviewUrl(newUrl || imagePreviewUrl);
      setFormData(prev => ({ ...prev, image: newUrl || prev.image }));
      setFileStagedForUpload(null);
      setSelectedFile(null);
      setSuccessMsg('Image uploaded and saved permanently to Cloudinary!');

      if (onSaved) onSaved();

    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(`अपलोड विफल: ${err.message}`);
      // Revert preview to saved image
      setImagePreviewUrl(formData.image);
    }
  };

  // ─── URL tab: apply external URL ──────────────────────────────────────
  const handleApplyUrl = async () => {
    const trimmed = urlInputValue.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      setError('Blob/Data URLs are not allowed. Please upload the file directly.');
      return;
    }

    try { new URL(trimmed); } catch {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    if (isEditing) {
      // If editing an existing product, save immediately via API
      setIsLoading(true);
      try {
        await api.setProductImageUrl(product.id, trimmed);
        setFormData(prev => ({ ...prev, image: trimmed }));
        setImagePreviewUrl(trimmed);
        setImageLoadError(false);
        setSuccessMsg('Image URL saved!');
        if (onSaved) onSaved();
      } catch (err) {
        setError(`Failed to save URL: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // For new products, just update local form state
      setFormData(prev => ({ ...prev, image: trimmed }));
      setImagePreviewUrl(trimmed);
      setImageLoadError(false);
    }
  };

  // ─── Remove image ─────────────────────────────────────────────────────
  const handleRemoveImage = async () => {
    if (!isEditing) {
      setFormData(prev => ({ ...prev, image: '' }));
      setImagePreviewUrl('');
      setShowRemoveConfirm(false);
      return;
    }

    setIsLoading(true);
    try {
      await api.removeProductImage(product.id);
      setFormData(prev => ({ ...prev, image: '' }));
      setImagePreviewUrl('');
      setShowRemoveConfirm(false);
      setSuccessMsg('Image removed. Emoji fallback will now display.');
      if (onSaved) onSaved();
    } catch (err) {
      setError(`Failed to remove image: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Unit preset ──────────────────────────────────────────────────────
  const handleUnitPresetChange = (e) => {
    const selected = PRESET_UNITS.find(u => u.unit === e.target.value);
    if (selected) {
      setFormData(prev => ({ ...prev, ...selected }));
    }
  };

  // ─── Form submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.nameEn.trim() || !formData.nameHi.trim()) {
      setError('Please provide both English and Hindi names.');
      return;
    }

    if (!formData.image.trim() && !isEditing) {
      setError('Please add an image (upload or URL) before creating the product.');
      return;
    }

    // Warn if staged file not yet uploaded
    if (fileStagedForUpload && isEditing) {
      setError('You have a file selected but not yet uploaded. Click "Upload to Cloudinary" first, or use a URL instead.');
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

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Save product error:', err);
      setError(err.message || 'Error saving product');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isUploading = uploadStatus === 'uploading';
  const hasImage = Boolean(imagePreviewUrl);
  const imageProvider = product?.imageProvider;

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
            <button type="button" onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">

            {/* Global error/success */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-300 text-green-900 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Basic Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">Hindi Name (हिंदी नाम) *</label>
                <input type="text" required value={formData.nameHi}
                  onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
                  placeholder="e.g. पालक / शिमला मिर्च"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">English Name *</label>
                <input type="text" required value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="e.g. Spinach / Capsicum"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
              </div>
            </div>

            {/* Category and ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">Category *</label>
                <select value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-dark">
                  <option value="daily-essentials">Daily Essentials (रोज़ाना ज़रूरी)</option>
                  <option value="fresh-greens">Fresh Greens (ताज़ी हरी सब्ज़ियाँ)</option>
                  <option value="aromatics">Aromatics & Herbs (अदरक, मिर्च व तड़का)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">
                  Product ID / Slug {!isEditing && '*'}
                </label>
                <input type="text" disabled={isEditing} value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder={formData.nameEn ? formData.nameEn.toLowerCase().replace(/\s+/g, '-') : 'e.g. spinach'}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:opacity-60" />
              </div>
            </div>

            {/* Unit */}
            <div className="p-3.5 bg-brand-soft/40 rounded-2xl border border-brand-border space-y-3">
              <span className="block text-xs font-bold text-brand-dark">Package Unit & Weight Model</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal mb-1">Preset Unit</label>
                  <select value={formData.unit} onChange={handleUnitPresetChange}
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs bg-white">
                    {PRESET_UNITS.map(u => (
                      <option key={u.unit} value={u.unit}>{u.unit} ({u.unitHindi})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal mb-1">Hindi Unit Label</label>
                  <input type="text" value={formData.unitHindi}
                    onChange={(e) => setFormData({ ...formData, unitHindi: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-brand-charcoal mb-1">Short Unit</label>
                  <input type="text" value={formData.unitShort}
                    onChange={(e) => setFormData({ ...formData, unitShort: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-brand-border text-xs" />
                </div>
              </div>
            </div>

            {/* Price / Stock / Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">Selling Price (₹)</label>
                <input type="number" step="0.5" min="0" value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Leave empty if pending"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
                <span className="text-[10px] text-brand-muted mt-0.5 block">Leave blank → 'Price Pending'</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">Stock Quantity</label>
                <input type="number" min="0" value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1">Badge (Optional)</label>
                <input type="text" value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="e.g. Fresh Stock"
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                IMAGE MANAGEMENT SECTION
            ═══════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border-2 border-brand-border overflow-hidden">

              {/* Section Header */}
              <div className="bg-brand-soft/60 px-4 py-3 flex items-center justify-between border-b border-brand-border">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-dark" />
                  <span className="text-xs font-bold text-brand-dark">Product Image</span>
                  {imageProvider === 'cloudinary' && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      ☁ Cloudinary
                    </span>
                  )}
                  {imageProvider === 'external' && (
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      🔗 External URL
                    </span>
                  )}
                </div>
                {hasImage && !showRemoveConfirm && (
                  <button type="button" onClick={() => setShowRemoveConfirm(true)}
                    className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4">

                {/* Remove confirm */}
                {showRemoveConfirm && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-3">
                    <span className="font-semibold">⚠️ Remove image? The emoji fallback will display instead.</span>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => setShowRemoveConfirm(false)}
                        className="px-3 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-100 font-semibold">
                        Cancel
                      </button>
                      <button type="button" onClick={handleRemoveImage} disabled={isLoading}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60">
                        {isLoading ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Image Preview */}
                <div className="flex gap-4 items-start">
                  {/* Preview box */}
                  <div className="w-28 h-28 rounded-xl bg-gray-100 overflow-hidden shrink-0 border-2 border-brand-border flex items-center justify-center relative">
                    {imagePreviewUrl && !imageLoadError ? (
                      <img
                        key={imagePreviewUrl}
                        src={imagePreviewUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={() => setImageLoadError(true)}
                      />
                    ) : imageLoadError ? (
                      <div className="text-center px-2">
                        <span className="text-2xl block">{formData.fallbackEmoji || '🥬'}</span>
                        <span className="text-[10px] text-red-500 mt-1 block">Failed to load</span>
                      </div>
                    ) : (
                      <div className="text-center px-2">
                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto" />
                        <span className="text-[10px] text-gray-400 mt-1 block">No image</span>
                      </div>
                    )}

                    {/* Upload progress overlay */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-xl">
                        <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                        <span className="text-white text-[11px] font-bold">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Info next to preview */}
                  <div className="flex-1 min-w-0">
                    {imagePreviewUrl && !imageLoadError && (
                      <p className="text-[11px] text-green-700 font-semibold flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3 h-3" /> Image ready
                      </p>
                    )}
                    {imageLoadError && (
                      <p className="text-[11px] text-red-600 mb-1">⚠️ Preview failed — the URL may be invalid or blocked.</p>
                    )}
                    <p className="text-[11px] text-brand-muted leading-relaxed">
                      Upload from your device (Cloudinary permanent storage) or paste an external URL.
                      {imageProvider === 'cloudinary' && ' This image is stored permanently on Cloudinary.'}
                    </p>
                  </div>
                </div>

                {/* Upload status message */}
                {uploadMessage && (
                  <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    uploadStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                    uploadStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                    uploadStatus === 'uploading' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                    'bg-gray-50 border border-gray-200 text-gray-700'
                  }`}>
                    {uploadStatus === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                    {uploadStatus === 'success' && <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                    {uploadStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                    <span>{uploadMessage}</span>
                  </div>
                )}

                {/* Upload progress bar */}
                {isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-brand-dark h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Tab switcher: Upload | URL */}
                <div className="flex border border-brand-border rounded-xl overflow-hidden">
                  <button type="button"
                    onClick={() => setImgTab(IMG_TAB_UPLOAD)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                      imgTab === IMG_TAB_UPLOAD
                        ? 'bg-brand-dark text-white'
                        : 'bg-white text-brand-muted hover:bg-brand-soft/40'
                    }`}>
                    <Upload className="w-3.5 h-3.5" />
                    Upload from Device
                  </button>
                  <button type="button"
                    onClick={() => setImgTab(IMG_TAB_URL)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors border-l border-brand-border ${
                      imgTab === IMG_TAB_URL
                        ? 'bg-brand-dark text-white'
                        : 'bg-white text-brand-muted hover:bg-brand-soft/40'
                    }`}>
                    <Link className="w-3.5 h-3.5" />
                    Use External URL
                  </button>
                </div>

                {/* Upload panel */}
                {imgTab === IMG_TAB_UPLOAD && (
                  <div className="space-y-3">
                    {cloudinaryConfigured === false && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <p className="font-bold mb-1">⚠️ Cloudinary Not Configured</p>
                        <p>Add these to <code className="bg-amber-100 px-1 rounded">server/.env</code>:</p>
                        <pre className="mt-1 text-[11px] bg-amber-100 p-2 rounded-lg overflow-x-auto">
{`CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret`}
                        </pre>
                        <p className="mt-1 text-amber-700">Get free credentials at <strong>cloudinary.com</strong> → Dashboard</p>
                      </div>
                    )}

                    {/* Drop zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-brand-dark bg-brand-soft/60 scale-[1.01]'
                          : 'border-brand-border hover:border-brand-dark hover:bg-brand-soft/30'
                      } ${cloudinaryConfigured === false ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Camera className="w-8 h-8 text-brand-muted mx-auto mb-2" />
                      <p className="text-sm font-semibold text-brand-charcoal">
                        Click to browse or drag & drop
                      </p>
                      <p className="text-xs text-brand-muted mt-1">
                        JPG, PNG, WebP — max {MAX_FILE_SIZE_MB} MB
                      </p>
                      <p className="text-[10px] text-brand-muted mt-1">
                        Works on mobile: tap to open camera or gallery
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="sr-only"
                        capture="environment"
                        onChange={handleFileInputChange}
                      />
                    </div>

                    {/* Upload button — only shown when file is staged and product exists */}
                    {fileStagedForUpload && isEditing && (
                      <button
                        type="button"
                        onClick={handleUploadNow}
                        disabled={isUploading || cloudinaryConfigured === false}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-bold hover:bg-brand-hover disabled:opacity-60 transition-colors">
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading {uploadProgress}%…
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload to Cloudinary
                          </>
                        )}
                      </button>
                    )}

                    {fileStagedForUpload && !isEditing && (
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                        📌 Image will be uploaded after the product is created. First save the product, then re-open to upload the image.
                      </div>
                    )}
                  </div>
                )}

                {/* URL panel */}
                {imgTab === IMG_TAB_URL && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-brand-charcoal mb-1.5">
                        External Image URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={urlInputValue}
                          onChange={(e) => {
                            setUrlInputValue(e.target.value);
                            setImageLoadError(false);
                          }}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="flex-1 px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
                        />
                        <button type="button" onClick={handleApplyUrl} disabled={isLoading}
                          className="px-3.5 py-2 rounded-xl bg-brand-dark text-white text-xs font-bold hover:bg-brand-hover disabled:opacity-60 flex items-center gap-1.5 shrink-0">
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Apply
                        </button>
                      </div>
                    </div>

                    {urlInputValue.includes('unsplash.com/photos/') && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          This looks like an Unsplash <strong>page URL</strong>. Please right-click the image on Unsplash
                          and choose <strong>"Copy image address"</strong>. The URL should start with{' '}
                          <code className="bg-amber-100 px-1 rounded text-[10px]">https://images.unsplash.com/</code>
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-brand-muted leading-relaxed">
                      💡 Tip: External URLs depend on the host keeping them online. For permanent images, use the
                      <strong> Upload from Device</strong> tab instead.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* ═══ END IMAGE SECTION ═══ */}

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal mb-1">Description</label>
              <textarea rows={2} value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the vegetable..."
                className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
            </div>

            {/* Stock & Active Toggles */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-charcoal">
                <input type="checkbox" checked={formData.inStock}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  className="w-4 h-4 text-brand-dark rounded" />
                <span>In Stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-charcoal">
                <input type="checkbox" checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-dark rounded" />
                <span>Active on Store</span>
              </label>
            </div>

            {/* Submit CTA */}
            <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2.5">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={isLoading || isUploading}
                className="px-5 py-2 rounded-xl bg-brand-dark hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isLoading ? 'Saving...' : 'Save Product'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
