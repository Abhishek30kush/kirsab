import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { formatCurrency } from '../../../../../packages/shared-utils/src/index';
import { COLORS, SHADOWS, SPACING } from '../constants/theme';
import { api } from '../services/api';

export const AdminPricingCalculatorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [purchasePrice, setPurchasePrice] = useState('20'); // ₹/kg
  const [quantity, setQuantity] = useState('100'); // kg
  const [transportCost, setTransportCost] = useState('150'); // ₹
  const [packagingCost, setPackagingCost] = useState('1'); // ₹/kg
  const [wastagePercent, setWastagePercent] = useState('5'); // %
  const [otherExpenses, setOtherExpenses] = useState('50'); // ₹
  const [targetMargin, setTargetMargin] = useState('25'); // %

  // Dynamic calculations based on backend formulas
  const numPurchasePrice = parseFloat(purchasePrice) || 0;
  const numQuantity = parseFloat(quantity) || 0;
  const numTransport = parseFloat(transportCost) || 0;
  const numPackaging = (parseFloat(packagingCost) || 0) * numQuantity;
  const numWastage = (parseFloat(wastagePercent) || 0) / 100;
  const numOther = parseFloat(otherExpenses) || 0;
  const numMargin = (parseFloat(targetMargin) || 0) / 100;

  // 1. Usable Quantity
  const usableQuantity = Math.max(0.1, numQuantity * (1 - numWastage));

  // 2. Total Batch Cost
  const totalPurchaseCost = numPurchasePrice * numQuantity;
  const totalOperationalCost = numTransport + numPackaging + numOther;
  const totalBatchCost = totalPurchaseCost + totalOperationalCost;

  // 3. Effective Cost Per Usable Kg
  const effectiveCostPerKg = totalBatchCost / usableQuantity;

  // 4. Recommended Selling Price (with Target Margin)
  const recommendedSellingPrice = numMargin < 1
    ? Math.round(effectiveCostPerKg / (1 - numMargin))
    : Math.round(effectiveCostPerKg * 1.25);

  // 5. Expected Profit
  const expectedTotalRevenue = recommendedSellingPrice * usableQuantity;
  const expectedGrossProfit = expectedTotalRevenue - totalBatchCost;
  const actualMarginPercent = expectedTotalRevenue > 0
    ? Math.round((expectedGrossProfit / expectedTotalRevenue) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.headerTitle}>Vegetable Profit & Price Calculator</Text>
          <Text style={styles.headerSubtitle}>Mandi cost, wastage & margin optimizer</Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Purchase & Mandi Inputs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Mandi Purchase Details</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Mandi Rate (₹/kg) *</Text>
              <TextInput
                style={styles.input}
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity (kg) *</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Expenses & Wastage Inputs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Operating Expenses & Wastage</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Transport (₹)</Text>
              <TextInput
                style={styles.input}
                value={transportCost}
                onChangeText={setTransportCost}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Wastage (%)</Text>
              <TextInput
                style={styles.input}
                value={wastagePercent}
                onChangeText={setWastagePercent}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.row, { marginTop: 10 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Packaging (₹/kg)</Text>
              <TextInput
                style={styles.input}
                value={packagingCost}
                onChangeText={setPackagingCost}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target Margin (%)</Text>
              <TextInput
                style={styles.input}
                value={targetMargin}
                onChangeText={setTargetMargin}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Real-time Calculation Results */}
        <View style={styles.resultCard}>
          <Text style={styles.resultHeading}>Calculated Cost & Margin Outputs</Text>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Total Purchase Cost:</Text>
            <Text style={styles.resultVal}>{formatCurrency(totalPurchaseCost)}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Total Operational Expenses:</Text>
            <Text style={styles.resultVal}>{formatCurrency(totalOperationalCost)}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Usable Quantity after Wastage:</Text>
            <Text style={styles.resultVal}>{usableQuantity.toFixed(1)} kg</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Effective Cost per kg (Breakeven):</Text>
            <Text style={[styles.resultVal, { color: '#DC2626' }]}>
              {formatCurrency(effectiveCostPerKg)} / kg
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.highlightRow}>
            <View>
              <Text style={styles.recTitle}>Recommended Selling Price</Text>
              <Text style={styles.recSub}>Achieves {actualMarginPercent}% gross margin</Text>
            </View>
            <Text style={styles.recPrice}>{formatCurrency(recommendedSellingPrice)} / kg</Text>
          </View>

          <View style={[styles.resultRow, { marginTop: 12 }]}>
            <Text style={styles.resultLabel}>Expected Gross Profit:</Text>
            <Text style={[styles.resultVal, { color: '#166534', fontWeight: 'bold' }]}>
              +{formatCurrency(expectedGrossProfit)}
            </Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
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
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  resultCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#86EFAC',
    ...SHADOWS.card,
  },
  resultHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14532D',
    marginBottom: SPACING.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  resultLabel: {
    fontSize: 12,
    color: '#166534',
  },
  resultVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#14532D',
  },
  divider: {
    height: 1,
    backgroundColor: '#86EFAC',
    marginVertical: SPACING.md,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14532D',
  },
  recSub: {
    fontSize: 10,
    color: '#166534',
  },
  recPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#14532D',
  },
});

