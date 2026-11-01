import React, { useState, useEffect } from 'react';
import {
  Star,
  ShieldCheck,
  Sparkles,
  Package,
  Truck,
  MessageSquare,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  CheckCircle2,
  X,
} from 'lucide-react';
import { StarRating } from '../common/StarRating';
import { AllReviewsModal } from './AllReviewsModal';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export const TestimonialsSection = () => {
  const { isHindi } = useLanguage();

  const [featuredReviews, setFeaturedReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllReviewsOpen, setIsAllReviewsOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

  const loadFeaturedReviews = async () => {
    setIsLoading(true);
    try {
      const res = await api.getFeaturedReviews(6);
      if (res.success) {
        setFeaturedReviews(res.reviews || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load testimonials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeaturedReviews();

    // Listen for public review updates via custom event or refresh
    const handleUpdate = () => loadFeaturedReviews();
    window.addEventListener('kirsab:reviews_updated', handleUpdate);
    return () => window.removeEventListener('kirsab:reviews_updated', handleUpdate);
  }, []);

  // If loading, show tasteful subtle skeleton
  if (isLoading) {
    return (
      <section className="py-12 bg-[#F7FAF5] border-y border-brand-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse space-y-6">
          <div className="h-6 w-48 bg-gray-200 rounded-md mx-auto" />
          <div className="h-4 w-72 bg-gray-200 rounded-md mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-3xl border border-gray-200 p-6 space-y-3" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If there are zero approved reviews, display a tasteful genuine empty state inviting customers
  if (!featuredReviews || featuredReviews.length === 0) {
    return (
      <section className="py-12 bg-[#F7FAF5] border-y border-brand-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#176B3A] text-xs font-bold">
            <HeartHandshake className="w-4 h-4" />
            <span>{isHindi ? '100% वास्तविक ग्राहक अनुभव' : '100% Verified Customer Experience'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-brand-charcoal">
            {isHindi ? 'हमारे ग्राहकों के अनुभव' : 'What Our Customers Say'}
          </h2>

          <p className="text-sm text-brand-muted max-w-lg mx-auto">
            {isHindi
              ? 'किरसाब पर हम केवल वास्तविक सत्यापित खरीदारों की समीक्षाएं प्रदर्शित करते हैं। ऑर्डर डिलीवर होने के बाद अपने अनुभव की निष्पक्ष समीक्षा साझा करें!'
              : 'Real experiences from KIRSAB customers. We only display authentic reviews from verified delivered purchases.'}
          </p>

          <div className="pt-2">
            <a
              href="#catalogue"
              className="inline-flex items-center gap-2 bg-[#176B3A] hover:bg-[#2E8B57] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <span>{isHindi ? 'ताज़ी सब्जियां ऑर्डर करें' : 'Order Fresh Groceries'}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 sm:py-16 bg-[#F7FAF5] border-y border-brand-border/80 relative overflow-hidden">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-10 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-[#176B3A] text-xs font-extrabold uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#176B3A]" />
              <span>{isHindi ? '100% सत्यापित खरीद समीक्षाएं' : '100% Verified Purchase Reviews'}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-brand-charcoal tracking-tight">
              {isHindi ? 'हमारे ग्राहकों के अनुभव' : 'What Our Customers Say'}
            </h2>

            <p className="text-xs sm:text-sm text-brand-muted font-medium">
              {isHindi
                ? 'किरसाब से जुड़े वास्तविक ग्राहकों के निष्पक्ष अनुभव एवं रेटिंग।'
                : 'Real experiences from KIRSAB customers.'}
            </p>
          </div>

          {/* Genuine Summary Rating Pill / Link */}
          <div className="flex flex-wrap items-center gap-3">
            {stats && stats.totalReviews > 0 && (
              <div className="bg-white border border-brand-border rounded-2xl px-4 py-2.5 shadow-xs flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-black text-brand-charcoal">
                    <span className="text-lg text-emerald-800">{stats.averageRating}</span>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <span className="text-[10px] text-brand-muted font-semibold block">
                    {stats.totalReviews} {isHindi ? 'प्रमाणित समीक्षाएं' : 'Verified Reviews'}
                  </span>
                </div>

                <div className="h-8 w-px bg-gray-200" />

                <div className="text-xs text-[#176B3A] font-extrabold">
                  <span>{stats.positivePercentage}%</span>
                  <span className="text-[10px] text-brand-muted block font-medium">
                    {isHindi ? 'सकारात्मक रेटिंग' : 'Positive Rating'}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAllReviewsOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-emerald-50 border border-brand-border hover:border-emerald-300 text-[#176B3A] text-xs font-extrabold rounded-2xl shadow-xs transition-all active:scale-95"
            >
              <span>{isHindi ? 'सभी समीक्षाएं देखें' : 'View All Reviews'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Testimonial Cards Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-3xl p-6 border border-brand-border/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 relative group"
            >
              <div className="space-y-3">
                {/* Top: Customer identity + Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-brand-charcoal">
                        {rev.customerName || 'Verified Customer'}
                      </span>
                      {rev.isVerifiedPurchase && (
                        <span
                          title="Verified delivered order by KIRSAB"
                          className="inline-flex items-center gap-0.5 bg-emerald-50 text-[#176B3A] text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200"
                        >
                          <ShieldCheck className="w-3 h-3 text-[#176B3A]" />
                          <span>{isHindi ? 'सत्यापित' : 'Verified'}</span>
                        </span>
                      )}
                    </div>

                    {rev.order?.deliveredAt && (
                      <span className="text-[11px] text-brand-muted font-medium block">
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
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.2 rounded-full mt-1 border border-amber-200">
                        ⭐ {isHindi ? 'फ़ीचर्ड' : 'Featured'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Product tag */}
                {rev.product && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-100 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-emerald-900">
                    <Package className="w-3 h-3 text-[#176B3A]" />
                    <span>{isHindi ? rev.product.nameHi : rev.product.nameEn}</span>
                  </div>
                )}

                {/* Review Title */}
                {rev.title && (
                  <h4 className="text-sm font-black text-brand-charcoal group-hover:text-[#176B3A] transition-colors">
                    {rev.title}
                  </h4>
                )}

                {/* Review Written Comment */}
                <p className="text-xs sm:text-sm text-brand-charcoal/90 leading-relaxed font-normal">
                  "{rev.comment}"
                </p>

                {/* Aspect Ratings Badges */}
                {(rev.productQualityRating || rev.packagingRating || rev.deliveryRating) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.productQualityRating && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{isHindi ? 'ताजगी:' : 'Freshness:'} {rev.productQualityRating}★</span>
                      </span>
                    )}
                    {rev.packagingRating && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                        <Package className="w-2.5 h-2.5 text-amber-600" />
                        <span>{isHindi ? 'पैकेजिंग:' : 'Packaging:'} {rev.packagingRating}★</span>
                      </span>
                    )}
                    {rev.deliveryRating && (
                      <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                        <Truck className="w-2.5 h-2.5 text-blue-600" />
                        <span>{isHindi ? 'डिलीवरी:' : 'Delivery:'} {rev.deliveryRating}★</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Attached Customer Photos */}
                {rev.images && rev.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rev.images.map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt="Customer review photo"
                        onClick={() => setActivePhoto(imgUrl)}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-brand-border cursor-pointer hover:scale-105 transition-transform shadow-xs"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Official KIRSAB Response Box if admin replied */}
              {rev.adminReply && (
                <div className="bg-[#F7FAF5] border border-emerald-200/90 rounded-2xl p-3.5 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-[#176B3A]">
                    <MessageSquare className="w-3.5 h-3.5 text-[#176B3A]" />
                    <span>{isHindi ? 'किरसाब टीम की आधिकारिक प्रतिक्रिया' : 'Official KIRSAB Response'}</span>
                  </div>
                  <p className="text-xs text-brand-charcoal italic leading-relaxed">
                    "{rev.adminReply}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsAllReviewsOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#176B3A] hover:text-[#2E8B57] underline underline-offset-4 transition-colors"
          >
            <span>{isHindi ? 'सभी प्रमाणित समीक्षाएं और रेटिंग्स पढ़ें' : 'Read all customer reviews and ratings'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* All Reviews Modal */}
      <AllReviewsModal
        isOpen={isAllReviewsOpen}
        onClose={() => setIsAllReviewsOpen(false)}
      />

      {/* Photo Lightbox */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activePhoto} alt="Review customer upload" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </section>
  );
};

