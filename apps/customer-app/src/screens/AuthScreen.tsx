import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    if (isRegister && (!name.trim() || name.trim().length < 2)) {
      Alert.alert('Invalid Name', 'Full name must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      if (isRegister) {
        const res = await register({
          name: name.trim(),
          phone: cleanPhone,
          password,
          email: email.trim() || undefined,
        });
        if (res.success) {
          Alert.alert('Welcome to KIRSAB!', 'Account created successfully.');
          navigation.goBack();
        } else {
          Alert.alert('Registration Failed', res.message || 'Please check your information');
        }
      } else {
        const res = await login(cleanPhone, password);
        if (res.success) {
          navigation.goBack();
        } else {
          Alert.alert('Login Failed', res.message || 'Invalid credentials');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Banner */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandEmoji}>🥬</Text>
          <Text style={styles.brandTitle}>KIRSAB</Text>
          <Text style={styles.brandHindi}>किरसाब • शेरवानी लेगेसी</Text>
          <Text style={styles.brandSub}>Fresh Vegetables & Greens Direct to your Doorstep</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, !isRegister && styles.tabActive]}
              onPress={() => setIsRegister(false)}
            >
              <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>
                Login (लॉगिन)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, isRegister && styles.tabActive]}
              onPress={() => setIsRegister(true)}
            >
              <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>
                Sign Up (रजिस्टर)
              </Text>
            </TouchableOpacity>
          </View>

          {isRegister && (
            <>
              <Text style={styles.label}>Full Name (पूरा नाम) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Amit Sharma"
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          <Text style={styles.label}>WhatsApp Mobile Number (मोबाइल नंबर) *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit number (e.g. 9876543210)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Password (पासवर्ड) *</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {isRegister && (
            <>
              <Text style={styles.label}>Email Address (वैकल्पिक)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. amit@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isRegister ? 'Create Account (खाता बनाएं) →' : 'Login Securely (लॉगिन करें) →'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.guestBtnText}>Skip & Browse as Guest (बाद में लॉगिन करें)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: 60,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  brandEmoji: {
    fontSize: 54,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 1,
    marginTop: 6,
  },
  brandHindi: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  brandSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#FFF',
    ...SHADOWS.card,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primaryDark,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  guestBtn: {
    marginTop: SPACING.md,
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

