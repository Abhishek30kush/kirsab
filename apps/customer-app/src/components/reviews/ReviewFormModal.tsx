import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { api } from '../../services/api';
import { StarRating } from '../common/StarRating';

interface ReviewFormModalProps {
  visible: boolean;
  orderId: string;
  orderNumber: string;
  productId?: string;
  productName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  visible,
  orderId,
  orderNumber,
  productId,
  productName,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [productQualityRating, setProductQualityRating] = useState<number | undefined>(5);
  const [packagingRating, setPackagingRating] = useState<number | undefined>(5);
  const [deliveryRating, setDeliveryRating] = useState<number | undefined>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || comment.trim().length < 5) {
      Alert.alert('Required', 'Please write a review of at least 5 characters (कृपया कम से कम 5 अक्षरों की समीक्षा लिखें)');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.reviews.submitReview({
        orderId,
        productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        productQualityRating,
        packagingRating,
        deliveryRating,
        images: [],
      });

      if (res.success) {
        Alert.alert(
          'धन्यवाद! (Thank You)',
          'आपकी समीक्षा सफलतापूर्वक सबमिट हो गई है। एडमिन द्वारा अनुमोदन के बाद यह प्रकाशित होगी। (Review submitted successfully)'
        );
        onSuccess();
        onClose();
      } else {
        Alert.alert('Error', res.message || 'Failed to submit review');
      }
    } catch (e: any) {
      Alert.alert('Submission Error', e.message || 'Could not submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Share Your Experience</Text>
              <Text style={styles.subheading}>
                Order #{orderNumber} {productName ? `• ${productName}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Overall Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.label}>Overall Experience (समग्र अनुभव) *</Text>
              <View style={styles.starsCenter}>
                <StarRating
                  rating={rating}
                  size={32}
                  interactive
                  onRatingChange={setRating}
                />
                <Text style={styles.ratingDescriptor}>
                  {rating === 5
                    ? 'Excellent (उत्कृष्ट)'
                    : rating === 4
                    ? 'Very Good (बहुत अच्छा)'
                    : rating === 3
                    ? 'Average (सामान्य)'
                    : rating === 2
                    ? 'Below Average (असंतोषजनक)'
                    : 'Poor (खराब)'}
                </Text>
              </View>
            </View>

            {/* Optional Specific Ratings */}
            <View style={styles.criteriaContainer}>
              <View style={styles.criteriaRow}>
                <Text style={styles.criteriaLabel}>🥬 Product Quality & Freshness</Text>
                <StarRating
                  rating={productQualityRating || 5}
                  size={18}
                  interactive
                  onRatingChange={setProductQualityRating}
                />
              </View>

              <View style={styles.criteriaRow}>
                <Text style={styles.criteriaLabel}>📦 Packaging Quality</Text>
                <StarRating
                  rating={packagingRating || 5}
                  size={18}
                  interactive
                  onRatingChange={setPackagingRating}
                />
              </View>

              <View style={styles.criteriaRow}>
                <Text style={styles.criteriaLabel}>🛵 Delivery Experience</Text>
                <StarRating
                  rating={deliveryRating || 5}
                  size={18}
                  interactive
                  onRatingChange={setDeliveryRating}
                />
              </View>
            </View>

            {/* Review Title */}
            <Text style={styles.label}>Review Title (वैकल्पिक)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fresh and clean vegetables, fast delivery!"
              value={title}
              onChangeText={setTitle}
            />

            {/* Written Review */}
            <Text style={styles.label}>Written Review (आपकी राय) *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell other Shervani Legacy residents about the quality, taste, and packaging..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review (समीक्षा भेजें)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  subheading: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  body: {
    padding: SPACING.lg,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  starsCenter: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ratingDescriptor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginTop: 6,
  },
  criteriaContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.lg,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  criteriaLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.md,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 90,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.6,
  },
});

