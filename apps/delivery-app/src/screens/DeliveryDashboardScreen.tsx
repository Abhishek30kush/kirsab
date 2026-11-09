import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Order } from '../../../../../packages/shared-types/src/index';
import { formatCurrency, formatDate, getOrderStatusMeta } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useDeliveryAuth } from '../context/DeliveryAuthContext';
import { api } from '../services/api';

export const DeliveryDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { partner, isAvailable, toggleAvailability, logout } = useDeliveryAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await api.delivery.getOrders('active');
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (e) {
      console.warn('Error loading delivery orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.partnerName}>{partner?.name || 'Delivery Partner'}</Text>
          <Text style={styles.vehicleInfo}>
            🛵 {partner?.vehicleType || 'Bike'} {partner?.vehicleNumber ? `• ${partner.vehicleNumber}` : ''}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Online / Offline Availability Toggle Bar */}
      <View style={[styles.availabilityBar, isAvailable ? styles.barOnline : styles.barOffline]}>
        <View style={styles.availTextCol}>
          <Text style={styles.availStatusText}>
            {isAvailable ? '🟢 Online - Receiving Assignments' : '🔴 Offline - Not Available'}
          </Text>
          <Text style={styles.availSub}>
            {isAvailable ? 'You can receive new delivery orders' : 'Toggle switch to start taking orders'}
          </Text>
        </View>

        <Switch
          value={isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
          thumbColor={isAvailable ? COLORS.primary : '#9CA3AF'}
        />
      </View>

      {/* Assigned Active Orders Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Assigned Active Deliveries ({orders.length})</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🛵</Text>
          <Text style={styles.emptyTitle}>No Active Deliveries</Text>
          <Text style={styles.emptySub}>
            {isAvailable
              ? 'New orders assigned by the store manager will appear here.'
              : 'You are currently offline. Turn on your availability to receive orders.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          renderItem={({ item }) => {
            const meta = getOrderStatusMeta(item.status);

            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: meta.badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
                      {meta.labelEn}
                    </Text>
                  </View>
                </View>

                <Text style={styles.custName}>👤 {item.customerName}</Text>
                <Text style={styles.custPhone}>📞 {item.customerPhone}</Text>
                <Text style={styles.addressText} numberOfLines={2}>
                  📍 {item.address}
                </Text>

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.collectLabel}>Collect on Delivery (COD)</Text>
                    <Text style={styles.collectAmount}>{formatCurrency(item.finalTotal)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                  >
                    <Text style={styles.openBtnText}>Open Delivery →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
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
    backgroundColor: COLORS.primaryDark,
    paddingTop: 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#E2F3E7',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  availabilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  barOnline: {
    backgroundColor: '#DCFCE7',
  },
  barOffline: {
    backgroundColor: '#FEE2E2',
  },
  availTextCol: {
    flex: 1,
  },
  availStatusText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  availSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  list: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  custPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  collectLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  collectAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  openBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});

