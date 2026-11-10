import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { PaymentMethod } from "@/src/types";
import { cardStyles } from "./checkoutStyles";

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "pix", label: "Pix", icon: "flash-outline" },
  { id: "credit", label: "Cartão de crédito", icon: "card-outline" },
  { id: "debit", label: "Cartão de débito", icon: "card-outline" },
  { id: "cash", label: "Dinheiro", icon: "cash-outline" },
];

type PaymentSelectorProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
};

/** Lista de formas de pagamento (só uma pode ficar marcada). */
export function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.title}>Forma de Pagamento</Text>
      <View style={styles.list}>
        {PAYMENT_OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onChange(opt.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.left}>
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.label, isSelected && styles.labelSelected]}>
                  {opt.label}
                </Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: typography.bold,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
