import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Order } from '../../../../../packages/shared-types/src/index';
import {
  formatCurrency,
  formatDate,
  generatePartnerToCustomerWhatsAppUrl,
  getOrderStatusMeta,
} from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useDeliveryAuth } from '../context/DeliveryAuthContext';
import { api } from '../services/api';

export const DeliveryOrderDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { orderId } = route.params;
  const { partner } = useDeliveryAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Delivery PIN Verification Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  const loadOrderDetail = async () => {
    try {
      const res = await api.delivery.getOrderById(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
      }
    } catch (e) {
      console.warn('Error fetching delivery order:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const handleAccept = async () => {
    try {
      const res = await api.delivery.acceptOrder(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
        Alert.alert('Accepted', 'You have accepted this order assignment.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not accept order');
    }
  };

  const handlePickup = async () => {
    try {
      const res = await api.delivery.pickupOrder(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
        Alert.alert('Picked Up', 'Order items marked as picked up from the hub.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not mark picked up');
    }
  };

  const handleOutForDelivery = async () => {
    try {
      const res = await api.delivery.markOutForDelivery(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
        Alert.alert('Out for Delivery', 'Order is now marked as out for delivery.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update status');
    }
  };

  const handleVerifyPinAndDeliver = async () => {
    const cleanPin = pinInput.replace(/[^0-9]/g, '');
    if (cleanPin.length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter the 6-digit PIN given by the customer (6 अंकों का पिन दर्ज करें)');
      return;
    }

    try {
      setVerifyingPin(true);
      const res = await api.delivery.verifyPinAndDeliver(orderId, cleanPin);

      if (res.success) {
        setIsPinModalOpen(false);
        setPinInput('');
        Alert.alert(
          '🎉 Delivery Completed Successfully!',
          `Order #${res.order.orderNumber} is confirmed as delivered. COD Collected: ${formatCurrency(res.order.finalTotal)}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Verification Failed', res.message || 'Incorrect PIN entered.');
      }
    } catch (e: any) {
      Alert.alert('Verification Error', e.message || 'Incorrect PIN');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleOpenNavigation = () => {
    if (!order?.address) return;
    const query = encodeURIComponent(`${order.address}, Shervani Legacy, Prayagraj`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps navigation');
    });
  };

  const handleCallCustomer = () => {
    if (!order?.customerPhone) return;
    Linking.openURL(`tel:${order.customerPhone}`).catch(() => {
      Alert.alert('Error', 'Could not initiate phone call');
    });
  };

  const handleWhatsAppCustomer = () => {
    if (!order?.customerPhone || !partner) return;
    const url = generatePartnerToCustomerWhatsAppUrl(
      order.customerPhone,
      order.orderNumber,
      partner.name
    );
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp');
    });
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
        <Text style={styles.errorText}>Order not found or unassigned</Text>
      </View>
    );
  }

  const meta = getOrderStatusMeta(order.status);
  const isDelivered = order.status === 'delivered';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.headerTitle}>Delivery #{order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.badgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
            {meta.labelEn}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Customer Address Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Customer & Delivery Location</Text>

          <Text style={styles.custName}>{order.customerName}</Text>
          <Text style={styles.custPhone}>📞 {order.customerPhone}</Text>
          <Text style={styles.addressText}>{order.address}</Text>

          {order.landmark ? (
            <Text style={styles.landmarkText}>Landmark: {order.landmark}</Text>
          ) : null}

          {order.instructions ? (
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsLabel}>Delivery Instructions:</Text>
              <Text style={styles.instructionsText}>{order.instructions}</Text>
            </View>
          ) : null}

          {/* Quick Contact & Navigation Buttons */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionBtnCall} onPress={handleCallCustomer}>
              <Text style={styles.actionBtnTextWhite}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnWA} onPress={handleWhatsAppCustomer}>
              <Text style={styles.actionBtnTextWhite}>💬 WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnNav} onPress={handleOpenNavigation}>
              <Text style={styles.actionBtnTextWhite}>🗺️ Maps</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Amount Card */}
        <View style={styles.collectCard}>
          <Text style={styles.collectLabel}>Cash to Collect from Customer (COD)</Text>
          <Text style={styles.collectAmount}>{formatCurrency(order.finalTotal)}</Text>
          <Text style={styles.collectSub}>
            Payment method: {order.paymentMethod.toUpperCase()} • Check accurate weight before collection
          </Text>
        </View>

        {/* Workflow Action Steps */}
        {!isDelivered && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Workflow Actions</Text>

            {/* Step 1: Accept */}
            {!order.acceptedAt && (
              <TouchableOpacity style={styles.stepBtnAccept} onPress={handleAccept}>
                <Text style={styles.stepBtnText}>1. Accept Assignment (स्वीकार करें) ✓</Text>
              </TouchableOpacity>
            )}

            {/* Step 2: Pick Up */}
            {order.acceptedAt && !order.pickedUpAt && (
              <TouchableOpacity style={styles.stepBtnPickup} onPress={handlePickup}>
                <Text style={styles.stepBtnText}>2. Mark Items Picked Up from Hub 📦</Text>
              </TouchableOpacity>
            )}

            {/* Step 3: Out for Delivery */}
            {order.pickedUpAt && order.status !== 'out_for_delivery' && (
              <TouchableOpacity style={styles.stepBtnOut} onPress={handleOutForDelivery}>
                <Text style={styles.stepBtnText}>3. Start Delivery (रास्ते में निकलें) 🛵</Text>
              </TouchableOpacity>
            )}

            {/* Step 4: Complete Delivery with PIN */}
            {order.status === 'out_for_delivery' && (
              <TouchableOpacity
                style={styles.stepBtnDeliver}
                onPress={() => setIsPinModalOpen(true)}
              >
                <Text style={styles.stepBtnText}>
                  4. Complete Delivery & Verify PIN (डिलीवरी पूरी करें) 🔐
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isDelivered && (
          <View style={styles.deliveredSuccessCard}>
            <Text style={styles.deliveredSuccessTitle}>🎉 Order Delivered Successfully!</Text>
            <Text style={styles.deliveredSuccessSub}>
              Delivery timestamp: {formatDate(order.deliveredAt || order.updatedAt)}
            </Text>
          </View>
        )}

        {/* Order Items Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items in this Package ({order.items?.length || 0})</Text>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productNameEn || item.productNameHi}</Text>
                <Text style={styles.itemMeta}>Qty: {item.quantity} × {item.unit}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* 6-Digit Secure PIN Verification Modal */}
      <Modal visible={isPinModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Customer's Delivery PIN</Text>
              <TouchableOpacity onPress={() => setIsPinModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.pinInstructions}>
              Ask the customer for their 6-digit Secure Delivery PIN shown in their KIRSAB app.
            </Text>

            <TextInput
              style={styles.pinInput}
              placeholder="0 0 0 0 0 0"
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.verifyBtn, verifyingPin && { opacity: 0.6 }]}
              onPress={handleVerifyPinAndDeliver}
              disabled={verifyingPin}
            >
              {verifyingPin ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify PIN & Complete Delivery</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerSubtitle: {
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
    marginBottom: SPACING.sm,
  },
  custName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  custPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 4,
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  instructionsBox: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginTop: SPACING.sm,
  },
  instructionsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400E',
  },
  instructionsText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionBtnCall: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnWA: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnNav: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnTextWhite: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  collectCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
  },
  collectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  collectAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#14532D',
    marginVertical: 4,
  },
  collectSub: {
    fontSize: 10,
    color: '#15803D',
    textAlign: 'center',
  },
  stepBtnAccept: {
    backgroundColor: '#3730A3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepBtnPickup: {
    backgroundColor: '#5B21B6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepBtnOut: {
    backgroundColor: '#9D174D',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepBtnDeliver: {
    backgroundColor: '#166534',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  stepBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deliveredSuccessCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  deliveredSuccessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
  },
  deliveredSuccessSub: {
    fontSize: 11,
    color: '#14532D',
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeBtn: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  pinInstructions: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  pinInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 10,
    color: COLORS.primaryDark,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.lg,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
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

