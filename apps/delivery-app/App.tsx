import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DeliveryAuthProvider, useDeliveryAuth } from './src/context/DeliveryAuthContext';
import { COLORS } from './src/constants/theme';

// Screens
import { DeliveryLoginScreen } from './src/screens/DeliveryLoginScreen';
import { DeliveryDashboardScreen } from './src/screens/DeliveryDashboardScreen';
import { DeliveryOrderDetailScreen } from './src/screens/DeliveryOrderDetailScreen';
import { DeliveryHistoryScreen } from './src/screens/DeliveryHistoryScreen';

function DeliveryMainNavigator() {
  const { isAuthenticated, isLoading } = useDeliveryAuth();
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
        <Text style={styles.loadingText}>Initializing Delivery Portal...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <DeliveryLoginScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return <DeliveryDashboardScreen navigation={navigation} />;
      case 'OrderDetail':
        return <DeliveryOrderDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'History':
        return <DeliveryHistoryScreen navigation={navigation} />;
      default:
        return <DeliveryDashboardScreen navigation={navigation} />;
    }
  };

  const isModalOrSubScreen = ['OrderDetail'].includes(currentScreen);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tabs */}
      {!isModalOrSubScreen && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'Dashboard' && styles.tabIconActive]}>
              🛵
            </Text>
            <Text style={[styles.tabText, currentScreen === 'Dashboard' && styles.tabTextActive]}>
              Active Deliveries
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={[styles.tabIcon, currentScreen === 'History' && styles.tabIconActive]}>
              📜
            </Text>
            <Text style={[styles.tabText, currentScreen === 'History' && styles.tabTextActive]}>
              Delivery History
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <DeliveryAuthProvider>
      <DeliveryMainNavigator />
    </DeliveryAuthProvider>
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
    paddingVertical: 10,
    paddingBottom: 16,
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
    fontSize: 22,
    marginBottom: 2,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
});

