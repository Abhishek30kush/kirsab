import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useAdminAuth } from '../context/AdminAuthContext';
import { api } from '../services/api';

export const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { admin, logout } = useAdminAuth();
  const [stats, setStats] = useState<any>(null);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const [statsRes, liveRes] = await Promise.allSettled([
        api.admin.getStats(),
        api.admin.getLiveOrders(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value.stats || statsRes.value);
      }
      if (liveRes.status === 'fulfilled' && liveRes.value) {
        setLiveOrders(liveRes.value.liveOrders || []);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>KIRSAB Admin</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {admin?.name || 'Store Manager'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* Key Metrics Cards */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#E0E7FF' }]}>
              <Text style={styles.metricIcon}>💰</Text>
              <Text style={styles.metricVal}>
                {formatCurrency(stats?.todayRevenue || stats?.revenueAggregate || 0)}
              </Text>
              <Text style={styles.metricLabel}>Today's Revenue</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.metricIcon}>📦</Text>
              <Text style={styles.metricVal}>{stats?.todayOrdersCount || stats?.totalOrders || 0}</Text>
              <Text style={styles.metricLabel}>Today's Orders</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.metricIcon}>⏳</Text>
              <Text style={styles.metricVal}>{stats?.pendingOrders || 0}</Text>
              <Text style={styles.metricLabel}>Pending Action</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#FCE7F3' }]}>
              <Text style={styles.metricIcon}>🛵</Text>
              <Text style={styles.metricVal}>{stats?.outForDeliveryOrders || 0}</Text>
              <Text style={styles.metricLabel}>Out for Delivery</Text>
            </View>
          </View>

          {/* Quick Management Shortcuts */}
          <Text style={styles.sectionHeading}>Store Modules</Text>
          <View style={styles.shortcutsGrid}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Orders')}
            >
              <Text style={styles.shortcutIcon}>📋</Text>
              <Text style={styles.shortcutTitle}>Orders</Text>
              <Text style={styles.shortcutDesc}>Dispatch & status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Products')}
            >
              <Text style={styles.shortcutIcon}>🥬</Text>
              <Text style={styles.shortcutTitle}>Products</Text>
              <Text style={styles.shortcutDesc}>Stock & prices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Pricing')}
            >
              <Text style={styles.shortcutIcon}>🧮</Text>
              <Text style={styles.shortcutTitle}>Profit Calc</Text>
              <Text style={styles.shortcutDesc}>Mandi margins</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('DeliveryPartners')}
            >
              <Text style={styles.shortcutIcon}>🛵</Text>
              <Text style={styles.shortcutTitle}>Partners</Text>
              <Text style={styles.shortcutDesc}>Assignments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Offers')}
            >
              <Text style={styles.shortcutIcon}>🏷️</Text>
              <Text style={styles.shortcutTitle}>Offers</Text>
              <Text style={styles.shortcutDesc}>Discounts & sales</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Reviews')}
            >
              <Text style={styles.shortcutIcon}>⭐</Text>
              <Text style={styles.shortcutTitle}>Reviews</Text>
              <Text style={styles.shortcutDesc}>Moderation & reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate('Customers')}
            >
              <Text style={styles.shortcutIcon}>👥</Text>
              <Text style={styles.shortcutTitle}>Customers</Text>
              <Text style={styles.shortcutDesc}>Registered list</Text>
            </TouchableOpacity>
          </View>

          {/* Live Active Orders */}
          <Text style={styles.sectionHeading}>Live Active Orders ({liveOrders.length})</Text>
          {liveOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No live active orders at the moment.</Text>
            </View>
          ) : (
            liveOrders.slice(0, 5).map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.liveOrderCard}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
              >
                <View style={styles.liveOrderHeader}>
                  <Text style={styles.liveOrderNum}>#{order.orderNumber}</Text>
                  <Text style={styles.liveOrderTotal}>{formatCurrency(order.finalTotal)}</Text>
                </View>
                <Text style={styles.liveOrderCust}>{order.customerName} • {order.customerPhone}</Text>
                <Text style={styles.liveOrderAddr} numberOfLines={1}>{order.address}</Text>
                <View style={styles.liveOrderFooter}>
                  <Text style={styles.liveOrderStatus}>Status: {order.status}</Text>
                  <Text style={styles.liveOrderPartner}>
                    {order.deliveryPartner ? `🛵 ${order.deliveryPartner.name}` : '⚠️ Unassigned'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
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
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#E2F3E7',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  metricCard: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: 14,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  metricIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  shortcutBtn: {
    backgroundColor: COLORS.surface,
    width: '31%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  shortcutIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shortcutDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  liveOrderCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  liveOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveOrderNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  liveOrderTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  liveOrderCust: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  liveOrderAddr: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  liveOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  liveOrderStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  liveOrderPartner: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

