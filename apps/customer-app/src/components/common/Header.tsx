import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { useCart } from '../../context/CartContext';

interface HeaderProps {
  location?: string;
  onCartPress: () => void;
  onSearchPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  location = 'Shervani Legacy, Prayagraj',
  onCartPress,
  onSearchPress,
}) => {
  const { totals } = useCart();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>KIRSAB</Text>
            <View style={styles.hindiBadge}>
              <Text style={styles.hindiBadgeText}>किरसाब</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cartButton} onPress={onCartPress}>
          <Text style={styles.cartIcon}>🛒</Text>
          {totals.itemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totals.itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {onSearchPress && (
        <TouchableOpacity style={styles.searchBar} onPress={onSearchPress}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search fresh vegetables, greens...</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingTop: 45,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hindiBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  hindiBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    color: '#E2F3E7',
    fontSize: 12,
    fontWeight: '500',
  },
  cartButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 12,
    position: 'relative',
  },
  cartIcon: {
    fontSize: 20,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchBar: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: SPACING.xs,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  searchPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});

