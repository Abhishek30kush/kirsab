import React, { useState, useMemo } from 'react';
import { Search, Sparkles, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { PRODUCT_CATEGORIES } from '../data/products';
import { ProductCard } from './ProductCard';

export const ProductSection = () => {
  const { products } = useCart();
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products by category and search term
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Category match across string or category object relations
      const itemCatId = item.categoryId || (typeof item.category === 'object' ? item.category?.id : item.category);
      const matchesCategory =
        selectedCategory === 'all' || itemCatId === selectedCategory || item.category === selectedCategory;

      // Search match across English and Hindi names
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.nameEn.toLowerCase().includes(query) ||
        item.nameHi.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark bg-brand-soft px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-fresh" />
            <span>{t('freshHarvestBadge')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-charcoal tracking-tight">
            {t('catalogueHeading')}
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-xl">
            {t('catalogueSubheading')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-brand-border bg-white text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {t('clearSearch')}
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {PRODUCT_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const label = language === 'en'
            ? (cat.id === 'all' ? cat.nameEn : `${cat.nameEn}`)
            : (cat.id === 'all' ? cat.nameHi : `${cat.nameHi}`);
          const altLabel = language === 'en' ? cat.nameHi : cat.nameEn;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'bg-white text-brand-charcoal hover:bg-brand-soft border border-brand-border/80'
              }`}
            >
              {label} {cat.id !== 'all' && <span className="opacity-75 font-normal text-[11px]">({altLabel})</span>}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-3xl border border-brand-border p-6">
          <div className="w-16 h-16 rounded-full bg-brand-soft text-brand-dark flex items-center justify-center mx-auto mb-3 text-2xl">
            🔍
          </div>
          <h3 className="font-bold text-base text-brand-charcoal">
            {t('noProductsFound')}
          </h3>
          <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
            {t('noProductsDesc')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-4 bg-brand-dark text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            {t('viewAllBtn')}
          </button>
        </div>
      )}

      {/* Transparent Disclaimer Notice */}
      <div className="mt-8 p-4 rounded-2xl bg-white border border-brand-border/70 text-xs text-brand-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-brand-fresh shrink-0" />
          <span>
            <strong>{t('mandiNoticeTitle')}</strong> {t('mandiNoticeDesc')}
          </span>
        </div>
        <span className="text-[11px] text-brand-dark font-medium">
          {t('locationTag', 'शेरवानी लेगेसी, प्रयागराज')}
        </span>
      </div>

    </section>
  );
};
