import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Category, Offer, Product, Review } from '../../../../../packages/shared-types/src/index';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { Header } from '../components/common/Header';
import { ProductCard } from '../components/product/ProductCard';
import { StarRating } from '../components/common/StarRating';

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { totals } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [testimonials, setTestimonials] = useState<Review[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, catRes, offRes, revRes] = await Promise.allSettled([
        api.products.getPublic(),
        api.products.getCategories(),
        api.offers.getActive(),
        api.reviews.getFeatured(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.success) {
        setProducts(prodRes.value.data || []);
      }
      if (catRes.status === 'fulfilled' && catRes.value.success) {
        setCategories(catRes.value.categories || []);
      }
      if (offRes.status === 'fulfilled' && offRes.value.success) {
        setOffers(offRes.value.data || []);
      }
      if (revRes.status === 'fulfilled' && revRes.value.success) {
        setTestimonials(revRes.value.reviews || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => p.categoryId === selectedCategory);

  return (
    <View style={styles.container}>
      <Header
        onCartPress={() => navigation.navigate('Cart')}
        onSearchPress={() => navigation.navigate('Catalogue')}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading fresh inventory...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* Trust & Delivery Banner */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTag}>
                <Text style={styles.bannerTagText}>⚡ DIRECT TO DOORSTEP</Text>
              </View>
              <Text style={styles.bannerTitle}>Fresh Vegetables & Greens</Text>
              <Text style={styles.bannerSub}>
                Handpicked from Mandi every morning for families of Shervani Legacy.
              </Text>
              <View style={styles.rulePillRow}>
                <View style={styles.rulePill}>
                  <Text style={styles.rulePillText}>Min. Order: ₹49</Text>
                </View>
                <View style={[styles.rulePill, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.rulePillText, { color: '#166534' }]}>FREE Delivery: ₹99+</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Active Offers Banner Carousel */}
          {offers.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Today's Fresh Offers (आज के ऑफ़र)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.offersRow}>
                {offers.map((offer) => (
                  <View key={offer.id} style={styles.offerCard}>
                    <Text style={styles.offerBadge}>
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}% OFF`
                        : `₹${offer.discountValue} OFF`}
                    </Text>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    {offer.description ? (
                      <Text style={styles.offerDesc} numberOfLines={2}>
                        {offer.description}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Category Filter Chips */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Categories (श्रेणियां)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === 'all' && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === 'all' && styles.categoryChipTextActive,
                  ]}
                >
                  All Vegetables ({products.length})
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.nameEn} ({cat.nameHi})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products Grid */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Fresh Inventory (ताज़ी सब्ज़ियां)</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Catalogue')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🥬</Text>
                <Text style={styles.emptyTitle}>No vegetables in this category</Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {filteredProducts.slice(0, 10).map((product) => (
                  <View key={product.id} style={styles.gridItem}>
                    <ProductCard
                      product={product}
                      onPress={() => navigation.navigate('Catalogue', { selectedProductId: product.id })}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Customer Testimonials Section */}
          {testimonials.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>What Customers Say</Text>
                  <Text style={styles.sectionSub}>Real reviews from verified residents</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testimonialRow}>
                {testimonials.map((review) => (
                  <View key={review.id} style={styles.testimonialCard}>
                    <View style={styles.testHeader}>
                      <StarRating rating={review.rating} size={14} />
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    </View>
                    {review.title ? (
                      <Text style={styles.testTitle} numberOfLines={1}>
                        {review.title}
                      </Text>
                    ) : null}
                    <Text style={styles.testComment} numberOfLines={3}>
                      "{review.comment}"
                    </Text>
                    <Text style={styles.testAuthor}>
                      — {review.customerName || 'Resident, Shervani Legacy'}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Bottom Cart Bar */}
      {totals.itemCount > 0 && (
        <View style={styles.floatingCartBar}>
          <View style={styles.cartBarInfo}>
            <Text style={styles.cartBarCount}>
              {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'} in Basket
            </Text>
            <Text style={styles.cartBarTotal}>{formatCurrency(totals.finalTotal)}</Text>
            {totals.isFreeDelivery ? (
              <Text style={styles.cartBarFree}>🎉 FREE Delivery</Text>
            ) : (
              <Text style={styles.cartBarShortfall}>
                Add {formatCurrency(totals.freeDeliveryShortfall)} for FREE delivery
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.cartBarBtn}
            onPress={() => navigation.navigate('Cart')}
          >
            <Text style={styles.cartBarBtnText}>View Basket →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  bannerCard: {
    margin: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    overflow: 'hidden',
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  bannerContent: {},
  bannerTag: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  bannerTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  bannerSub: {
    color: '#E2F3E7',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  rulePillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  rulePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rulePillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  offersRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  offerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: SPACING.md,
    marginRight: SPACING.md,
    width: 220,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offerBadge: {
    backgroundColor: '#D97706',
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  offerDesc: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  categoryChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  testimonialRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  testimonialCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    width: 240,
    marginRight: SPACING.md,
    ...SHADOWS.card,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: 'bold',
  },
  testTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  testComment: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  testAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 8,
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 20,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.modal,
  },
  cartBarInfo: {
    flex: 1,
  },
  cartBarCount: {
    color: '#E2F3E7',
    fontSize: 11,
    fontWeight: '600',
  },
  cartBarTotal: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  cartBarFree: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '700',
  },
  cartBarShortfall: {
    color: '#FEF08A',
    fontSize: 10,
    fontWeight: '600',
  },
  cartBarBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartBarBtnText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
});

