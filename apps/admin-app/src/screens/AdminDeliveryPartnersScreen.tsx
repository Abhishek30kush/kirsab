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
import { User } from '../../../../../packages/shared-types/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminDeliveryPartnersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Partner Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPartners = async () => {
    try {
      const res = await api.admin.getPartners();
      if (res.success && res.partners) {
        setPartners(res.partners);
      }
    } catch (e) {
      console.warn('Error loading partners:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleToggleActive = async (partner: User) => {
    try {
      const nextActive = !partner.isActive;
      const res = await api.admin.updatePartner(partner.id, { isActive: nextActive });
      if (res.success && res.partner) {
        setPartners((prev) =>
          prev.map((p) => (p.id === partner.id ? { ...p, isActive: nextActive } : p))
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update status');
    }
  };

  const handleResetPassword = async (partner: User) => {
    Alert.alert(
      'Reset Password',
      `Generate a new password for ${partner.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Password',
          onPress: async () => {
            try {
              const res = await api.admin.resetPartnerPassword(partner.id);
              if (res.success) {
                Alert.alert('New Password Generated', `Temporary password: ${res.newPassword}`);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to reset password');
            }
          },
        },
      ]
    );
  };

  const handleCreatePartner = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!name.trim() || cleanPhone.length !== 10 || !password) {
      Alert.alert('Required', 'Please fill name, valid 10-digit phone, and password');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.admin.createPartner({
        name: name.trim(),
        phone: cleanPhone,
        password,
        vehicleType,
        vehicleNumber: vehicleNumber.trim() || undefined,
      });

      if (res.success) {
        Alert.alert('Success', 'Delivery partner account created successfully');
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setPassword('');
        setVehicleNumber('');
        loadPartners();
      }
    } catch (e: any) {
      Alert.alert('Creation Failed', e.message || 'Could not create account');
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
          <Text style={styles.headerTitle}>Delivery Partners</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Add New Partner</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : partners.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🛵</Text>
          <Text style={styles.emptyTitle}>No delivery partners registered yet</Text>
          <TouchableOpacity style={styles.addBtnLarge} onPress={() => setIsAddModalOpen(true)}>
            <Text style={styles.addBtnText}>+ Add First Partner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.partnerCard}>
              <View style={styles.partnerTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.partnerName}>{item.name}</Text>
                  <Text style={styles.partnerPhone}>📞 {item.phone}</Text>
                  <Text style={styles.partnerVehicle}>
                    🚗 {item.vehicleType || 'Bike'} {item.vehicleNumber ? `• ${item.vehicleNumber}` : ''}
                  </Text>
                </View>

                <View style={styles.switchCol}>
                  <Text style={[styles.statusLabel, !item.isActive && { color: COLORS.danger }]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleActive(item)}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={item.isActive ? COLORS.primary : '#9CA3AF'}
                  />
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleResetPassword(item)}
                >
                  <Text style={styles.actionBtnText}>🔑 Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Partner Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Delivery Partner</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Partner Full Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Rahul Kumar" value={name} onChangeText={setName} />

              <Text style={styles.label}>10-Digit Mobile Number *</Text>
              <TextInput style={styles.input} placeholder="e.g. 9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />

              <Text style={styles.label}>Initial Password *</Text>
              <TextInput style={styles.input} placeholder="At least 6 characters" value={password} onChangeText={setPassword} secureTextEntry />

              <Text style={styles.label}>Vehicle Type</Text>
              <TextInput style={styles.input} placeholder="e.g. Bike, Scooter, Cycle" value={vehicleType} onChangeText={setVehicleType} />

              <Text style={styles.label}>Vehicle Number (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. UP 70 AB 1234" value={vehicleNumber} onChangeText={setVehicleNumber} />

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.btnDisabled]}
                onPress={handleCreatePartner}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Create Partner Account</Text>
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
  partnerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  partnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  partnerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  partnerPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  partnerVehicle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  switchCol: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  actionBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
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

