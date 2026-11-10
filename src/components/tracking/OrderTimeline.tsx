import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { OrderStatus } from "@/src/types";

// Etapas do pedido, na ordem em que acontecem
const STEPS: { status: OrderStatus; title: string }[] = [
  { status: "placed", title: "Pedido realizado" },
  { status: "preparing", title: "Em preparo" },
  { status: "out_for_delivery", title: "Saiu para entrega" },
  { status: "arriving", title: "Chegando" },
];

/**
 * Linha do tempo do pedido. Cada etapa fica:
 * - concluída (verde, com ✓) se já passou,
 * - atual (vermelha) se é o status do pedido,
 * - futura (cinza) se ainda não aconteceu.
 */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex =
    status === "delivered" ? STEPS.length : STEPS.findIndex((s) => s.status === status);

  return (
    <View style={styles.timeline}>
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <View key={step.status} style={styles.row}>
            <View style={styles.indicatorColumn}>
              <View
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isCompleted ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.line, isCompleted && styles.lineCompleted]} />
              )}
            </View>
            <Text
              style={[
                styles.text,
                isCurrent && styles.textCurrent,
                isCompleted && styles.textCompleted,
              ]}
            >
              {step.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 44,
  },
  indicatorColumn: {
    alignItems: "center",
    width: 24,
    marginRight: spacing.md,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCompleted: {
    backgroundColor: colors.success,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray300,
    marginVertical: 2,
  },
  lineCompleted: {
    backgroundColor: colors.success,
  },
  text: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.gray400,
    paddingTop: 1,
  },
  textCurrent: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  textCompleted: {
    fontFamily: typography.medium,
    color: colors.text,
  },
});
