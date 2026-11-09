import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Product } from '../../../../../packages/shared-types/src/index';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

export const WishlistScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.customer.getWishlist();
      if (res.success && res.items) {
        setItems(res.items);
      }
    } catch (e) {
      console.warn('Error fetching wishlist:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, [isAuthenticated]);

  const handleRemove = async (productId: string) => {
    try {
      await api.customer.toggleWishlist(productId);
      setItems((prev) => prev.filter((i) => i.id !== productId));
    } catch (e) {
      console.warn('Error removing wishlist item:', e);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.icon}>❤️</Text>
        <Text style={styles.title}>Login to View Your Wishlist</Text>
        <Text style={styles.sub}>पसंदीदा सब्ज़ियों को सहेजने के लिए लॉगिन करें।</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.loginBtnText}>Login / Register →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist (पसंदीदा सब्ज़ियां)</Text>
        <Text style={styles.headerSubtitle}>{items.length} items saved</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.icon}>🥬</Text>
          <Text style={styles.title}>Your Wishlist is Empty</Text>
          <Text style={styles.sub}>कैटलॉग से अपनी पसंदीदा सब्ज़ियों को हार्ट आइकन दबाकर सहेजें।</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Catalogue')}>
            <Text style={styles.browseBtnText}>Explore Vegetables →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.imageContainer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.image} />
                ) : (
                  <Text style={{ fontSize: 32 }}>{item.fallbackEmoji || '🥬'}</Text>
                )}
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.nameEn}>{item.nameEn}</Text>
                <Text style={styles.nameHi}>{item.nameHi}</Text>
                <Text style={styles.price}>{formatCurrency(item.price || 0)} / {item.unit}</Text>
              </View>

              <View style={styles.actionCol}>
                <TouchableOpacity
                  style={styles.addCartBtn}
                  onPress={() => {
                    addToCart(item, 1);
                    handleRemove(item.id);
                  }}
                >
                  <Text style={styles.addCartText}>Add to Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item.id)}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
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
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nameEn: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  nameHi: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
  },
  addCartBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  addCartText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  removeBtn: {
    padding: 4,
  },
  removeText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  loginBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  browseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

