import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "@foodrush:onboarding_completed",
  AUTH_USER: "@foodrush:auth_user",
  FAVORITES: "@foodrush:favorites",
  CART: "@foodrush:cart",
  ORDERS: "@foodrush:orders",
  CUSTOM_RESTAURANTS: "@foodrush:custom_restaurants",
  CUSTOM_PRODUCTS: "@foodrush:custom_products",
} as const;

export async function storageGet<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Erro ao ler storage para a chave ${key}:`, error);
    return defaultValue;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Erro ao salvar storage para a chave ${key}:`, error);
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Erro ao remover storage para a chave ${key}:`, error);
  }
}

