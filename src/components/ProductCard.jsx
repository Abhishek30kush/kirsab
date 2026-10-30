import React, { useState, useEffect } from 'react';
import { Plus, Check, AlertCircle, Sparkles, Tag, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { QuantitySelector } from './QuantitySelector';
import { formatCurrency, isPriceConfigured } from '../utils/currency';
import { getFreshImageUrl } from '../utils/image';

export const ProductCard = ({ product }) => {
  const { getItemQuantity, addToCart, updateQuantity, removeFromCart, setSelectedProductForDetail } = useCart();
  const { t, tProduct, isEnglish } = useLanguage();
  const [imageError, setImageError] = useState(false);

  // Reset image error immediately whenever product image URL or timestamp changes
  useEffect(() => {
    setImageError(false);
  }, [product?.id, product?.image, product?.updatedAt]);

  const quantity = getItemQuantity(product.id);
  const isConfigured = isPriceConfigured(product);
  const isOutOfStock = !product.inStock;
  const prodInfo = tProduct(product);

  const hasOffer = Boolean(
    product.activeOffer &&
    product.discountedPrice != null &&
    product.discountedPrice < product.price
  );

  return (
    <div 
      className={`group relative flex flex-col justify-between bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-soft hover:shadow-elevated ${
        hasOffer
          ? 'border-amber-200 ring-1 ring-amber-100 hover:border-amber-400'
          : !isConfigured
          ? 'border-amber-200 bg-amber-50/20'
          : 'border-brand-border/80'
      }`}
    >
      {/* Top Image & Badges Container */}
      <div 
        onClick={() => setSelectedProductForDetail(product)}
        className="relative aspect-[4/3] w-full bg-brand-soft/40 overflow-hidden cursor-pointer"
        title="Click to view details"
      >
        {!imageError ? (
          <img
            key={`${product.id}-${product.image}`}
            src={getFreshImageUrl(product.image, product.updatedAt)}
            alt={`${prodInfo.name} (${prodInfo.altName})`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-800">
            <span className="text-5xl select-none" role="img" aria-label={product.nameEn}>
              {product.fallbackEmoji || '🥬'}
            </span>
            <span className="text-xs font-semibold text-brand-dark/70 mt-2">
              {prodInfo.name}
            </span>
          </div>
        )}

        {/* Badge: Fresh / Everyday Essential */}
        {product.badge && isConfigured && !isOutOfStock && (
          <div className="absolute top-2.5 left-2.5 bg-brand-dark/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {prodInfo.badge || product.badge}
          </div>
        )}

        {/* Offer Discount Badge */}
        {hasOffer && !isOutOfStock && (
          <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10 border border-white/20 animate-pulse">
            <Sparkles className="w-3 h-3 text-yellow-300" />
            <span>
              {product.discountPercentage ? `${product.discountPercentage}% OFF` : `₹${product.discountPerUnit} OFF`}
            </span>
          </div>
        )}

        {/* Unconfigured Status Badge */}
        {!isConfigured && !isOutOfStock && (
          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10">
            <AlertCircle className="w-3 h-3" />
            {t('priceSoonBadge')}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
              {t('outOfStockBadge')}
            </span>
          </div>
        )}

        {/* Quick view hover button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/90 backdrop-blur-xs text-brand-charcoal text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>View Details</span>
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div 
          onClick={() => setSelectedProductForDetail(product)}
          className="cursor-pointer"
        >
          {/* Dual language Title */}
          <div className="flex items-baseline justify-between gap-1">
            <h3 className="font-bold text-base sm:text-lg text-brand-charcoal leading-snug group-hover:text-brand-dark transition-colors">
              {prodInfo.name}
            </h3>
            {prodInfo.altName && (
              <span className="text-xs font-medium text-brand-muted shrink-0">
                {prodInfo.altName}
              </span>
            )}
          </div>

          {/* Unit & Offer condition tags */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-block text-xs font-medium text-brand-dark bg-brand-soft px-2 py-0.5 rounded-md">
              {prodInfo.unit}
            </span>
            {hasOffer && product.activeOffer?.minQuantity > 1 && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Min {product.activeOffer.minQuantity} {prodInfo.unitShort}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mt-2 text-xs text-brand-muted line-clamp-2 leading-relaxed">
            {prodInfo.description || product.description}
          </p>
        </div>

        {/* Pricing and Action Footer */}
        <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between gap-2">
          {/* Price Section */}
          <div className="flex flex-col">
            {isConfigured ? (
              hasOffer ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-800">
                      ₹{product.discountedPrice}
                    </span>
                    <span className="text-xs text-gray-400 line-through font-semibold">
                      ₹{product.originalPrice || product.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      Save ₹{product.discountPerUnit}
                    </span>
                    <span className="text-[10px] text-brand-muted">
                      /{prodInfo.unitShort}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-extrabold text-brand-dark">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <span className="text-[10px] text-brand-muted">
                    {prodInfo.unitShort}
                  </span>
                </>
              )
            ) : (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                  {t('pricePendingText')}
                </span>
                <span className="text-[10px] text-brand-muted mt-0.5">
                  {t('mandiPendingText')}
                </span>
              </div>
            )}
          </div>

          {/* Add to Cart / Quantity Selector */}
          <div className="shrink-0">
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed"
              >
                {t('unavailableBtn')}
              </button>
            ) : !isConfigured ? (
              <button
                type="button"
                disabled
                className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded-xl cursor-not-allowed opacity-80"
              >
                {t('priceSoonBtn')}
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
                className="inline-flex items-center gap-1.5 bg-brand-dark hover:bg-brand-hover text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addBtn')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
