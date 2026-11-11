import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { STORAGE_KEYS, storageGet } from "@/src/utils/storage";
import { useAuth } from "@/src/contexts/AuthContext";

/**
 * Tela de abertura (splash). Espera o AuthContext carregar e decide para onde ir:
 * boas-vindas (primeira vez), login (sem usuário) ou tela inicial (já logado).
 */
export default function SplashScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Espera o AuthContext terminar de ler o usuário salvo. Sem isso, a tela
    // poderia decidir o caminho antes de saber se alguém está logado.
    if (isLoading) return;

    const delay = Platform.OS === "web" ? 300 : 1800;
    const timer = setTimeout(async () => {
      const onboardingCompleted = await storageGet<boolean>(
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        false
      );

      if (!onboardingCompleted) {
        router.replace("/onboarding");
      } else if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/login");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="bicycle" size={64} color={colors.primary} />
        </View>

        <Text style={styles.brandTitle}>FOOD RUSH</Text>
        <Text style={styles.slogan}>Sua fome não pode esperar!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ minHeight: "100vh", width: "100%" } as any) : {}),
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  brandTitle: {
    fontSize: fontSizes.display,
    fontFamily: typography.extraBold,
    fontStyle: "italic",
    color: colors.white,
    letterSpacing: 2,
    textAlign: "center",
  },
  slogan: {
    marginTop: spacing.xs,
    fontSize: fontSizes.md,
    fontFamily: typography.medium,
    color: colors.white,
    opacity: 0.95,
    textAlign: "center",
  },
});
