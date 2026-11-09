import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onRatingChange,
  showCount = false,
  count,
}) => {
  const stars = Array.from({ length: maxRating }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {stars.map((star) => {
          const filled = star <= Math.round(rating);
          const StarIcon = (
            <Text
              key={star}
              style={{
                fontSize: size,
                color: filled ? '#F59E0B' : '#D1D5DB',
                marginRight: 2,
              }}
            >
              ★
            </Text>
          );

          if (interactive && onRatingChange) {
            return (
              <TouchableOpacity
                key={star}
                onPress={() => onRatingChange(star)}
                activeOpacity={0.7}
              >
                {StarIcon}
              </TouchableOpacity>
            );
          }

          return StarIcon;
        })}
      </View>

      {showCount && count !== undefined && (
        <Text style={styles.countText}>({count})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
});

