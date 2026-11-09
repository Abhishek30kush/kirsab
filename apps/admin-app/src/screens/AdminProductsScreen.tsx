import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Category, Product } from '../../../../../packages/shared-types/src/index';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminProductsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('1 kg');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await api.admin.getAllProducts({ search });
      if (res.success) {
        setProducts(res.data || []);
        setCategories(res.categories || []);
        if (res.categories && res.categories.length > 0 && !categoryId) {
          setCategoryId(res.categories[0].id);
        }
      }
    } catch (e) {
      console.warn('Error fetching products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleToggleStock = async (product: Product) => {
    try {
      const res = await api.admin.toggleProductStock(product.id);
      if (res.success && res.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, inStock: res.product.inStock } : p))
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not toggle stock');
    }
  };

  const handleCreateProduct = async () => {
    if (!nameEn.trim() || !nameHi.trim() || !price) {
      Alert.alert('Required', 'Please enter English name, Hindi name, and selling price');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.admin.createProduct({
        id: nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        nameEn: nameEn.trim(),
        nameHi: nameHi.trim(),
        categoryId,
        unit,
        unitHindi: unit === '1 kg' ? 'प्रति किलो' : unit,
        unitShort: unit.replace(/\s+/g, ''),
        price: parseFloat(price),
        image: image.trim() || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
        inStock: true,
      });

      if (res.success) {
        Alert.alert('Success', 'Product added successfully');
        setIsAddModalOpen(false);
        setNameEn('');
        setNameHi('');
        setPrice('');
        setImage('');
        loadProducts();
      }
    } catch (e: any) {
      Alert.alert('Creation Failed', e.message || 'Could not add product');
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
          <Text style={styles.headerTitle}>Products & Inventory</Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadProducts}
          />
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalOpen(true)}>
            <Text style={styles.addBtnText}>+ Add Product</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nameEn}>{item.nameEn}</Text>
                <Text style={styles.nameHi}>{item.nameHi}</Text>
                <Text style={styles.unitText}>{item.unit} • {formatCurrency(item.price || 0)}</Text>
              </View>

              <View style={styles.stockCol}>
                <Text style={[styles.stockStatusText, !item.inStock && { color: COLORS.danger }]}>
                  {item.inStock ? 'In Stock' : 'Out of Stock'}
                </Text>
                <Switch
                  value={item.inStock}
                  onValueChange={() => handleToggleStock(item)}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={item.inStock ? COLORS.primary : '#9CA3AF'}
                />
              </View>
            </View>
          )}
        />
      )}

      {/* Add Product Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Vegetable</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Name in English *</Text>
              <TextInput style={styles.input} placeholder="e.g. Fresh Spinach" value={nameEn} onChangeText={setNameEn} />

              <Text style={styles.label}>Name in Hindi (हिंदी नाम) *</Text>
              <TextInput style={styles.input} placeholder="e.g. ताज़ा पालक" value={nameHi} onChangeText={setNameHi} />

              <Text style={styles.label}>Unit *</Text>
              <TextInput style={styles.input} placeholder="e.g. 1 kg, 500 g, 1 bunch" value={unit} onChangeText={setUnit} />

              <Text style={styles.label}>Selling Price (₹) *</Text>
              <TextInput style={styles.input} placeholder="e.g. 30" value={price} onChangeText={setPrice} keyboardType="numeric" />

              <Text style={styles.label}>Image URL (Optional)</Text>
              <TextInput style={styles.input} placeholder="https://..." value={image} onChangeText={setImage} autoCapitalize="none" />

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.btnDisabled]}
                onPress={handleCreateProduct}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save & Publish Vegetable</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
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
    gap: SPACING.sm,
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
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    padding: SPACING.lg,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  nameEn: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  nameHi: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  unitText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  stockCol: {
    alignItems: 'center',
  },
  stockStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

