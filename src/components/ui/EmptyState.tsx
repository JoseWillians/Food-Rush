import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { AppButton } from "./AppButton";

type IconName = keyof typeof Ionicons.glyphMap;

export type EmptyStateProps = {
  icon: IconName; // ícone principal da ilustração
  accentIcon?: IconName; // ícone pequeno no canto (ex.: lupa, coração)
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Tela de "lista vazia" com uma ilustração feita de formas e ícones
 * (círculos sobrepostos + ícone principal + ícone de destaque), sem precisar de imagens.
 */
export function EmptyState({
  icon,
  accentIcon = "sparkles",
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.illustration}>
        <View style={styles.outerCircle} />
        <View style={styles.innerCircle}>
          <Ionicons name={icon} size={52} color={colors.primary} />
        </View>
        <View style={[styles.dot, styles.dotTop]} />
        <View style={[styles.dot, styles.dotBottom]} />
        <View style={styles.accentBadge}>
          <Ionicons name={accentIcon} size={18} color={colors.white} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction ? (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const SIZE = 150;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  illustration: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  outerCircle: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
  innerCircle: {
    width: SIZE * 0.66,
    height: SIZE * 0.66,
    borderRadius: SIZE,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dot: {
    position: "absolute",
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  dotTop: {
    width: 12,
    height: 12,
    top: 12,
    left: 18,
    opacity: 0.5,
  },
  dotBottom: {
    width: 8,
    height: 8,
    bottom: 22,
    left: 6,
    opacity: 0.35,
  },
  accentBadge: {
    position: "absolute",
    right: 14,
    bottom: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
  },
  title: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: "center",
  },
  message: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  button: {
    marginTop: spacing.lg,
    minWidth: 180,
  },
});
