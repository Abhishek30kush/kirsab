import React, { useState } from 'react';
import { Plus, Check, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { QuantitySelector } from './QuantitySelector';
import { formatCurrency, isPriceConfigured } from '../utils/currency';

export const ProductCard = ({ product }) => {
  const { getItemQuantity, addToCart, updateQuantity, removeFromCart } = useCart();
  const { t, tProduct, isEnglish } = useLanguage();
  const [imageError, setImageError] = useState(false);

  const quantity = getItemQuantity(product.id);
  const isConfigured = isPriceConfigured(product);
  const isOutOfStock = !product.inStock;
  const prodInfo = tProduct(product);

  return (
    <div 
      className={`group relative flex flex-col justify-between bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-soft hover:shadow-elevated ${
        !isConfigured ? 'border-amber-200 bg-amber-50/20' : 'border-brand-border/80'
      }`}
    >
      {/* Top Image & Badges Container */}
      <div className="relative aspect-[4/3] w-full bg-brand-soft/40 overflow-hidden">
        {!imageError ? (
          <img
            src={product.image}
            alt={`${prodInfo.name} (${prodInfo.altName})`}
            loading="lazy"
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
          <div className="absolute top-2.5 left-2.5 bg-brand-dark/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {prodInfo.badge || product.badge}
          </div>
        )}

        {/* Unconfigured Status Badge */}
        {!isConfigured && !isOutOfStock && (
          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('priceSoonBadge')}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
              {t('outOfStockBadge')}
            </span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Dual language Title */}
          <div className="flex items-baseline justify-between gap-1">
            <h3 className="font-bold text-base sm:text-lg text-brand-charcoal leading-snug">
              {prodInfo.name}
            </h3>
            {prodInfo.altName && (
              <span className="text-xs font-medium text-brand-muted shrink-0">
                {prodInfo.altName}
              </span>
            )}
          </div>

          {/* Unit description */}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block text-xs font-medium text-brand-dark bg-brand-soft px-2 py-0.5 rounded-md">
              {prodInfo.unit}
            </span>
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
