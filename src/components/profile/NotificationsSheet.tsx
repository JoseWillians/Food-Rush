import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { useAuth } from "@/src/contexts/AuthContext";
import { NotificationPreferences } from "@/src/types";

type SheetProps = { visible: boolean; onClose: () => void };

// Cada linha da janela: qual preferência ela liga/desliga e o texto mostrado
const OPTIONS: { key: keyof NotificationPreferences; title: string; desc: string }[] = [
  {
    key: "orderUpdates",
    title: "Status do Pedido",
    desc: "Avisos sobre preparo, saída e chegada do entregador.",
  },
  {
    key: "promotions",
    title: "Promoções e Cupons",
    desc: "Descontos, frete grátis e novidades.",
  },
  {
    key: "whatsappUpdates",
    title: "Mensagens no WhatsApp",
    desc: "Confirmação de pedido e chave Pix pelo WhatsApp.",
  },
];

const DEFAULT_PREFS: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  whatsappUpdates: false,
};

/** Janela de preferências de notificação (liga/desliga com Switch). */
export function NotificationsSheet({ visible, onClose }: SheetProps) {
  const { user, updateUser } = useAuth();
  const prefs = user?.notifications ?? DEFAULT_PREFS;

  const toggle = (key: keyof NotificationPreferences, value: boolean) =>
    updateUser({ notifications: { ...prefs, [key]: value } });

  return (
    <BottomSheet visible={visible} title="Notificações" onClose={onClose}>
      {OPTIONS.map((opt, idx) => (
        <View
          key={opt.key}
          style={[styles.row, idx === OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
        >
          <View style={styles.info}>
            <Text style={styles.title}>{opt.title}</Text>
            <Text style={styles.desc}>{opt.desc}</Text>
          </View>
          <Switch
            value={prefs[opt.key]}
            onValueChange={(val) => toggle(opt.key, val)}
            trackColor={{ false: colors.gray200, true: colors.primary }}
            thumbColor={colors.white}
            accessibilityLabel={opt.title}
          />
        </View>
      ))}
      <AppButton title="Concluído" onPress={onClose} style={{ marginTop: spacing.lg }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  desc: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
