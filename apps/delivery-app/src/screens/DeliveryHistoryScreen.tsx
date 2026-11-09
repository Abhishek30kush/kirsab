import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Order } from '../../../../../packages/shared-types/src/index';
import { formatCurrency, formatDate } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const DeliveryHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await api.delivery.getOrders('delivered');
      if (res.success && res.orders) {
        setCompletedOrders(res.orders);
      }
    } catch (e) {
      console.warn('Error fetching history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <Text style={styles.headerSubtitle}>
          {completedOrders.length} completed orders delivered successfully
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : completedOrders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyTitle}>No Completed Deliveries Yet</Text>
          <Text style={styles.emptySub}>
            Delivered orders confirmed with secure customer PINs will be recorded here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={completedOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                <View style={styles.deliveredBadge}>
                  <Text style={styles.deliveredText}>DELIVERED ✓</Text>
                </View>
              </View>

              <Text style={styles.custName}>👤 {item.customerName}</Text>
              <Text style={styles.addressText} numberOfLines={1}>📍 {item.address}</Text>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.dateText}>{formatDate(item.deliveredAt || item.updatedAt)}</Text>
                  <Text style={styles.slotText}>Slot: {item.deliverySlot}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountLabel}>Collected</Text>
                  <Text style={styles.amountVal}>{formatCurrency(item.finalTotal)}</Text>
                </View>
              </View>
            </View>
          )}
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
    marginTop: 2,
  },
  list: {
    padding: SPACING.lg,
  },
  card: {
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
  deliveredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deliveredText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: 'bold',
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
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
  dateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  slotText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  amountLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  amountVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primaryDark,
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

