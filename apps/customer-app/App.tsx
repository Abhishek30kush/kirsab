import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import { COLORS } from './src/constants/theme';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { CatalogueScreen } from './src/screens/CatalogueScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { OrderDetailScreen } from './src/screens/OrderDetailScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';
import { AuthScreen } from './src/screens/AuthScreen';

function MainNavigator() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [screenParams, setScreenParams] = useState<any>({});
  const { totals } = useCart();

  const navigation = {
    navigate: (screen: string, params?: any) => {
      setScreenParams(params || {});
      setCurrentScreen(screen);
    },
    goBack: () => {
      setCurrentScreen('Home');
    },
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen navigation={navigation} />;
      case 'Catalogue':
        return <CatalogueScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'Cart':
        return <CartScreen navigation={navigation} />;
      case 'Checkout':
        return <CheckoutScreen navigation={navigation} />;
      case 'Orders':
        return <OrdersScreen navigation={navigation} />;
      case 'OrderDetail':
        return <OrderDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'Wishlist':
        return <WishlistScreen navigation={navigation} />;
      case 'Auth':
        return <AuthScreen navigation={navigation} />;
      default:
        return <HomeScreen navigation={navigation} />;
    }
  };

  const isModalOrStackScreen = ['Checkout', 'OrderDetail', 'Auth'].includes(currentScreen);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      {!isModalOrStackScreen && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Home' && styles.tabIconActive]}>
              🏠
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Home' && styles.tabTextActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Catalogue')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Catalogue' && styles.tabIconActive]}>
              🥬
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Catalogue' && styles.tabTextActive]}>
              Catalogue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Cart')}
          >
            <View style={{ position: 'relative' }}>
              <Text style={[styles.tabIcon, currentScreen === 'Cart' && styles.tabIconActive]}>
                🛒
              </Text>
              {totals.itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totals.itemCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabText, currentScreen === 'Cart' && styles.tabTextActive]}>
              Basket
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
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Wishlist' && styles.tabIconActive]}>
              ❤️
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Wishlist' && styles.tabTextActive]}>
              Saved
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainNavigator />
      </CartProvider>
    </AuthProvider>
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
    color: COLORS.primary,
    fontWeight: '800',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

