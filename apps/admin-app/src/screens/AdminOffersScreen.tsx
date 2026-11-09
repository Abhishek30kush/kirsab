import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Offer } from '../../../../../packages/shared-types/src/index';
import { formatDate } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminOffersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Add offer modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOffers = async () => {
    try {
      const res = await api.admin.getAllOffers();
      if (res.success && res.offers) {
        setOffers(res.offers);
      }
    } catch (e) {
      console.warn('Error loading offers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleToggleStatus = async (offer: Offer) => {
    try {
      const res = await api.admin.toggleOfferStatus(offer.id);
      if (res.success && res.offer) {
        setOffers((prev) =>
          prev.map((o) => (o.id === offer.id ? { ...o, isActive: res.offer.isActive } : o))
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not toggle offer status');
    }
  };

  const handleCreateOffer = async () => {
    if (!title.trim() || !discountValue) {
      Alert.alert('Required', 'Please fill offer title and discount value');
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(now.getDate() + 30);

      const res = await api.admin.createOffer({
        title: title.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: parseFloat(discountValue),
        startDate: now.toISOString(),
        endDate: nextMonth.toISOString(),
        isActive: true,
      });

      if (res.success) {
        Alert.alert('Success', 'Offer created successfully');
        setIsAddModalOpen(false);
        setTitle('');
        setDescription('');
        setDiscountValue('');
        loadOffers();
      }
    } catch (e: any) {
      Alert.alert('Creation Failed', e.message || 'Could not create offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offers & Discounts</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addBtnText}>+ New Offer</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : offers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🏷️</Text>
          <Text style={styles.emptyTitle}>No promotional offers active</Text>
          <TouchableOpacity style={styles.addBtnLarge} onPress={() => setIsAddModalOpen(true)}>
            <Text style={styles.addBtnText}>+ Create First Offer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.offerCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerBadge}>
                    {item.discountType === 'percentage'
                      ? `${item.discountValue}% OFF`
                      : `₹${item.discountValue} OFF`}
                  </Text>
                  <Text style={styles.offerTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.offerDesc}>{item.description}</Text>
                  ) : null}
                </View>

                <View style={styles.switchCol}>
                  <Text style={[styles.statusText, !item.isActive && { color: COLORS.danger }]}>
                    {item.isActive ? 'Active' : 'Disabled'}
                  </Text>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleStatus(item)}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={item.isActive ? COLORS.primary : '#9CA3AF'}
                  />
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.usageText}>Used: {item.usageCount || 0} times</Text>
                <Text style={styles.dateText}>Expires: {formatDate(item.endDate)}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Offer Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Promotional Offer</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.label}>Offer Title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Weekend Fresh Greens Sale" value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. Extra 10% off on all green vegetables" value={description} onChangeText={setDescription} />

              <Text style={styles.label}>Discount Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, discountType === 'percentage' && styles.typeBtnActive]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text style={[styles.typeText, discountType === 'percentage' && styles.typeTextActive]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, discountType === 'fixed' && styles.typeBtnActive]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text style={[styles.typeText, discountType === 'fixed' && styles.typeTextActive]}>
                    Fixed Amount (₹)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Discount Value *</Text>
              <TextInput
                style={styles.input}
                placeholder={discountType === 'percentage' ? 'e.g. 15 for 15%' : 'e.g. 10 for ₹10'}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.btnDisabled]}
                onPress={handleCreateOffer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Publish Offer</Text>
                )}
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnLarge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: SPACING.lg,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    padding: SPACING.lg,
  },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerBadge: {
    backgroundColor: '#D97706',
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  offerDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  switchCol: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  usageText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginTop: 8,
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: '#FFF',
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFF',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

