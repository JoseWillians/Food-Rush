import { Platform } from "react-native";
import { Category, Order, OrderStatus, Product, Restaurant } from "@/src/types";
import { mockCategories } from "@/src/mocks/categories";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { mockProducts } from "@/src/mocks/products";
import { mockOrders } from "@/src/mocks/orders";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";

// Emulador Android acessa localhost via 10.0.2.2; Web e iOS acessam localhost direto.
const DEFAULT_HOST = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
const API_BASE = `${DEFAULT_HOST}/api`;

const TIMEOUT_MS = 1500;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  /**
   * Obtém categorias da API com fallback para mocks locais
   */
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/categories`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Servidor mock offline - usa fallback local transparente
    }
    return mockCategories;
  },

  /**
   * Obtém restaurantes com filtro opcional de categoria (incluindo lojas criadas pelo usuário)
   */
  async getRestaurants(category?: string): Promise<Restaurant[]> {
    const customList = await storageGet<Restaurant[]>(STORAGE_KEYS.CUSTOM_RESTAURANTS, []);
    let apiRestaurants: Restaurant[] = [];

    try {
      const url = category
        ? `${API_BASE}/restaurants?category=${encodeURIComponent(category)}`
        : `${API_BASE}/restaurants`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        apiRestaurants = await res.json();
      }
    } catch {
      // Fallback local silencioso
    }

    if (apiRestaurants.length === 0) {
      apiRestaurants = mockRestaurants;
    }

    // Combina lojas cadastradas (prioridade no topo) com a base padrão
    const combined = [
      ...customList,
      ...apiRestaurants.filter((ar) => !customList.some((cr) => cr.id === ar.id)),
    ];

    if (category) {
      return combined.filter((r) =>
        r.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    return combined;
  },

  /**
   * Busca restaurante por ID (lojas customizadas + padrão)
   */
  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const all = await this.getRestaurants();
    return all.find((r) => r.id === id) || null;
  },

  /**
   * Salva ou atualiza uma loja parceira no armazenamento local
   */
  async saveCustomRestaurant(restaurant: Restaurant): Promise<void> {
    const existing = await storageGet<Restaurant[]>(STORAGE_KEYS.CUSTOM_RESTAURANTS, []);
    const updated = [restaurant, ...existing.filter((s) => s.id !== restaurant.id)];
    await storageSet(STORAGE_KEYS.CUSTOM_RESTAURANTS, updated);
  },

  /**
   * Obtém produtos com filtro opcional por ID do restaurante
   */
  async getProducts(restaurantId?: string): Promise<Product[]> {
    const customProducts = await storageGet<Product[]>(STORAGE_KEYS.CUSTOM_PRODUCTS, []);
    let apiProducts: Product[] = [];

    try {
      const url = restaurantId
        ? `${API_BASE}/products?restaurantId=${encodeURIComponent(restaurantId)}`
        : `${API_BASE}/products`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        apiProducts = await res.json();
      }
    } catch {
      // Fallback local silencioso
    }

    if (apiProducts.length === 0) {
      apiProducts = mockProducts;
    }

    const combined = [
      ...customProducts,
      ...apiProducts.filter((ap) => !customProducts.some((cp) => cp.id === ap.id)),
    ];

    if (restaurantId) {
      return combined.filter((p) => p.restaurantId === restaurantId);
    }
    return combined;
  },

  /**
   * Envia novo pedido para o servidor mock com fallback
   */
  async createOrder(orderData: Partial<Order>): Promise<Order | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/orders`, {
        method: "POST",
        body: JSON.stringify(orderData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Servidor mock offline
    }
    return null;
  },

  /**
   * Atualiza status do pedido no servidor
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Cadastra nova loja parceira (Empreendedor) e persiste no feed local
   */
  async registerPartner(partnerData: Record<string, any>): Promise<Restaurant | null> {
    const newRestaurant: Restaurant = {
      id: partnerData.id || `store-${Date.now()}`,
      name: partnerData.storeName || partnerData.name || "Restaurante Parceiro",
      image:
        partnerData.image ||
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
      category: partnerData.category || "Lanches",
      priceRange: "$$",
      rating: 5.0,
      reviewCount: 1,
      deliveryTime: partnerData.deliveryTime || "30-45 min",
      deliveryFee:
        typeof partnerData.deliveryFee === "number" ? partnerData.deliveryFee : 5.99,
      favorite: false,
    };

    // Salva imediatamente no storage local de lojas customizadas
    try {
      const existing = await storageGet<Restaurant[]>(STORAGE_KEYS.CUSTOM_RESTAURANTS, []);
      const updated = [newRestaurant, ...existing.filter((s) => s.id !== newRestaurant.id)];
      await storageSet(STORAGE_KEYS.CUSTOM_RESTAURANTS, updated);
    } catch (e) {
      console.warn("Erro ao salvar loja parceira localmente:", e);
    }

    try {
      const res = await fetchWithTimeout(`${API_BASE}/partners/register`, {
        method: "POST",
        body: JSON.stringify(partnerData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Servidor mock offline
    }
    return newRestaurant;
  },

  /**
   * Adiciona novo produto ao cardápio da loja parceira
   */
  async addStoreProduct(
    restaurantId: string,
    productData: Record<string, any>
  ): Promise<Product | null> {
    const newProduct: Product = {
      id: productData.id || `prod-${Date.now()}`,
      restaurantId,
      name: productData.name,
      description: productData.description || "",
      image:
        productData.image ||
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
      price: productData.price || 0,
      category: productData.category || "Geral",
    };

    try {
      const existing = await storageGet<Product[]>(STORAGE_KEYS.CUSTOM_PRODUCTS, []);
      const updated = [newProduct, ...existing.filter((p) => p.id !== newProduct.id)];
      await storageSet(STORAGE_KEYS.CUSTOM_PRODUCTS, updated);
    } catch (e) {
      console.warn("Erro ao salvar produto customizado localmente:", e);
    }

    try {
      const res = await fetchWithTimeout(`${API_BASE}/restaurants/${restaurantId}/products`, {
        method: "POST",
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Servidor mock offline
    }
    return newProduct;
  },
};

