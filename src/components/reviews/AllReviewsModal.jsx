import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Truck,
} from 'lucide-react';
import { StarRating } from '../common/StarRating';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export const AllReviewsModal = ({ isOpen, onClose }) => {
  const { isHindi } = useLanguage();

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [activePhoto, setActivePhoto] = useState(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        sortBy,
      });

      if (selectedRating !== 'all') {
        params.append('rating', selectedRating);
      }

      const res = await api.getPublicReviews(params.toString());
      if (res.success) {
        setReviews(res.reviews || []);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen, page, selectedRating, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#176B3A] text-white px-5 sm:px-8 py-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
              <h2 className="text-xl sm:text-2xl font-black">
                {isHindi ? 'सभी ग्राहक समीक्षाएं एवं अनुभव' : 'All Customer Reviews & Experiences'}
              </h2>
            </div>
            <p className="text-xs text-white/80">
              {stats?.totalReviews
                ? isHindi
                  ? `${stats.totalReviews} सत्यापित ग्राहकों द्वारा प्रमाणित समीक्षाएं`
                  : `Showing verified authentic experiences from ${stats.totalReviews} orders`
                : isHindi
                ? 'सत्यापित ग्राहकों के वास्तविक अनुभव'
                : 'Authentic reviews from verified purchases'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-50 border-b border-brand-border p-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          {/* Star Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {['all', '5', '4', '3', '2', '1'].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setSelectedRating(star);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  selectedRating === star
                    ? 'bg-[#176B3A] text-white shadow-xs'
                    : 'bg-white text-brand-charcoal border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {star === 'all' ? (
                  isHindi ? 'सभी' : 'All'
                ) : (
                  <span className="flex items-center gap-1">
                    <span>{star}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-brand-muted font-semibold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {isHindi ? 'क्रमबद्ध:' : 'Sort:'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-[#176B3A]/30"
            >
              <option value="featured">{isHindi ? 'फ़ीचर्ड पहले' : 'Featured First'}</option>
              <option value="latest">{isHindi ? 'नवीनतम' : 'Newest'}</option>
              <option value="highest">{isHindi ? 'उच्चतम रेटिंग' : 'Highest Rated'}</option>
              <option value="lowest">{isHindi ? 'न्यूनतम रेटिंग' : 'Lowest Rated'}</option>
            </select>
          </div>
        </div>

        {/* Content / Reviews List */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#176B3A] animate-spin mx-auto" />
              <p className="text-xs text-brand-muted font-medium">
                {isHindi ? 'समीक्षाएं लोड हो रही हैं...' : 'Loading verified reviews...'}
              </p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-[#176B3A] rounded-full flex items-center justify-center mx-auto">
                <Star className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-brand-charcoal">
                {isHindi ? 'इस श्रेणी में कोई समीक्षा नहीं मिली' : 'No reviews found in this filter'}
              </h4>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                {isHindi
                  ? 'कृपया अन्य स्टार फ़िल्टर चुनें या सभी समीक्षाएं देखें।'
                  : 'Try selecting a different rating filter or browse all reviews.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white border border-brand-border/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative"
                >
                  <div className="space-y-2.5">
                    {/* Header: Customer Name, Verified Badge, Rating */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-brand-charcoal">
                            {rev.customerName || 'Verified Customer'}
                          </span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#176B3A] text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-[#176B3A]" />
                              <span>{isHindi ? 'सत्यापित खरीद' : 'Verified'}</span>
                            </span>
                          )}
                        </div>

                        {rev.order?.deliveredAt && (
                          <span className="text-[11px] text-brand-muted block">
                            {new Date(rev.order.deliveredAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-end">
                        <StarRating rating={rev.rating} size="sm" />
                        {rev.isFeatured && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full mt-1">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product reference if attached */}
                    {rev.product && (
                      <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg text-[11px] text-brand-charcoal font-semibold">
                        <Package className="w-3 h-3 text-emerald-700" />
                        <span>{isHindi ? rev.product.nameHi : rev.product.nameEn}</span>
                      </div>
                    )}

                    {/* Title */}
                    {rev.title && (
                      <h4 className="text-xs sm:text-sm font-bold text-brand-charcoal">
                        {rev.title}
                      </h4>
                    )}

                    {/* Comment */}
                    <p className="text-xs text-brand-charcoal/90 leading-relaxed">
                      "{rev.comment}"
                    </p>

                    {/* Aspect Badges */}
                    {(rev.productQualityRating || rev.packagingRating || rev.deliveryRating) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rev.productQualityRating && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            {isHindi ? 'ताजगी:' : 'Freshness:'} {rev.productQualityRating}★
                          </span>
                        )}
                        {rev.packagingRating && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" />
                            {isHindi ? 'पैकिंग:' : 'Packing:'} {rev.packagingRating}★
                          </span>
                        )}
                        {rev.deliveryRating && (
                          <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5" />
                            {isHindi ? 'डिलीवरी:' : 'Delivery:'} {rev.deliveryRating}★
                          </span>
                        )}
                      </div>
                    )}

                    {/* Review Attached Photos */}
                    {rev.images && rev.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {rev.images.map((imgUrl, i) => (
                          <img
                            key={i}
                            src={imgUrl}
                            alt="Customer review photo"
                            onClick={() => setActivePhoto(imgUrl)}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-brand-border cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Official KIRSAB Admin Response Box */}
                  {rev.adminReply && (
                    <div className="mt-2 bg-[#F7FAF5] border border-emerald-200/90 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#176B3A]">
                        <MessageSquare className="w-3.5 h-3.5 text-[#176B3A]" />
                        <span>
                          {isHindi ? 'किरसाब आधिकारिक प्रतिक्रिया' : 'Official KIRSAB Response'}
                        </span>
                      </div>
                      <p className="text-xs text-brand-charcoal italic">
                        {rev.adminReply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 border-t border-brand-border px-6 py-3 flex items-center justify-between text-xs">
            <span className="text-brand-muted">
              {isHindi ? 'पृष्ठ' : 'Page'} {pagination.page} / {pagination.totalPages} ({pagination.total} {isHindi ? 'समीक्षाएं' : 'reviews'})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-bold disabled:opacity-40 hover:bg-gray-100 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{isHindi ? 'पिछला' : 'Prev'}</span>
              </button>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg font-bold disabled:opacity-40 hover:bg-gray-100 flex items-center gap-1"
              >
                <span>{isHindi ? 'अगला' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Photo Lightbox Preview Modal */}
        {activePhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setActivePhoto(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={activePhoto} alt="Review full preview" className="max-w-full max-h-[85vh] object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

