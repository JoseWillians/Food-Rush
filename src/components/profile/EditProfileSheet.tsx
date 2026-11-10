import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { showMessage } from "@/src/utils/dialog";
import { formatPhone, isValidEmail, isValidPhone } from "@/src/utils/validation";
import { sheetStyles } from "./profileStyles";

// Fotos de perfil que o usuário pode escolher
export const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
];

type SheetProps = { visible: boolean; onClose: () => void };
type FieldErrors = Record<string, string>;

/** Janela "Meus dados": foto, nome, sobrenome, e-mail e telefone. */
export function EditProfileSheet({ visible, onClose }: SheetProps) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Toda vez que a janela abre, preenche com os dados atuais do usuário
  useEffect(() => {
    if (visible && user) {
      setName(user.name);
      setLastName(user.lastName ?? "");
      setEmail(user.email);
      setPhone(user.phone ?? "");
      setAvatar(user.avatar ?? PRESET_AVATARS[0]);
      setErrors({});
    }
  }, [visible, user]);

  const handleSave = async () => {
    const found: FieldErrors = {};
    if (!name.trim()) found.name = "Informe seu nome.";
    if (!isValidEmail(email)) found.email = "Digite um e-mail válido.";
    if (phone.trim() && !isValidPhone(phone)) found.phone = "Digite o DDD e o número completo.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    await updateUser({
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone,
      avatar,
    });
    showMessage("Sucesso", "Seus dados foram atualizados!");
    onClose();
  };

  return (
    <BottomSheet visible={visible} title="Editar Meus Dados" onClose={onClose}>
      <Text style={styles.label}>Escolha sua foto:</Text>
      <View style={styles.avatarsRow}>
        {PRESET_AVATARS.map((uri) => (
          <Pressable
            key={uri}
            onPress={() => setAvatar(uri)}
            style={[styles.avatarChoice, avatar === uri && styles.avatarChoiceSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: avatar === uri }}
            accessibilityLabel="Escolher esta foto"
          >
            <Image source={{ uri }} style={styles.avatarImg} />
          </Pressable>
        ))}
      </View>

      <AppInput
        label="Nome"
        value={name}
        onChangeText={setName}
        error={errors.name}
        leftIcon={<Ionicons name="person-outline" size={18} color={colors.gray400} />}
        containerStyle={sheetStyles.formInput}
      />
      <AppInput
        label="Sobrenome"
        value={lastName}
        onChangeText={setLastName}
        leftIcon={<Ionicons name="person-outline" size={18} color={colors.gray400} />}
        containerStyle={sheetStyles.formInput}
      />
      <AppInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        leftIcon={<Ionicons name="mail-outline" size={18} color={colors.gray400} />}
        containerStyle={sheetStyles.formInput}
      />
      <AppInput
        label="Telefone / WhatsApp"
        placeholder="(98) 98765-4321"
        value={phone}
        onChangeText={(t) => setPhone(formatPhone(t))}
        keyboardType="phone-pad"
        maxLength={15}
        error={errors.phone}
        leftIcon={<Ionicons name="call-outline" size={18} color={colors.gray400} />}
        containerStyle={sheetStyles.formInput}
      />

      <AppButton title="Salvar Alterações" onPress={handleSave} style={{ marginTop: spacing.md }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  avatarsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarChoice: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 2,
  },
  avatarChoiceSelected: {
    borderColor: colors.primary,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
});
