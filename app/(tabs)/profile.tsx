import React, { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { useAuth } from "@/src/contexts/AuthContext";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { UserAddress, SavedPaymentMethod, PartnerStore } from "@/src/types";
import { api } from "@/src/services/api";

type ModalType =
  | "profile"
  | "addresses"
  | "payments"
  | "notifications"
  | "help"
  | "about"
  | "partnerStore"
  | "becomePartner"
  | null;

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
];

export default function ProfileScreen() {
  const { user, updateUser, signOut } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Estados do formulário de dados pessoais
  const [name, setName] = useState(user?.name || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [selectedAvatar, setSelectedAvatar] = useState(
    user?.avatar || PRESET_AVATARS[0]
  );

  // Estados de formulário de novo endereço
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [addrNeighborhood, setAddrNeighborhood] = useState("");
  const [addrCity, setAddrCity] = useState("Santa Inês - MA");

  // Estados de formulário de novo cartão
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");

  // Estado de FAQ expandido
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Estados da loja / empreendedor
  const isPartner = user?.role === "partner" || Boolean(user?.store);
  const [storeOpen, setStoreOpen] = useState(user?.store?.isOpen ?? true);

  // Estados de novo produto na loja
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCat, setProdCat] = useState("Destaques");

  // Estados para tornar-se parceiro
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreCat, setNewStoreCat] = useState("Lanches");
  const [newStoreFee, setNewStoreFee] = useState("5.99");
  const [newStoreTime, setNewStoreTime] = useState("30-45 min");
  const [newStoreAddr, setNewStoreAddr] = useState("");

  const handleToggleStoreOpen = async () => {
    const nextState = !storeOpen;
    setStoreOpen(nextState);
    if (user?.store) {
      await updateUser({
        store: {
          ...user.store,
          isOpen: nextState,
        },
      });
      Alert.alert(
        "Status da Loja",
        nextState
          ? "Sua loja agora está ABERTA para receber pedidos!"
          : "Sua loja foi marcada como FECHADA temporariamente."
      );
    }
  };

  const handleAddStoreProduct = async () => {
    if (!prodName.trim() || !prodPrice.trim()) {
      Alert.alert("Atenção", "Preencha o nome e o preço do prato.");
      return;
    }

    const storeId = user?.store?.id || "1";
    await api.addStoreProduct(storeId, {
      name: prodName.trim(),
      price: parseFloat(prodPrice.replace(",", ".")) || 0,
      description: prodDesc.trim(),
      category: prodCat,
    });

    setProdName("");
    setProdPrice("");
    setProdDesc("");
    Alert.alert("Sucesso!", `Item "${prodName}" adicionado ao cardápio da sua loja!`);
  };

  const handleCreatePartnerStore = async () => {
    if (!newStoreName.trim()) {
      Alert.alert("Atenção", "Informe o nome da sua loja.");
      return;
    }

    const storeData: PartnerStore = {
      id: `store-${Date.now()}`,
      name: newStoreName.trim(),
      category: newStoreCat,
      deliveryTime: newStoreTime.trim() || "30-45 min",
      deliveryFee: parseFloat(newStoreFee.replace(",", ".")) || 0,
      address: newStoreAddr.trim() || user?.address || "Endereço cadastrado",
      isOpen: true,
    };

    await updateUser({
      role: "partner",
      store: storeData,
    });

    await api.registerPartner({
      ownerName: `${user?.name || ""} ${user?.lastName || ""}`.trim(),
      ownerEmail: user?.email || "",
      storeName: storeData.name,
      category: storeData.category,
      deliveryTime: storeData.deliveryTime,
      deliveryFee: storeData.deliveryFee,
      address: storeData.address,
    });

    setActiveModal("partnerStore");
    Alert.alert("Parabéns!", `Sua loja "${storeData.name}" foi cadastrada com sucesso!`);
  };

  // Sincroniza campos quando o usuário abrir a edição
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setSelectedAvatar(user.avatar || PRESET_AVATARS[0]);
    }
  }, [user, activeModal]);

  // Salvar dados pessoais
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Atenção", "Por favor, preencha o seu nome.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Atenção", "Por favor, preencha o seu e-mail.");
      return;
    }

    await updateUser({
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatar: selectedAvatar,
    });

    Alert.alert("Sucesso", "Seus dados foram atualizados com sucesso!");
    setActiveModal(null);
  };

  // Gerenciamento de Endereços
  const addresses: UserAddress[] = user?.addresses || [
    {
      id: "addr-1",
      label: "Casa",
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Centro",
      city: "Santa Inês - MA",
      isDefault: true,
    },
    {
      id: "addr-2",
      label: "Trabalho",
      street: "Av. Castelo Branco",
      number: "450",
      neighborhood: "Centro",
      city: "Santa Inês - MA",
      isDefault: false,
    },
  ];

  const handleSelectDefaultAddress = async (addrId: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === addrId,
    }));
    const defaultAddr = updated.find((a) => a.id === addrId);
    const formatted = defaultAddr
      ? `${defaultAddr.street}, ${defaultAddr.number} - ${defaultAddr.neighborhood}, ${defaultAddr.city}`
      : user?.address;

    await updateUser({
      addresses: updated,
      address: formatted,
    });
  };

  const handleAddAddress = async () => {
    if (!addrStreet.trim() || !addrNumber.trim() || !addrNeighborhood.trim()) {
      Alert.alert("Atenção", "Preencha rua, número e bairro para salvar.");
      return;
    }

    const newAddr: UserAddress = {
      id: `addr-${Date.now()}`,
      label: addrLabel.trim() || "Outro",
      street: addrStreet.trim(),
      number: addrNumber.trim(),
      neighborhood: addrNeighborhood.trim(),
      city: addrCity.trim() || "Santa Inês - MA",
      isDefault: addresses.length === 0,
    };

    const updated = [...addresses, newAddr];
    await updateUser({
      addresses: updated,
      ...(newAddr.isDefault
        ? {
            address: `${newAddr.street}, ${newAddr.number} - ${newAddr.neighborhood}, ${newAddr.city}`,
          }
        : {}),
    });

    setAddrLabel("");
    setAddrStreet("");
    setAddrNumber("");
    setAddrNeighborhood("");
    setShowAddressForm(false);
    Alert.alert("Sucesso", "Novo endereço cadastrado com sucesso!");
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (addresses.length <= 1) {
      Alert.alert("Atenção", "Você precisa manter ao menos um endereço cadastrado.");
      return;
    }

    const updated = addresses.filter((a) => a.id !== addrId);
    // Se o removido era o padrão, define o primeiro restante como padrão
    if (!updated.some((a) => a.isDefault) && updated.length > 0) {
      updated[0].isDefault = true;
    }
    const defaultAddr = updated.find((a) => a.isDefault);
    const formatted = defaultAddr
      ? `${defaultAddr.street}, ${defaultAddr.number} - ${defaultAddr.neighborhood}, ${defaultAddr.city}`
      : "";

    await updateUser({
      addresses: updated,
      address: formatted,
    });
  };

  // Gerenciamento de Formas de Pagamento
  const savedPayments: SavedPaymentMethod[] = user?.savedPaymentMethods || [
    {
      id: "pay-1",
      type: "credit",
      title: "Cartão de Crédito",
      details: "Mastercard •••• 4829",
      isDefault: true,
    },
    {
      id: "pay-2",
      type: "pix",
      title: "Pix",
      details: "Chave CPF cadastrada",
      isDefault: false,
    },
  ];

  const handleSelectDefaultPayment = async (payId: string) => {
    const updated = savedPayments.map((p) => ({
      ...p,
      isDefault: p.id === payId,
    }));
    await updateUser({ savedPaymentMethods: updated });
  };

  const handleAddCard = async () => {
    if (!cardNumber.trim() || cardNumber.length < 4) {
      Alert.alert("Atenção", "Informe os 4 últimos dígitos do cartão.");
      return;
    }

    const last4 = cardNumber.slice(-4);
    const newCard: SavedPaymentMethod = {
      id: `pay-${Date.now()}`,
      type: "credit",
      title: "Cartão de Crédito",
      details: `Visa •••• ${last4}`,
      isDefault: savedPayments.length === 0,
    };

    const updated = [...savedPayments, newCard];
    await updateUser({ savedPaymentMethods: updated });
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setShowCardForm(false);
    Alert.alert("Sucesso", "Cartão salvo com sucesso!");
  };

  // Notificações
  const notifications = user?.notifications || {
    orderUpdates: true,
    promotions: true,
    whatsappUpdates: false,
  };

  const handleToggleNotification = async (
    key: "orderUpdates" | "promotions" | "whatsappUpdates",
    value: boolean
  ) => {
    const updated = {
      ...notifications,
      [key]: value,
    };
    await updateUser({ notifications: updated });
  };

  // Sair
  const handleSignOut = () => {
    Alert.alert(
      "Sair do aplicativo",
      "Deseja realmente encerrar sua sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/auth/login");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card do Usuário */}
        <Pressable
          style={styles.userCard}
          accessibilityRole="button"
          accessibilityLabel="Editar meus dados de perfil"
          onPress={() => setActiveModal("profile")}
        >
          <Image
            source={{
              uri: user?.avatar || PRESET_AVATARS[0],
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.name || "Policarpo"} {user?.lastName || "de Sousa"}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || "policarpo.sousa@foodrush.com.br"}
            </Text>
            {user?.phone ? (
              <Text style={styles.userPhone}>{user.phone}</Text>
            ) : null}
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </View>
        </Pressable>

        {/* Banner do Empreendedor / Minha Loja */}
        {isPartner ? (
          <View style={styles.partnerBannerCard}>
            <View style={styles.partnerBannerHeader}>
              <View style={styles.partnerBadge}>
                <Ionicons name="storefront" size={14} color={colors.white} />
                <Text style={styles.partnerBadgeText}>Empreendedor Food Rush</Text>
              </View>
              <Pressable
                style={[
                  styles.storeStatusPill,
                  storeOpen ? styles.storeOpenPill : styles.storeClosedPill,
                ]}
                onPress={handleToggleStoreOpen}
                accessibilityRole="button"
                accessibilityLabel="Alternar status da loja"
              >
                <View
                  style={[
                    styles.storeStatusDot,
                    storeOpen ? styles.storeDotOpen : styles.storeDotClosed,
                  ]}
                />
                <Text
                  style={[
                    styles.storeStatusText,
                    storeOpen ? styles.storeTextOpen : styles.storeTextClosed,
                  ]}
                >
                  {storeOpen ? "Aberta" : "Fechada"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.partnerStoreName}>
              {user?.store?.name || "Minha Loja"}
            </Text>
            <Text style={styles.partnerStoreDetails}>
              Categoria: {user?.store?.category || "Lanches"} • Entrega:{" "}
              {user?.store?.deliveryTime || "30-45 min"}
            </Text>

            <View style={styles.partnerActionsRow}>
              <Pressable
                style={styles.manageStoreButton}
                onPress={() => setActiveModal("partnerStore")}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar loja e cardápio"
              >
                <Ionicons name="restaurant-outline" size={16} color={colors.white} />
                <Text style={styles.manageStoreButtonText}>
                  Gerenciar Cardápio & Pratos
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.becomePartnerCard}
            onPress={() => setActiveModal("becomePartner")}
            accessibilityRole="button"
            accessibilityLabel="Torne-se um parceiro do Food Rush"
          >
            <View style={styles.becomePartnerIconBox}>
              <Ionicons name="storefront-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.becomePartnerInfo}>
              <Text style={styles.becomePartnerTitle}>
                Vende comida ou tem restaurante?
              </Text>
              <Text style={styles.becomePartnerSub}>
                Cadastre sua loja e venda para milhares no Food Rush!
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* Lista de Opções */}
        <View style={styles.optionsList}>
          <Pressable
            style={styles.optionItem}
            accessibilityRole="button"
            accessibilityLabel="Abrir meus dados"
            onPress={() => setActiveModal("profile")}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="person-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Meus dados</Text>
              <Text style={styles.optionSub}>Nome, e-mail, telefone e foto</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </Pressable>

          <Pressable
            style={styles.optionItem}
            accessibilityRole="button"
            accessibilityLabel="Abrir endereços"
            onPress={() => setActiveModal("addresses")}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="location-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Endereços</Text>
              <Text style={styles.optionSub} numberOfLines={1}>
                {user?.address || "Rua das Flores, 123"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </Pressable>

          <Pressable
            style={styles.optionItem}
            accessibilityRole="button"
            accessibilityLabel="Abrir formas de pagamento"
            onPress={() => setActiveModal("payments")}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="card-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Formas de pagamento</Text>
              <Text style={styles.optionSub}>Cartão, Pix e Dinheiro</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </Pressable>

          <Pressable
            style={styles.optionItem}
            accessibilityRole="button"
            accessibilityLabel="Configurar notificações"
            onPress={() => setActiveModal("notifications")}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.text}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Notificação</Text>
              <Text style={styles.optionSub}>Alertas de pedidos e ofertas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </Pressable>

          <Pressable
            style={styles.optionItem}
            accessibilityRole="button"
            accessibilityLabel="Ajuda e suporte"
            onPress={() => setActiveModal("help")}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={colors.text}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Ajuda e suporte</Text>
              <Text style={styles.optionSub}>FAQ e canais de atendimento</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </Pressable>

          <Pressable
            style={styles.optionItem}
            accessibilityRole="button"
            accessibilityLabel="Sobre o aplicativo"
            onPress={() => setActiveModal("about")}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.text}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Sobre o app</Text>
              <Text style={styles.optionSub}>Versão 1.1.0, termos e LGPD</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </Pressable>

          <Pressable
            style={[styles.optionItem, { borderBottomWidth: 0 }]}
            accessibilityRole="button"
            accessibilityLabel="Sair do aplicativo"
            onPress={handleSignOut}
          >
            <View
              style={[
                styles.optionIconContainer,
                styles.optionDangerIconContainer,
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.optionDangerTitle]}>
                Sair
              </Text>
              <Text style={styles.optionSub}>Encerrar sessão no aparelho</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </Pressable>
        </View>
      </ScrollView>

      {/* ================= MODAL: MEUS DADOS ================= */}
      <Modal
        visible={activeModal === "profile"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Meus Dados</Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Seletor de Avatar */}
              <Text style={styles.inputLabel}>Escolha seu Avatar:</Text>
              <View style={styles.avatarsRow}>
                {PRESET_AVATARS.map((uri, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setSelectedAvatar(uri)}
                    style={[
                      styles.avatarChoice,
                      selectedAvatar === uri && styles.avatarChoiceSelected,
                    ]}
                  >
                    <Image source={{ uri }} style={styles.avatarChoiceImg} />
                  </Pressable>
                ))}
              </View>

              <AppInput
                label="Nome"
                placeholder="Ex: Policarpo"
                value={name}
                onChangeText={setName}
                leftIcon={<Ionicons name="person-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="Sobrenome"
                placeholder="Ex: de Sousa"
                value={lastName}
                onChangeText={setLastName}
                leftIcon={<Ionicons name="person-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="E-mail"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="Telefone / WhatsApp"
                placeholder="(98) 98765-4321"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                leftIcon={<Ionicons name="call-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <View style={styles.modalButtonRow}>
                <AppButton
                  title="Salvar Alterações"
                  onPress={handleSaveProfile}
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: ENDEREÇOS ================= */}
      <Modal
        visible={activeModal === "addresses"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Meus Endereços</Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionSubtitle}>
                Toque para selecionar seu endereço de entrega padrão:
              </Text>

              {addresses.map((addr) => (
                <Pressable
                  key={addr.id}
                  style={[
                    styles.addressCard,
                    addr.isDefault && styles.addressCardActive,
                  ]}
                  onPress={() => handleSelectDefaultAddress(addr.id)}
                >
                  <View style={styles.addressLeft}>
                    <Ionicons
                      name={
                        addr.label.toLowerCase() === "trabalho"
                          ? "briefcase"
                          : "home"
                      }
                      size={22}
                      color={addr.isDefault ? colors.primary : colors.gray400}
                    />
                    <View style={styles.addressTextWrapper}>
                      <View style={styles.addressLabelRow}>
                        <Text style={styles.addressLabel}>{addr.label}</Text>
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Padrão</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressStreet}>
                        {addr.street}, {addr.number}
                      </Text>
                      <Text style={styles.addressCity}>
                        {addr.neighborhood} - {addr.city}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleDeleteAddress(addr.id)}
                    hitSlop={8}
                    style={styles.deleteAddrBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.error}
                    />
                  </Pressable>
                </Pressable>
              ))}

              {/* Botão / Formulário de Novo Endereço */}
              {!showAddressForm ? (
                <AppButton
                  title="+ Adicionar Novo Endereço"
                  variant="outline"
                  onPress={() => setShowAddressForm(true)}
                  style={{ marginTop: spacing.md }}
                />
              ) : (
                <View style={styles.newFormBox}>
                  <Text style={styles.newFormTitle}>Novo Endereço</Text>
                  <AppInput
                    label="Apelido (ex: Casa, Trabalho, Mãe)"
                    placeholder="Casa"
                    value={addrLabel}
                    onChangeText={setAddrLabel}
                    containerStyle={styles.formInput}
                  />
                  <AppInput
                    label="Rua / Avenida"
                    placeholder="Nome da rua"
                    value={addrStreet}
                    onChangeText={setAddrStreet}
                    containerStyle={styles.formInput}
                  />
                  <View style={styles.twoColumnRow}>
                    <AppInput
                      label="Número"
                      placeholder="123"
                      value={addrNumber}
                      onChangeText={setAddrNumber}
                      containerStyle={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <AppInput
                      label="Bairro"
                      placeholder="Centro"
                      value={addrNeighborhood}
                      onChangeText={setAddrNeighborhood}
                      containerStyle={{ flex: 2 }}
                    />
                  </View>
                  <AppInput
                    label="Cidade / Estado"
                    placeholder="Santa Inês - MA"
                    value={addrCity}
                    onChangeText={setAddrCity}
                    containerStyle={styles.formInput}
                  />

                  <View style={styles.modalButtonRow}>
                    <AppButton
                      title="Cancelar"
                      variant="ghost"
                      onPress={() => setShowAddressForm(false)}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <AppButton
                      title="Salvar Endereço"
                      onPress={handleAddAddress}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FORMAS DE PAGAMENTO ================= */}
      <Modal
        visible={activeModal === "payments"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Formas de Pagamento</Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionSubtitle}>
                Selecione a sua forma de pagamento preferencial:
              </Text>

              {savedPayments.map((p) => (
                <Pressable
                  key={p.id}
                  style={[
                    styles.paymentCard,
                    p.isDefault && styles.paymentCardActive,
                  ]}
                  onPress={() => handleSelectDefaultPayment(p.id)}
                >
                  <View style={styles.paymentLeft}>
                    <View
                      style={[
                        styles.paymentIconBox,
                        p.isDefault && styles.paymentIconBoxActive,
                      ]}
                    >
                      <Ionicons
                        name={p.type === "pix" ? "flash-outline" : "card-outline"}
                        size={22}
                        color={p.isDefault ? colors.primary : colors.text}
                      />
                    </View>
                    <View>
                      <View style={styles.addressLabelRow}>
                        <Text style={styles.paymentTitle}>{p.title}</Text>
                        {p.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Padrão</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.paymentDetails}>{p.details}</Text>
                    </View>
                  </View>

                  <Ionicons
                    name={
                      p.isDefault
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={22}
                    color={p.isDefault ? colors.primary : colors.gray300}
                  />
                </Pressable>
              ))}

              {!showCardForm ? (
                <AppButton
                  title="+ Cadastrar Novo Cartão"
                  variant="outline"
                  onPress={() => setShowCardForm(true)}
                  style={{ marginTop: spacing.md }}
                />
              ) : (
                <View style={styles.newFormBox}>
                  <Text style={styles.newFormTitle}>Adicionar Cartão</Text>
                  <AppInput
                    label="Nome impresso no cartão"
                    placeholder="POLICARPO DE SOUSA"
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    autoCapitalize="characters"
                    containerStyle={styles.formInput}
                  />
                  <AppInput
                    label="Número do Cartão"
                    placeholder="•••• •••• •••• 1234"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="numeric"
                    containerStyle={styles.formInput}
                  />
                  <AppInput
                    label="Validade (MM/AA)"
                    placeholder="12/29"
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    containerStyle={styles.formInput}
                  />

                  <View style={styles.modalButtonRow}>
                    <AppButton
                      title="Cancelar"
                      variant="ghost"
                      onPress={() => setShowCardForm(false)}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <AppButton
                      title="Salvar Cartão"
                      onPress={handleAddCard}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: NOTIFICAÇÕES ================= */}
      <Modal
        visible={activeModal === "notifications"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Preferências de Notificação</Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Status do Pedido</Text>
                  <Text style={styles.switchDesc}>
                    Alertas push em tempo real sobre preparo, saída e chegada do entregador.
                  </Text>
                </View>
                <Switch
                  value={notifications.orderUpdates}
                  onValueChange={(val) =>
                    handleToggleNotification("orderUpdates", val)
                  }
                  trackColor={{ false: colors.gray200, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Promoções e Cupons</Text>
                  <Text style={styles.switchDesc}>
                    Descontos relâmpago, frete grátis e novidades gastronômicas exclusivas.
                  </Text>
                </View>
                <Switch
                  value={notifications.promotions}
                  onValueChange={(val) =>
                    handleToggleNotification("promotions", val)
                  }
                  trackColor={{ false: colors.gray200, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchTitle}>Mensagens no WhatsApp</Text>
                  <Text style={styles.switchDesc}>
                    Confirmação de pedido e chave Pix via WhatsApp para maior comodidade.
                  </Text>
                </View>
                <Switch
                  value={notifications.whatsappUpdates}
                  onValueChange={(val) =>
                    handleToggleNotification("whatsappUpdates", val)
                  }
                  trackColor={{ false: colors.gray200, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>

              <AppButton
                title="Concluído"
                onPress={() => setActiveModal(null)}
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: AJUDA E SUPORTE ================= */}
      <Modal
        visible={activeModal === "help"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajuda e Suporte</Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionSubtitle}>
                Perguntas Frequentes (FAQ):
              </Text>

              {[
                {
                  id: 1,
                  q: "Como acompanhar meu pedido em tempo real?",
                  a: "Após finalizar a compra, você é direcionado automaticamente à tela de rastreamento com mapa, estimativa e contatos do entregador. Você também pode acessar qualquer pedido pela aba 'Pedidos'.",
                },
                {
                  id: 2,
                  q: "Como cancelar ou alterar um pedido?",
                  a: "Caso o restaurante ainda não tenha iniciado o preparo, você pode acionar nosso suporte via chat imediatamente para solicitar o cancelamento ou alteração.",
                },
                {
                  id: 3,
                  q: "Quais são as formas de pagamento aceitas?",
                  a: "Aceitamos Pix instantâneo, cartões de crédito e débito das principais bandeiras e pagamento em dinheiro no momento da entrega.",
                },
              ].map((faq) => {
                const isExpanded = expandedFaq === faq.id;
                return (
                  <Pressable
                    key={faq.id}
                    style={styles.faqCard}
                    onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={styles.faqQuestion}>{faq.q}</Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.text}
                      />
                    </View>
                    {isExpanded && (
                      <Text style={styles.faqAnswer}>{faq.a}</Text>
                    )}
                  </Pressable>
                );
              })}

              <Text style={[styles.sectionSubtitle, { marginTop: spacing.lg }]}>
                Canais de Atendimento:
              </Text>

              <AppButton
                title="Abrir Chat de Atendimento"
                leftIcon={
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color={colors.white}
                  />
                }
                onPress={() => {
                  setActiveModal(null);
                  router.push("/order/chat");
                }}
                style={{ marginBottom: spacing.sm }}
              />

              <AppButton
                title="Ligar para Suporte (0800 123 4567)"
                variant="outline"
                leftIcon={
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={colors.primary}
                  />
                }
                onPress={() =>
                  Alert.alert("Central de Ajuda", "Discando para 0800 123 4567...")
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: SOBRE O APP ================= */}
      <Modal
        visible={activeModal === "about"}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sobre o FOOD RUSH</Text>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.aboutHero}>
                <View style={styles.aboutLogo}>
                  <Ionicons name="fast-food" size={40} color={colors.white} />
                </View>
                <Text style={styles.aboutAppName}>FOOD RUSH</Text>
                <Text style={styles.aboutVersion}>Versão 1.1.0 (Build 2026.10)</Text>
              </View>

              <Text style={styles.aboutParagraph}>
                O **FOOD RUSH** é a sua solução definitiva para entrega de refeições, lanches e bebidas com agilidade extrema e foco total na experiência do usuário.
              </Text>

              <View style={styles.aboutCard}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aboutCardTitle}>Privacidade e LGPD</Text>
                  <Text style={styles.aboutCardDesc}>
                    Seus dados pessoais, endereços e histórico de compras são protegidos em conformidade com as melhores práticas de segurança da informação.
                  </Text>
                </View>
              </View>

              <View style={styles.aboutCard}>
                <Ionicons name="flash-outline" size={20} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aboutCardTitle}>Entrega Expressa</Text>
                  <Text style={styles.aboutCardDesc}>
                    Rastreamento de entrega dinâmico com atualização em tempo real e suporte direto aos entregadores parceiros.
                  </Text>
                </View>
              </View>

              <AppButton
                title="Entendido"
                onPress={() => setActiveModal(null)}
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: PAINEL DA LOJA / CARDÁPIO ================= */}
      <Modal
        visible={activeModal === "partnerStore"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="storefront" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Painel da Minha Loja</Text>
              </View>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Informações da Loja */}
              <View style={styles.partnerStoreInfoCard}>
                <Text style={styles.partnerInfoTitle}>{user?.store?.name || "Minha Loja"}</Text>
                <Text style={styles.partnerInfoMeta}>
                  Categoria: {user?.store?.category || "Lanches"} • Taxa: R$ {user?.store?.deliveryFee?.toFixed(2) || "5,99"}
                </Text>
                <Text style={styles.partnerInfoAddress}>
                  Endereço: {user?.store?.address || "Centro"}
                </Text>

                <View style={styles.storeStatusToggleRow}>
                  <Text style={styles.storeStatusToggleLabel}>Status da Loja para Clientes:</Text>
                  <Pressable
                    style={[styles.storeStatusPill, storeOpen ? styles.storeOpenPill : styles.storeClosedPill]}
                    onPress={handleToggleStoreOpen}
                  >
                    <View style={[styles.storeStatusDot, storeOpen ? styles.storeDotOpen : styles.storeDotClosed]} />
                    <Text style={[styles.storeStatusText, storeOpen ? styles.storeTextOpen : styles.storeTextClosed]}>
                      {storeOpen ? "Aberta (Recebendo pedidos)" : "Fechada"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Seção Adicionar Produto ao Cardápio */}
              <Text style={styles.storeSectionHeading}>Adicionar Prato ao Cardápio</Text>
              <Text style={styles.storeSectionSubtitle}>
                Cadastre novos itens para ficarem disponíveis no aplicativo imediatamente:
              </Text>

              <AppInput
                label="Nome do Prato / Produto"
                placeholder="Ex: Hambúrguer Especial Duplo"
                value={prodName}
                onChangeText={setProdName}
                leftIcon={<Ionicons name="fast-food-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="Preço de Venda (R$)"
                placeholder="Ex: 34.90"
                value={prodPrice}
                onChangeText={setProdPrice}
                keyboardType="numeric"
                leftIcon={<Ionicons name="cash-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="Descrição dos Ingredientes"
                placeholder="Ex: Pão brioche, 2 blends 150g, queijo gouda e molho especial."
                value={prodDesc}
                onChangeText={setProdDesc}
                multiline
                numberOfLines={2}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="Categoria do Prato"
                placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas"
                value={prodCat}
                onChangeText={setProdCat}
                containerStyle={styles.formInput}
              />

              <AppButton
                title="Adicionar ao Cardápio"
                onPress={handleAddStoreProduct}
                leftIcon={<Ionicons name="add-circle" size={18} color={colors.white} />}
                style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: TORNAR-SE PARCEIRO ================= */}
      <Modal
        visible={activeModal === "becomePartner"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="storefront" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Cadastre sua Loja</Text>
              </View>
              <Pressable
                onPress={() => setActiveModal(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionSubtitle}>
                Preencha os dados do seu restaurante para começar a vender:
              </Text>

              <AppInput
                label="Nome da Loja / Restaurante"
                placeholder="Ex: Pizzaria Forno Nobre"
                value={newStoreName}
                onChangeText={setNewStoreName}
                leftIcon={<Ionicons name="restaurant-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppInput
                label="Categoria Gastronômica"
                placeholder="Ex: Pizza, Lanches, Sushi, Doces"
                value={newStoreCat}
                onChangeText={setNewStoreCat}
                containerStyle={styles.formInput}
              />

              <View style={styles.formInputRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <AppInput
                    label="Tempo Médio"
                    placeholder="Ex: 30-45 min"
                    value={newStoreTime}
                    onChangeText={setNewStoreTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Taxa de Entrega"
                    placeholder="Ex: 5.99"
                    value={newStoreFee}
                    onChangeText={setNewStoreFee}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <AppInput
                label="Endereço Comercial"
                placeholder="Ex: Av. Brasil, 250 - Centro"
                value={newStoreAddr}
                onChangeText={setNewStoreAddr}
                leftIcon={<Ionicons name="location-outline" size={18} color={colors.gray400} />}
                containerStyle={styles.formInput}
              />

              <AppButton
                title="Concluir e Abrir Minha Loja"
                onPress={handleCreatePartnerStore}
                leftIcon={<Ionicons name="checkmark-circle" size={18} color={colors.white} />}
                style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray200,
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  optionDangerIconContainer: {
    backgroundColor: colors.primaryLight,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  optionSub: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  optionDangerTitle: {
    color: colors.error,
  },

  /* Modais Compartilhados */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  formInput: {
    marginBottom: spacing.sm,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  twoColumnRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },

  /* Avatar Picker */
  inputLabel: {
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
  avatarChoiceImg: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },

  /* Endereços */
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  addressCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#FFF8F8",
  },
  addressLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  addressTextWrapper: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  addressLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontFamily: typography.bold,
    color: colors.white,
  },
  addressStreet: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.text,
    marginTop: 2,
  },
  addressCity: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  deleteAddrBtn: {
    padding: spacing.xs,
  },
  newFormBox: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newFormTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  /* Pagamentos */
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  paymentCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#FFF8F8",
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconBoxActive: {
    backgroundColor: colors.primaryLight,
  },
  paymentTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  paymentDetails: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Switches de Notificação */
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  switchDesc: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* FAQ */
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
  faqQuestion: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  /* Sobre o App */
  aboutHero: {
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  aboutAppName: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  aboutVersion: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aboutParagraph: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  aboutCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutCardTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: 2,
  },
  aboutCardDesc: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  /* Banner do Empreendedor */
  partnerBannerCard: {
    backgroundColor: colors.gray50,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  partnerBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  partnerBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: colors.white,
    textTransform: "uppercase",
  },
  storeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  storeOpenPill: {
    backgroundColor: "#E8F8EE",
    borderColor: colors.success,
  },
  storeClosedPill: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  storeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeDotOpen: {
    backgroundColor: colors.success,
  },
  storeDotClosed: {
    backgroundColor: colors.gray400,
  },
  storeStatusText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
  },
  storeTextOpen: {
    color: colors.success,
  },
  storeTextClosed: {
    color: colors.textSecondary,
  },
  partnerStoreName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  partnerStoreDetails: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  partnerActionsRow: {
    marginTop: spacing.sm,
  },
  manageStoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
  },
  manageStoreButtonText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.white,
  },

  /* Card Quero ser Parceiro */
  becomePartnerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(250, 44, 44, 0.2)",
  },
  becomePartnerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  becomePartnerInfo: {
    flex: 1,
  },
  becomePartnerTitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  becomePartnerSub: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: colors.text,
    marginTop: 2,
  },

  /* Modais de Loja e Cardápio */
  partnerStoreInfoCard: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  partnerInfoTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  partnerInfoMeta: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  partnerInfoAddress: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  storeStatusToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  storeStatusToggleLabel: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.text,
  },
  storeSectionHeading: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  storeSectionSubtitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  formInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
