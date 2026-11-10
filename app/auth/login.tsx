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
import { STORE_CATEGORIES } from "@/src/constants/stores";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from "@/src/contexts/AuthContext";
import { PartnerStore, UserRole } from "@/src/types";
import { showMessage } from "@/src/utils/dialog";
import {
  MIN_PASSWORD_LENGTH,
  formatPhone,
  isValidEmail,
  isValidPhone,
  parsePrice,
} from "@/src/utils/validation";

type AuthTab = "login" | "register";

// Erros por campo: a chave é o nome do campo e o valor é a mensagem
type FieldErrors = Record<string, string>;


/**
 * Tela de Login e Cadastro.
 * - Login: valida o e-mail e a senha e confere a conta no AuthContext.
 * - Cadastro: cliente ou empreendedor (com os dados da loja), com validação campo a campo.
 * - Esqueceu a senha: redefine a senha no próprio aparelho.
 */
export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});

  // Redefinição de senha (aparece no lugar do login)
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetErrors, setResetErrors] = useState<FieldErrors>({});

  // Register form state
  const [accountType, setAccountType] = useState<UserRole>("customer");
  const [regName, setRegName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regErrors, setRegErrors] = useState<FieldErrors>({});

  // Partner store form state
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("Lanches");
  const [storeDeliveryTime, setStoreDeliveryTime] = useState("30-45 min");
  const [storeDeliveryFee, setStoreDeliveryFee] = useState("5.99");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");

  // ---------- LOGIN ----------
  const handleLogin = async () => {
    const errors: FieldErrors = {};
    if (!loginEmail.trim()) errors.email = "Informe seu e-mail.";
    else if (!isValidEmail(loginEmail)) errors.email = "Digite um e-mail válido.";
    if (!loginPassword) errors.password = "Informe sua senha.";
    else if (loginPassword.length < MIN_PASSWORD_LENGTH)
      errors.password = `A senha tem no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      // O AuthContext confere se a conta existe e se a senha está certa
      const result = await signIn(loginEmail, loginPassword);
      if (!result.ok) {
        setLoginErrors({ [result.field]: result.message });
        return;
      }
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setLoginEmail(DEMO_EMAIL);
    setLoginPassword(DEMO_PASSWORD);
    setLoginErrors({});
  };

  // Google e Apple exigem configurar contas de desenvolvedor, então ficam só como demonstração
  const handleSocialLogin = (provider: string) => {
    showMessage(
      `Entrar com ${provider}`,
      `O login com ${provider} ainda não está disponível nesta versão. Use e-mail e senha ou a conta de demonstração.`
    );
  };

  // ---------- REDEFINIR SENHA ----------
  const openReset = () => {
    setResetEmail(loginEmail);
    setResetNewPassword("");
    setResetConfirm("");
    setResetErrors({});
    setShowReset(true);
  };

  const handleResetPassword = async () => {
    const errors: FieldErrors = {};
    if (!isValidEmail(resetEmail)) errors.email = "Digite um e-mail válido.";
    if (resetNewPassword.length < MIN_PASSWORD_LENGTH)
      errors.password = `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (resetConfirm !== resetNewPassword) errors.confirm = "As senhas não coincidem.";

    setResetErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const result = await resetPassword(resetEmail, resetNewPassword);
      if (!result.ok) {
        setResetErrors({ [result.field]: result.message });
        return;
      }
      showMessage("Senha alterada", "Pronto! Agora entre com a nova senha.");
      setLoginEmail(resetEmail.trim());
      setLoginPassword("");
      setShowReset(false);
    } finally {
      setLoading(false);
    }
  };

  // ---------- CADASTRO ----------
  const validateRegister = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!regName.trim()) errors.name = "Informe seu nome.";
    if (!regEmail.trim()) errors.email = "Informe seu e-mail.";
    else if (!isValidEmail(regEmail)) errors.email = "Digite um e-mail válido.";
    if (!regPhone.trim()) errors.phone = "Informe seu celular.";
    else if (!isValidPhone(regPhone)) errors.phone = "Digite o DDD e o número completo.";
    if (regPassword.length < MIN_PASSWORD_LENGTH)
      errors.password = `A senha precisa ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (regConfirmPassword !== regPassword) errors.confirm = "As senhas não coincidem.";

    if (accountType === "partner") {
      if (!storeName.trim()) errors.storeName = "Informe o nome da sua loja.";
      if (parsePrice(storeDeliveryFee) === null)
        errors.storeFee = "Digite um valor válido. Ex: 5,99 ou 0";
      if (!storeDeliveryTime.trim()) errors.storeTime = "Informe o tempo de entrega.";
      if (storePhone.trim() && !isValidPhone(storePhone))
        errors.storePhone = "Digite o DDD e o número completo.";
    }
    return errors;
  };

  const handleRegister = async () => {
    const errors = validateRegister();
    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const createdStore: PartnerStore | undefined =
        accountType === "partner"
          ? {
              id: `store-${Date.now()}`,
              name: storeName.trim(),
              category: storeCategory,
              deliveryTime: storeDeliveryTime.trim(),
              deliveryFee: parsePrice(storeDeliveryFee) ?? 0,
              address: storeAddress.trim() || "Endereço cadastrado",
              phone: storePhone.trim() || regPhone,
              isOpen: true,
            }
          : undefined;

      // O signUp cria a conta e, se for empreendedor, cadastra a loja (uma vez só)
      const result = await signUp(
        {
          name: regName.trim(),
          lastName: regLastName.trim(),
          email: regEmail.trim(),
          phone: regPhone,
          role: accountType,
          store: createdStore,
        },
        regPassword
      );
      if (!result.ok) {
        setRegErrors({ [result.field]: result.message });
        return;
      }

      router.replace("/(tabs)");
    } catch {
      setRegErrors({ general: "Erro ao cadastrar. Tente novamente." });
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
              onPress={() => {
                setActiveTab("login");
                setShowReset(false);
              }}
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
            showReset ? (
            /* Redefinir senha: feita no próprio aparelho, sem envio de e-mail */
            <View style={styles.formSection}>
              <Text style={styles.resetTitle}>Redefinir senha</Text>
              <Text style={styles.resetInfo}>
                Nesta versão do app as contas ficam salvas no próprio celular, então não
                enviamos e-mail. Informe o e-mail da conta e escolha uma nova senha.
              </Text>

              <AppInput
                label="E-mail da conta"
                placeholder="exemplo@email.com"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={resetErrors.email}
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.gray400} />}
              />
              <AppInput
                label="Nova senha"
                placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
                value={resetNewPassword}
                onChangeText={setResetNewPassword}
                isPassword
                error={resetErrors.password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />}
              />
              <AppInput
                label="Confirme a nova senha"
                placeholder="Digite a senha novamente"
                value={resetConfirm}
                onChangeText={setResetConfirm}
                isPassword
                error={resetErrors.confirm}
                leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.gray400} />}
              />

              <AppButton
                title="Salvar nova senha"
                onPress={handleResetPassword}
                loading={loading}
                size="lg"
                style={styles.mainButton}
              />
              <Pressable style={styles.switchAuth} onPress={() => setShowReset(false)}>
                <Text style={styles.switchAuthText}>
                  Lembrou a senha? <Text style={styles.switchAuthHighlight}>Voltar ao login</Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Formulário de Login */
            <View style={styles.formSection}>
              <AppInput
                label="E-mail"
                placeholder="exemplo@email.com"
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={loginErrors.email}
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Senha"
                placeholder="Sua senha secreta"
                value={loginPassword}
                onChangeText={setLoginPassword}
                isPassword
                error={loginErrors.password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />}
              />

              <Pressable style={styles.forgotPassword} onPress={openReset}>
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </Pressable>

              <AppButton
                title="Entrar"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={styles.mainButton}
              />

              {/* Conta pronta para a professora e o grupo testarem */}
              <Pressable
                style={styles.demoBox}
                onPress={fillDemoAccount}
                accessibilityRole="button"
                accessibilityLabel="Preencher com a conta de demonstração"
              >
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoTitle}>Conta de demonstração</Text>
                  <Text style={styles.demoText}>
                    {DEMO_EMAIL} · senha {DEMO_PASSWORD}
                  </Text>
                  <Text style={styles.demoLink}>Toque para preencher</Text>
                </View>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <AppButton
                title="Continuar com Google"
                variant="outline"
                onPress={() => handleSocialLogin("Google")}
                leftIcon={<Ionicons name="logo-google" size={20} color={colors.primary} />}
                style={styles.socialButton}
              />

              <AppButton
                title="Continuar com Apple"
                variant="secondary"
                onPress={() => handleSocialLogin("Apple")}
                leftIcon={<Ionicons name="logo-apple" size={20} color={colors.text} />}
                style={styles.socialButton}
              />
              <Text style={styles.socialNote}>Google e Apple: em breve</Text>

              <Pressable
                style={styles.switchAuth}
                onPress={() => setActiveTab("register")}
              >
                <Text style={styles.switchAuthText}>
                  Não tem uma conta? <Text style={styles.switchAuthHighlight}>Cadastre-se</Text>
                </Text>
              </Pressable>
            </View>
          )
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
                    error={regErrors.name}
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
                label="E-mail"
                placeholder="exemplo@email.com"
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={regErrors.email}
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Celular"
                placeholder="(98) 99999-9999"
                value={regPhone}
                onChangeText={(text) => setRegPhone(formatPhone(text))}
                keyboardType="phone-pad"
                maxLength={15}
                error={regErrors.phone}
                leftIcon={<Ionicons name="call-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Senha"
                placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
                value={regPassword}
                onChangeText={setRegPassword}
                isPassword
                error={regErrors.password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.gray400} />}
              />

              <AppInput
                label="Digite sua senha novamente"
                placeholder="Confirme a senha"
                value={regConfirmPassword}
                onChangeText={setRegConfirmPassword}
                isPassword
                error={regErrors.confirm}
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
                    error={regErrors.storeName}
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
                        error={regErrors.storeTime}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <AppInput
                        label="Taxa de Entrega (R$)"
                        placeholder="Ex: 5.99"
                        value={storeDeliveryFee}
                        onChangeText={setStoreDeliveryFee}
                        keyboardType="decimal-pad"
                        error={regErrors.storeFee}
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
                    onChangeText={(text) => setStorePhone(formatPhone(text))}
                    keyboardType="phone-pad"
                    maxLength={15}
                    error={regErrors.storePhone}
                    leftIcon={<Ionicons name="call-outline" size={20} color={colors.gray400} />}
                  />
                </View>
              )}

              {Object.keys(regErrors).length > 0 ? (
                <Text style={styles.errorBanner}>
                  {regErrors.general || "Confira os campos destacados em vermelho."}
                </Text>
              ) : null}

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
  resetTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resetInfo: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  demoBox: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  demoTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  demoText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  demoLink: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
    marginTop: 2,
  },
  socialNote: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
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

