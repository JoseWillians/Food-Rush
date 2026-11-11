import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { useAuth } from "@/src/contexts/AuthContext";
import { confirmDialog } from "@/src/utils/dialog";
import { PartnerBanner } from "@/src/components/profile/PartnerBanner";
import { EditProfileSheet, PRESET_AVATARS } from "@/src/components/profile/EditProfileSheet";
import { AddressesSheet } from "@/src/components/profile/AddressesSheet";
import { PaymentsSheet } from "@/src/components/profile/PaymentsSheet";
import { NotificationsSheet } from "@/src/components/profile/NotificationsSheet";
import { HelpSheet } from "@/src/components/profile/HelpSheet";
import { AboutSheet } from "@/src/components/profile/AboutSheet";
import { BecomePartnerSheet } from "@/src/components/profile/BecomePartnerSheet";

// Qual janela está aberta (null = nenhuma)
type SheetType =
  | "profile"
  | "addresses"
  | "payments"
  | "notifications"
  | "help"
  | "about"
  | "becomePartner"
  | null;

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Tela de Perfil. Ela só monta o menu e controla qual janela está aberta;
 * cada janela é um componente em src/components/profile/.
 */
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  const close = () => setOpenSheet(null);

  // Itens do menu: ícone, título, subtítulo e qual janela abrem
  const menu: { icon: IconName; title: string; sub: string; sheet: SheetType }[] = [
    { icon: "person-outline", title: "Meus dados", sub: "Nome, e-mail, telefone e foto", sheet: "profile" },
    { icon: "location-outline", title: "Endereços", sub: user?.address || "Cadastre um endereço", sheet: "addresses" },
    { icon: "card-outline", title: "Formas de pagamento", sub: "Cartão, Pix e Dinheiro", sheet: "payments" },
    { icon: "notifications-outline", title: "Notificações", sub: "Alertas de pedidos e ofertas", sheet: "notifications" },
    { icon: "help-circle-outline", title: "Ajuda e suporte", sub: "Perguntas frequentes e atendimento", sheet: "help" },
    { icon: "information-circle-outline", title: "Sobre o app", sub: "Versão 1.1.0", sheet: "about" },
  ];

  const handleSignOut = async () => {
    const sair = await confirmDialog("Sair do aplicativo", "Deseja realmente encerrar sua sessão?", "Sair", true);
    if (!sair) return;
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cartão do usuário */}
        <Pressable
          style={styles.userCard}
          onPress={() => setOpenSheet("profile")}
          accessibilityRole="button"
          accessibilityLabel="Editar meus dados de perfil"
        >
          <Image source={{ uri: user?.avatar || PRESET_AVATARS[0] }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{`${user?.name ?? ""} ${user?.lastName ?? ""}`.trim()}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userEmail}>{user.phone}</Text> : null}
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </View>
        </Pressable>

        {/* Atalho exclusivo do Entregador */}
        {user?.role === "courier" && (
          <Pressable
            style={styles.courierBanner}
            onPress={() => router.push("/courier" as any)}
            accessibilityRole="button"
            accessibilityLabel="Abrir Painel do Entregador"
          >
            <View style={styles.courierBannerIcon}>
              <Ionicons name="bicycle" size={24} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courierBannerTitle}>Painel do Entregador</Text>
              <Text style={styles.courierBannerSub}>
                Status: {user.courierProfile?.status === "online" || user.courierProfile?.isOnline ? "Online (Recebendo entregas)" : "Offline"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        )}

        {/* Loja do empreendedor ou convite para cadastrar uma */}
        <PartnerBanner onBecomePartner={() => setOpenSheet("becomePartner")} />

        {/* Menu de opções */}
        <View style={styles.optionsList}>
          {menu.map((item) => (
            <Pressable
              key={item.title}
              style={styles.optionItem}
              onPress={() => setOpenSheet(item.sheet)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={item.icon} size={20} color={colors.text} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{item.title}</Text>
                <Text style={styles.optionSub} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </Pressable>
          ))}

          <Pressable
            style={[styles.optionItem, { borderBottomWidth: 0 }]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sair do aplicativo"
          >
            <View style={[styles.optionIcon, styles.optionIconDanger]}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.error }]}>Sair</Text>
              <Text style={styles.optionSub}>Encerrar sessão no aparelho</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Janelas (cada uma em seu próprio arquivo) */}
      <EditProfileSheet visible={openSheet === "profile"} onClose={close} />
      <AddressesSheet visible={openSheet === "addresses"} onClose={close} />
      <PaymentsSheet visible={openSheet === "payments"} onClose={close} />
      <NotificationsSheet visible={openSheet === "notifications"} onClose={close} />
      <HelpSheet visible={openSheet === "help"} onClose={close} />
      <AboutSheet visible={openSheet === "about"} onClose={close} />
      <BecomePartnerSheet visible={openSheet === "becomePartner"} onClose={close} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray200,
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  optionIconDanger: {
    backgroundColor: colors.primaryLight,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  optionSub: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  courierBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  courierBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  courierBannerTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  courierBannerSub: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
