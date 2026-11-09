import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AdminAuthProvider, useAdminAuth } from './src/context/AdminAuthContext';
import { COLORS } from './src/constants/theme';

// Screens
import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { AdminOrdersScreen } from './src/screens/AdminOrdersScreen';
import { AdminOrderDetailScreen } from './src/screens/AdminOrderDetailScreen';
import { AdminProductsScreen } from './src/screens/AdminProductsScreen';
import { AdminPricingCalculatorScreen } from './src/screens/AdminPricingCalculatorScreen';
import { AdminDeliveryPartnersScreen } from './src/screens/AdminDeliveryPartnersScreen';
import { AdminOffersScreen } from './src/screens/AdminOffersScreen';
import { AdminReviewsScreen } from './src/screens/AdminReviewsScreen';
import { AdminCustomersScreen } from './src/screens/AdminCustomersScreen';

function AdminMainNavigator() {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [currentScreen, setCurrentScreen] = useState('Dashboard');
  const [screenParams, setScreenParams] = useState<any>({});

  const navigation = {
    navigate: (screen: string, params?: any) => {
      setScreenParams(params || {});
      setCurrentScreen(screen);
    },
    goBack: () => {
      setCurrentScreen('Dashboard');
    },
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing KIRSAB Admin...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return <AdminDashboardScreen navigation={navigation} />;
      case 'Orders':
        return <AdminOrdersScreen navigation={navigation} />;
      case 'OrderDetail':
        return <AdminOrderDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'Products':
        return <AdminProductsScreen navigation={navigation} />;
      case 'Pricing':
        return <AdminPricingCalculatorScreen navigation={navigation} />;
      case 'DeliveryPartners':
        return <AdminDeliveryPartnersScreen navigation={navigation} />;
      case 'Offers':
        return <AdminOffersScreen navigation={navigation} />;
      case 'Reviews':
        return <AdminReviewsScreen navigation={navigation} />;
      case 'Customers':
        return <AdminCustomersScreen navigation={navigation} />;
      default:
        return <AdminDashboardScreen navigation={navigation} />;
    }
  };

  const isModalOrSubScreen = ['OrderDetail'].includes(currentScreen);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
      <View style={styles.content}>{renderScreen()}</View>

      {/* Admin Bottom Navigation Bar */}
      {!isModalOrSubScreen && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Dashboard' && styles.tabIconActive]}>
              📊
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Dashboard' && styles.tabTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Orders' && styles.tabIconActive]}>
              📦
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Orders' && styles.tabTextActive]}>
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Products')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Products' && styles.tabIconActive]}>
              🥬
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Products' && styles.tabTextActive]}>
              Stock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Pricing')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Pricing' && styles.tabIconActive]}>
              🧮
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Pricing' && styles.tabTextActive]}>
              Profit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('DeliveryPartners')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'DeliveryPartners' && styles.tabIconActive]}>
              🛵
            </Text>
            <Text style={[styles.tabText, currentScreen === 'DeliveryPartners' && styles.tabTextActive]}>
              Partners
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminMainNavigator />
    </AdminAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 14,
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
});

