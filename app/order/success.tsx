import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { AppButton } from "@/src/components/ui/AppButton";

/**
 * Tela de pedido entregue, com atalho para avaliar.
 */
export default function OrderSuccessScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark-circle" size={88} color={colors.success} />
        </View>

        <Text style={styles.title}>Pedido concluído!</Text>
        <Text style={styles.subtitle}>
          Agradecemos por pedir com a gente! Seu pedido foi entregue com sucesso.
        </Text>
      </View>

      <View style={styles.footer}>
        <AppButton
          title="Avaliar pedido"
          onPress={() => router.push("/order/review")}
          size="lg"
          style={styles.reviewButton}
        />

        <AppButton
          title="Voltar para o início"
          variant="outline"
          onPress={() => router.replace("/(tabs)")}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  footer: {
    width: "100%",
    gap: spacing.md,
  },
  reviewButton: {
    marginBottom: spacing.xs,
  },
});

