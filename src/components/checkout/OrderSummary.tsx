import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { formatCurrency } from "@/src/utils/currency";
import { cardStyles } from "./checkoutStyles";

type OrderSummaryProps = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  total: number;
};

/** Resumo de valores do pedido: subtotal, entrega, desconto e total. */
export function OrderSummary({ subtotal, deliveryFee, discount, couponCode, total }: OrderSummaryProps) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.title}>Resumo da Compra</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>{formatCurrency(subtotal)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Taxa de entrega</Text>
        <Text style={styles.value}>
          {deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}
        </Text>
      </View>

      {discount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discount]}>Desconto ({couponCode})</Text>
          <Text style={[styles.value, styles.discount]}>-{formatCurrency(discount)}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  value: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
  },
  discount: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.lg,
    fontFamily: typography.extraBold,
    color: colors.primary,
  },
});
