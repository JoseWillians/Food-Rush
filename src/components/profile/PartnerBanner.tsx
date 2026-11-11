import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { showMessage } from "@/src/utils/dialog";

/**
 * Cartão do perfil ligado à loja:
 * - empreendedor: mostra a loja, abre/fecha e leva ao painel "Minha Loja";
 * - cliente: convida a cadastrar uma loja (onBecomePartner abre o formulário).
 */
export function PartnerBanner({ onBecomePartner }: { onBecomePartner: () => void }) {
  const { user, updateUser } = useAuth();
  const store = user?.store;

  if (!store) {
    return (
      <Pressable
        style={styles.inviteCard}
        onPress={onBecomePartner}
        accessibilityRole="button"
        accessibilityLabel="Cadastrar minha loja no Food Rush"
      >
        <View style={styles.inviteIcon}>
          <Ionicons name="storefront-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteTitle}>Vende comida ou tem restaurante?</Text>
          <Text style={styles.inviteSub}>Cadastre sua loja e venda pelo Food Rush!</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    );
  }

  // Loja sem a informação conta como aberta
  const isOpen = store.isOpen !== false;

  const handleToggleOpen = async () => {
    await updateUser({ store: { ...store, isOpen: !isOpen } });
    await api.setStoreOpen(store.id, !isOpen); // atualiza a loja que os clientes veem
    showMessage(
      "Status da Loja",
      !isOpen ? "Sua loja agora está ABERTA para receber pedidos!" : "Sua loja foi marcada como FECHADA."
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="storefront" size={14} color={colors.white} />
          <Text style={styles.badgeText}>Empreendedor Food Rush</Text>
        </View>
        <Pressable
          style={[styles.statusPill, isOpen ? styles.pillOpen : styles.pillClosed]}
          onPress={handleToggleOpen}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOpen }}
          accessibilityLabel="Abrir ou fechar a loja"
        >
          <View style={[styles.dot, { backgroundColor: isOpen ? colors.success : colors.gray400 }]} />
          <Text style={[styles.statusText, { color: isOpen ? colors.success : colors.textSecondary }]}>
            {isOpen ? "Aberta" : "Fechada"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.storeName}>{store.name}</Text>
      <Text style={styles.storeDetails}>
        Categoria: {store.category} • Entrega: {store.deliveryTime ?? "30-45 min"}
      </Text>

      <Pressable
        style={styles.manageButton}
        onPress={() => router.push("/store" as any)}
        accessibilityRole="button"
      >
        <Ionicons name="restaurant-outline" size={16} color={colors.white} />
        <Text style={styles.manageText}>Gerenciar Loja, Pratos e Pedidos</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: colors.white,
    textTransform: "uppercase",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillOpen: {
    backgroundColor: "#E8F8EE",
    borderColor: colors.success,
  },
  pillClosed: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
  },
  storeName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  storeDetails: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  manageText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.white,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(250, 44, 44, 0.2)",
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  inviteTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  inviteSub: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.text,
    marginTop: 2,
  },
});
