import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Category, Product, Review } from '../../../../../packages/shared-types/src/index';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { ProductCard } from '../components/product/ProductCard';
import { StarRating } from '../components/common/StarRating';

export const CatalogueScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Product detail modal state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const { getItemQuantity, updateQuantity, addToCart } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.allSettled([
        api.products.getPublic(),
        api.products.getCategories(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.success) {
        setProducts(prodRes.value.data || []);
      }
      if (catRes.status === 'fulfilled' && catRes.value.success) {
        setCategories(catRes.value.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const openProductDetail = async (product: Product) => {
    setDetailProduct(product);
    try {
      setLoadingReviews(true);
      const res = await api.products.getReviews(product.id);
      if (res.success) {
        setProductReviews(res.reviews || []);
      }
    } catch {
      setProductReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesStock = !inStockOnly || p.inStock;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.nameEn.toLowerCase().includes(query) ||
      p.nameHi.toLowerCase().includes(query) ||
      p.unit.toLowerCase().includes(query);

    return matchesCategory && matchesStock && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vegetables Catalogue</Text>
        <Text style={styles.headerSubtitle}>ताज़ी हरी सब्ज़ियों की पूरी सूची</Text>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search potato, bhindi, tomato, palak..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.categoryFilter,
                selectedCategory === 'all' && styles.categoryFilterActive,
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  selectedCategory === 'all' && styles.categoryFilterTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.categoryFilter,
                  selectedCategory === c.id && styles.categoryFilterActive,
                ]}
                onPress={() => setSelectedCategory(c.id)}
              >
                <Text
                  style={[
                    styles.categoryFilterText,
                    selectedCategory === c.id && styles.categoryFilterTextActive,
                  ]}
                >
                  {c.nameEn}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.stockToggle, inStockOnly && styles.stockToggleActive]}
            onPress={() => setInStockOnly(!inStockOnly)}
          >
            <Text style={[styles.stockToggleText, inStockOnly && styles.stockToggleTextActive]}>
              In Stock Only
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🥬</Text>
          <Text style={styles.emptyTitle}>No vegetables match your search</Text>
          <Text style={styles.emptySub}>Try searching with a different name</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={{ width: '48%' }}>
              <ProductCard product={item} onPress={() => openProductDetail(item)} />
            </View>
          )}
        />
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <Modal visible={!!detailProduct} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{detailProduct.nameEn}</Text>
                <TouchableOpacity onPress={() => setDetailProduct(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalImageContainer}>
                  {detailProduct.image ? (
                    <Image source={{ uri: detailProduct.image }} style={styles.modalImage} />
                  ) : (
                    <Text style={{ fontSize: 60 }}>{detailProduct.fallbackEmoji || '🥬'}</Text>
                  )}
                </View>

                <Text style={styles.modalNameHi}>{detailProduct.nameHi}</Text>
                <Text style={styles.modalUnit}>{detailProduct.unit}</Text>
                <Text style={styles.modalPrice}>
                  {formatCurrency(detailProduct.discountedPrice || detailProduct.price || 0)}
                </Text>

                {detailProduct.description ? (
                  <View style={styles.descContainer}>
                    <Text style={styles.descHeading}>Product Description</Text>
                    <Text style={styles.descText}>{detailProduct.description}</Text>
                  </View>
                ) : null}

                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                  <View style={styles.reviewHeaderRow}>
                    <Text style={styles.reviewHeading}>Customer Reviews (समीक्षाएं)</Text>
                    {detailProduct.averageRating ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <StarRating rating={detailProduct.averageRating} size={14} />
                        <Text style={styles.avgText}>{detailProduct.averageRating}/5</Text>
                      </View>
                    ) : null}
                  </View>

                  {loadingReviews ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : productReviews.length === 0 ? (
                    <Text style={styles.noReviewsText}>
                      No reviews yet for this product. Be the first to share your experience!
                    </Text>
                  ) : (
                    productReviews.map((r) => (
                      <View key={r.id} style={styles.reviewItem}>
                        <View style={styles.reviewTop}>
                          <StarRating rating={r.rating} size={13} />
                          <Text style={styles.reviewUser}>{r.customerName || 'Verified Resident'}</Text>
                        </View>
                        {r.title ? <Text style={styles.reviewTitleText}>{r.title}</Text> : null}
                        <Text style={styles.reviewComment}>{r.comment}</Text>
                        {r.adminReply && (
                          <View style={styles.adminReplyBox}>
                            <Text style={styles.adminReplyLabel}>Official KIRSAB Response:</Text>
                            <Text style={styles.adminReplyText}>{r.adminReply}</Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalAddBtn}
                  onPress={() => {
                    addToCart(detailProduct, 1);
                    setDetailProduct(null);
                  }}
                >
                  <Text style={styles.modalAddBtnText}>Add to Basket ({formatCurrency(detailProduct.price || 0)})</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  clearSearch: {
    fontSize: 14,
    color: COLORS.textMuted,
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  categoryFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 6,
  },
  categoryFilterActive: {
    backgroundColor: COLORS.primary,
  },
  categoryFilterText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryFilterTextActive: {
    color: '#FFF',
  },
  stockToggle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stockToggleActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  stockToggleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  stockToggleTextActive: {
    color: '#166534',
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  modalImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalNameHi: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalUnit: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  descContainer: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
  },
  descHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  reviewsSection: {
    marginTop: SPACING.lg,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  reviewHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  avgText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#D97706',
    marginLeft: 4,
  },
  noReviewsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  reviewItem: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUser: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reviewTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
  },
  adminReplyBox: {
    marginTop: 6,
    backgroundColor: '#E2F3E7',
    padding: 8,
    borderRadius: 6,
  },
  adminReplyLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534',
  },
  adminReplyText: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  modalAddBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalAddBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

