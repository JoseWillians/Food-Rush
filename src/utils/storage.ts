import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "@foodrush:onboarding_completed",
  AUTH_USER: "@foodrush:auth_user",
  ACCOUNTS: "@foodrush:accounts",
  FAVORITES: "@foodrush:favorites",
  FAVORITE_PRODUCTS: "@foodrush:favorite_products",
  CART: "@foodrush:cart",
  ORDERS: "@foodrush:orders",
  CUSTOM_RESTAURANTS: "@foodrush:custom_restaurants",
  CUSTOM_PRODUCTS: "@foodrush:custom_products",
  REVIEWS: "@foodrush:reviews",
  RESTAURANT_RATINGS: "@foodrush:restaurant_ratings",
  STORE_ORDERS: "@foodrush:store_orders", // pedidos feitos para lojas de empreendedores
  HOME_FILTERS: "@foodrush:home_filters",
  CHAT: "@foodrush:chat", // + "_" + id do pedido
  NEIGHBORHOODS: "@foodrush:neighborhoods",
  STORE_DELIVERY_RATES: "@foodrush:store_delivery_rates",
  COURIER_PROFILE: "@foodrush:courier_profile",
  COURIER_ORDERS: "@foodrush:courier_orders",
  STORE_COURIERS: "@foodrush:store_couriers",
} as const;

export async function storageGet<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("Erro ao ler storage para a chave:", key, error);
    return defaultValue;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Erro ao salvar storage para a chave:", key, error);
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Erro ao remover storage para a chave:", key, error);
  }
}

