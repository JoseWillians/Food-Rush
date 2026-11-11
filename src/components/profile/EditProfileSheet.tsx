import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { showMessage } from "@/src/utils/dialog";
import { formatPhone, isValidEmail, isValidPhone } from "@/src/utils/validation";
import { sheetStyles } from "./profileStyles";
import * as ImagePicker from "expo-image-picker";

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
  const [uploading, setUploading] = useState(false);

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

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage("Permissão necessária", "Permita acesso à galeria para enviar uma nova foto.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);
        try {
          if (asset.base64) {
            const uploaded = await api.uploadImage({
              base64: `data:image/jpeg;base64,${asset.base64}`,
              fileName: `avatar-${Date.now()}.jpg`,
              folder: "avatars",
            });
            setAvatar(uploaded.url);
          } else if (asset.uri) {
            setAvatar(asset.uri);
          }
        } finally {
          setUploading(false);
        }
      }
    } catch (err: any) {
      setUploading(false);
      showMessage("Erro no upload", err.message || "Tente novamente.");
    }
  };

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
      <Text style={styles.label}>Escolha sua foto ou envie uma nova:</Text>
      <View style={styles.avatarsRow}>
        <Pressable
          onPress={handlePickAvatar}
          disabled={uploading}
          style={[styles.avatarChoice, styles.uploadChoice]}
          accessibilityRole="button"
          accessibilityLabel="Enviar foto da galeria"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
          )}
        </Pressable>

        {/* Se o avatar atual for personalizado e não estiver nos presets */}
        {!PRESET_AVATARS.includes(avatar) && (
          <Pressable
            style={[styles.avatarChoice, styles.avatarChoiceSelected]}
            accessibilityRole="button"
            accessibilityLabel="Foto enviada por você"
          >
            <Image source={{ uri: avatar }} style={styles.avatarImg} />
          </Pressable>
        )}

        {PRESET_AVATARS.map((uri) => (
          <Pressable
            key={uri}
            onPress={() => setAvatar(uri)}
            style={[styles.avatarChoice, avatar === uri && styles.avatarChoiceSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: avatar === uri }}
            accessibilityLabel="Escolher esta foto"
          >
            <Image source={{ uri: uri }} style={styles.avatarImg} />
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
  uploadChoice: {
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
});
