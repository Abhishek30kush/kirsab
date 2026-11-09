import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Order } from '../../../../../packages/shared-types/src/index';
import { formatCurrency, formatDate, getOrderStatusMeta } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminOrdersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.admin.getOrders(params);
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (e) {
      console.warn('Error loading admin orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'ready_for_dispatch', label: 'Ready' },
    { key: 'out_for_delivery', label: 'Out' },
    { key: 'delivered', label: 'Delivered' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Management</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order #, phone, or name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadOrders}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={loadOrders}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.tabsRow}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, statusFilter === tab.key && styles.tabActive]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Text style={[styles.tabText, statusFilter === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No orders found</Text>
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
                  <View>
                    <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: meta.badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
                      {meta.labelEn}
                    </Text>
                  </View>
                </View>

                <View style={styles.custRow}>
                  <Text style={styles.custName}>👤 {item.customerName}</Text>
                  <Text style={styles.custPhone}>📞 {item.customerPhone}</Text>
                </View>
                <Text style={styles.addressText} numberOfLines={1}>📍 {item.address}</Text>

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.totalText}>{formatCurrency(item.finalTotal)}</Text>
                    <Text style={styles.slotText}>Slot: {item.deliverySlot}</Text>
                  </View>

                  <View style={styles.partnerCol}>
                    {item.deliveryPartner ? (
                      <Text style={styles.assignedPartner}>🛵 {item.deliveryPartner.name}</Text>
                    ) : (
                      <Text style={styles.unassignedPartner}>⚠️ Unassigned</Text>
                    )}
                  </View>
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
    backgroundColor: COLORS.surface,
    paddingTop: 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
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
  searchRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: COLORS.background,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginLeft: 6,
  },
  searchBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  list: {
    padding: SPACING.lg,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  custRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  custName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  custPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  slotText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  partnerCol: {},
  assignedPartner: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  unassignedPartner: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginTop: 8,
  },
});

