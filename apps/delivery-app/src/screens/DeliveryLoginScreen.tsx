import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useDeliveryAuth } from '../context/DeliveryAuthContext';

export const DeliveryLoginScreen: React.FC = () => {
  const { login } = useDeliveryAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Required', 'Please enter your mobile number and password');
      return;
    }

    try {
      setLoading(true);
      const res = await login(identifier.trim(), password);
      if (!res.success) {
        Alert.alert('Login Failed', res.message || 'Invalid partner credentials');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.logo}>🛵</Text>
          <Text style={styles.title}>KIRSAB Delivery</Text>
          <Text style={styles.subtitle}>Partner Portal • Shervani Legacy</Text>
        </View>

        <Text style={styles.label}>Mobile Number (मोबाइल नंबर)</Text>
        <TextInput
          style={styles.input}
          placeholder="10-digit mobile number"
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Password (पासवर्ड)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Login to Delivery Portal (लॉगिन करें) →</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Account provided by KIRSAB Store Manager.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 8,
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
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});

