import React, { useState } from 'react';
import {
  X,
  Plus,
  ShoppingBag,
  Sparkles,
  Clock,
  Calendar,
  AlertCircle,
  Tag,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, isPriceConfigured } from '../utils/currency';
import { QuantitySelector } from './QuantitySelector';
import { getFreshImageUrl } from '../utils/image';

export const ProductDetailModal = () => {
  const {
    selectedProductForDetail,
    setSelectedProductForDetail,
    getItemQuantity,
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const { t, tProduct, isHindi } = useLanguage();
  const [imageError, setImageError] = useState(false);

  const product = selectedProductForDetail;

  // Reset image error immediately whenever selected product changes or its image URL updates
  React.useEffect(() => {
    setImageError(false);
  }, [product?.id, product?.image, product?.updatedAt]);

  if (!selectedProductForDetail) return null;

  const prodInfo = tProduct(product);
  const quantity = getItemQuantity(product.id);
  const isConfigured = isPriceConfigured(product);
  const isOutOfStock = !product.inStock;

  const hasOffer = Boolean(
    product.activeOffer &&
    product.discountedPrice != null &&
    product.discountedPrice < product.price
  );

  const offer = product.activeOffer;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setSelectedProductForDetail(null)}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Product Image Container */}
        <div className="relative aspect-[16/10] w-full bg-brand-soft/40 overflow-hidden">
          {!imageError ? (
            <img
              key={`${product.id}-${product.image}`}
              src={getFreshImageUrl(product.image, product.updatedAt)}
              alt={`${prodInfo.name} (${prodInfo.altName})`}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-800">
              <span className="text-7xl select-none" role="img" aria-label={product.nameEn}>
                {product.fallbackEmoji || '🥬'}
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {product.badge && (
              <span className="bg-brand-dark/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                {prodInfo.badge || product.badge}
              </span>
            )}
            {hasOffer && (
              <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-white/20 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>
                  {product.discountPercentage ? `${product.discountPercentage}% OFF` : `₹${product.discountPerUnit} OFF`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Details Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title and Category */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-brand-charcoal">
                {prodInfo.name}
              </h2>
              {prodInfo.altName && (
                <span className="text-sm font-semibold text-brand-muted">
                  {prodInfo.altName}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs font-bold text-brand-dark bg-brand-soft px-2.5 py-0.5 rounded-lg">
                {prodInfo.unit}
              </span>
              <span className="text-xs text-brand-muted">
                {isOutOfStock ? (
                  <span className="text-red-600 font-bold">Out of Stock</span>
                ) : (
                  <span className="text-emerald-700 font-bold">In Stock & Ready for Dispatch</span>
                )}
              </span>
            </div>
          </div>

          {/* Offer Highlight Box if active */}
          {hasOffer && offer && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-sm">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span>{offer.title || 'Special Vegetable Offer'}</span>
                </div>
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Save ₹{product.discountPerUnit}
                </span>
              </div>

              {offer.description && (
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  {offer.description}
                </p>
              )}

              {/* Offer Validity & Conditions */}
              <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-950 font-medium">
                {offer.endDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Valid till: {new Date(offer.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {offer.minQuantity > 1 && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Condition: Minimum {offer.minQuantity} {prodInfo.unitShort || 'units'} required
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-1">
              About This Vegetable
            </h4>
            <p className="text-xs sm:text-sm text-brand-charcoal leading-relaxed">
              {prodInfo.description || product.description || 'Farm-fresh, crisp, and ethically harvested daily for your kitchen.'}
            </p>
          </div>

          {/* Price Breakdown Card */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-brand-border/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted block">
                Selling Price
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                {hasOffer ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black text-brand-dark">
                      ₹{product.discountedPrice}
                    </span>
                    <span className="text-sm font-semibold text-gray-400 line-through">
                      ₹{product.originalPrice || product.price}
                    </span>
                    <span className="text-xs text-brand-muted">
                      / {prodInfo.unitShort}
                    </span>
                  </>
                ) : isConfigured ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black text-brand-dark">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="text-xs text-brand-muted">
                      / {prodInfo.unitShort}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Price Config Pending
                  </span>
                )}
              </div>
            </div>

            {hasOffer && (
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-800 block">
                  You Save: ₹{product.discountPerUnit}
                </span>
                <span className="text-[10px] text-brand-muted">
                  Per {prodInfo.unitShort}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Cart Trigger */}
        <div className="p-4 sm:p-5 bg-white border-t border-brand-border flex items-center justify-between gap-3">
          <div className="text-xs text-brand-muted">
            <span className="block font-bold text-brand-charcoal">
              {quantity > 0 ? `In Cart: ${quantity} × ${prodInfo.unit}` : 'Not in Cart'}
            </span>
            <span>Delivery in 10-20 mins</span>
          </div>

          <div className="shrink-0">
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-400 text-xs font-bold cursor-not-allowed"
              >
                Unavailable
              </button>
            ) : !isConfigured ? (
              <button
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold cursor-not-allowed"
              >
                Price Pending
              </button>
            ) : quantity > 0 ? (
              <QuantitySelector
                quantity={quantity}
                onIncrement={() => addToCart(product.id, 1)}
                onDecrement={() => updateQuantity(product.id, quantity - 1)}
                onDelete={() => removeFromCart(product.id)}
                size="md"
              />
            ) : (
              <button
                type="button"
                onClick={() => addToCart(product.id, 1)}
                className="inline-flex items-center gap-2 bg-brand-dark hover:bg-brand-hover text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
