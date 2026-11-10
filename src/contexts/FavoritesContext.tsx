import React, { createContext, useContext, useEffect, useState } from "react";
import { Product, Restaurant } from "@/src/types";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { mockProducts } from "@/src/mocks/products";
import { mockUser } from "@/src/mocks/user";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { useAuth } from "@/src/contexts/AuthContext";

type FavoritesContextData = {
  favorites: Restaurant[];
  toggleFavorite: (restaurant: Restaurant) => void;
  isFavorite: (id: string) => boolean;
  // Pratos favoritos (antes a aba mostrava todos os pratos do app)
  favoriteProducts: Product[];
  toggleFavoriteProduct: (product: Product) => void;
  isFavoriteProduct: (id: string) => boolean;
};

// Pratos de exemplo já favoritados para o usuário demo
const DEMO_FAVORITE_PRODUCT_IDS = ["p1", "p22"];

const FavoritesContext = createContext<FavoritesContextData>({} as FavoritesContextData);

/**
 * Contexto de favoritos: restaurantes e pratos favoritos de cada usuário.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);

  const productsKey = (userId: string) => `${STORAGE_KEYS.FAVORITE_PRODUCTS}_${userId}`;

  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEYS.FAVORITES}_${user.id}` : STORAGE_KEYS.FAVORITES;
  };

  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        setFavorites([]);
        setFavoriteProducts([]);
        return;
      }

      // Pratos favoritos
      const storedProducts = await storageGet<Product[] | null>(productsKey(user.id), null);
      if (storedProducts !== null) {
        setFavoriteProducts(storedProducts);
      } else {
        const initial =
          user.id === mockUser.id
            ? mockProducts.filter((p) => DEMO_FAVORITE_PRODUCT_IDS.includes(p.id))
            : [];
        setFavoriteProducts(initial);
        await storageSet(productsKey(user.id), initial);
      }

      const key = `${STORAGE_KEYS.FAVORITES}_${user.id}`;
      const stored = await storageGet<Restaurant[] | null>(key, null);

      if (stored !== null) {
        setFavorites(stored);
      } else {
        // Se for o usuário demo, preenche os favoritos de exemplo.
        // Compara com mockUser.id em vez de escrever o id à mão (antes estava "u-1" e o id real é "u1").
        if (user.id === mockUser.id) {
          const defaultFavorites = mockRestaurants.filter((r) => r.favorite);
          setFavorites(defaultFavorites);
          await storageSet(key, defaultFavorites);
        } else {
          // Cliente novo: abre com favoritos ZERADOS!
          setFavorites([]);
          await storageSet(key, []);
        }
      }
    }

    loadFavorites();
  }, [user?.id]);

  const toggleFavorite = (restaurant: Restaurant) => {
    const key = getStorageKey();
    const exists = favorites.some((f) => f.id === restaurant.id);
    let updated: Restaurant[];

    if (exists) {
      updated = favorites.filter((f) => f.id !== restaurant.id);
    } else {
      updated = [...favorites, { ...restaurant, favorite: true }];
    }

    setFavorites(updated);
    storageSet(key, updated);
  };

  const isFavorite = (id: string) => {
    return favorites.some((f) => f.id === id);
  };

  const toggleFavoriteProduct = (product: Product) => {
    if (!user) return;
    const exists = favoriteProducts.some((p) => p.id === product.id);
    const updated = exists
      ? favoriteProducts.filter((p) => p.id !== product.id)
      : [...favoriteProducts, product];
    setFavoriteProducts(updated);
    storageSet(productsKey(user.id), updated);
  };

  const isFavoriteProduct = (id: string) => favoriteProducts.some((p) => p.id === id);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        favoriteProducts,
        toggleFavoriteProduct,
        isFavoriteProduct,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextData {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites deve ser utilizado dentro de um FavoritesProvider");
  }
  return context;
}

