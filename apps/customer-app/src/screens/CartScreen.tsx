import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';

export const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { items, totals, updateQuantity, removeFromCart, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🧺</Text>
        <Text style={styles.emptyTitle}>Your Basket is Empty</Text>
        <Text style={styles.emptySub}>
          आपकी टोकरी खाली है। शेरवानी लेगेसी के लिए ताज़ी, हरी व स्वच्छ सब्ज़ियाँ चुनें।
        </Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => navigation.navigate('Catalogue')}
        >
          <Text style={styles.browseBtnText}>Explore Vegetables (सब्ज़ियां देखें)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.headerTitle}>Shopping Basket</Text>
          <Text style={styles.headerSubtitle}>{totals.itemCount} items selected</Text>
        </View>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Minimum Order Value Alert */}
        {!totals.isMinOrderMet && (
          <View style={styles.minOrderAlert}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.alertTitle}>
                Minimum order value is ₹{totals.minOrderShortfall ? formatCurrency(49) : '₹49'}
              </Text>
              <Text style={styles.alertSub}>
                Add {formatCurrency(totals.minOrderShortfall)} more of vegetables to checkout (न्यूनतम ऑर्डर ₹49)
              </Text>
            </View>
          </View>
        )}

        {/* Free Delivery Status Banner */}
        <View style={[styles.freeDeliveryBanner, totals.isFreeDelivery && styles.freeDeliveryActive]}>
          <Text style={styles.freeDeliveryIcon}>{totals.isFreeDelivery ? '🎉' : '🚚'}</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            {totals.isFreeDelivery ? (
              <Text style={styles.freeDeliveryTitleActive}>
                Congratulations! You get FREE Delivery on this order.
              </Text>
            ) : (
              <Text style={styles.freeDeliveryTitle}>
                Add {formatCurrency(totals.freeDeliveryShortfall)} more for FREE Delivery (₹99+)
              </Text>
            )}
          </View>
        </View>

        {/* Cart Items List */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardHeading}>Selected Fresh Items</Text>
          {items.map(({ product, quantity }) => {
            const effectivePrice = product.hasActiveOffer && product.discountedPrice !== null && product.discountedPrice !== undefined
              ? product.discountedPrice
              : (product.price || 0);

            return (
              <View key={product.id} style={styles.cartItemRow}>
                <View style={styles.itemImageContainer}>
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.itemImage} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>{product.fallbackEmoji || '🥬'}</Text>
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemNameEn}>{product.nameEn}</Text>
                  <Text style={styles.itemNameHi}>{product.nameHi}</Text>
                  <Text style={styles.itemUnit}>{product.unit} • {formatCurrency(effectivePrice)}</Text>
                </View>

                <View style={styles.itemRightCol}>
                  <Text style={styles.lineTotal}>{formatCurrency(effectivePrice * quantity)}</Text>

                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(product.id, quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(product.id, quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bill Summary */}
        <View style={styles.billCard}>
          <Text style={styles.cardHeading}>Bill Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Vegetables Subtotal</Text>
            <Text style={styles.billValue}>{formatCurrency(totals.subtotal)}</Text>
          </View>

          {totals.discountTotal > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: COLORS.success }]}>Offers & Savings</Text>
              <Text style={[styles.billValue, { color: COLORS.success }]}>
                -{formatCurrency(totals.discountTotal)}
              </Text>
            </View>
          )}

          <View style={styles.billRow}>
            <View>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.deliverySubtext}>
                {totals.isFreeDelivery ? 'Orders ₹99+ qualify for FREE delivery' : 'Orders under ₹99: ₹10 fee'}
              </Text>
            </View>
            <Text
              style={[
                styles.billValue,
                totals.deliveryFee === 0 && { color: COLORS.success, fontWeight: 'bold' },
              ]}
            >
              {totals.deliveryFee === 0 ? 'FREE' : formatCurrency(totals.deliveryFee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total (कुल राशि)</Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.finalTotal)}</Text>
          </View>

          <Text style={styles.codNote}>
            💵 Cash on Delivery / UPI on Delivery available at your doorstep
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout Footer Bar */}
      <View style={styles.footerBar}>
        <View>
          <Text style={styles.footerTotalLabel}>Final Payable</Text>
          <Text style={styles.footerTotalValue}>{formatCurrency(totals.finalTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, !totals.canProceedToCheckout && styles.checkoutBtnDisabled]}
          onPress={() => navigation.navigate('Checkout')}
          disabled={!totals.canProceedToCheckout}
        >
          <Text style={styles.checkoutBtnText}>
            {totals.isMinOrderMet ? 'Proceed to Checkout →' : `Add ${formatCurrency(totals.minOrderShortfall)} More`}
          </Text>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  clearText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  minOrderAlert: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  alertSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  freeDeliveryBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 10,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  freeDeliveryActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  freeDeliveryIcon: {
    fontSize: 18,
  },
  freeDeliveryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  freeDeliveryTitleActive: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065F46',
  },
  itemsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemImageContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  itemNameEn: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemNameHi: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  itemUnit: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  itemRightCol: {
    alignItems: 'flex-end',
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F3E7',
    borderRadius: 6,
    overflow: 'hidden',
  },
  qtyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  qtyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  qtyVal: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  billCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  deliverySubtext: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  billValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  codNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  footerBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.modal,
  },
  footerTotalLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkoutBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  checkoutBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.background,
  },
  emptyIcon: {
    fontSize: 54,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: SPACING.lg,
  },
  browseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

