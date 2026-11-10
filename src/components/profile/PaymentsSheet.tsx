import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { SavedPaymentMethod } from "@/src/types";
import { showMessage } from "@/src/utils/dialog";
import { onlyDigits } from "@/src/utils/validation";
import { sheetStyles } from "./profileStyles";

type SheetProps = { visible: boolean; onClose: () => void };
type FieldErrors = Record<string, string>;

/** "1229" -> "12/29" enquanto digita a validade */
const formatExpiry = (text: string) => {
  const digits = onlyDigits(text).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/**
 * Janela "Formas de Pagamento": escolher a forma preferida e cadastrar cartão.
 * Por segurança, só os 4 últimos dígitos do cartão ficam salvos.
 */
export function PaymentsSheet({ visible, onClose }: SheetProps) {
  const { user, updateUser } = useAuth();
  const payments = user?.savedPaymentMethods ?? [];

  const [showForm, setShowForm] = useState(false);
  const [holder, setHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSelectDefault = (id: string) =>
    updateUser({ savedPaymentMethods: payments.map((p) => ({ ...p, isDefault: p.id === id })) });

  const resetForm = () => {
    setHolder("");
    setCardNumber("");
    setExpiry("");
    setErrors({});
    setShowForm(false);
  };

  const handleAddCard = async () => {
    const digits = onlyDigits(cardNumber);
    const [mes] = expiry.split("/").map(Number);
    const found: FieldErrors = {};
    if (!holder.trim()) found.holder = "Informe o nome impresso no cartão.";
    if (digits.length < 13 || digits.length > 19) found.number = "Número do cartão inválido.";
    if (!/^\d{2}\/\d{2}$/.test(expiry) || mes < 1 || mes > 12) found.expiry = "Use o formato MM/AA.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const novo: SavedPaymentMethod = {
      id: `pay-${Date.now()}`,
      type: "credit",
      title: "Cartão de Crédito",
      details: `Cartão •••• ${digits.slice(-4)}`,
      isDefault: payments.length === 0,
    };
    await updateUser({ savedPaymentMethods: [...payments, novo] });
    resetForm();
    showMessage("Sucesso", "Cartão salvo!");
  };

  return (
    <BottomSheet visible={visible} title="Formas de Pagamento" onClose={onClose}>
      <Text style={sheetStyles.subtitle}>
        {payments.length > 0
          ? "Selecione a sua forma de pagamento preferida:"
          : "Nenhuma forma de pagamento salva. Cadastre um cartão abaixo."}
      </Text>

      {payments.map((p) => (
        <Pressable
          key={p.id}
          style={[sheetStyles.option, p.isDefault && sheetStyles.optionActive]}
          onPress={() => handleSelectDefault(p.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: Boolean(p.isDefault) }}
        >
          <View style={styles.left}>
            <View style={[styles.iconBox, p.isDefault && styles.iconBoxActive]}>
              <Ionicons
                name={p.type === "pix" ? "flash-outline" : "card-outline"}
                size={22}
                color={p.isDefault ? colors.primary : colors.text}
              />
            </View>
            <View>
              <View style={sheetStyles.labelRow}>
                <Text style={sheetStyles.optionTitle}>{p.title}</Text>
                {p.isDefault && (
                  <View style={sheetStyles.defaultBadge}>
                    <Text style={sheetStyles.defaultBadgeText}>Padrão</Text>
                  </View>
                )}
              </View>
              <Text style={sheetStyles.optionText}>{p.details}</Text>
            </View>
          </View>
          <Ionicons
            name={p.isDefault ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={p.isDefault ? colors.primary : colors.gray300}
          />
        </Pressable>
      ))}

      {!showForm ? (
        <AppButton
          title="+ Cadastrar Novo Cartão"
          variant="outline"
          onPress={() => setShowForm(true)}
          style={{ marginTop: spacing.md }}
        />
      ) : (
        <View style={sheetStyles.formBox}>
          <Text style={sheetStyles.formTitle}>Adicionar Cartão</Text>
          <AppInput
            label="Nome impresso no cartão"
            value={holder}
            onChangeText={setHolder}
            autoCapitalize="characters"
            error={errors.holder}
            containerStyle={sheetStyles.formInput}
          />
          <AppInput
            label="Número do Cartão"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="numeric"
            maxLength={23}
            error={errors.number}
            containerStyle={sheetStyles.formInput}
          />
          <AppInput
            label="Validade (MM/AA)"
            placeholder="12/29"
            value={expiry}
            onChangeText={(t) => setExpiry(formatExpiry(t))}
            keyboardType="numeric"
            maxLength={5}
            error={errors.expiry}
            containerStyle={sheetStyles.formInput}
          />
          <View style={sheetStyles.buttonRow}>
            <AppButton title="Cancelar" variant="ghost" onPress={resetForm} style={{ flex: 1 }} />
            <AppButton title="Salvar Cartão" onPress={handleAddCard} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: colors.primaryLight,
  },
});
