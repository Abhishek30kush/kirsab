import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { Order, User } from '../../../../../packages/shared-types/src/index';
import { formatCurrency, formatDate, getOrderStatusMeta } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminOrderDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign partner modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadOrderDetail = async () => {
    try {
      const [orderRes, partnersRes] = await Promise.allSettled([
        api.admin.getOrderById(orderId),
        api.admin.getPartners(),
      ]);

      if (orderRes.status === 'fulfilled' && orderRes.value.success) {
        setOrder(orderRes.value.order);
      }
      if (partnersRes.status === 'fulfilled' && partnersRes.value.success) {
        setPartners(partnersRes.value.partners || []);
      }
    } catch (e) {
      console.warn('Error loading order:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const handleUpdateStatus = async (nextStatus: string) => {
    try {
      const res = await api.admin.updateOrderStatus(orderId, nextStatus);
      if (res.success && res.order) {
        setOrder(res.order);
        Alert.alert('Status Updated', `Order status changed to '${nextStatus}'`);
      }
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update status');
    }
  };

  const handleAssignPartner = async (partnerId: string) => {
    try {
      setAssigning(true);
      const res = await api.admin.assignOrderDelivery(orderId, partnerId);
      if (res.success && res.order) {
        setOrder(res.order);
        setIsAssignModalOpen(false);
        Alert.alert('Assigned', 'Delivery partner assigned successfully');
      }
    } catch (e: any) {
      Alert.alert('Assignment Failed', e.message || 'Could not assign partner');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignPartner = async () => {
    Alert.alert('Confirm Unassign', 'Are you sure you want to remove the delivery partner?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unassign',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.admin.removeOrderDelivery(orderId);
            loadOrderDetail();
            Alert.alert('Success', 'Delivery partner removed from order');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not unassign partner');
          }
        },
      },
    ]);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.badgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
            {meta.labelEn}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Delivery Partner Assignment Section */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>🛵 Delivery Partner Assignment</Text>
            {order.deliveryPartner && (
              <TouchableOpacity onPress={handleUnassignPartner}>
                <Text style={styles.unassignText}>Remove Partner</Text>
              </TouchableOpacity>
            )}
          </View>

          {order.deliveryPartner ? (
            <View style={styles.assignedBox}>
              <View style={styles.partnerInfoRow}>
                <View style={styles.partnerAvatar}>
                  <Text style={styles.avatarText}>{order.deliveryPartner.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.partnerName}>{order.deliveryPartner.name}</Text>
                  <Text style={styles.partnerPhone}>📞 {order.deliveryPartner.phone}</Text>
                  {order.deliveryPartner.vehicleType && (
                    <Text style={styles.partnerVehicle}>
                      🚗 {order.deliveryPartner.vehicleType} {order.deliveryPartner.vehicleNumber || ''}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.reassignBtn}
                onPress={() => setIsAssignModalOpen(true)}
              >
                <Text style={styles.reassignBtnText}>Reassign Partner →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.unassignedBox}>
              <Text style={styles.unassignedText}>
                No delivery partner assigned yet for this order.
              </Text>
              <TouchableOpacity
                style={styles.assignBtn}
                onPress={() => setIsAssignModalOpen(true)}
              >
                <Text style={styles.assignBtnText}>+ Assign Delivery Partner</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Status Transition Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Order Status (स्थिति बदलें)</Text>
          <View style={styles.statusButtonsGrid}>
            {order.status === 'pending' && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: '#3730A3' }]}
                onPress={() => handleUpdateStatus('confirmed')}
              >
                <Text style={styles.actionBtnText}>Confirm Order ✓</Text>
              </TouchableOpacity>
            )}

            {order.status === 'confirmed' && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: '#5B21B6' }]}
                onPress={() => handleUpdateStatus('ready_for_dispatch')}
              >
                <Text style={styles.actionBtnText}>Ready for Dispatch 📦</Text>
              </TouchableOpacity>
            )}

            {['confirmed', 'ready_for_dispatch'].includes(order.status) && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: '#9D174D' }]}
                onPress={() => handleUpdateStatus('out_for_delivery')}
              >
                <Text style={styles.actionBtnText}>Out for Delivery 🛵</Text>
              </TouchableOpacity>
            )}

            {order.status === 'out_for_delivery' && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: '#166534' }]}
                onPress={() => handleUpdateStatus('delivered')}
              >
                <Text style={styles.actionBtnText}>Mark as Delivered 🎉</Text>
              </TouchableOpacity>
            )}

            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
                    { text: 'No' },
                    { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleUpdateStatus('cancelled') },
                  ]);
                }}
              >
                <Text style={styles.actionBtnText}>Cancel Order ✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Customer Information & Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <Text style={styles.detailLabel}>Name:</Text>
          <Text style={styles.detailValue}>{order.customerName}</Text>

          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{order.customerPhone}</Text>

          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={styles.detailValue}>{order.address}</Text>

          {order.landmark && (
            <>
              <Text style={styles.detailLabel}>Landmark:</Text>
              <Text style={styles.detailValue}>{order.landmark}</Text>
            </>
          )}

          <Text style={styles.detailLabel}>Slot:</Text>
          <Text style={styles.detailValue}>{order.deliverySlot}</Text>

          <View style={styles.custContactRow}>
            <TouchableOpacity
              style={styles.callCustBtn}
              onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
            >
              <Text style={styles.callCustText}>📞 Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waCustBtn}
              onPress={() => Linking.openURL(`https://wa.me/91${order.customerPhone}`)}
            >
              <Text style={styles.waCustText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({order.items?.length || 0})</Text>
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryVal}>{formatCurrency(order.deliveryFee)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>{formatCurrency(order.finalTotal)}</Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Assign Partner Modal */}
      <Modal visible={isAssignModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Partner</Text>
              <TouchableOpacity onPress={() => setIsAssignModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {partners.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>
                  No active delivery partners registered. Add one from Delivery Partners menu.
                </Text>
              ) : (
                partners.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.partnerOption}
                    onPress={() => handleAssignPartner(p.id)}
                    disabled={assigning}
                  >
                    <View style={styles.partnerAvatarSmall}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{p.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.partnerOptName}>{p.name}</Text>
                      <Text style={styles.partnerOptPhone}>📞 {p.phone} • {p.vehicleType || 'Bike'}</Text>
                    </View>
                    <Text style={styles.selectArrow}>Assign →</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  unassignText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  assignedBox: {
    backgroundColor: '#DCFCE7',
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
  },
  partnerPhone: {
    fontSize: 12,
    color: '#166534',
    marginTop: 1,
  },
  partnerVehicle: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
  },
  reassignBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  reassignBtnText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  unassignedBox: {
    backgroundColor: '#FEF2F2',
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  unassignedText: {
    color: '#991B1B',
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  assignBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  assignBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusButtonsGrid: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  statusActionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
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
  custContactRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  callCustBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  callCustText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
  waCustBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  waCustText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  partnerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  partnerAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerOptName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  partnerOptPhone: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  selectArrow: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
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

