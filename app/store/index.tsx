import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { STORE_CATEGORIES } from "@/src/constants/stores";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { Header } from "@/src/components/ui/Header";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppInput } from "@/src/components/ui/AppInput";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FoodCard } from "@/src/components/food/FoodCard";
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { Neighborhood, Product, StoreCourier, StoreDeliveryRate } from "@/src/types";
import { formatCurrency } from "@/src/utils/currency";
import { confirmDialog, showMessage } from "@/src/utils/dialog";
import { parsePrice } from "@/src/utils/validation";
import { FOOD_IMAGES, suggestFoodImage } from "@/src/constants/foodImages";
import * as ImagePicker from "expo-image-picker";


type FieldErrors = Record<string, string>;

/**
 * Painel do empreendedor: dados da loja, abrir/fechar, cardápio (adicionar,
 * editar e excluir pratos) e atalho para os pedidos recebidos.
 */
export default function StoreDashboardScreen() {
  const { user, updateUser } = useAuth();
  const store = user?.store;

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);

  // ----- Bairros e Taxas de Entrega da Cidade (Santa Inês - MA) -----
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [storeRates, setStoreRates] = useState<StoreDeliveryRate[]>([]);
  const [searchBairro, setSearchBairro] = useState("");
  const [editingBairroId, setEditingBairroId] = useState<string | null>(null);
  const [editingBairroRate, setEditingBairroRate] = useState("");
  const [showNewBairroForm, setShowNewBairroForm] = useState(false);
  const [newBairroName, setNewBairroName] = useState("");
  const [newBairroZone, setNewBairroZone] = useState<"central" | "periferica" | "rural">("central");
  const [savingBairro, setSavingBairro] = useState(false);

  // ----- Formulário de prato (serve para adicionar e para editar) -----
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCat, setProdCat] = useState("Destaques");
  const [prodErrors, setProdErrors] = useState<FieldErrors>({});
  // Foto escolhida na galeria/upload. null = usar a sugestão automática pelo nome do prato
  const [prodImage, setProdImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // ----- Formulário de dados da loja -----
  const [editingStore, setEditingStore] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeCat, setStoreCat] = useState("Lanches");
  const [storeTime, setStoreTime] = useState("");
  const [storeFee, setStoreFee] = useState("");
  const [storeDeliveryMode, setStoreDeliveryMode] = useState<"own_courier" | "independent_couriers" | "both">("own_courier");
  const [storeErrors, setStoreErrors] = useState<FieldErrors>({});

  // ----- Motoboys próprios da loja -----
  const [storeCouriers, setStoreCouriers] = useState<StoreCourier[]>([]);
  const [showCourierForm, setShowCourierForm] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [courierVehicleType, setCourierVehicleType] = useState<"moto" | "bicicleta" | "carro">("moto");
  const [courierPlate, setCourierPlate] = useState("");
  const [savingCourier, setSavingCourier] = useState(false);
  const [courierErrors, setCourierErrors] = useState<FieldErrors>({});
  const [refreshing, setRefreshing] = useState(false);

  const cityId = (store as any)?.cityId || "cidade-santa-ines";

  const loadData = useCallback(async () => {
    if (!store) return;
    setLoadingProducts(true);
    try {
      const [prods, orders, neighs, rates, couriers] = await Promise.all([
        api.getProducts(store.id),
        api.getStoreOrders(store.id),
        api.getNeighborhoods(cityId),
        api.getStoreDeliveryRates(store.id),
        api.getStoreCouriers(store.id),
      ]);
      setProducts(prods);
      setNeighborhoods(neighs);
      setStoreRates(rates);
      setStoreCouriers(couriers);
      // Pedidos que ainda precisam de ação da loja
      setPendingOrders(
        orders.filter((o) => o.status === "placed" || o.status === "preparing").length
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [store?.id, cityId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  if (!store) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Minha Loja"
          onBackPress={() => router.replace("/(tabs)/profile")}
        />
        <EmptyState
          icon="storefront-outline"
          accentIcon="add"
          title="Você ainda não tem uma loja"
          message="Cadastre sua loja no seu perfil para começar a vender pelo Food Rush."
          actionLabel="Ir para o perfil"
          onAction={() => router.replace("/(tabs)/profile")}
        />
      </SafeAreaView>
    );
  }

  const isOpen = store.isOpen !== false;

  // Foto do prato: a escolhida pelo dono ou a sugerida pelo nome/categoria
  const suggestedImage = suggestFoodImage(prodName, prodCat, store.category);
  const selectedImage = prodImage ?? suggestedImage;
  const selectedImageLabel =
    FOOD_IMAGES.find((img) => img.url === selectedImage)?.label ?? "Foto atual";

  // ---------- Loja: abrir / fechar ----------
  const handleToggleOpen = async () => {
    const next = !isOpen;
    await updateUser({ store: { ...store, isOpen: next } });
    await api.setStoreOpen(store.id, next);
    showMessage(
      "Status da Loja",
      next
        ? "Sua loja agora está ABERTA para receber pedidos!"
        : "Sua loja foi marcada como FECHADA. Os clientes não conseguem pedir."
    );
  };

  // ---------- Loja: editar dados ----------
  const openStoreEdit = () => {
    setStoreName(store.name);
    setStoreCat(store.category);
    setStoreTime(store.deliveryTime ?? "30-45 min");
    setStoreFee(
      store.deliveryMode === "independent_couriers"
        ? "Automática"
        : (store.deliveryFee ?? 0).toFixed(2).replace(".", ",")
    );
    setStoreDeliveryMode(store.deliveryMode || "own_courier");
    setStoreErrors({});
    setEditingStore(true);
  };

  const handleSaveStore = async () => {
    const errors: FieldErrors = {};
    const fee = storeDeliveryMode === "independent_couriers" ? 6.0 : parsePrice(storeFee);
    if (!storeName.trim()) errors.name = "Informe o nome da loja.";
    if (!storeTime.trim()) errors.time = "Informe o tempo médio.";
    if (storeDeliveryMode === "own_courier" && fee === null) {
      errors.fee = "Use só números. Ex: 5,99 ou 0";
    }
    setStoreErrors(errors);
    if (Object.keys(errors).length > 0 || fee === null) return;

    const changes = {
      name: storeName.trim(),
      category: storeCat,
      deliveryTime: storeTime.trim(),
      deliveryFee: fee,
      deliveryMode: storeDeliveryMode,
    };
    await updateUser({ store: { ...store, ...changes } });
    await api.updateStore(store.id, changes);
    setEditingStore(false);
    showMessage("Loja atualizada", "Os dados da sua loja foram salvos.");
  };

  // ---------- Motoboys Próprios da Loja ----------
  const handleSaveStoreCourier = async () => {
    const errors: FieldErrors = {};
    if (!courierName.trim()) errors.name = "Informe o nome do motoboy.";
    if (!courierPhone.trim()) errors.phone = "Informe o celular/WhatsApp.";
    if (courierVehicleType !== "bicicleta" && !courierPlate.trim()) {
      errors.plate = "Informe a placa do veículo.";
    }
    setCourierErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingCourier(true);
    try {
      await api.addStoreCourier(store.id, {
        restaurantId: store.id,
        name: courierName.trim(),
        phone: courierPhone.trim(),
        vehicleType: courierVehicleType,
        vehicle: courierVehicleType === "moto" ? "Motocicleta" : courierVehicleType === "bicicleta" ? "Bicicleta" : "Carro",
        plate: courierPlate.toUpperCase().trim(),
        isActive: true,
      });
      setShowCourierForm(false);
      setCourierName("");
      setCourierPhone("");
      setCourierPlate("");
      setCourierErrors({});
      showMessage("Motoboy cadastrado", "Seu motoboy próprio foi adicionado com sucesso!");
      await loadData();
    } catch (err: any) {
      showMessage("Erro", err?.message || "Não foi possível cadastrar o motoboy.");
    } finally {
      setSavingCourier(false);
    }
  };

  const handleDeleteStoreCourier = async (c: StoreCourier) => {
    const ok = await confirmDialog(
      "Remover motoboy",
      `Deseja remover ${c.name} da lista de motoboys próprios da loja?`,
      "Remover",
      true
    );
    if (!ok) return;
    await api.deleteStoreCourier(store.id, c.id);
    showMessage("Removido", `${c.name} foi removido.`);
    await loadData();
  };

  // ---------- Loja: excluir ----------
  const handleDeleteStore = async () => {
    const ok = await confirmDialog(
      "Excluir loja",
      `Tem certeza que deseja excluir "${store.name}"? Todos os pratos dela também serão apagados. Isso não pode ser desfeito.`,
      "Excluir",
      true
    );
    if (!ok) return;
    await api.deleteStore(store.id);
    await updateUser({ store: undefined, role: "customer" });
    showMessage("Loja excluída", "Sua loja foi removida do Food Rush.");
    router.replace("/(tabs)/profile");
  };

  // ---------- Pratos: adicionar / editar ----------
  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdPrice("");
    setProdDesc("");
    setProdCat("Destaques");
    setProdErrors({});
    setProdImage(null);
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdPrice(product.price.toFixed(2).replace(".", ","));
    setProdDesc(product.description);
    setProdCat(product.category);
    setProdErrors({});
    setProdImage(product.image);
  };

  const handleSaveProduct = async () => {
    const errors: FieldErrors = {};
    const price = parsePrice(prodPrice);
    if (!prodName.trim()) errors.name = "Informe o nome do prato.";
    if (!prodPrice.trim()) errors.price = "Informe o preço.";
    else if (price === null) errors.price = "Use só números. Ex: 34,90";
    else if (price <= 0) errors.price = "O preço precisa ser maior que zero.";
    if (!prodCat.trim()) errors.category = "Informe a categoria do prato.";
    setProdErrors(errors);
    if (Object.keys(errors).length > 0 || price === null) return;

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await api.updateStoreProduct({
          ...editingProduct,
          name: prodName.trim(),
          price,
          description: prodDesc.trim(),
          category: prodCat.trim(),
          image: selectedImage,
        });
        showMessage("Prato atualizado", `"${prodName.trim()}" foi salvo.`);
      } else {
        await api.addStoreProduct(store.id, {
          name: prodName.trim(),
          price,
          description: prodDesc.trim(),
          category: prodCat.trim(),
          image: selectedImage,
        });
        showMessage("Sucesso!", `"${prodName.trim()}" foi adicionado ao cardápio.`);
      }
      resetProductForm();
      await loadData();
    } finally {
      setSavingProduct(false);
    }
  };

  // ---------- Pratos: excluir ----------
  const handleDeleteProduct = async (product: Product) => {
    const ok = await confirmDialog(
      "Excluir prato",
      `Remover "${product.name}" do cardápio?`,
      "Excluir",
      true
    );
    if (!ok) return;
    await api.deleteStoreProduct(product.id);
    if (editingProduct?.id === product.id) resetProductForm();
    await loadData();
  };

  // ---------- Upload e Captura de Foto de Prato / Produto ----------
  const handleCameraProductImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showMessage("Permissão necessária", "Permita o acesso à câmera para fotografar o prato.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingImage(true);
        try {
          if (asset.base64) {
            const res = await api.uploadImage({
              base64: `data:image/jpeg;base64,${asset.base64}`,
              fileName: `product-cam-${Date.now()}.jpg`,
              folder: "products",
            });
            setProdImage(res.url);
            showMessage("Foto capturada", "Foto do prato adicionada com sucesso!");
          } else if (asset.uri) {
            setProdImage(asset.uri);
          }
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      setUploadingImage(false);
      showMessage("Erro na câmera", err?.message || "Não foi possível abrir a câmera.");
    }
  };

  const handlePickProductImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showMessage("Permissão necessária", "Permita o acesso à galeria para enviar fotos dos pratos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingImage(true);
        try {
          if (asset.base64) {
            const res = await api.uploadImage({
              base64: `data:image/jpeg;base64,${asset.base64}`,
              fileName: `product-${Date.now()}.jpg`,
              folder: "products",
            });
            setProdImage(res.url);
            showMessage("Upload concluído", "Foto do prato enviada com sucesso!");
          } else if (asset.uri) {
            setProdImage(asset.uri);
          }
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      setUploadingImage(false);
      showMessage("Erro no upload", err?.message || "Não foi possível carregar a imagem.");
    }
  };

  // ---------- Taxas de Entrega por Bairro (Santa Inês - MA) ----------
  const handleSaveBairroRate = async (bairroId: string) => {
    const rate = parsePrice(editingBairroRate);
    if (rate === null || rate < 0) {
      showMessage("Valor inválido", "Informe um valor de taxa válido (ex: 7,50 ou 0 para grátis).");
      return;
    }
    try {
      await api.saveStoreDeliveryRate(store.id, bairroId, rate, 35);
      showMessage("Taxa salva", "A taxa de entrega para este bairro foi atualizada!");
      setEditingBairroId(null);
      setEditingBairroRate("");
      const updatedRates = await api.getStoreDeliveryRates(store.id);
      setStoreRates(updatedRates);
    } catch (err: any) {
      showMessage("Erro ao salvar", err?.message || "Não foi possível salvar a taxa.");
    }
  };

  const handleAddNeighborhood = async () => {
    if (!newBairroName.trim()) {
      showMessage("Campo obrigatório", "Digite o nome do novo bairro.");
      return;
    }
    setSavingBairro(true);
    try {
      const created = await api.addNeighborhood(cityId, {
        name: newBairroName.trim(),
        zone: newBairroZone,
      });
      showMessage("Bairro adicionado", `O bairro "${created.name}" foi cadastrado com sucesso em Santa Inês!`);
      setNewBairroName("");
      setShowNewBairroForm(false);
      const updatedNeighs = await api.getNeighborhoods(cityId);
      setNeighborhoods(updatedNeighs);
    } catch (err: any) {
      showMessage("Erro ao adicionar", err?.message || "Não foi possível adicionar o bairro.");
    } finally {
      setSavingBairro(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Minha Loja"
        onBackPress={() => router.replace("/(tabs)/profile")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ===== Dados da loja ===== */}
        <View style={styles.card}>
          {editingStore ? (
            <>
              <Text style={styles.cardTitle}>Editar dados da loja</Text>
              <AppInput
                label="Nome da loja"
                value={storeName}
                onChangeText={setStoreName}
                error={storeErrors.name}
              />
              <Text style={styles.chipsLabel}>Categoria</Text>
              <View style={styles.chipsRow}>
                {STORE_CATEGORIES.map((cat) => {
                  const selected = storeCat === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setStoreCat(cat)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Modalidade de Entrega */}
              <Text style={styles.chipsLabel}>Modalidade de Entrega</Text>
              <View style={styles.chipsRow}>
                <Pressable
                  style={[styles.chip, storeDeliveryMode === "own_courier" && styles.chipSelected]}
                  onPress={() => setStoreDeliveryMode("own_courier")}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="bicycle"
                    size={14}
                    color={storeDeliveryMode === "own_courier" ? colors.white : colors.gray400}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.chipText, storeDeliveryMode === "own_courier" && styles.chipTextSelected]}>
                    Motoboy Próprio
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.chip, storeDeliveryMode === "independent_couriers" && styles.chipSelected]}
                  onPress={() => setStoreDeliveryMode("independent_couriers")}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="people"
                    size={14}
                    color={storeDeliveryMode === "independent_couriers" ? colors.white : colors.gray400}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.chipText, storeDeliveryMode === "independent_couriers" && styles.chipTextSelected]}>
                    Rede Autônoma (Food Rush)
                  </Text>
                </Pressable>
              </View>

              {storeDeliveryMode === "independent_couriers" && (
                <View style={styles.autoFeeBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.autoFeeBoxText}>
                    Na Rede Autônoma, os entregadores do aplicativo realizam as entregas e as taxas são calculadas automaticamente por bairro. A loja não define taxa manual.
                  </Text>
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.half}>
                  <AppInput
                    label="Tempo médio"
                    value={storeTime}
                    onChangeText={setStoreTime}
                    error={storeErrors.time}
                  />
                </View>
                <View style={styles.half}>
                  <AppInput
                    label={
                      storeDeliveryMode === "independent_couriers"
                        ? "Taxa de entrega (Rede)"
                        : "Taxa de entrega (R$)"
                    }
                    placeholder={
                      storeDeliveryMode === "independent_couriers"
                        ? "Automática"
                        : "Ex: 5.99"
                    }
                    value={
                      storeDeliveryMode === "independent_couriers"
                        ? "Automática por bairro"
                        : storeFee
                    }
                    editable={storeDeliveryMode !== "independent_couriers"}
                    onChangeText={setStoreFee}
                    keyboardType="decimal-pad"
                    error={storeErrors.fee}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <AppButton
                  title="Cancelar"
                  variant="outline"
                  onPress={() => setEditingStore(false)}
                  style={styles.half}
                />
                <AppButton title="Salvar" onPress={handleSaveStore} style={styles.half} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.storeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeMeta}>
                    {store.category} · {store.deliveryTime ?? "30-45 min"} · Taxa{" "}
                    {store.deliveryMode === "independent_couriers"
                      ? "Calculada por bairro"
                      : formatCurrency(store.deliveryFee ?? 0)}
                  </Text>
                  <View style={styles.storeDeliveryTag}>
                    <Ionicons
                      name={store.deliveryMode === "independent_couriers" ? "people" : "bicycle"}
                      size={13}
                      color={colors.primary}
                    />
                    <Text style={styles.storeDeliveryTagText}>
                      {store.deliveryMode === "independent_couriers"
                        ? "Rede Autônoma de Entregadores"
                        : "Motoboy Próprio da Loja"}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={openStoreEdit}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Editar dados da loja"
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>

              <Pressable
                style={[styles.statusPill, isOpen ? styles.statusOpen : styles.statusClosed]}
                onPress={handleToggleOpen}
                accessibilityRole="switch"
                accessibilityState={{ checked: isOpen }}
              >
                <View style={[styles.statusDot, { backgroundColor: isOpen ? colors.success : colors.error }]} />
                <Text style={[styles.statusText, { color: isOpen ? colors.success : colors.error }]}>
                  {isOpen ? "Aberta · toque para fechar" : "Fechada · toque para abrir"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ===== Atalho para os pedidos ===== */}
        <Pressable
          style={styles.ordersShortcut}
          onPress={() => router.push("/store/orders" as any)}
          accessibilityRole="button"
        >
          <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ordersTitle}>Pedidos recebidos</Text>
            <Text style={styles.ordersSub}>Aceitar, preparar e despachar para entregador</Text>
          </View>
          {pendingOrders > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingOrders}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

        {/* ===== Motoboys Próprios da Loja ===== */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithAction}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Motoboys Próprios da Loja</Text>
              <Text style={styles.cardSubtitle}>
                Cadastre entregadores fixos da sua loja para despachar pedidos.
              </Text>
            </View>
            <Pressable
              style={styles.addSmallBtn}
              onPress={() => setShowCourierForm((prev) => !prev)}
            >
              <Ionicons
                name={showCourierForm ? "close" : "add"}
                size={16}
                color={colors.white}
              />
              <Text style={styles.addSmallBtnText}>
                {showCourierForm ? "Fechar" : "Novo Motoboy"}
              </Text>
            </Pressable>
          </View>

          {showCourierForm && (
            <View style={styles.newCourierBox}>
              <Text style={styles.subFormTitle}>Cadastrar Motoboy Próprio</Text>
              <AppInput
                label="Nome do Motoboy"
                placeholder="Ex: Carlos Oliveira"
                value={courierName}
                onChangeText={setCourierName}
                error={courierErrors.name}
              />
              <AppInput
                label="Celular / WhatsApp"
                placeholder="Ex: (98) 98888-0000"
                value={courierPhone}
                onChangeText={setCourierPhone}
                keyboardType="phone-pad"
                error={courierErrors.phone}
              />
              <Text style={styles.chipsLabel}>Tipo de Veículo</Text>
              <View style={styles.chipsRow}>
                {(["moto", "bicicleta", "carro"] as const).map((vt) => (
                  <Pressable
                    key={vt}
                    style={[styles.chip, courierVehicleType === vt && styles.chipSelected]}
                    onPress={() => setCourierVehicleType(vt)}
                  >
                    <Text style={[styles.chipText, courierVehicleType === vt && styles.chipTextSelected]}>
                      {vt === "moto" ? "Moto" : vt === "bicicleta" ? "Bicicleta" : "Carro"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {courierVehicleType !== "bicicleta" && (
                <AppInput
                  label="Placa do Veículo"
                  placeholder="Ex: NXR-2026"
                  value={courierPlate}
                  onChangeText={setCourierPlate}
                  autoCapitalize="characters"
                  error={courierErrors.plate}
                />
              )}
              <AppButton
                title="Salvar Motoboy"
                onPress={handleSaveStoreCourier}
                loading={savingCourier}
                size="sm"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}

          {storeCouriers.length === 0 ? (
            <Text style={styles.emptyNoticeText}>
              Nenhum motoboy próprio cadastrado ainda. Sua loja pode usar entregadores autônomos da rede ou cadastrar seus próprios entregadores aqui.
            </Text>
          ) : (
            storeCouriers.map((c) => (
              <View key={c.id} style={styles.courierRowItem}>
                <View style={styles.courierRowIcon}>
                  <Ionicons name="bicycle" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courierRowName}>{c.name}</Text>
                  <Text style={styles.courierRowDetails}>
                    {c.vehicle} {c.plate ? `• Placa: ${c.plate}` : ""} • {c.phone}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteStoreCourier(c)}
                  style={styles.deleteSmallBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* ===== Formulário de prato ===== */}
        <Text style={styles.sectionTitle}>
          {editingProduct ? `Editando: ${editingProduct.name}` : "Adicionar prato"}
        </Text>
        <AppInput
          label="Nome do prato"
          placeholder="Ex: Hambúrguer Especial Duplo"
          value={prodName}
          onChangeText={setProdName}
          error={prodErrors.name}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <AppInput
              label="Preço (R$)"
              placeholder="Ex: 34,90"
              value={prodPrice}
              onChangeText={setProdPrice}
              keyboardType="decimal-pad"
              error={prodErrors.price}
            />
          </View>
          <View style={styles.half}>
            <AppInput
              label="Categoria"
              placeholder="Ex: Bebidas"
              value={prodCat}
              onChangeText={setProdCat}
              error={prodErrors.category}
            />
          </View>
        </View>
        <AppInput
          label="Descrição"
          placeholder="Ex: Pão brioche, 2 blends 150g e queijo gouda."
          value={prodDesc}
          onChangeText={setProdDesc}
          multiline
        />

        {/* Galeria e upload de fotos do prato */}
        <View style={styles.photoHeaderRow}>
          <Text style={styles.chipsLabel}>Foto do prato</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Pressable
              style={styles.uploadBtn}
              onPress={handleCameraProductImage}
              disabled={uploadingImage}
              accessibilityRole="button"
              accessibilityLabel="Tirar foto com a câmera"
            >
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={styles.uploadBtnText}>Câmera</Text>
            </Pressable>

            <Pressable
              style={styles.uploadBtn}
              onPress={handlePickProductImage}
              disabled={uploadingImage}
              accessibilityRole="button"
              accessibilityLabel="Escolher foto da galeria"
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="images-outline" size={16} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>Galeria</Text>
                </>
              )}
            </Pressable>

            {prodImage && (
              <Pressable
                style={[styles.uploadBtn, { borderColor: colors.gray300 }]}
                onPress={() => setProdImage(null)}
                accessibilityRole="button"
                accessibilityLabel="Restaurar foto sugerida"
              >
                <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.uploadBtnText, { color: colors.textSecondary }]}>Sugerida</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.photoHint}>
          {prodImage
            ? `Escolhida por você: ${selectedImageLabel}.`
            : `Sugerida pelo nome do prato: ${selectedImageLabel}. Toque em outra para trocar ou use o botão de upload.`}
        </Text>
        {/* Prévia grande da foto que vai para o cardápio */}
        <Image source={{ uri: selectedImage }} style={styles.photoPreview} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {FOOD_IMAGES.map((img) => {
            const selected = img.url === selectedImage;
            return (
              <Pressable
                key={img.id}
                style={styles.photoOption}
                onPress={() => setProdImage(img.url)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Foto: ${img.label}`}
              >
                <Image
                  source={{ uri: img.url }}
                  style={[styles.photoThumb, selected && styles.photoThumbSelected]}
                />
                <Text
                  style={[styles.photoLabel, selected && styles.photoLabelSelected]}
                  numberOfLines={1}
                >
                  {img.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.row}>
          {editingProduct && (
            <AppButton
              title="Cancelar"
              variant="outline"
              onPress={resetProductForm}
              style={styles.half}
            />
          )}
          <AppButton
            title={editingProduct ? "Salvar alterações" : "Adicionar ao cardápio"}
            onPress={handleSaveProduct}
            loading={savingProduct}
            style={editingProduct ? styles.half : styles.full}
          />
        </View>

        {/* ===== Lista de pratos ===== */}
        <Text style={styles.sectionTitle}>Cardápio ({products.length})</Text>
        {loadingProducts && products.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : products.length === 0 ? (
          <Text style={styles.emptyMenu}>
            Nenhum prato cadastrado ainda. Use o formulário acima para adicionar o primeiro.
          </Text>
        ) : (
          products.map((product) => (
            <FoodCard
              key={product.id}
              product={product}
              isOwner={true}
              onEdit={startEditProduct}
              onDelete={handleDeleteProduct}
            />
          ))
        )}

        {/* ===== Taxas de Entrega por Bairro (Santa Inês - MA) ===== */}
        <View style={styles.ratesSection}>
          {store.deliveryMode === "independent_couriers" && (
            <View style={styles.independentModeNotice}>
              <Ionicons name="information-circle" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.independentModeTitle}>
                  Modalidade: Rede Autônoma de Entregadores
                </Text>
                <Text style={styles.independentModeDesc}>
                  Sua loja utiliza os entregadores autônomos da rede Food Rush. As taxas de entrega para os clientes de Santa Inês são calculadas automaticamente pela distância até o bairro: o motoboy recebe no mínimo R$ 6,50 por rota mais R$ 1,50 por km rodado. A loja não pode alterar essas taxas manualmente. Para definir taxas próprias, altere a modalidade da loja para "Motoboy Próprio".
                </Text>
              </View>
            </View>
          )}

          <View style={styles.ratesHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Taxas de Entrega por Bairro</Text>
              <Text style={styles.ratesSubtitle}>
                Santa Inês - MA ({neighborhoods.length} bairros mapeados)
              </Text>
            </View>
            {store.deliveryMode !== "independent_couriers" && (
              <Pressable
                style={styles.addBairroBtn}
                onPress={() => setShowNewBairroForm(!showNewBairroForm)}
                accessibilityRole="button"
                accessibilityLabel={showNewBairroForm ? "Fechar cadastro de bairro" : "Adicionar novo bairro"}
              >
                <Ionicons
                  name={showNewBairroForm ? "close" : "add-circle-outline"}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.addBairroBtnText}>
                  {showNewBairroForm ? "Fechar" : "Novo Bairro"}
                </Text>
              </Pressable>
            )}
          </View>

          {showNewBairroForm && (
            <View style={styles.newBairroCard}>
              <Text style={styles.cardTitle}>Cadastrar Bairro em Santa Inês</Text>
              <AppInput
                label="Nome do Bairro"
                placeholder="Ex: Novo Tempo"
                value={newBairroName}
                onChangeText={setNewBairroName}
              />
              <Text style={styles.chipsLabel}>Zona Urbana</Text>
              <View style={styles.chipsRow}>
                {(["central", "periferica", "rural"] as const).map((z) => {
                  const sel = newBairroZone === z;
                  const label =
                    z === "central" ? "Central" : z === "periferica" ? "Periférica" : "Rural";
                  return (
                    <Pressable
                      key={z}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setNewBairroZone(z)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <AppButton
                title="Salvar Bairro"
                onPress={handleAddNeighborhood}
                loading={savingBairro}
              />
            </View>
          )}

          {/* Campo de Busca Rápida de Bairro */}
          <AppInput
            placeholder="Buscar bairro em Santa Inês..."
            value={searchBairro}
            onChangeText={setSearchBairro}
            leftIcon={<Ionicons name="search-outline" size={18} color={colors.gray400} />}
          />

          {/* Lista de Bairros */}
          <View style={styles.bairrosListContainer}>
            {neighborhoods
              .filter((b) =>
                b.name.toLowerCase().includes(searchBairro.toLowerCase().trim())
              )
              .map((bairro) => {
                const specificRate = storeRates.find(
                  (r) => r.neighborhoodId === bairro.id || r.bairroId === bairro.id
                );
                const currentFee = specificRate
                  ? (specificRate.rate ?? specificRate.deliveryFee)
                  : (store.deliveryFee ?? 0);
                const isEditing = editingBairroId === bairro.id;

                return (
                  <View key={bairro.id} style={styles.bairroRow}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                      <Text style={styles.bairroName}>{bairro.name}</Text>
                      <Text style={styles.bairroZone}>
                        Zona {bairro.zone === "central" ? "Central" : bairro.zone === "periferica" ? "Periférica" : "Rural"}
                        {specificRate ? " · Taxa própria" : " · Taxa padrão"}
                      </Text>
                    </View>

                    {isEditing ? (
                      <View style={styles.rateEditRow}>
                        <AppInput
                          placeholder="Taxa R$"
                          value={editingBairroRate}
                          onChangeText={setEditingBairroRate}
                          keyboardType="decimal-pad"
                        />
                        <Pressable
                          style={styles.saveRateBtn}
                          onPress={() => handleSaveBairroRate(bairro.id)}
                          accessibilityRole="button"
                          accessibilityLabel="Salvar taxa"
                        >
                          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                        </Pressable>
                        <Pressable
                          style={styles.cancelRateBtn}
                          onPress={() => {
                            setEditingBairroId(null);
                            setEditingBairroRate("");
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Cancelar edição"
                        >
                          <Ionicons name="close-circle" size={28} color={colors.gray400} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.rateDisplayRow}>
                        <Text style={styles.rateFeeText}>
                          {store.deliveryMode === "independent_couriers"
                            ? "Automática"
                            : currentFee > 0
                            ? formatCurrency(currentFee)
                            : "Grátis"}
                        </Text>
                        {store.deliveryMode !== "independent_couriers" && (
                          <Pressable
                            style={styles.editRateBtn}
                            onPress={() => {
                              setEditingBairroId(bairro.id);
                              setEditingBairroRate(currentFee.toFixed(2).replace(".", ","));
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Editar taxa do bairro ${bairro.name}`}
                          >
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        </View>

        {/* ===== Excluir loja ===== */}
        <Pressable
          style={styles.deleteStore}
          onPress={handleDeleteStore}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.deleteStoreText}>Excluir minha loja</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  storeName: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  storeMeta: {
    marginTop: 2,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  iconButton: {
    padding: spacing.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusOpen: {
    borderColor: colors.success,
  },
  statusClosed: {
    borderColor: colors.error,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
  },
  ordersShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  ordersTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  ordersSub: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  full: {
    flex: 1,
  },
  chipsLabel: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
  photoHint: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  photoPreview: {
    width: "100%",
    height: 140,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
    marginBottom: spacing.sm,
  },
  photoRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  photoOption: {
    width: 72,
    alignItems: "center",
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 3,
    borderColor: "transparent",
    backgroundColor: colors.gray100,
  },
  photoThumbSelected: {
    borderColor: colors.primary,
  },
  photoLabel: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  photoLabelSelected: {
    color: colors.primary,
    fontFamily: typography.semiBold,
  },
  emptyMenu: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  productName: {
    fontSize: fontSizes.md,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  productMeta: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  photoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  uploadBtnText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  ratesSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ratesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  ratesSubtitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBairroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  addBairroBtnText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  newBairroCard: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  bairrosListContainer: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  bairroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  bairroName: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  bairroZone: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rateEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    width: 170,
  },
  rateDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rateFeeText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  editRateBtn: {
    padding: spacing.xs,
  },
  saveRateBtn: {
    padding: 2,
  },
  cancelRateBtn: {
    padding: 2,
  },
  deleteStore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  deleteStoreText: {
    fontSize: fontSizes.md,
    fontFamily: typography.semiBold,
    color: colors.error,
  },
  autoFeeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  autoFeeBoxText: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.text,
    lineHeight: 18,
  },
  storeDeliveryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  storeDeliveryTagText: {
    fontSize: fontSizes.xs - 1,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  cardHeaderWithAction: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  cardSubtitle: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  addSmallBtnText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.white,
  },
  newCourierBox: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subFormTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyNoticeText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    fontStyle: "italic",
    paddingVertical: spacing.xs,
  },
  courierRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  courierRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  courierRowName: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  courierRowDetails: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  deleteSmallBtn: {
    padding: spacing.xs,
  },
  independentModeNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  independentModeTitle: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  independentModeDesc: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.text,
    lineHeight: 18,
  },
});
