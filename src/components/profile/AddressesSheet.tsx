import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { UserAddress } from "@/src/types";
import { confirmDialog, showMessage } from "@/src/utils/dialog";
import { formatAddress } from "@/src/components/checkout/AddressCard";
import { sheetStyles } from "./profileStyles";

type SheetProps = { visible: boolean; onClose: () => void };
type FieldErrors = Record<string, string>;

/**
 * Janela "Meus Endereços": escolher o endereço padrão, adicionar e excluir.
 * O endereço padrão é o usado no checkout.
 */
export function AddressesSheet({ visible, onClose }: SheetProps) {
  const { user, updateUser } = useAuth();
  const addresses = user?.addresses ?? [];

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Santa Inês - MA");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Salva a lista e atualiza o "endereço atual" do usuário com o padrão
  const saveAddresses = async (list: UserAddress[]) => {
    const padrao = list.find((a) => a.isDefault);
    await updateUser({ addresses: list, address: padrao ? formatAddress(padrao) : "" });
  };

  const handleSelectDefault = (id: string) =>
    saveAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));

  const resetForm = () => {
    setLabel("");
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setErrors({});
    setShowForm(false);
  };

  const handleAdd = async () => {
    const found: FieldErrors = {};
    if (!street.trim()) found.street = "Informe a rua.";
    if (!number.trim()) found.number = "Informe o número.";
    if (!neighborhood.trim()) found.neighborhood = "Informe o bairro.";
    if (!city.trim()) found.city = "Informe a cidade.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const novo: UserAddress = {
      id: `addr-${Date.now()}`,
      label: label.trim() || "Outro",
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      isDefault: addresses.length === 0, // o primeiro endereço já vira o padrão
    };
    await saveAddresses([...addresses, novo]);
    resetForm();
    showMessage("Sucesso", "Novo endereço cadastrado!");
  };

  const handleDelete = async (address: UserAddress) => {
    const ok = await confirmDialog("Excluir endereço", `Excluir "${address.label}"?`, "Excluir", true);
    if (!ok) return;
    const restantes = addresses.filter((a) => a.id !== address.id);
    // Se excluiu o padrão, o primeiro que sobrou vira o padrão
    if (restantes.length > 0 && !restantes.some((a) => a.isDefault)) {
      restantes[0] = { ...restantes[0], isDefault: true };
    }
    await saveAddresses(restantes);
  };

  return (
    <BottomSheet visible={visible} title="Meus Endereços" onClose={onClose}>
      <Text style={sheetStyles.subtitle}>
        {addresses.length > 0
          ? "Toque para escolher o endereço de entrega padrão:"
          : "Você ainda não tem endereços. Cadastre o primeiro abaixo."}
      </Text>

      {addresses.map((addr) => (
        <View key={addr.id} style={[sheetStyles.option, addr.isDefault && sheetStyles.optionActive]}>
          <Pressable
            style={styles.main}
            onPress={() => handleSelectDefault(addr.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: Boolean(addr.isDefault) }}
          >
            <Ionicons
              name={addr.label.toLowerCase() === "trabalho" ? "briefcase" : "home"}
              size={22}
              color={addr.isDefault ? colors.primary : colors.gray400}
            />
            <View style={{ flex: 1 }}>
              <View style={sheetStyles.labelRow}>
                <Text style={sheetStyles.optionTitle}>{addr.label}</Text>
                {addr.isDefault && (
                  <View style={sheetStyles.defaultBadge}>
                    <Text style={sheetStyles.defaultBadgeText}>Padrão</Text>
                  </View>
                )}
              </View>
              <Text style={sheetStyles.optionText}>{formatAddress(addr)}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => handleDelete(addr)}
            hitSlop={8}
            style={{ padding: spacing.xs }}
            accessibilityRole="button"
            accessibilityLabel={`Excluir endereço ${addr.label}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      ))}

      {!showForm ? (
        <AppButton
          title="+ Adicionar Novo Endereço"
          variant="outline"
          onPress={() => setShowForm(true)}
          style={{ marginTop: spacing.md }}
        />
      ) : (
        <View style={sheetStyles.formBox}>
          <Text style={sheetStyles.formTitle}>Novo Endereço</Text>
          <AppInput
            label="Apelido (ex: Casa, Trabalho)"
            placeholder="Casa"
            value={label}
            onChangeText={setLabel}
            containerStyle={sheetStyles.formInput}
          />
          <AppInput
            label="Rua / Avenida"
            value={street}
            onChangeText={setStreet}
            error={errors.street}
            containerStyle={sheetStyles.formInput}
          />
          <View style={sheetStyles.twoColumns}>
            <AppInput
              label="Número"
              value={number}
              onChangeText={setNumber}
              error={errors.number}
              containerStyle={{ flex: 1 }}
            />
            <AppInput
              label="Bairro"
              value={neighborhood}
              onChangeText={setNeighborhood}
              error={errors.neighborhood}
              containerStyle={{ flex: 2 }}
            />
          </View>
          <AppInput
            label="Cidade / Estado"
            value={city}
            onChangeText={setCity}
            error={errors.city}
            containerStyle={sheetStyles.formInput}
          />
          <View style={sheetStyles.buttonRow}>
            <AppButton title="Cancelar" variant="ghost" onPress={resetForm} style={{ flex: 1 }} />
            <AppButton title="Salvar Endereço" onPress={handleAdd} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
