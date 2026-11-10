import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";

type SheetProps = { visible: boolean; onClose: () => void };

/** Janela "Sobre o app": versão e informações gerais. */
export function AboutSheet({ visible, onClose }: SheetProps) {
  return (
    <BottomSheet visible={visible} title="Sobre o FOOD RUSH" onClose={onClose}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="fast-food" size={40} color={colors.white} />
        </View>
        <Text style={styles.appName}>FOOD RUSH</Text>
        <Text style={styles.version}>Versão 1.1.0</Text>
      </View>

      <Text style={styles.paragraph}>
        O <Text style={styles.bold}>FOOD RUSH</Text> é um app de delivery de refeições, lanches e
        bebidas, feito como trabalho da disciplina de Programação para Dispositivos Móveis.
      </Text>

      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Privacidade</Text>
          <Text style={styles.cardDesc}>
            Nesta versão, seus dados ficam salvos só neste aparelho (AsyncStorage).
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Ionicons name="flash-outline" size={20} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Acompanhamento do pedido</Text>
          <Text style={styles.cardDesc}>
            Veja cada etapa do pedido, do preparo até a entrega, e fale com a loja pelo chat.
          </Text>
        </View>
      </View>

      <AppButton title="Entendido" onPress={onClose} style={{ marginTop: spacing.md }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  version: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paragraph: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  bold: {
    fontFamily: typography.bold,
    color: colors.text,
  },
  card: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
