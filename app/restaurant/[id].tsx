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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { mockProducts } from "@/src/mocks/products";
import { useCart } from "@/src/contexts/CartContext";
import { useFavorites } from "@/src/contexts/FavoritesContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { RatingStars } from "@/src/components/ui/RatingStars";
import { BackButton } from "@/src/components/ui/BackButton";
import { AppButton } from "@/src/components/ui/AppButton";
import { FoodCard } from "@/src/components/food/FoodCard";
import { formatCurrency } from "@/src/utils/currency";
import { api } from "@/src/services/api";
import { confirmDialog, showMessage } from "@/src/utils/dialog";
import { Product, Restaurant, Review } from "@/src/types";

type RestaurantTab = "menu" | "reviews";

/**
 * Página da loja: cardápio, avaliações, favoritar e adicionar ao carrinho.
 * O [id] no nome do arquivo é o id da loja, vindo da rota (useLocalSearchParams).
 */
export default function RestaurantDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<RestaurantTab>("menu");

  // Começa com os dados locais (mocks) para a tela abrir rápido.
  // Lojas criadas pelo empreendedor não estão nos mocks: nesse caso começa como null.
  const [restaurant, setRestaurant] = useState<Restaurant | null>(
    () => mockRestaurants.find((r) => r.id === id) ?? null
  );
  // Só os pratos desta loja
  const [products, setProducts] = useState<Product[]>(() =>
    mockProducts.filter((p) => p.restaurantId === id)
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { addItem, clearCart, total, itemCount, cartRestaurant, isFromAnotherStore } = useCart();
  const { isFavorite, toggleFavorite, isFavoriteProduct, toggleFavoriteProduct } = useFavorites();

  // Recarrega sempre que a tela ganha foco. Assim, se o dono cadastrar um prato
  // ou o cliente enviar uma avaliação, a tela já aparece atualizada ao voltar.
  useFocusEffect(
    useCallback(() => {
      let ativo = true; // evita atualizar o estado se o usuário já saiu da tela

      async function loadData() {
        if (!id) return;
        try {
          const [found, prods, revs] = await Promise.all([
            api.getRestaurantById(id),
            api.getProducts(id),
            api.getReviews(id),
          ]);
          if (!ativo) return;
          if (found) setRestaurant(found);
          setProducts(prods);
          setReviews(revs);
        } catch {
          // Em caso de erro mantém os dados locais já exibidos
        } finally {
          if (ativo) setLoading(false);
        }
      }

      loadData();
      return () => {
        ativo = false;
      };
    }, [id])
  );

  // Ainda buscando uma loja criada pelo empreendedor (ou ela não existe)
  if (!restaurant) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.gray400} />
            <Text style={styles.emptyTitle}>Loja não encontrada</Text>
            <AppButton title="Voltar" variant="outline" onPress={() => router.back()} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const isFav = isFavorite(restaurant.id);
  // Loja fechada não aceita pedidos (lojas sem essa informação contam como abertas)
  const isClosed = restaurant.isOpen === false;

  const handleAddProduct = async (product: Product) => {
    if (isClosed) {
      showMessage("Loja fechada", "Esta loja não está recebendo pedidos agora.");
      return;
    }
    // O carrinho só pode ter itens de uma loja, porque cada pedido vai para um restaurante
    if (isFromAnotherStore(product)) {
      const outraLoja = cartRestaurant?.name ?? "outra loja";
      const trocar = await confirmDialog(
        "Trocar de loja?",
        `Seu carrinho tem itens de ${outraLoja}. Para pedir em ${restaurant.name}, o carrinho atual será esvaziado.`,
        "Esvaziar e adicionar",
        true
      );
      if (!trocar) return;
      clearCart();
    }
    addItem(product);
    showMessage("Adicionado!", `"${product.name}" foi adicionado à sua sacola.`);
  };
  // O usuário logado é o dono desta loja?
  const isOwner = user?.store?.id === restaurant.id;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Imagem do Restaurante & Botões Flutuantes */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: restaurant.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.topActions}>
            <BackButton style={styles.actionCircle} />
            <View style={styles.topRightActions}>
              <Pressable
                style={styles.actionCircle}
                accessibilityRole="button"
                accessibilityLabel={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                onPress={() => toggleFavorite(restaurant)}
              >
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={22}
                  color={isFav ? colors.primary : colors.text}
                />
              </Pressable>
              <Pressable
                style={[styles.actionCircle, styles.cartCircleBtn]}
                accessibilityRole="button"
                accessibilityLabel="Abrir carrinho de compras"
                onPress={() => router.push("/cart")}
              >
                <Ionicons name="cart-outline" size={22} color={colors.text} />
                {itemCount > 0 && (
                  <View style={styles.headerCartBadge}>
                    <Text style={styles.headerCartBadgeText}>
                      {itemCount > 99 ? "99+" : itemCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Informações do Restaurante */}
        <View style={styles.infoSection}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={colors.warning} />
              {restaurant.reviewCount === 0 ? (
                <Text style={styles.ratingText}>Novo</Text>
              ) : (
                <>
                  <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>
                    ({restaurant.reviewCount} avaliações)
                  </Text>
                </>
              )}
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaText}>{restaurant.priceRange}</Text>
          </View>

          <Text style={styles.feeText}>
            Taxa de entrega:{" "}
            {restaurant.deliveryFee > 0 ? formatCurrency(restaurant.deliveryFee) : "Grátis"}
          </Text>

          {isClosed && (
            <View style={styles.closedBanner}>
              <Ionicons name="lock-closed" size={16} color={colors.error} />
              <Text style={styles.closedBannerText}>
                Loja fechada no momento. Você pode ver o cardápio, mas não pode fazer pedidos.
              </Text>
            </View>
          )}

          {/* Abas Internas: Cardápio | Avaliações */}
          <View style={styles.tabsRow}>
            <Pressable
              style={[styles.tabItem, activeTab === "menu" && styles.tabItemActive]}
              onPress={() => setActiveTab("menu")}
            >
              <Text
                style={[
                  styles.tabTitle,
                  activeTab === "menu" && styles.tabTitleActive,
                ]}
              >
                Cardápio
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabItem,
                activeTab === "reviews" && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab("reviews")}
            >
              <Text
                style={[
                  styles.tabTitle,
                  activeTab === "reviews" && styles.tabTitleActive,
                ]}
              >
                Avaliações
              </Text>
            </Pressable>
          </View>

          {/* Conteúdo da Aba */}
          {activeTab === "menu" ? (
            /* Cardápio */
            <View style={styles.menuSection}>
              {products.length === 0 && loading ? (
                <ActivityIndicator color={colors.primary} style={styles.loader} />
              ) : products.length === 0 ? (
                // Estado vazio: a loja ainda não tem pratos
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={44} color={colors.gray400} />
                  <Text style={styles.emptyTitle}>
                    Esta loja ainda não cadastrou pratos
                  </Text>
                  <Text style={styles.emptyText}>
                    {isOwner
                      ? "Cadastre o primeiro prato para os clientes poderem pedir."
                      : "Volte mais tarde para conferir o cardápio."}
                  </Text>
                  {isOwner && (
                    <AppButton
                      title="Adicionar pratos"
                      onPress={() => router.push("/store" as any)}
                    />
                  )}
                </View>
              ) : (
                products.map((product) => (
                  <FoodCard
                    key={product.id}
                    product={product}
                    onAdd={handleAddProduct}
                    isFavorite={isFavoriteProduct(product.id)}
                    onToggleFavorite={toggleFavoriteProduct}
                    isClosed={isClosed}
                  />
                ))
              )}
            </View>
          ) : (
            /* Avaliações desta loja */
            <View style={styles.reviewsSection}>
              {reviews.length === 0 && loading ? (
                <ActivityIndicator color={colors.primary} style={styles.loader} />
              ) : reviews.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.gray400} />
                  <Text style={styles.emptyTitle}>Ainda sem avaliações</Text>
                  <Text style={styles.emptyText}>
                    Faça um pedido e seja o primeiro a avaliar esta loja.
                  </Text>
                </View>
              ) : (
                reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.userAvatarSmall}>
                        <Text style={styles.userInitial}>
                          {review.userName[0]}
                        </Text>
                      </View>
                      <View style={styles.reviewHeaderInfo}>
                        <Text style={styles.reviewAuthor}>{review.userName}</Text>
                        <Text style={styles.reviewDate}>{review.date}</Text>
                      </View>
                      <RatingStars rating={review.rating} size={14} />
                    </View>
                    {review.comment ? (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barra Inferior Flutuante do Carrinho */}
      {itemCount > 0 && (
        <View
          style={[
            styles.floatingCartBar,
            { bottom: Math.max(insets.bottom, 12) + 12 },
          ]}
        >
          <Pressable
            style={styles.cartBarButton}
            onPress={() => router.push("/cart")}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
              <Text style={styles.cartTotalText}>{formatCurrency(total)}</Text>
            </View>

            <View style={styles.cartBarRight}>
              <Text style={styles.viewCartText}>Ver carrinho</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </View>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 220,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  topActions: {
    position: "absolute",
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cartCircleBtn: {
    position: "relative",
  },
  headerCartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  headerCartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.bold,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  infoSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  restaurantName: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  reviewCount: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  metaDivider: {
    marginHorizontal: spacing.sm,
    color: colors.gray400,
  },
  metaText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  tabTitleActive: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  menuSection: {
    gap: spacing.md,
  },
  productCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  productDetails: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  productDesc: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginVertical: 4,
    lineHeight: 16,
  },
  productPrice: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
    marginTop: 2,
  },
  productImageWrapper: {
    position: "relative",
    width: 90,
    height: 90,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: borderRadius.sm,
  },
  addButton: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  reviewsSection: {
    gap: spacing.md,
  },
  reviewCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  userAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  userInitial: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  reviewHeaderInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  reviewAuthor: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  reviewDate: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  reviewComment: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.text,
    lineHeight: 18,
  },
  floatingCartBar: {
    position: "absolute",
    bottom: 20,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    elevation: 12,
  },
  cartBarButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cartBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cartBadge: {
    backgroundColor: colors.white,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: colors.primary,
    fontFamily: typography.bold,
    fontSize: fontSizes.xs,
  },
  cartTotalText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: fontSizes.md,
  },
  cartBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  viewCartText: {
    color: colors.white,
    fontFamily: typography.semiBold,
    fontSize: fontSizes.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  feeText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  closedBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.error,
  },
  addButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
});

