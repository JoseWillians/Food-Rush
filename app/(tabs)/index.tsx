import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
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
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { showMessage } from "@/src/utils/dialog";

type IconName = keyof typeof Ionicons.glyphMap;

// As categorias vêm do JSON como texto. Esta função confere se o texto
// é um ícone que existe de verdade; se não for, usa um ícone padrão.
const toIconName = (name: string): IconName =>
  name in Ionicons.glyphMap ? (name as IconName) : "restaurant-outline";

// Filtros rápidos da tela inicial
const FILTER_CHIPS: { id: FilterType; label: string; icon: IconName }[] = [
  { id: "all", label: "Todos", icon: "apps-outline" },
  { id: "fast", label: "Mais rápidos", icon: "flash-outline" },
  { id: "rating", label: "Top Avaliados (★ 4.8+)", icon: "star-outline" },
  { id: "free_delivery", label: "Menor Taxa", icon: "bicycle-outline" },
];

type FilterType = "all" | "fast" | "rating" | "free_delivery";
type SortType = "relevance" | "rating" | "time" | "price";

// Filtros que ficam salvos no aparelho entre uma abertura e outra
type SavedFilters = {
  category: string | null;
  filter: FilterType;
  sort: SortType;
};

const SORT_OPTIONS: { id: SortType; label: string }[] = [
  { id: "relevance", label: "Relevância" },
  { id: "rating", label: "Melhor nota" },
  { id: "time", label: "Mais rápido" },
  { id: "price", label: "Mais barato" },
];

// "30-45 min" -> 30 (usa o menor tempo para comparar)
const minDeliveryTime = (r: Restaurant) => parseInt(r.deliveryTime, 10) || 999;

/**
 * Tela inicial (Home): busca, categorias, filtros, ordenação e lista de restaurantes.
 * Os restaurantes vêm da API (ou dos dados locais, se o servidor estiver desligado)
 * e os filtros escolhidos ficam salvos no aparelho.
 */
