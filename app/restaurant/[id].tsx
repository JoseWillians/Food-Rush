import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { mockProducts } from "@/src/mocks/products";
import { mockReviews } from "@/src/mocks/reviews";
import { useCart } from "@/src/contexts/CartContext";
import { useFavorites } from "@/src/contexts/FavoritesContext";
import { RatingStars } from "@/src/components/ui/RatingStars";
import { BackButton } from "@/src/components/ui/BackButton";
import { formatCurrency } from "@/src/utils/currency";
import { api } from "@/src/services/api";
import { Product, Restaurant } from "@/src/types";

type RestaurantTab = "menu" | "reviews";

export default function RestaurantDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<RestaurantTab>("menu");

  const [restaurant, setRestaurant] = useState<Restaurant>(() => {
    return mockRestaurants.find((r) => r.id === id) || mockRestaurants[0];
  });
  const [products, setProducts] = useState<Product[]>(() => {
    return mockProducts.filter((p) => p.restaurantId === id || id === "1");
  });

  React.useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const found = await api.getRestaurantById(id);
        if (found) {
          setRestaurant(found);
        }
        const prods = await api.getProducts(id);
        if (prods && prods.length > 0) {
          setProducts(prods);
        }
      } catch {
        // Fallback silencioso
      }
    }
    loadData();
  }, [id]);

  const { addItem, items, total, itemCount } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isFav = isFavorite(restaurant.id);

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
          </View>
        </View>

        {/* Informações do Restaurante */}
        <View style={styles.infoSection}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>
                ({restaurant.reviewCount} avaliações)
              </Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaText}>{restaurant.priceRange}</Text>
          </View>

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
              {products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {product.description}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(product.price)}
                    </Text>
                  </View>

                  <View style={styles.productImageWrapper}>
                    <Image
                      source={{ uri: product.image }}
                      style={styles.productImage}
                    />
                    <Pressable
                      style={styles.addButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Adicionar ${product.name} ao carrinho`}
                      onPress={() => addItem(product)}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={20} color={colors.white} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* Avaliações */
            <View style={styles.reviewsSection}>
              {mockReviews.map((review) => (
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
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
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
    bottom: 16,
    left: spacing.lg,
    right: spacing.lg,
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
});

