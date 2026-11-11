import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { PartnerStore } from "@/src/types";
import { showMessage } from "@/src/utils/dialog";
import { parsePrice } from "@/src/utils/validation";
import { STORE_CATEGORIES } from "@/src/constants/stores";
import { sheetStyles } from "./profileStyles";

type SheetProps = { visible: boolean; onClose: () => void };
type FieldErrors = Record<string, string>;

/** Janela "Cadastre sua Loja": transforma o cliente em empreendedor. */
export function BecomePartnerSheet({ visible, onClose }: SheetProps) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Lanches");
  const [fee, setFee] = useState("5,99");
  const [time, setTime] = useState("30-45 min");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const found: FieldErrors = {};
    const feeValue = parsePrice(fee);
    if (!name.trim()) found.name = "Informe o nome da sua loja.";
    if (!time.trim()) found.time = "Informe o tempo médio.";
    if (feeValue === null) found.fee = "Use só números. Ex: 5,99 ou 0";
    setErrors(found);
    if (Object.keys(found).length > 0 || feeValue === null) return;

    setSaving(true);
    try {
      const store: PartnerStore = {
        id: `store-${Date.now()}`,
        name: name.trim(),
        category,
        deliveryTime: time.trim(),
        deliveryFee: feeValue,
        address: address.trim() || user?.address || "Endereço cadastrado",
        isOpen: true,
      };
      await updateUser({ role: "partner", store });

      // Cadastra a loja uma única vez, com o mesmo id salvo no usuário
      await api.registerPartner({
        id: store.id,
        ownerName: `${user?.name ?? ""} ${user?.lastName ?? ""}`.trim(),
        ownerEmail: user?.email ?? "",
        storeName: store.name,
        category: store.category,
        deliveryTime: store.deliveryTime,
        deliveryFee: store.deliveryFee,
        address: store.address,
      });

      onClose();
      showMessage("Parabéns!", `Sua loja "${store.name}" foi cadastrada!`);
      // Leva direto ao painel da loja para cadastrar os pratos
      router.push("/store" as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Cadastre sua Loja" icon="storefront" onClose={onClose}>
      <Text style={sheetStyles.subtitle}>Preencha os dados do seu restaurante para começar a vender:</Text>

      <AppInput
        label="Nome da Loja / Restaurante"
        placeholder="Ex: Pizzaria Forno Nobre"
        value={name}
        onChangeText={setName}
        error={errors.name}
        leftIcon={<Ionicons name="restaurant-outline" size={18} color={colors.gray400} />}
        containerStyle={sheetStyles.formInput}
      />

      {/* Categoria em botões: só aceita as categorias que o app conhece */}
      <Text style={sheetStyles.chipsLabel}>Categoria</Text>
      <View style={sheetStyles.chipsRow}>
        {STORE_CATEGORIES.map((cat) => {
          const selected = category === cat;
          return (
            <Pressable
              key={cat}
              style={[sheetStyles.chip, selected && sheetStyles.chipSelected]}
              onPress={() => setCategory(cat)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[sheetStyles.chipText, selected && sheetStyles.chipTextSelected]}>{cat}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={sheetStyles.twoColumns}>
        <AppInput
          label="Tempo Médio"
          placeholder="Ex: 30-45 min"
          value={time}
          onChangeText={setTime}
          error={errors.time}
          containerStyle={{ flex: 1 }}
        />
        <AppInput
          label="Taxa de Entrega (R$)"
          placeholder="Ex: 5,99"
          value={fee}
          onChangeText={setFee}
          keyboardType="decimal-pad"
          error={errors.fee}
          containerStyle={{ flex: 1 }}
        />
      </View>

      <AppInput
        label="Endereço Comercial"
        placeholder="Ex: Av. Brasil, 250 - Centro"
        value={address}
        onChangeText={setAddress}
        leftIcon={<Ionicons name="location-outline" size={18} color={colors.gray400} />}
        containerStyle={sheetStyles.formInput}
      />

      <AppButton
        title="Concluir e Abrir Minha Loja"
        onPress={handleCreate}
        loading={saving}
        leftIcon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />}
        style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
      />
    </BottomSheet>
  );
}
