import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme/colors";
import { borderRadius, spacing } from "@/src/theme/spacing";
import { fontSizes, typography } from "@/src/theme/typography";
import { useAuth } from "@/src/contexts/AuthContext";
import { useFavorites } from "@/src/contexts/FavoritesContext";
import { useCart } from "@/src/contexts/CartContext";
import { mockCategories } from "@/src/mocks/categories";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { AppInput } from "@/src/components/ui/AppInput";
import { RatingStars } from "@/src/components/ui/RatingStars";
import { formatCurrency } from "@/src/utils/currency";
import { api } from "@/src/services/api";
import { Restaurant } from "@/src/types";

export default function HomeScreen() {
  const { user, updateUser } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { items, total, itemCount } = useCart();

  type FilterType = "all" | "fast" | "rating" | "free_delivery";
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [requestingLocation, setRequestingLocation] = useState(false);

  const loadRestaurants = useCallback(async () => {
    try {
      const data = await api.getRestaurants();
      if (data && data.length > 0) {
        setRestaurants(data);
      }
    } catch {
      // Fallback
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRestaurants();
    }, [loadRestaurants])
  );

  const handleRequestLocation = async () => {
    try {
      setRequestingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão de Localização",
          "Para encontrarmos os restaurantes mais próximos com entrega rápida para você, precisamos do acesso à sua localização.",
          [{ text: "Entendido" }]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geo) {
        const street = geo.street || geo.name || "Minha Localização";
        const num = geo.streetNumber ? `, ${geo.streetNumber}` : "";
        const district = geo.district || geo.subregion || "";
        const city = geo.city || "Santa Inês - MA";
        const formatted = `${street}${num} - ${district ? `${district}, ` : ""}${city}`;

        await updateUser({ address: formatted });
        Alert.alert("Localização Atualizada", `Endereço detectado:\n${formatted}`);
      }
    } catch {
      Alert.alert(
        "Aviso",
        "Não foi possível obter a localização exata no momento. Você pode editar seu endereço nas configurações de perfil."
      );
    } finally {
      setRequestingLocation(false);
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory
      ? restaurant.category.toLowerCase().includes(selectedCategory.toLowerCase())
      : true;

    let matchesFilter = true;
    if (activeFilter === "fast") {
      const timeNum = parseInt(restaurant.deliveryTime, 10);
      matchesFilter = timeNum <= 35;
    } else if (activeFilter === "rating") {
      matchesFilter = restaurant.rating >= 4.8;
    } else if (activeFilter === "free_delivery") {
      matchesFilter = restaurant.deliveryFee <= 5.0;
    }

    return matchesSearch && matchesCategory && matchesFilter;
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name || "Policarpo"}!</Text>
            <Text style={styles.subGreeting}>O que vamos pedir hoje?</Text>
          </View>
          <Pressable
            style={styles.notificationButton}
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            onPress={() => alert("Você não possui novas notificações no momento.")}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>

        {/* Barra de Endereço & Localização GPS */}
        <Pressable
          style={styles.locationBar}
          onPress={handleRequestLocation}
          accessibilityRole="button"
          accessibilityLabel="Atualizar endereço com localização do celular"
        >
          <View style={styles.locationIconBox}>
            <Ionicons name="location" size={16} color={colors.primary} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Entregar em</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {user?.address || "Toque para detectar sua localização"}
            </Text>
          </View>
          {requestingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={styles.gpsPill}>
              <Ionicons name="navigate-circle" size={14} color={colors.primary} />
              <Text style={styles.gpsPillText}>Usar GPS</Text>
            </View>
          )}
        </Pressable>

        {/* Campo de Busca */}
        <View style={styles.searchSection}>
          <AppInput
            placeholder="Busca Restaurante, comida..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Ionicons name="search-outline" size={20} color={colors.gray400} />}
            rightIcon={
              searchQuery ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  hitSlop={8}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons name="close-circle" size={18} color={colors.gray400} />
                </Pressable>
              ) : undefined
            }
            containerStyle={styles.searchInputContainer}
          />
        </View>

        {/* Categorias Horizontais */}
        <View style={styles.categoriesSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={mockCategories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.name;
              return (
                <Pressable
                  style={styles.categoryItem}
                  onPress={() =>
                    setSelectedCategory(isSelected ? null : item.name)
                  }
                >
                  <View
                    style={[
                      styles.categoryCircle,
                      isSelected && styles.categoryCircleSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={26}
                      color={isSelected ? colors.white : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Chips de Filtros Rápidos */}
        <View style={styles.filterChipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            {[
              { id: "all", label: "Todos", icon: "apps-outline" },
              { id: "fast", label: "Mais rápidos", icon: "flash-outline" },
              {
                id: "rating",
                label: "Top Avaliados (★ 4.8+)",
                icon: "star-outline",
              },
              {
                id: "free_delivery",
                label: "Menor Taxa",
                icon: "bicycle-outline",
              },
            ].map((chip) => {
              const isSelected = activeFilter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(chip.id as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${chip.label}`}
                >
                  <Ionicons
                    name={chip.icon as any}
                    size={14}
                    color={isSelected ? colors.white : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Seção Restaurantes em Destaque */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Restaurantes em destaque</Text>
          <Pressable onPress={() => { setSelectedCategory(null); setActiveFilter("all"); }}>
            <Text style={styles.viewAllText}>Ver todos</Text>
          </Pressable>
        </View>

        {/* Lista de Restaurantes */}
        {filteredRestaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>Nenhum restaurante encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Tente pesquisar por outro termo ou categoria.
            </Text>
          </View>
        ) : (
          filteredRestaurants.map((restaurant) => {
            const favoriteActive = isFavorite(restaurant.id);
            return (
              <Pressable
                key={restaurant.id}
                style={styles.restaurantCard}
                onPress={() => router.push(`/restaurant/${restaurant.id}` as any)}
              >
                <Image
                  source={{ uri: restaurant.image }}
                  style={styles.restaurantImage}
                  resizeMode="cover"
                />

                <Pressable
                  style={styles.favoriteBadge}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(restaurant);
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={favoriteActive ? "heart" : "heart-outline"}
                    size={22}
                    color={favoriteActive ? colors.primary : colors.gray500}
                  />
                </Pressable>

                <View style={styles.restaurantInfo}>
                  <View style={styles.restaurantHeaderRow}>
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
                  </View>

                  <Text style={styles.restaurantCategory}>
                    {restaurant.category}
                  </Text>

                  <View style={styles.restaurantFooterRow}>
                    <View style={styles.ratingBox}>
                      <RatingStars rating={restaurant.rating} size={14} />
                      <Text style={styles.ratingNumber}>
                        {restaurant.rating.toFixed(1)}
                      </Text>
                      <Text style={styles.reviewCount}>
                        ({restaurant.reviewCount})
                      </Text>
                    </View>

                    <View style={styles.timeBox}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.timeText}>{restaurant.deliveryTime}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Barra Inferior Flutuante do Carrinho (se houver itens) */}
      {itemCount > 0 && (
        <View style={styles.floatingCartBar}>
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
    paddingBottom: 90,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: {
    fontSize: fontSizes.xl,
    fontFamily: typography.bold,
    color: colors.text,
  },
  subGreeting: {
    fontSize: fontSizes.sm,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  locationBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  locationIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: fontSizes.xs - 2,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  locationAddress: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  gpsPillText: {
    fontSize: fontSizes.xs - 1,
    fontFamily: typography.bold,
    color: colors.primary,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  searchInputContainer: {
    marginBottom: spacing.xs,
  },
  categoriesSection: {
    marginVertical: spacing.md,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: spacing.sm,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  categoryCircleSelected: {
    backgroundColor: colors.primary,
  },
  categoryName: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  categoryNameSelected: {
    color: colors.primary,
    fontFamily: typography.bold,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: typography.bold,
    color: colors.text,
  },
  viewAllText: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.primary,
  },
  restaurantCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  restaurantImage: {
    width: "100%",
    height: 150,
  },
  favoriteBadge: {
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
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  restaurantInfo: {
    padding: spacing.md,
  },
  restaurantHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restaurantName: {
    fontSize: fontSizes.md,
    fontFamily: typography.bold,
    color: colors.text,
    flex: 1,
  },
  priceRange: {
    fontSize: fontSizes.sm,
    fontFamily: typography.medium,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  restaurantCategory: {
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  restaurantFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingNumber: {
    marginLeft: spacing.xs,
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.text,
  },
  reviewCount: {
    marginLeft: 2,
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
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
  floatingCartBar: {
    position: "absolute",
    bottom: 12,
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
  filterChipsRow: {
    marginBottom: spacing.xs,
  },
  filterChipsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontFamily: typography.bold,
  },
});
