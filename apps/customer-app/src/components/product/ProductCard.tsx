import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Product } from '../../../../../packages/shared-types/src/index';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { StarRating } from '../common/StarRating';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const { getItemQuantity, addToCart, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);

  const price = product.hasActiveOffer && product.discountedPrice !== null && product.discountedPrice !== undefined
    ? product.discountedPrice
    : product.price;

  const hasDiscount = product.hasActiveOffer && product.originalPrice && product.originalPrice > (price || 0);

  return (
    <TouchableOpacity
      style={[styles.card, !product.inStock && styles.outOfStockCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.emojiContainer}>
            <Text style={styles.emojiText}>{product.fallbackEmoji || '🥬'}</Text>
          </View>
        )}

        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>OFFER</Text>
          </View>
        )}

        {!product.inStock && (
          <View style={styles.stockOverlay}>
            <Text style={styles.stockOverlayText}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.nameEn} numberOfLines={1}>
            {product.nameEn}
          </Text>
          <Text style={styles.nameHi} numberOfLines={1}>
            {product.nameHi}
          </Text>
        </View>

        <Text style={styles.unitText}>{product.unit}</Text>

        {product.averageRating ? (
          <View style={styles.ratingRow}>
            <StarRating rating={product.averageRating} size={12} />
            <Text style={styles.ratingText}>{product.averageRating}</Text>
          </View>
        ) : (
          <View style={{ height: 16 }} />
        )}

        <View style={styles.footerRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{price !== null ? formatCurrency(price) : 'N/A'}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatCurrency(product.originalPrice!)}
              </Text>
            )}
          </View>

          {product.inStock ? (
            quantity > 0 ? (
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(product.id, quantity - 1)}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(product.id, quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(product, 1)}
              >
                <Text style={styles.addBtnText}>ADD +</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.disabledBtn}>
              <Text style={styles.disabledBtnText}>Unavailable</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  outOfStockCard: {
    opacity: 0.7,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 48,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  stockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockOverlayText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  infoContainer: {
    padding: SPACING.md,
  },
  titleRow: {
    marginBottom: 2,
  },
  nameEn: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  nameHi: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  unitText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D97706',
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  priceContainer: {
    flexDirection: 'column',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F3E7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  qtyValue: {
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  disabledBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disabledBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
});

