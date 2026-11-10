import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";

type CourierCardProps = {
  name: string;
  rating: number;
  onCall: () => void;
  onChat: () => void;
};

/** Cartão do entregador com botões de ligar e abrir o chat. */
export function CourierCard({ name, rating, onCall, onChat }: CourierCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>Entregador Parceiro</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          <Text style={styles.deliveries}>• 342 entregas</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={styles.iconButton}
          onPress={onCall}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ligar para o entregador"
        >
          <Ionicons name="call" size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={onChat}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Abrir chat com a loja ou entregador"
        >
          <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  role: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
  },
  deliveries: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.gray400,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
