import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CustomerAddress } from '../../../../../packages/shared-types/src/index';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

export const CheckoutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const { items, totals, clearCart } = useCart();

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('morning');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // New address form in modal
  const [modalFlatNumber, setModalFlatNumber] = useState('');
  const [modalStreet, setModalStreet] = useState('Shervani Legacy');
  const [modalLandmark, setModalLandmark] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const loadAddresses = async () => {
    try {
      const res = await api.customer.getAddresses();
      if (res.success && res.addresses) {
        setSavedAddresses(res.addresses);
        const def = res.addresses.find((a) => a.isDefault) || res.addresses[0];
        if (def) {
          setSelectedAddressId(def.id);
          setAddress(`${def.flatNumber}, ${def.street}`);
          if (def.landmark) setLandmark(def.landmark);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved addresses', e);
    }
  };

  const handleSelectAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setAddress(`${addr.flatNumber}, ${addr.street}`);
    if (addr.landmark) setLandmark(addr.landmark);
  };

  const handleSaveNewAddress = async () => {
    if (!modalFlatNumber.trim()) {
      Alert.alert('Required', 'Please enter your flat & tower number');
      return;
    }

    try {
      const res = await api.customer.createAddress({
        flatNumber: modalFlatNumber.trim(),
        street: modalStreet.trim(),
        locality: 'Shervani Legacy',
        city: 'Prayagraj',
        state: 'Uttar Pradesh',
        pincode: '211011',
        landmark: modalLandmark.trim() || undefined,
        isDefault: savedAddresses.length === 0,
        label: 'Home',
      });

      if (res.success && res.address) {
        setSavedAddresses((prev) => [res.address, ...prev]);
        setSelectedAddressId(res.address.id);
        setAddress(`${res.address.flatNumber}, ${res.address.street}`);
        if (res.address.landmark) setLandmark(res.address.landmark);
        setIsAddressModalOpen(false);
        setModalFlatNumber('');
        setModalLandmark('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert('Required', 'Please enter your full name (कम से कम 2 अक्षर)');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit Indian WhatsApp mobile number');
      return;
    }

    if (!address.trim() || address.trim().length < 3) {
      Alert.alert('Required', 'Please enter your tower and flat number (e.g. Tower 3, Flat 504)');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customer: {
          fullName: fullName.trim(),
          phone: cleanPhone,
          address: address.trim(),
          landmark: landmark.trim() || undefined,
          deliverySlot,
          instructions: instructions.trim() || undefined,
        },
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const res = await api.orders.placeOrder(payload);

      if (res.success && res.order) {
        clearCart();
        Alert.alert(
          '🎉 Order Placed Successfully!',
          `Order #${res.order.orderNumber} has been received. Our team will handpick your fresh greens.`,
          [
            {
              text: 'View Order Tracking',
              onPress: () => navigation.navigate('OrderDetail', { orderId: res.order.id }),
            },
          ]
        );
      } else {
        Alert.alert('Order Failed', res.message || 'Could not place order');
      }
    } catch (e: any) {
      Alert.alert('Order Error', e.message || 'Could not place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout & Delivery</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Section 1: Contact Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>1. Contact Details (संपर्क विवरण)</Text>

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Amit Sharma"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.fieldLabel}>WhatsApp Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit number (e.g. 9876543210)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Section 2: Delivery Address */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeading}>2. Delivery Address (डिलीवरी पता)</Text>
            {isAuthenticated && (
              <TouchableOpacity onPress={() => setIsAddressModalOpen(true)}>
                <Text style={styles.addAddressText}>+ New Address</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Saved Addresses List */}
          {savedAddresses.length > 0 && (
            <View style={styles.savedAddressesList}>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressItem,
                    selectedAddressId === addr.id && styles.addressItemActive,
                  ]}
                  onPress={() => handleSelectAddress(addr)}
                >
                  <View style={styles.radio}>
                    {selectedAddressId === addr.id && <View style={styles.radioSelected} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.addressLabel}>{addr.label}: {addr.flatNumber}</Text>
                    <Text style={styles.addressStreet}>{addr.street}, {addr.locality}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Flat & Tower / House Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tower 3, Flat 504, Shervani Legacy"
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.fieldLabel}>Nearby Landmark (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Near Lift A, Opposite Central Park"
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>

        {/* Section 3: Delivery Slot */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>3. Delivery Slot (समय स्लॉट)</Text>
          <View style={styles.slotsRow}>
            <TouchableOpacity
              style={[styles.slotCard, deliverySlot === 'morning' && styles.slotCardActive]}
              onPress={() => setDeliverySlot('morning')}
            >
              <Text style={styles.slotIcon}>🌅</Text>
              <Text style={[styles.slotTitle, deliverySlot === 'morning' && styles.slotTitleActive]}>
                Morning Slot
              </Text>
              <Text style={styles.slotTime}>07:00 AM - 10:00 AM</Text>
              <Text style={styles.slotNote}>सुबह ताज़ी सब्ज़ियों के साथ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.slotCard, deliverySlot === 'evening' && styles.slotCardActive]}
              onPress={() => setDeliverySlot('evening')}
            >
              <Text style={styles.slotIcon}>🌆</Text>
              <Text style={[styles.slotTitle, deliverySlot === 'evening' && styles.slotTitleActive]}>
                Evening Slot
              </Text>
              <Text style={styles.slotTime}>05:00 PM - 08:00 PM</Text>
              <Text style={styles.slotNote}>शाम के भोजन की तैयारी हेतु</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Instructions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>4. Delivery Instructions (वैकल्पिक)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ring the doorbell, leave at door..."
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>

        {/* Section 5: Payment Method */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>5. Payment Method (भुगतान का तरीका)</Text>
          <View style={styles.codBox}>
            <Text style={styles.codIcon}>💵</Text>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.codTitle}>Cash on Delivery / UPI on Delivery</Text>
              <Text style={styles.codDesc}>
                सामान प्राप्त होने और सही तौल जांचने के बाद सीधे नकद या UPI द्वारा भुगतान करें।
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Place Order Button */}
      <View style={styles.footerBar}>
        <View>
          <Text style={styles.footerTotalLabel}>Total Payable</Text>
          <Text style={styles.footerTotalValue}>{formatCurrency(totals.finalTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.placeOrderBtn, isSubmitting && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place Order (ऑर्डर करें) →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* New Address Modal */}
      <Modal visible={isAddressModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Delivery Address</Text>

            <Text style={styles.fieldLabel}>Flat & Tower Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tower 2, Flat 301"
              value={modalFlatNumber}
              onChangeText={setModalFlatNumber}
            />

            <Text style={styles.fieldLabel}>Society / Street</Text>
            <TextInput
              style={styles.input}
              value={modalStreet}
              onChangeText={setModalStreet}
            />

            <Text style={styles.fieldLabel}>Landmark</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Opposite Lift"
              value={modalLandmark}
              onChangeText={setModalLandmark}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddressModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveNewAddress}
              >
                <Text style={styles.saveBtnText}>Save Address</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
    marginRight: SPACING.sm,
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
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addAddressText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  savedAddressesList: {
    marginBottom: SPACING.md,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  addressItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E2F3E7',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addressStreet: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  fieldLabel: {
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FFF',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  slotCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  slotCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#E2F3E7',
  },
  slotIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  slotTitleActive: {
    color: COLORS.primaryDark,
  },
  slotTime: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  slotNote: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  codBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  codIcon: {
    fontSize: 24,
  },
  codTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#166534',
  },
  codDesc: {
    fontSize: 11,
    color: '#14532D',
    marginTop: 2,
    lineHeight: 15,
  },
  footerBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.modal,
  },
  footerTotalLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  placeOrderBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