export default function HomeScreen() {
  const { user, updateUser } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { total, itemCount } = useCart();

  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [loading, setLoading] = useState(true);
  const [serverOffline, setServerOffline] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("relevance");
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRestaurants();
      if (data && data.length > 0) {
        setRestaurants(data);
      }
    } catch {
      // Mantém a lista que já está na tela
    } finally {
      // Se o servidor não respondeu, a lista veio dos dados salvos no aparelho
      setServerOffline(api.isServerOnline() === false);
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRestaurants();
    } finally {
      setRefreshing(false);
    }
  }, [loadRestaurants]);

  // Recupera os filtros usados da última vez
  useEffect(() => {
    storageGet<SavedFilters | null>(STORAGE_KEYS.HOME_FILTERS, null).then((saved) => {
      if (saved) {
        setSelectedCategory(saved.category);
        setActiveFilter(saved.filter);
        setSortBy(saved.sort);
      }
      setFiltersLoaded(true);
    });
  }, []);

  // Salva os filtros sempre que mudam
  useEffect(() => {
    if (!filtersLoaded) return;
    storageSet<SavedFilters>(STORAGE_KEYS.HOME_FILTERS, {
      category: selectedCategory,
      filter: activeFilter,
      sort: sortBy,
    });
  }, [selectedCategory, activeFilter, sortBy, filtersLoaded]);

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
        showMessage(
          "Permissão de Localização",
          "Para encontrarmos os restaurantes mais próximos com entrega rápida para você, precisamos do acesso à sua localização."
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
        showMessage("Localização Atualizada", `Endereço detectado:\n${formatted}`);
      }
    } catch {
      showMessage(
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

  // Ordenação escolhida pelo usuário ("relevância" mantém a ordem original)
  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "time") return minDeliveryTime(a) - minDeliveryTime(b);
    if (sortBy === "price") {
      // Faixa de preço ($, $$, $$$) e, no empate, a menor taxa de entrega
      return a.priceRange.length - b.priceRange.length || a.deliveryFee - b.deliveryFee;
    }
    return 0;
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Olá, {user?.name || "Policarpo"}!</Text>
            <Text style={styles.subGreeting}>O que vamos pedir hoje?</Text>
          </View>

          <View style={styles.headerRightActions}>
            <Pressable
              style={styles.cartHeaderButton}
              accessibilityRole="button"
              accessibilityLabel="Meu carrinho"
              onPress={() => router.push("/cart")}
            >
              <Ionicons name="cart-outline" size={24} color={colors.text} />
              {itemCount > 0 && (
                <View style={styles.cartBadgeSmall}>
                  <Text style={styles.cartBadgeTextSmall}>{itemCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.notificationButton}
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              onPress={() =>
                showMessage("Notificações", "Você não possui novas notificações no momento.")
              }
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <View style={styles.notificationBadge} />
            </Pressable>
          </View>
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
                      name={toIconName(item.icon)}
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
            {FILTER_CHIPS.map((chip) => {
              const isSelected = activeFilter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(chip.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${chip.label}`}
                >
                  <Ionicons
                    name={chip.icon}
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

        {/* Ordenação */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScrollTight}
          >
            {SORT_OPTIONS.map((opt) => {
              const selected = sortBy === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.sortChip, selected && styles.sortChipActive]}
                  onPress={() => setSortBy(opt.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Ordenar por ${opt.label}`}
                >
                  <Text style={[styles.sortChipText, selected && styles.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Aviso quando o servidor não respondeu */}
        {serverOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
            <Text style={styles.offlineText}>
              Servidor indisponível. Mostrando os dados salvos no aparelho.
            </Text>
            <Pressable onPress={loadRestaurants} hitSlop={8} accessibilityRole="button">
              <Text style={styles.retryText}>Tentar de novo</Text>
            </Pressable>
          </View>
        )}

        {/* Seção Restaurantes em Destaque */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Restaurantes em destaque</Text>
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <Pressable
            onPress={() => {
              setSelectedCategory(null);
              setActiveFilter("all");
              setSortBy("relevance");
            }}
          >
            <Text style={styles.viewAllText}>Limpar</Text>
          </Pressable>
        </View>

        {/* Lista de Restaurantes */}
        {sortedRestaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>Nenhum restaurante encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Tente pesquisar por outro termo ou categoria.
            </Text>
          </View>
        ) : (
          sortedRestaurants.map((restaurant) => {
            const favoriteActive = isFavorite(restaurant.id);
            return (
              // O cartão e o coração são botões separados (um botão dentro do outro dá erro na web)
              <View key={restaurant.id} style={styles.restaurantCard}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } })
                  }
                >
                  <Image
                    source={{ uri: restaurant.image }}
                    style={styles.restaurantImage}
                    resizeMode="cover"
                  />

                  <View style={styles.restaurantInfo}>
                    <View style={styles.restaurantHeaderRow}>
                      <Text style={styles.restaurantName}>
                        {restaurant.name}
                        {restaurant.isOpen === false && (
                          <Text style={styles.closedTag}>  · Fechada</Text>
                        )}
                      </Text>
                      <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
                    </View>

                    <Text style={styles.restaurantCategory}>
                      {restaurant.category}
                    </Text>

                    <View style={styles.restaurantFooterRow}>
                      <View style={styles.ratingBox}>
                        {/* Loja sem avaliações ainda: mostra "Novo" em vez de nota */}
                        {restaurant.reviewCount === 0 ? (
                          <Text style={styles.ratingNumber}>Novo</Text>
                        ) : (
                          <>
                            <RatingStars rating={restaurant.rating} size={14} />
                            <Text style={styles.ratingNumber}>
                              {restaurant.rating.toFixed(1)}
                            </Text>
                            <Text style={styles.reviewCount}>
                              ({restaurant.reviewCount})
                            </Text>
                          </>
                        )}
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
                <Pressable
                  style={styles.favoriteBadge}
                  onPress={() => toggleFavorite(restaurant)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={favoriteActive ? "Remover dos favoritos" : "Favoritar restaurante"}
                >
                  <Ionicons
                    name={favoriteActive ? "heart" : "heart-outline"}
                    size={22}
                    color={favoriteActive ? colors.primary : colors.gray500}
                  />
                </Pressable>
              </View>
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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cartHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadgeSmall: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
  },
  cartBadgeTextSmall: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 10,
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sortLabel: {
    fontSize: fontSizes.xs,
    fontFamily: typography.semiBold,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  filterChipsScrollTight: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  sortChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  sortChipActive: {
    backgroundColor: colors.primaryLight,
  },
  sortChipText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.medium,
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.primary,
    fontFamily: typography.bold,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offlineText: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  retryText: {
    fontSize: fontSizes.xs,
    fontFamily: typography.bold,
    color: colors.primary,
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
  closedTag: {
    fontSize: fontSizes.sm,
    fontFamily: typography.semiBold,
    color: colors.error,
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
