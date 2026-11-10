import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { formatCurrency } from "@/src/utils/currency";
import { AVAILABLE_COUPONS, Coupon, findCoupon } from "@/src/utils/pricing";
import { cardStyles } from "./checkoutStyles";

type CouponSectionProps = {
  appliedCoupon: Coupon | null;
  discount: number;
  onApply: (coupon: Coupon) => void;
  onRemove: () => void;
};

/**
 * Cartão de cupom do checkout + janela para digitar ou escolher um cupom.
 * As regras de desconto ficam em src/utils/pricing.ts.
 */
export function CouponSection({ appliedCoupon, discount, onApply, onRemove }: CouponSectionProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const apply = (coupon: Coupon) => {
    onApply(coupon);
    setCode("");
    setError("");
    setOpen(false);
  };

  const handleApplyCode = () => {
    const match = findCoupon(code);
    if (match) {
      apply(match);
    } else {
      // Mostra o erro embaixo do campo em vez de um alerta
      setError("Cupom inválido. Escolha um dos cupons abaixo.");
    }
  };

  return (
    <View style={cardStyles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
          <View style={styles.texts}>
            <Text style={styles.title}>Cupom</Text>
            <Text style={styles.subtitle}>
              {appliedCoupon
                ? `Cupom ${appliedCoupon.code} aplicado (-${formatCurrency(discount)})`
                : `${AVAILABLE_COUPONS.length} cupons disponíveis para usar nesta loja`}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={appliedCoupon ? onRemove : () => setOpen(true)}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={appliedCoupon ? "Remover cupom" : "Adicionar cupom"}
        >
          <Text style={cardStyles.actionText}>{appliedCoupon ? "Remover" : "Adicionar"}</Text>
        </Pressable>
      </View>

      <BottomSheet visible={open} title="Cupons de Desconto" onClose={() => setOpen(false)}>
        {/* Campo para digitar o código */}
        <View style={styles.inputRow}>
          <AppInput
            placeholder="Código (ex: FOODRUSH10)"
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              setError("");
            }}
            autoCapitalize="characters"
            error={error}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <AppButton
            title="Aplicar"
            size="sm"
            onPress={handleApplyCode}
            style={{ marginLeft: spacing.sm, height: 48 }}
          />
        </View>

        <Text style={styles.availableTitle}>Cupons disponíveis para você:</Text>

        {AVAILABLE_COUPONS.map((coupon) => (
          <View key={coupon.code} style={styles.optionCard}>
            <View style={styles.optionInfo}>
              <View style={styles.badgeRow}>
                <Text style={styles.codeText}>{coupon.code}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{coupon.title}</Text>
                </View>
              </View>
              <Text style={styles.descText}>{coupon.description}</Text>
            </View>
            <AppButton title="Usar" size="sm" variant="outline" onPress={() => apply(coupon)} />
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  texts: {
    gap: 2,
    flex: 1,
  },
  title: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  button: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  availableTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  optionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  codeText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  descText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
});
