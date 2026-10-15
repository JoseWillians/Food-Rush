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
import { mockProducts } from "@/src/mocks/products";
import { RatingStars } from "@/src/components/ui/RatingStars";
import { formatCurrency } from "@/src/utils/currency";
import { AppButton } from "@/src/components/ui/AppButton";

type FavoritesTab = "restaurants" | "dishes";

export default function FavoritesScreen() {
  const [activeTab, setActiveTab] = useState<FavoritesTab>("restaurants");
  const { favorites, toggleFavorite } = useFavorites();

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
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={56} color={colors.gray300} />
              <Text style={styles.emptyTitle}>Você ainda não possui favoritos</Text>
              <Text style={styles.emptySubtitle}>
                Toque no coração dos restaurantes para salvá-los aqui.
              </Text>
              <AppButton
                title="Descobrir Restaurantes"
                onPress={() => router.push("/(tabs)")}
                variant="outline"
                size="sm"
                style={{ marginTop: spacing.md, minWidth: 160 }}
              />
            </View>
          ) : (
            favorites.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                style={styles.card}
                onPress={() => router.push(`/restaurant/${restaurant.id}` as any)}
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
                      <RatingStars rating={restaurant.rating} size={14} />
                      <Text style={styles.ratingText}>
                        {restaurant.rating.toFixed(1)} ({restaurant.reviewCount})
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{restaurant.deliveryTime}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )
        ) : (
          /* Pratos Favoritos */
          mockProducts.map((product) => (
            <View key={product.id} style={styles.dishCard}>
              <Image source={{ uri: product.image }} style={styles.dishImage} />
              <View style={styles.dishInfo}>
                <Text style={styles.dishName}>{product.name}</Text>
                <Text style={styles.dishCategory}>{product.category}</Text>
                <Text style={styles.dishPrice}>{formatCurrency(product.price)}</Text>
              </View>
              <Pressable style={styles.dishFavIcon}>
                <Ionicons name="heart" size={22} color={colors.primary} />
              </Pressable>
            </View>
          ))
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

