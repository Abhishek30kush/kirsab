import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { AssignedDeliveryPartner } from '../../../../../packages/shared-types/src/index';
import { generateCustomerToPartnerWhatsAppUrl } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

interface DeliveryPartnerCardProps {
  partner?: AssignedDeliveryPartner | null;
  orderNumber: string;
  customerName: string;
  address: string;
  status: string;
  deliveryPin?: string | null;
}

export const DeliveryPartnerCard: React.FC<DeliveryPartnerCardProps> = ({
  partner,
  orderNumber,
  customerName,
  address,
  status,
  deliveryPin,
}) => {
  const isAssigned = Boolean(partner && partner.name);

  const handleCall = () => {
    if (!partner?.phone) return;
    Linking.openURL(`tel:${partner.phone}`).catch(() => {
      Alert.alert('Error', 'Could not initiate phone call');
    });
  };

  const handleWhatsApp = () => {
    if (!partner?.phone) return;
    const url = generateCustomerToPartnerWhatsAppUrl(
      partner.phone,
      orderNumber,
      customerName,
      address
    );
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp');
    });
  };

  if (!isAssigned) {
    return (
      <View style={styles.card}>
        <View style={styles.unassignedRow}>
          <Text style={styles.unassignedIcon}>🛵</Text>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.unassignedTitle}>Delivery Partner</Text>
            <Text style={styles.unassignedMessage}>
              Your delivery partner will be assigned soon. (डिलीवरी पार्टनर जल्द ही असाइन किया जाएगा)
            </Text>
          </View>
        </View>

        {deliveryPin && (
          <View style={styles.pinContainer}>
            <Text style={styles.pinLabel}>Your Secure Delivery PIN (डिलीवरी पिन):</Text>
            <Text style={styles.pinValue}>{deliveryPin}</Text>
            <Text style={styles.pinNote}>Share this PIN only with your delivery partner upon delivery.</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{partner?.name?.charAt(0) || 'D'}</Text>
        </View>
        <View style={styles.infoCol}>
          <View style={styles.badgeRow}>
            <Text style={styles.partnerName}>{partner?.name}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Assigned</Text>
            </View>
          </View>
          <Text style={styles.phoneText}>📞 {partner?.phone}</Text>
          {partner?.vehicleType && (
            <Text style={styles.vehicleText}>
              🚗 {partner.vehicleType} {partner.vehicleNumber ? `• ${partner.vehicleNumber}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons: 1. Call, 2. WhatsApp */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Text style={styles.btnIcon}>📞</Text>
          <Text style={styles.callBtnText}>Call Partner</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
          <Text style={styles.btnIcon}>💬</Text>
          <Text style={styles.whatsappBtnText}>WhatsApp Partner</Text>
        </TouchableOpacity>
      </View>

      {/* Secure PIN Card for Customer */}
      {deliveryPin && (
        <View style={styles.pinContainer}>
          <Text style={styles.pinLabel}>Your Delivery PIN (डिलीवरी पिन):</Text>
          <Text style={styles.pinValue}>{deliveryPin}</Text>
          <Text style={styles.pinNote}>
            सामान प्राप्त करने और सही वजन जांचने के बाद ही पार्टनर को पिन बताएं।
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    ...SHADOWS.card,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  verifiedText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: 'bold',
  },
  phoneText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  vehicleText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  callBtnText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    borderRadius: 8,
  },
  whatsappBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  btnIcon: {
    fontSize: 14,
  },
  unassignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unassignedIcon: {
    fontSize: 32,
  },
  unassignedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  unassignedMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  pinContainer: {
    marginTop: SPACING.md,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  pinValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 4,
    marginVertical: 4,
  },
  pinNote: {
    fontSize: 11,
    color: '#78350F',
    textAlign: 'center',
  },
});

