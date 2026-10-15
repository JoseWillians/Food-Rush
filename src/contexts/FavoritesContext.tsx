import React, { createContext, useContext, useEffect, useState } from "react";
import { Restaurant } from "@/src/types";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { useAuth } from "@/src/contexts/AuthContext";

type FavoritesContextData = {
  favorites: Restaurant[];
  toggleFavorite: (restaurant: Restaurant) => void;
  isFavorite: (id: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextData>({} as FavoritesContextData);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Restaurant[]>([]);

  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEYS.FAVORITES}_${user.id}` : STORAGE_KEYS.FAVORITES;
  };

  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        setFavorites([]);
        return;
      }

      const key = `${STORAGE_KEYS.FAVORITES}_${user.id}`;
      const stored = await storageGet<Restaurant[] | null>(key, null);

      if (stored !== null) {
        setFavorites(stored);
      } else {
        // Se for o usuário demo padrão inicial (u-1), preenche os favoritos de exemplo
        if (user.id === "u-1") {
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

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
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

