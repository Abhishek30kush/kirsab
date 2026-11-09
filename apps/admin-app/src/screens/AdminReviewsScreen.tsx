import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Review } from '../../../../../packages/shared-types/src/index';
import { formatDate } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminReviewsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Reply modal
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadReviews = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.admin.getReviews(params);
      if (res.success && res.reviews) {
        setReviews(res.reviews);
      }
    } catch (e) {
      console.warn('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const handleUpdateStatus = async (reviewId: string, status: string) => {
    try {
      const res = await api.admin.updateReviewStatus(reviewId, status);
      if (res.success && res.review) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status: res.review.status } : r))
        );
        Alert.alert('Status Updated', `Review marked as ${status}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update review status');
    }
  };

  const handleToggleFeature = async (reviewId: string) => {
    try {
      const res = await api.admin.toggleReviewFeature(reviewId);
      if (res.success && res.review) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, isFeatured: res.review.isFeatured } : r))
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not toggle featured');
    }
  };

  const handleSendReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      const res = await api.admin.replyToReview(selectedReview.id, replyText.trim());
      if (res.success && res.review) {
        setReviews((prev) =>
          prev.map((r) => (r.id === selectedReview.id ? { ...r, adminReply: res.review.adminReply } : r))
        );
        Alert.alert('Reply Published', 'Official KIRSAB response posted successfully.');
        setSelectedReview(null);
        setReplyText('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reviews & Testimonials</Text>
        </View>

        {/* Status Tabs */}
        <View style={styles.tabsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, statusFilter === tab && styles.tabActive]}
                onPress={() => setStatusFilter(tab)}
              >
                <Text style={[styles.tabText, statusFilter === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>No reviews in this status</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.starsText}>{'★'.repeat(item.rating)}</Text>
                  <Text style={styles.ratingVal}>{item.rating}/5</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'APPROVED'
                      ? styles.statusApproved
                      : item.status === 'PENDING'
                      ? styles.statusPending
                      : styles.statusRejected,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              {item.title ? <Text style={styles.reviewTitle}>{item.title}</Text> : null}
              <Text style={styles.reviewComment}>"{item.comment}"</Text>

              <View style={styles.metaRow}>
                <Text style={styles.authorText}>👤 {item.customerName || 'Customer'}</Text>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>

              {/* Official Admin Reply display */}
              {item.adminReply && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Official KIRSAB Response:</Text>
                  <Text style={styles.replyText}>{item.adminReply}</Text>
                </View>
              )}

              {/* Moderation Controls */}
              <View style={styles.actionsRow}>
                {item.status !== 'APPROVED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleUpdateStatus(item.id, 'APPROVED')}
                  >
                    <Text style={styles.approveBtnText}>Approve ✓</Text>
                  </TouchableOpacity>
                )}

                {item.status !== 'REJECTED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
                  >
                    <Text style={styles.rejectBtnText}>Reject ✕</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, item.isFeatured && styles.featuredActiveBtn]}
                  onPress={() => handleToggleFeature(item.id)}
                >
                  <Text style={[styles.actionBtnText, item.isFeatured && { color: '#92400E' }]}>
                    {item.isFeatured ? '★ Featured' : '☆ Feature'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setSelectedReview(item);
                    setReplyText(item.adminReply || '');
                  }}
                >
                  <Text style={styles.actionBtnText}>💬 Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Reply Modal */}
      <Modal visible={!!selectedReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Official KIRSAB Reply</Text>
              <TouchableOpacity onPress={() => setSelectedReview(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              This response will appear publicly under the customer's review labelled as the official KIRSAB response.
            </Text>

            <TextInput
              style={styles.replyInput}
              placeholder="e.g. Thank you for your feedback! We are glad you enjoyed the fresh spinach..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.publishReplyBtn, submittingReply && { opacity: 0.6 }]}
              onPress={handleSendReply}
              disabled={submittingReply}
            >
              {submittingReply ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.publishReplyText}>Publish Official Response</Text>
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
  tabsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFF',
  },
  list: {
    padding: SPACING.lg,
  },
  reviewCard: {
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
  starsText: {
    color: '#F59E0B',
    fontSize: 16,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  reviewComment: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  authorText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  replyBox: {
    backgroundColor: '#E2F3E7',
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#166534',
  },
  replyText: {
    fontSize: 12,
    color: '#14532D',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  actionBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  approveBtn: {
    backgroundColor: '#166534',
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rejectBtn: {
    backgroundColor: '#DC2626',
  },
  rejectBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  featuredActiveBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
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
  modalSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    height: 100,
    backgroundColor: '#FFF',
  },
  publishReplyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  publishReplyText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

