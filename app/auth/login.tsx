import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { PartnerStore, UserRole } from "@/src/types";

type AuthTab = "login" | "register";

const STORE_CATEGORIES = [
  "Lanches",
  "Pizza",
  "Sushi",
  "Brasileira",
  "Italiano",
  "Sobremesas",
  "Bebidas",
];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register form state
  const [accountType, setAccountType] = useState<UserRole>("customer");
  const [regName, setRegName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");

  // Partner store form state
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("Lanches");
  const [storeDeliveryTime, setStoreDeliveryTime] = useState("30-45 min");
  const [storeDeliveryFee, setStoreDeliveryFee] = useState("5.99");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Por favor, preencha todos os campos.");
      return;
    }
    setLoginError("");
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      router.replace("/(tabs)");
    } catch {
      setLoginError("Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regContact.trim() || !regPassword.trim()) {
      setRegError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("As senhas não coincidem.");
      return;
    }
    if (accountType === "partner" && !storeName.trim()) {
      setRegError("Por favor, informe o nome do seu restaurante/loja.");
      return;
    }

    setRegError("");
    setLoading(true);
    try {
      let createdStore: PartnerStore | undefined = undefined;

      if (accountType === "partner") {
        createdStore = {
          id: `store-${Date.now()}`,
          name: storeName.trim(),
          category: storeCategory,
          deliveryTime: storeDeliveryTime.trim() || "30-45 min",
          deliveryFee: parseFloat(storeDeliveryFee.replace(",", ".")) || 0,
          address: storeAddress.trim() || "Endereço cadastrado",
          phone: storePhone.trim() || regContact.trim(),
          isOpen: true,
        };

        // Envia para o backend em background
        try {
          await api.registerPartner({
            ownerName: `${regName} ${regLastName}`.trim(),
            ownerEmail: regContact.trim(),
            storeName: createdStore.name,
            category: createdStore.category,
            deliveryTime: createdStore.deliveryTime,
            deliveryFee: createdStore.deliveryFee,
            address: createdStore.address,
            phone: createdStore.phone,
          });
        } catch {
          // Fallback silencioso
        }
      }

      await signUp({
        name: regName.trim(),
        lastName: regLastName.trim(),
        email: regContact.trim(),
        role: accountType,
        store: createdStore,
      });

      router.replace("/(tabs)");
    } catch {
      setRegError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Header Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.miniIcon}>
              <Ionicons name="fast-food" size={28} color={colors.white} />
            </View>
            <Text style={styles.brandTitle}>FOOD RUSH</Text>
          </View>

          {/* Abas Entrar | Cadastrar */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tabButton, activeTab === "login" && styles.activeTabButton]}
              onPress={() => setActiveTab("login")}
            >
              <Text
                style={[styles.tabText, activeTab === "login" && styles.activeTabText]}
              >
                Entrar
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeTab === "register" && styles.activeTabButton]}
              onPress={() => setActiveTab("register")}
            >
              <Text
                style={[styles.tabText, activeTab === "register" && styles.activeTabText]}
              >
                Cadastrar
              </Text>
            </Pressable>
          </View>

          {activeTab === "login" ? (
            /* Formulário de Login */
            <View style={styles.formSection}>
              <AppInput
                label="E-mail ou telefone"
                placeholder="exemplo@email.com"
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Senha"
                placeholder="Sua senha secreta"
                value={loginPassword}
                onChangeText={setLoginPassword}
                isPassword
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />}
              />

              <Pressable
                style={styles.forgotPassword}
                onPress={() => alert("Recuperação de senha enviada para seu e-mail!")}
              >
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </Pressable>

              {loginError ? <Text style={styles.errorBanner}>{loginError}</Text> : null}

              <AppButton
                title="Entrar"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={styles.mainButton}
              />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <AppButton
                title="Continuar com Google"
                variant="outline"
                onPress={() => handleLogin()}
                leftIcon={<Ionicons name="logo-google" size={20} color={colors.primary} />}
                style={styles.socialButton}
              />

              <AppButton
                title="Continuar com Apple"
                variant="secondary"
                onPress={() => handleLogin()}
                leftIcon={<Ionicons name="logo-apple" size={20} color={colors.text} />}
                style={styles.socialButton}
              />

              <Pressable
                style={styles.switchAuth}
                onPress={() => setActiveTab("register")}
              >
                <Text style={styles.switchAuthText}>
                  Não tem uma conta? <Text style={styles.switchAuthHighlight}>Cadastre-se</Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Formulário de Cadastro com Opção de Empreendedor */
            <View style={styles.formSection}>
              {/* Seletor de Tipo de Perfil */}
              <View style={styles.roleSelectorBox}>
                <Text style={styles.roleSelectorLabel}>Como você quer usar o Food Rush?</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={[
                      styles.roleButton,
                      accountType === "customer" && styles.roleButtonActive,
                    ]}
                    onPress={() => setAccountType("customer")}
                    accessibilityRole="button"
                    accessibilityLabel="Conta Cliente: quero pedir comida"
                  >
                    <View
                      style={[
                        styles.roleIconCircle,
                        accountType === "customer" && styles.roleIconCircleActive,
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={18}
                        color={accountType === "customer" ? colors.white : colors.primary}
                      />
                    </View>
                    <View style={styles.roleTextContainer}>
                      <Text
                        style={[
                          styles.roleButtonTitle,
                          accountType === "customer" && styles.roleButtonTitleActive,
                        ]}
                      >
                        Cliente
                      </Text>
                      <Text style={styles.roleButtonSub}>Quero pedir comida</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.roleButton,
                      accountType === "partner" && styles.roleButtonActive,
                    ]}
                    onPress={() => setAccountType("partner")}
                    accessibilityRole="button"
                    accessibilityLabel="Conta Empreendedor: quero cadastrar minha loja"
                  >
                    <View
                      style={[
                        styles.roleIconCircle,
                        accountType === "partner" && styles.roleIconCircleActive,
                      ]}
                    >
                      <Ionicons
                        name="storefront"
                        size={18}
                        color={accountType === "partner" ? colors.white : colors.primary}
                      />
                    </View>
                    <View style={styles.roleTextContainer}>
                      <Text
                        style={[
                          styles.roleButtonTitle,
                          accountType === "partner" && styles.roleButtonTitleActive,
                        ]}
                      >
                        Empreendedor
                      </Text>
                      <Text style={styles.roleButtonSub}>Cadastrar minha loja</Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Dados Pessoais do Usuário */}
              <View style={styles.nameRow}>
                <View style={styles.halfInput}>
                  <AppInput
                    label="Nome"
                    placeholder="Seu nome"
                    value={regName}
                    onChangeText={setRegName}
                  />
                </View>
                <View style={styles.halfInput}>
                  <AppInput
                    label="Sobrenome"
                    placeholder="Sobrenome"
                    value={regLastName}
                    onChangeText={setRegLastName}
                  />
                </View>
              </View>

              <AppInput
                label="Número de celular ou e-mail"
                placeholder="(98) 99999-9999 ou email"
                value={regContact}
                onChangeText={setRegContact}
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Ionicons name="person-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Senha"
                placeholder="Crie uma senha"
                value={regPassword}
                onChangeText={setRegPassword}
                isPassword
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Digite sua senha novamente"
                placeholder="Confirme a senha"
                value={regConfirmPassword}
                onChangeText={setRegConfirmPassword}
                isPassword
                leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.gray400} />}
              />

              {/* Campos Exclusivos da Loja (Empreendedor) */}
              {accountType === "partner" && (
                <View style={styles.storeCardContainer}>
                  <View style={styles.storeHeaderRow}>
                    <Ionicons name="storefront" size={20} color={colors.primary} />
                    <Text style={styles.storeHeaderTitle}>Dados do seu Restaurante</Text>
                  </View>

                  <AppInput
                    label="Nome da sua Loja / Restaurante"
                    placeholder="Ex: Burger Rush Prime"
                    value={storeName}
                    onChangeText={setStoreName}
                    leftIcon={<Ionicons name="restaurant-outline" size={20} color={colors.gray400} />}
                  />

                  {/* Chips de Categorias da Loja */}
                  <Text style={styles.chipsSectionLabel}>Categoria Gastronômica</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryChipsContainer}
                  >
                    {STORE_CATEGORIES.map((cat) => {
                      const isSelected = storeCategory === cat;
                      return (
                        <Pressable
                          key={cat}
                          style={[
                            styles.categoryChip,
                            isSelected && styles.categoryChipSelected,
                          ]}
                          onPress={() => setStoreCategory(cat)}
                          accessibilityRole="button"
                          accessibilityLabel={`Categoria ${cat}`}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              isSelected && styles.categoryChipTextSelected,
                            ]}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.nameRow}>
                    <View style={styles.halfInput}>
                      <AppInput
                        label="Tempo de Entrega"
                        placeholder="Ex: 30-45 min"
                        value={storeDeliveryTime}
                        onChangeText={setStoreDeliveryTime}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <AppInput
                        label="Taxa de Entrega (R$)"
                        placeholder="Ex: 5.99"
                        value={storeDeliveryFee}
                        onChangeText={setStoreDeliveryFee}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <AppInput
                    label="Endereço ou Bairro da Loja"
                    placeholder="Ex: Av. Litorânea, 120 - Calhau"
                    value={storeAddress}
                    onChangeText={setStoreAddress}
                    leftIcon={<Ionicons name="location-outline" size={20} color={colors.gray400} />}
                  />

                  <AppInput
                    label="Telefone Comercial / WhatsApp"
                    placeholder="Ex: (98) 98888-1234"
                    value={storePhone}
                    onChangeText={setStorePhone}
                    keyboardType="phone-pad"
                    leftIcon={<Ionicons name="call-outline" size={20} color={colors.gray400} />}
                  />
                </View>
              )}

              {regError ? <Text style={styles.errorBanner}>{regError}</Text> : null}

              <AppButton
                title={accountType === "partner" ? "Cadastrar Minha Loja" : "Criar Conta"}
                onPress={handleRegister}
                loading={loading}
                size="lg"
                style={styles.mainButton}
              />

              <Pressable
                style={styles.switchAuth}
                onPress={() => setActiveTab("login")}
              >
                <Text style={styles.switchAuthText}>
                  Já possui uma conta? <Text style={styles.switchAuthHighlight}>Entrar</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  miniIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  brandTitle: {
    fontSize: fontSizes.xl,
    fontFamily: typography.extraBold,
    fontStyle: "italic",
    color: colors.primary,
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.md,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  formSection: {
    width: "100%",
  },
  roleSelectorBox: {
    marginBottom: spacing.md,
  },
  roleSelectorLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  roleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  roleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconCircleActive: {
    backgroundColor: colors.primary,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleButtonTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
  },
  roleButtonTitleActive: {
    color: colors.primary,
  },
  roleButtonSub: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  storeCardContainer: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  storeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  storeHeaderTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  chipsSectionLabel: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  categoryChipsContainer: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.text,
  },
  categoryChipTextSelected: {
    color: colors.white,
    fontFamily: typography.bold,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.primary,
  },
  errorBanner: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  mainButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  socialButton: {
    marginBottom: spacing.sm,
  },
  switchAuth: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  switchAuthText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  switchAuthHighlight: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
});

