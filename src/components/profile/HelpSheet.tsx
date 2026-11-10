import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { confirmDialog } from "@/src/utils/dialog";
import { sheetStyles } from "./profileStyles";

type SheetProps = { visible: boolean; onClose: () => void };

// Perguntas frequentes (toque para abrir a resposta)
const FAQ = [
  {
    q: "Como acompanhar meu pedido?",
    a: "Depois de finalizar a compra você vai para a tela de acompanhamento, com o status do pedido e o mapa. Você também acessa seus pedidos pela aba 'Pedidos'.",
  },
  {
    q: "Como cancelar ou alterar um pedido?",
    a: "Se a loja ainda não aceitou o pedido, fale com a gente pelo chat para pedir o cancelamento ou a alteração.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "Pix, cartões de crédito e débito e dinheiro na entrega.",
  },
];

const SUPPORT_PHONE = "08001234567";

/** Janela "Ajuda e Suporte": perguntas frequentes, chat e telefone. */
export function HelpSheet({ visible, onClose }: SheetProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleCall = async () => {
    const ok = await confirmDialog("Central de Ajuda", "Ligar para 0800 123 4567?", "Ligar");
    if (ok) Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
  };

  return (
    <BottomSheet visible={visible} title="Ajuda e Suporte" onClose={onClose}>
      <Text style={sheetStyles.subtitle}>Perguntas frequentes:</Text>

      {FAQ.map((item, idx) => {
        const isOpen = expanded === idx;
        return (
          <Pressable
            key={item.q}
            style={styles.faqCard}
            onPress={() => setExpanded(isOpen ? null : idx)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.question}>{item.q}</Text>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.text} />
            </View>
            {isOpen && <Text style={styles.answer}>{item.a}</Text>}
          </Pressable>
        );
      })}

      <Text style={[sheetStyles.subtitle, { marginTop: spacing.lg }]}>Canais de atendimento:</Text>
      <AppButton
        title="Abrir Chat de Atendimento"
        leftIcon={<Ionicons name="chatbubbles-outline" size={20} color={colors.white} />}
        onPress={() => {
          onClose();
          router.push("/order/chat");
        }}
        style={{ marginBottom: spacing.sm }}
      />
      <AppButton
        title="Ligar para o Suporte"
        variant="outline"
        leftIcon={<Ionicons name="call-outline" size={20} color={colors.primary} />}
        onPress={handleCall}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  faqCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  question: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  answer: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
