import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Order, Product } from '../../../../../packages/shared-types/src/index';
import { formatCurrency, formatDate, getOrderStatusMeta } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { DeliveryPartnerCard } from '../components/order/DeliveryPartnerCard';
import { ReviewFormModal } from '../components/reviews/ReviewFormModal';

export const OrderDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { orderId } = route.params;
  const { reorder } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const loadOrderDetail = async () => {
    try {
      const [orderRes, partnerRes, prodRes] = await Promise.allSettled([
        api.customer.getOrderById(orderId),
        api.customer.getDeliveryPartner(orderId),
        api.products.getPublic(),
      ]);

      if (orderRes.status === 'fulfilled' && orderRes.value.success) {
        let orderData = orderRes.value.order;
        if (partnerRes.status === 'fulfilled' && partnerRes.value.success) {
          orderData = {
            ...orderData,
            deliveryPartner: partnerRes.value.deliveryPartner || null,
          };
        }
        setOrder(orderData);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value.success) {
        setAllProducts(prodRes.value.data || []);
      }
    } catch (e) {
      console.warn('Error loading order detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const handleReorder = () => {
    if (!order?.items || order.items.length === 0) return;
    reorder(order.items, allProducts);
    Alert.alert(
      'Items Added to Basket!',
      'Your previous items have been re-added to your shopping basket.',
      [
        {
          text: 'Go to Basket',
          onPress: () => navigation.navigate('Cart'),
        },
        { text: 'OK' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  const meta = getOrderStatusMeta(order.status);
  const isDelivered = order.status === 'delivered';

  const TIMELINE_STEPS = [
    { key: 'placed', label: 'Order Placed', step: 1 },
    { key: 'confirmed', label: 'Confirmed', step: 2 },
    { key: 'preparing', label: 'Packed & Ready', step: 3 },
    { key: 'out_for_delivery', label: 'Out for Delivery', step: 5 },
    { key: 'delivered', label: 'Delivered', step: 6 },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
          <Text style={styles.headerDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.badgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
            {meta.labelEn}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Tracking (लाइव स्थिति)</Text>
          <View style={styles.timelineRow}>
            {TIMELINE_STEPS.map((step, idx) => {
              const isPassed = meta.stepIndex >= step.step && meta.stepIndex > 0;
              const isCurrent = meta.stepIndex === step.step;

              return (
                <View key={step.key} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.timelineCircle,
                      isPassed && styles.timelineCirclePassed,
                      isCurrent && styles.timelineCircleCurrent,
                    ]}
                  >
                    <Text style={styles.stepNumText}>{isPassed ? '✓' : idx + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Compulsory Delivery Partner Card */}
        <DeliveryPartnerCard
          partner={order.deliveryPartner}
          orderNumber={order.orderNumber}
          customerName={order.customerName}
          address={order.address}
          status={order.status}
          deliveryPin={order.deliveryPin}
        />

        {/* Review Action for Delivered Orders */}
        {isDelivered && (
          <View style={styles.reviewPromptCard}>
            <Text style={styles.reviewPromptTitle}>How was your shopping experience?</Text>
            <Text style={styles.reviewPromptSub}>
              Share your feedback on vegetable freshness, packaging and delivery to help other residents.
            </Text>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => setReviewModalVisible(true)}
            >
              <Text style={styles.reviewBtnText}>★ Share Your Experience (समीक्षा लिखें)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Items List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ordered Vegetables ({order.items?.length || 0})</Text>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productNameEn || item.productNameHi}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × {item.unit} ({formatCurrency(item.unitPrice)})
                </Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.discountTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Discount</Text>
              <Text style={[styles.summaryVal, { color: COLORS.success }]}>
                -{formatCurrency(order.discountTotal)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryVal}>
              {order.deliveryFee === 0 ? 'FREE' : formatCurrency(order.deliveryFee)}
            </Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>{formatCurrency(order.finalTotal)}</Text>
          </View>
        </View>

        {/* Delivery Address & Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Details</Text>
          <Text style={styles.detailLabel}>Recipient Name:</Text>
          <Text style={styles.detailValue}>{order.customerName}</Text>

          <Text style={styles.detailLabel}>Mobile Number:</Text>
          <Text style={styles.detailValue}>{order.customerPhone}</Text>

          <Text style={styles.detailLabel}>Delivery Address:</Text>
          <Text style={styles.detailValue}>{order.address}</Text>

          {order.landmark && (
            <>
              <Text style={styles.detailLabel}>Landmark:</Text>
              <Text style={styles.detailValue}>{order.landmark}</Text>
            </>
          )}

          <Text style={styles.detailLabel}>Delivery Slot:</Text>
          <Text style={styles.detailValue}>
            {order.deliverySlot === 'morning' ? 'Morning (07:00 AM - 10:00 AM)' : 'Evening (05:00 PM - 08:00 PM)'}
          </Text>

          <Text style={styles.detailLabel}>Payment Method:</Text>
          <Text style={styles.detailValue}>Cash / UPI on Delivery</Text>
        </View>

        {/* Repeat Order Button */}
        <TouchableOpacity style={styles.reorderBtn} onPress={handleReorder}>
          <Text style={styles.reorderBtnText}>🔄 Repeat This Order (दोबारा ऑर्डर करें)</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Review Submission Modal */}
      {order && (
        <ReviewFormModal
          visible={reviewModalVisible}
          orderId={order.id}
          orderNumber={order.orderNumber}
          onClose={() => setReviewModalVisible(false)}
          onSuccess={() => {
            loadOrderDetail();
          }}
        />
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
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    width: '18%',
  },
  timelineCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timelineCirclePassed: {
    backgroundColor: COLORS.primary,
  },
  timelineCircleCurrent: {
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  stepNumText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: COLORS.primaryDark,
    fontWeight: 'bold',
  },
  reviewPromptCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reviewPromptTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400E',
  },
  reviewPromptSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  reviewBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  reviewBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 1,
  },
  reorderBtn: {
    backgroundColor: '#E2F3E7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  reorderBtnText: {
    color: COLORS.primaryDark,
    fontWeight: 'bold',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
  },
});

