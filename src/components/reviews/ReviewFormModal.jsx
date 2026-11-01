import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Star,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { StarRating } from '../common/StarRating';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Client-side image compression helper
 * Scales down large camera photos to max 1200px and exports clean JPEG base64
 */
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Only JPEG, PNG or WebP images are allowed.'));
    }
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return reject(new Error('Image size must be less than 5MB.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to read image file.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to load file.'));
    reader.readAsDataURL(file);
  });
}

export const ReviewFormModal = ({
  isOpen,
  onClose,
  order, // { id, orderNumber, deliveredAt, items }
  existingReview = null,
  preselectedProductId = null,
  onReviewSubmitted = () => {},
}) => {
  const { isHindi } = useLanguage();
  const fileInputRef = useRef(null);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || null);
  const [productQualityRating, setProductQualityRating] = useState(0);
  const [packagingRating, setPackagingRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [images, setImages] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Initialize or reset form state
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
      setSelectedProductId(existingReview.productId || null);
      setProductQualityRating(existingReview.productQualityRating || 0);
      setPackagingRating(existingReview.packagingRating || 0);
      setDeliveryRating(existingReview.deliveryRating || 0);
      setImages(existingReview.images || []);
      setError(null);
      setSuccessData(null);
    } else {
      setRating(5);
      setTitle('');
      setComment('');
      setSelectedProductId(preselectedProductId || null);
      setProductQualityRating(0);
      setPackagingRating(0);
      setDeliveryRating(0);
      setImages([]);
      setError(null);
      setSuccessData(null);
    }
  }, [existingReview, preselectedProductId, isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 4) {
      setError(isHindi ? 'आप अधिकतम 4 फोटो जोड़ सकते हैं।' : 'You can attach up to 4 photos.');
      return;
    }

    setError(null);
    try {
      const compressedList = await Promise.all(files.map((file) => compressImageFile(file)));
      setImages((prev) => [...prev, ...compressedList]);
    } catch (err) {
      setError(err.message || 'Error processing selected image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!rating || rating < 1 || rating > 5) {
      setError(isHindi ? 'कृपया 1 से 5 स्टार रेटिंग चुनें।' : 'Please choose a rating between 1 and 5 stars.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setError(isHindi ? 'कृपया कम से कम 5 अक्षरों की समीक्षा लिखें।' : 'Please write at least 5 characters for your review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        orderId: order?.id || existingReview?.orderId,
        productId: selectedProductId || null,
        rating: Math.round(rating),
        title: title.trim() || null,
        comment: comment.trim(),
        productQualityRating: productQualityRating >= 1 ? productQualityRating : null,
        packagingRating: packagingRating >= 1 ? packagingRating : null,
        deliveryRating: deliveryRating >= 1 ? deliveryRating : null,
        images,
      };

      let response;
      if (existingReview?.id) {
        response = await api.updateMyReview(existingReview.id, payload);
      } else {
        response = await api.submitReview(payload);
      }

      if (response.success) {
        setSuccessData(response.review || response);
        onReviewSubmitted(response.review || response);
      } else {
        setError(response.message || 'Failed to submit review.');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#176B3A] to-[#2E8B57] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <h2 className="text-lg sm:text-xl font-black">
                {isHindi ? 'अपना अनुभव साझा करें' : 'Share Your Experience'}
              </h2>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              {existingReview
                ? isHindi ? 'अपनी समीक्षा को संपादित करें' : 'Edit your submitted review'
                : isHindi ? 'किरसाब डिलीवरी और गुणवत्ता पर आपकी वास्तविक राय' : 'Your authentic feedback on KIRSAB delivery & quality'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Confirmation State */}
        {successData ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-brand-charcoal">
                {isHindi ? 'समीक्षा सफलतापूर्वक दर्ज हुई!' : 'Review Submitted Successfully!'}
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
                {isHindi
                  ? 'आपकी समीक्षा के लिए धन्यवाद। व्यवस्थापक द्वारा सत्यापन के बाद यह सार्वजनिक होगी।'
                  : 'Thank you for sharing your experience! Your review has been submitted for moderation and will appear publicly once approved.'}
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-left max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between">
                <StarRating rating={rating} size="sm" showLabel isHindi={isHindi} />
                <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {isHindi ? 'समीक्षाधीन (Under Review)' : 'Under Moderation'}
                </span>
              </div>
              {title && <p className="text-xs font-bold text-brand-charcoal">{title}</p>}
              <p className="text-xs text-brand-muted italic">"{comment}"</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3 bg-[#176B3A] hover:bg-[#2E8B57] text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
            >
              {isHindi ? 'ठीक है (Done)' : 'Close & Done'}
            </button>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Order & Verified Purchase Banner */}
            {order && (
              <div className="bg-[#F7FAF5] border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#176B3A]" />
                    <span className="text-xs font-extrabold text-[#176B3A] uppercase tracking-wide">
                      {isHindi ? 'सत्यापित खरीद समीक्षा' : 'Verified Purchase Review'}
                    </span>
                  </div>
                  <p className="text-xs text-brand-charcoal font-semibold">
                    {isHindi ? 'ऑर्डर क्र.' : 'Order #'}: {order.orderNumber}
                  </p>
                  {order.deliveredAt && (
                    <p className="text-[11px] text-brand-muted">
                      {isHindi ? 'डिलीवर हुआ:' : 'Delivered:'}{' '}
                      {new Date(order.deliveredAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="text-right">
                    <span className="text-[11px] text-brand-muted block">
                      {order.items.length} {isHindi ? 'उत्पाद' : 'items'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Overall Rating (Mandatory) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                {isHindi ? '1. समग्र खरीदारी अनुभव (Overall Rating) *' : '1. Overall Shopping Experience *'}
              </label>
              <div className="p-4 bg-gray-50 border border-brand-border/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <StarRating
                  rating={rating}
                  onChange={(val) => setRating(val)}
                  size="xl"
                  showLabel
                  isHindi={isHindi}
                />
                <span className="text-xs text-brand-muted font-medium">
                  {isHindi ? 'रेट करने के लिए स्टार पर क्लिक करें' : 'Click stars to rate'}
                </span>
              </div>
            </div>

            {/* Optional: Tag review to a specific vegetable from this order */}
            {order?.items && order.items.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  {isHindi ? 'उत्पाद चयन (वैकल्पिक)' : 'Specific Vegetable (Optional)'}
                </label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(e.target.value || null)}
                  className="w-full text-xs font-medium bg-gray-50 border border-brand-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#176B3A]/30 focus:border-[#176B3A]"
                >
                  <option value="">
                    {isHindi ? 'पूरा ऑर्डर अनुभव (Overall Order Experience)' : 'Overall Order Experience (All Items)'}
                  </option>
                  {order.items.map((item) => (
                    <option key={item.productId || item.productNameEn} value={item.productId || ''}>
                      {item.productNameEn} ({item.productNameHi || ''})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Review Title (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                {isHindi ? 'समीक्षा शीर्षक (वैकल्पिक)' : 'Review Title (Optional)'}
              </label>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isHindi ? 'उदा. बहुत ताज़ा पालक और तेज़ डिलीवरी!' : 'e.g. Crisp fresh vegetables & friendly delivery!'}
                className="w-full text-xs sm:text-sm bg-gray-50 border border-brand-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#176B3A]/30 focus:border-[#176B3A]"
              />
            </div>

            {/* 3. Written Review (Mandatory) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                  {isHindi ? '2. विस्तृत समीक्षा (Written Review) *' : '2. Written Review *'}
                </label>
                <span className="text-[11px] text-brand-muted font-medium">
                  {comment.length}/2000
                </span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  isHindi
                    ? 'कृपया सब्जियों की ताजगी, पैकेजिंग, तौल एवं डिलीवरी समय के बारे में विस्तार से बताएं...'
                    : 'Share details of product freshness, packaging quality, accurate weighing, or delivery experience...'
                }
                className="w-full text-xs sm:text-sm bg-gray-50 border border-brand-border rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#176B3A]/30 focus:border-[#176B3A]"
              />
            </div>

            {/* 4. Aspect Ratings (Freshness, Packaging, Delivery) */}
            <div className="space-y-3 pt-2 border-t border-brand-border/60">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                {isHindi ? '3. विस्तृत पहलू रेटिंग (Optional Details)' : '3. Detailed Feedback Ratings (Optional)'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Freshness / Quality */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isHindi ? 'सब्जी ताजगी' : 'Freshness'}</span>
                  </div>
                  <StarRating
                    rating={productQualityRating}
                    onChange={(v) => setProductQualityRating(v)}
                    size="sm"
                  />
                </div>

                {/* Packaging */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isHindi ? 'पैकेजिंग' : 'Packaging'}</span>
                  </div>
                  <StarRating
                    rating={packagingRating}
                    onChange={(v) => setPackagingRating(v)}
                    size="sm"
                  />
                </div>

                {/* Delivery */}
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isHindi ? 'डिलीवरी' : 'Delivery'}</span>
                  </div>
                  <StarRating
                    rating={deliveryRating}
                    onChange={(v) => setDeliveryRating(v)}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* 5. Photo Upload (Optional) */}
            <div className="space-y-2 pt-2 border-t border-brand-border/60">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">
                  {isHindi ? '4. फोटो जोड़ें (वैकल्पिक, अधिकतम 4)' : '4. Attach Photos (Optional, max 4)'}
                </label>
                <span className="text-[11px] text-brand-muted">{images.length}/4</span>
              </div>

              {/* Upload trigger & Previews */}
              <div className="flex flex-wrap items-center gap-3">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-brand-border overflow-hidden group shadow-xs"
                  >
                    <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {images.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#176B3A] text-gray-500 hover:text-[#176B3A] flex flex-col items-center justify-center gap-1 bg-gray-50 hover:bg-emerald-50/40 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-[10px] font-bold">
                      {isHindi ? 'फोटो अपलोड' : 'Add Photo'}
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <p className="text-[11px] text-brand-muted">
                {isHindi
                  ? 'समर्थित: JPG, PNG, WebP (प्रति फोटो अधिकतम 5MB)'
                  : 'Supported: JPG, PNG, WebP (max 5MB per photo)'}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-brand-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-brand-muted hover:text-brand-charcoal text-xs font-bold transition-colors"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#176B3A] hover:bg-[#2E8B57] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isHindi ? 'दर्ज हो रहा है...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <span>
                    {existingReview
                      ? isHindi ? 'समीक्षा अपडेट करें' : 'Update Review'
                      : isHindi ? 'समीक्षा दर्ज करें' : 'Submit Review'}
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

