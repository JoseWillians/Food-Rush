import React, { useState } from "react";
import {
  Image,
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
import { useFavorites } from "@/src/contexts/FavoritesContext";
import { RatingStars } from "@/src/components/ui/RatingStars";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { FoodCard } from "@/src/components/food/FoodCard";

type FavoritesTab = "restaurants" | "dishes";

/**
 * Aba Favoritos: restaurantes e pratos marcados com o coração.
 * Os dados vêm do FavoritesContext e ficam salvos por usuário.
 */
export default function FavoritesScreen() {
  const [activeTab, setActiveTab] = useState<FavoritesTab>("restaurants");
  const { favorites, toggleFavorite, favoriteProducts, toggleFavoriteProduct } = useFavorites();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Favoritos</Text>
      </View>

      {/* Subabas: Restaurantes | Pratos */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === "restaurants" && styles.activeTabButton]}
          onPress={() => setActiveTab("restaurants")}
        >
          <Text
            style={[styles.tabText, activeTab === "restaurants" && styles.activeTabText]}
          >
            Restaurantes
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === "dishes" && styles.activeTabButton]}
          onPress={() => setActiveTab("dishes")}
        >
          <Text
            style={[styles.tabText, activeTab === "dishes" && styles.activeTabText]}
          >
            Pratos
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "restaurants" ? (
          favorites.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              accentIcon="heart"
              title="Você ainda não tem favoritos"
              message="Toque no coração de um restaurante para guardá-lo aqui e achar mais rápido depois."
              actionLabel="Descobrir restaurantes"
              onAction={() => router.push("/(tabs)")}
            />
          ) : (
            favorites.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } })
                }
              >
                <Image source={{ uri: restaurant.image }} style={styles.cardImage} />
                <Pressable
                  style={styles.favoriteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(restaurant);
                  }}
                >
                  <Ionicons name="heart" size={22} color={colors.primary} />
                </Pressable>

                <View style={styles.cardInfo}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{restaurant.name}</Text>
                    <Text style={styles.cardPrice}>{restaurant.priceRange}</Text>
                  </View>
                  <Text style={styles.cardCategory}>{restaurant.category}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.ratingRow}>
                      {restaurant.reviewCount === 0 ? (
                        <Text style={styles.ratingText}>Novo</Text>
                      ) : (
                        <>
                          <RatingStars rating={restaurant.rating} size={14} />
                          <Text style={styles.ratingText}>
                            {restaurant.rating.toFixed(1)} ({restaurant.reviewCount})
                          </Text>
                        </>
                      )}
                    </View>
                    <Text style={styles.timeText}>{restaurant.deliveryTime}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )
        ) : (
          /* Pratos Favoritos: só os que o usuário marcou com o coração */
          favoriteProducts.length === 0 ? (
            <EmptyState
              icon="fast-food-outline"
              accentIcon="heart"
              title="Nenhum prato favorito"
              message="Toque no coração de um prato dentro da loja para guardá-lo aqui."
              actionLabel="Descobrir pratos"
              onAction={() => router.push("/(tabs)")}
            />
          ) : (
            favoriteProducts.map((product) => (
              <FoodCard
                key={product.id}
                product={product}
                isFavorite={true}
                onToggleFavorite={toggleFavoriteProduct}
                onPress={() =>
                  router.push({ pathname: "/restaurant/[id]", params: { id: product.restaurantId } })
                }
              />
            ))
          )
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 140,
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  cardInfo: {
    padding: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  cardPrice: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  cardCategory: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.text,
    marginLeft: 4,
  },
  timeText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  dishCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  dishMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  dishImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.sm,
  },
  dishInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  dishName: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.text,
  },
  dishCategory: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  dishPrice: {
    fontSize: fontSizes.sm,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  dishFavIcon: {
    padding: spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 3,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

