import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
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
import { useAuth } from "@/src/contexts/AuthContext";
import { api } from "@/src/services/api";
import { Product } from "@/src/types";
import { formatCurrency } from "@/src/utils/currency";
import { confirmDialog, showMessage } from "@/src/utils/dialog";
import { parsePrice } from "@/src/utils/validation";
import { FOOD_IMAGES, suggestFoodImage } from "@/src/constants/foodImages";


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

  // ----- Formulário de prato (serve para adicionar e para editar) -----
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCat, setProdCat] = useState("Destaques");
  const [prodErrors, setProdErrors] = useState<FieldErrors>({});
  // Foto escolhida na galeria. null = usar a sugestão automática pelo nome do prato
  const [prodImage, setProdImage] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // ----- Formulário de dados da loja -----
  const [editingStore, setEditingStore] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeCat, setStoreCat] = useState("Lanches");
  const [storeTime, setStoreTime] = useState("");
  const [storeFee, setStoreFee] = useState("");
  const [storeErrors, setStoreErrors] = useState<FieldErrors>({});

  const loadData = useCallback(async () => {
    if (!store) return;
    setLoadingProducts(true);
    try {
      const [prods, orders] = await Promise.all([
        api.getProducts(store.id),
        api.getStoreOrders(store.id),
      ]);
      setProducts(prods);
      // Pedidos que ainda precisam de ação da loja
      setPendingOrders(
        orders.filter((o) => o.status === "placed" || o.status === "preparing").length
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [store?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!store) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Minha Loja" />
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
    setStoreFee((store.deliveryFee ?? 0).toFixed(2).replace(".", ","));
    setStoreErrors({});
    setEditingStore(true);
  };

  const handleSaveStore = async () => {
    const errors: FieldErrors = {};
    const fee = parsePrice(storeFee);
    if (!storeName.trim()) errors.name = "Informe o nome da loja.";
    if (!storeTime.trim()) errors.time = "Informe o tempo médio.";
    if (fee === null) errors.fee = "Use só números. Ex: 5,99 ou 0";
    setStoreErrors(errors);
    if (Object.keys(errors).length > 0 || fee === null) return;

    const changes = {
      name: storeName.trim(),
      category: storeCat,
      deliveryTime: storeTime.trim(),
      deliveryFee: fee,
    };
    await updateUser({ store: { ...store, ...changes } });
    await api.updateStore(store.id, changes);
    setEditingStore(false);
    showMessage("Loja atualizada", "Os dados da sua loja foram salvos.");
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

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Minha Loja" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                    label="Taxa de entrega (R$)"
                    value={storeFee}
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
                    {formatCurrency(store.deliveryFee ?? 0)}
                  </Text>
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
          onPress={() => router.push("/store/orders")}
          accessibilityRole="button"
        >
          <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ordersTitle}>Pedidos recebidos</Text>
            <Text style={styles.ordersSub}>Aceitar, preparar e enviar pedidos</Text>
          </View>
          {pendingOrders > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingOrders}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>

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

        {/* Galeria de fotos do prato */}
        <Text style={styles.chipsLabel}>Foto do prato</Text>
        <Text style={styles.photoHint}>
          {prodImage
            ? `Escolhida por você: ${selectedImageLabel}.`
            : `Sugerida pelo nome do prato: ${selectedImageLabel}. Toque em outra para trocar.`}
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
            <View key={product.id} style={styles.productRow}>
              <Image source={{ uri: product.image }} style={styles.productImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.productMeta}>
                  {formatCurrency(product.price)} · {product.category}
                </Text>
              </View>
              <Pressable
                onPress={() => startEditProduct(product)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${product.name}`}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => handleDeleteProduct(product)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${product.name}`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))
        )}

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
});
