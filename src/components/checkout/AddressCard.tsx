import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { useAuth } from "@/src/contexts/AuthContext";
import { UserAddress } from "@/src/types";
import { cardStyles } from "./checkoutStyles";

// "Rua das Flores, 123 - Centro, Santa Inês - MA"
export const formatAddress = (a: UserAddress) =>
  `${a.street}, ${a.number} - ${a.neighborhood}, ${a.city}`;

/**
 * Cartão "Endereço de Entrega" do checkout.
 * O botão "Alterar" abre uma lista com os endereços salvos no perfil.
 */
export function AddressCard() {
  const { user, updateUser } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const addresses = user?.addresses ?? [];

  const handleSelect = async (address: UserAddress) => {
    // O escolhido vira o endereço padrão (e o usado no pedido)
    await updateUser({
      address: formatAddress(address),
      addresses: addresses.map((a) => ({ ...a, isDefault: a.id === address.id })),
    });
    setPickerOpen(false);
  };

  const goToProfile = () => {
    setPickerOpen(false);
    router.push("/(tabs)/profile");
  };

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={cardStyles.title}>Endereço de Entrega</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alterar endereço de entrega"
          onPress={() => (addresses.length > 0 ? setPickerOpen(true) : goToProfile())}
        >
          <Text style={cardStyles.actionText}>Alterar</Text>
        </Pressable>
      </View>
      <Text style={styles.addressLine}>{user?.address || "Cadastre um endereço no perfil"}</Text>

      <BottomSheet
        visible={pickerOpen}
        title="Entregar em"
        icon="location"
        onClose={() => setPickerOpen(false)}
      >
        {addresses.map((address) => {
          const selected = Boolean(address.isDefault);
          return (
            <Pressable
              key={address.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => handleSelect(address)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Ionicons
                name={selected ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={selected ? colors.primary : colors.gray400}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{address.label}</Text>
                <Text style={styles.optionText}>{formatAddress(address)}</Text>
              </View>
            </Pressable>
          );
        })}
        <AppButton
          title="Gerenciar endereços"
          variant="outline"
          onPress={goToProfile}
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addressLine: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
    marginTop: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  optionText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
});
