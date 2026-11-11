import { Platform } from "react-native";
import Constants from "expo-constants";
import {
  Category,
  City,
  CourierProfile,
  Neighborhood,
  NewProductInput,
  Order,
  OrderStatus,
  PartnerRegistration,
  Product,
  Restaurant,
  Review,
  StoreDeliveryRate,
} from "@/src/types";
import { mockCategories } from "@/src/mocks/categories";
import { mockRestaurants } from "@/src/mocks/restaurants";
import { mockProducts } from "@/src/mocks/products";
import { mockReviews } from "@/src/mocks/reviews";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { isDefaultStoreImage, storeImageFor, suggestFoodImage } from "@/src/constants/foodImages";

/**
 * Endereço do servidor (server.js), escolhido nesta ordem:
 * 1. Variável EXPO_PUBLIC_API_URL do arquivo .env (ex.: http://192.168.0.10:3000).
 * 2. No celular com Expo Go: o mesmo IP do computador que está rodando o Expo,
 *    na porta 3000. Assim o celular físico encontra o servidor sem configurar nada.
 * 3. Emulador Android usa 10.0.2.2; web e simulador iOS usam localhost.
 */
function resolveApiHost(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // hostUri vem como "192.168.0.10:8081" quando o app abre pelo Expo Go
  const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (Platform.OS !== "web" && expoHost && expoHost !== "localhost") {
    return `http://${expoHost}:3000`;
  }

  return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
}

export const API_HOST = resolveApiHost();
const API_BASE = `${API_HOST}/api`;

const TIMEOUT_MS = 3500;

// Nota e quantidade de avaliações de cada loja, atualizadas quando o cliente avalia um pedido.
// Fica salvo no aparelho e é aplicado por cima dos dados que vêm do servidor ou dos mocks.
type RatingOverrides = Record<string, { rating: number; reviewCount: number }>;

async function applyRatingOverrides(list: Restaurant[]): Promise<Restaurant[]> {
  const overrides = await storageGet<RatingOverrides>(STORAGE_KEYS.RESTAURANT_RATINGS, {});
  return list.map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r));
}

// Guarda se o servidor respondeu na última tentativa.
// null = ainda não tentou. As telas usam isso para avisar quando estão sem servidor.
let serverOnline: boolean | null = null;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort("Timeout");
    } catch {
      // Ignora erro ao abortar
    }
  }, TIMEOUT_MS);

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
    serverOnline = true;
    return res;
  } catch (error: any) {
    serverOnline = false;
    // Evita vazamento de erro não tratado em navegadores quando o sinal for abortado
    if (error?.name === "AbortError" || controller.signal.aborted) {
      throw new Error("Timeout ao conectar com o servidor.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Envia uma alteração ao servidor sem esperar a resposta (se ele estiver desligado ou offline, ignora)
function sendInBackground(path: string, method: string, body?: unknown) {
  try {
    fetchWithTimeout(`${API_BASE}${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => {
      // Silenciosamente capturado para modo offline
    });
  } catch {
    // Falha silenciosa para não quebrar a UI
  }
}

// Chave onde ficam os pedidos de um cliente
const ordersKeyOf = (userId: string) => `${STORAGE_KEYS.ORDERS}_${userId}`;

/**
 * Camada de acesso aos dados. Cada função tenta o servidor primeiro e, se ele
 * não responder em 1,5 s, usa os dados locais (mocks + AsyncStorage).
 * Assim o app funciona mesmo sem o servidor ligado.
 */
export const api = {
  /**
   * true se o servidor respondeu na última chamada, false se não respondeu,
   * null se ainda não houve nenhuma chamada.
   */
  isServerOnline(): boolean | null {
    return serverOnline;
  },

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
    // e aplica as notas atualizadas pelas avaliações feitas no app.
    const combined = await applyRatingOverrides([
      ...customList,
      ...apiRestaurants.filter((ar) => !customList.some((cr) => cr.id === ar.id)),
    ]);

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
  async registerPartner(partnerData: PartnerRegistration): Promise<Restaurant | null> {
    const newRestaurant: Restaurant = {
      id: partnerData.id || `store-${Date.now()}`,
      name: partnerData.storeName || "Restaurante Parceiro",
      // Foto de capa de acordo com a categoria da loja
      image: partnerData.image || storeImageFor(partnerData.category || "Lanches"),
      category: partnerData.category || "Lanches",
      priceRange: "$$",
      // Loja nova começa sem nota; a nota surge com as primeiras avaliações
      rating: 0,
      reviewCount: 0,
      deliveryTime: partnerData.deliveryTime || "30-45 min",
      deliveryFee:
        typeof partnerData.deliveryFee === "number" ? partnerData.deliveryFee : 5.99,
      favorite: false,
      isOpen: true,
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
      // Manda o mesmo id para o servidor, assim app e servidor falam da mesma loja
      const res = await fetchWithTimeout(`${API_BASE}/partners/register`, {
        method: "POST",
        body: JSON.stringify({ ...partnerData, id: newRestaurant.id }),
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
   * Abre ou fecha a loja do empreendedor. Loja fechada não recebe pedidos.
   */
  async setStoreOpen(restaurantId: string, isOpen: boolean): Promise<void> {
    const existing = await storageGet<Restaurant[]>(STORAGE_KEYS.CUSTOM_RESTAURANTS, []);
    const updated = existing.map((r) => (r.id === restaurantId ? { ...r, isOpen } : r));
    await storageSet(STORAGE_KEYS.CUSTOM_RESTAURANTS, updated);

    fetchWithTimeout(`${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isOpen }),
    }).catch(() => {});
  },

  /**
   * Busca as avaliações de uma loja: primeiro as feitas neste aparelho,
   * depois as do servidor (ou dos mocks, se o servidor estiver desligado).
   */
  async getReviews(restaurantId: string): Promise<Review[]> {
    const saved = await storageGet<Review[]>(STORAGE_KEYS.REVIEWS, []);
    const local = saved.filter((r) => r.restaurantId === restaurantId);

    let remote: Review[] | null = null;
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}/reviews`
      );
      if (res.ok) {
        remote = await res.json();
      }
    } catch {
      // Servidor offline - usa os mocks
    }
    if (remote === null) {
      remote = mockReviews.filter((r) => r.restaurantId === restaurantId);
    }

    // Junta as duas listas sem repetir avaliações com o mesmo id
    return [...local, ...remote.filter((r) => !local.some((l) => l.id === r.id))];
  },

  /**
   * Salva a avaliação de um pedido e recalcula a nota média da loja.
   * Retorna a loja já com a nota e a quantidade de avaliações atualizadas.
   */
  async addReview(review: Review): Promise<Restaurant | null> {
    const saved = await storageGet<Review[]>(STORAGE_KEYS.REVIEWS, []);
    await storageSet(STORAGE_KEYS.REVIEWS, [review, ...saved]);

    const restaurant = await this.getRestaurantById(review.restaurantId);
    let updated: Restaurant | null = null;

    if (restaurant) {
      // Nova média = (média antiga × quantidade antiga + nova nota) ÷ (quantidade + 1)
      const reviewCount = restaurant.reviewCount + 1;
      const total = restaurant.rating * restaurant.reviewCount + review.rating;
      const rating = Math.round((total / reviewCount) * 10) / 10;

      const overrides = await storageGet<RatingOverrides>(STORAGE_KEYS.RESTAURANT_RATINGS, {});
      overrides[restaurant.id] = { rating, reviewCount };
      await storageSet(STORAGE_KEYS.RESTAURANT_RATINGS, overrides);

      updated = { ...restaurant, rating, reviewCount };
    }

    // Envia ao servidor em segundo plano (se estiver ligado)
    fetchWithTimeout(
      `${API_BASE}/restaurants/${encodeURIComponent(review.restaurantId)}/reviews`,
      { method: "POST", body: JSON.stringify(review) }
    ).catch(() => {});

    return updated;
  },

  /**
   * Edita os dados da loja do empreendedor (nome, categoria, taxa, tempo...).
   */
  async updateStore(restaurantId: string, data: Partial<Restaurant>): Promise<void> {
    const existing = await storageGet<Restaurant[]>(STORAGE_KEYS.CUSTOM_RESTAURANTS, []);
    const updated = existing.map((r) => {
      if (r.id !== restaurantId) return r;
      const merged = { ...r, ...data, id: r.id };
      // Mudou a categoria e a loja ainda usa a foto padrão: troca pela foto da nova categoria
      if (data.category && !data.image && isDefaultStoreImage(r.image)) {
        merged.image = storeImageFor(data.category);
      }
      return merged;
    });
    await storageSet(STORAGE_KEYS.CUSTOM_RESTAURANTS, updated);
    sendInBackground(`/restaurants/${encodeURIComponent(restaurantId)}`, "PUT", data);
  },

  /**
   * Exclui a loja do empreendedor e todos os pratos dela.
   */
  async deleteStore(restaurantId: string): Promise<void> {
    const stores = await storageGet<Restaurant[]>(STORAGE_KEYS.CUSTOM_RESTAURANTS, []);
    await storageSet(
      STORAGE_KEYS.CUSTOM_RESTAURANTS,
      stores.filter((r) => r.id !== restaurantId)
    );
    const products = await storageGet<Product[]>(STORAGE_KEYS.CUSTOM_PRODUCTS, []);
    await storageSet(
      STORAGE_KEYS.CUSTOM_PRODUCTS,
      products.filter((p) => p.restaurantId !== restaurantId)
    );
    sendInBackground(`/restaurants/${encodeURIComponent(restaurantId)}`, "DELETE");
  },

  /**
   * Salva as alterações de um prato já cadastrado.
   */
  async updateStoreProduct(product: Product): Promise<void> {
    const existing = await storageGet<Product[]>(STORAGE_KEYS.CUSTOM_PRODUCTS, []);
    const updated = existing.map((p) => (p.id === product.id ? product : p));
    await storageSet(STORAGE_KEYS.CUSTOM_PRODUCTS, updated);
    sendInBackground(`/products/${encodeURIComponent(product.id)}`, "PUT", product);
  },

  /**
   * Remove um prato do cardápio.
   */
  async deleteStoreProduct(productId: string): Promise<void> {
    const existing = await storageGet<Product[]>(STORAGE_KEYS.CUSTOM_PRODUCTS, []);
    await storageSet(
      STORAGE_KEYS.CUSTOM_PRODUCTS,
      existing.filter((p) => p.id !== productId)
    );
    sendInBackground(`/products/${encodeURIComponent(productId)}`, "DELETE");
  },

  /**
   * Guarda o pedido feito para uma loja de empreendedor, para aparecer no painel dela.
   * Como não há servidor de pedidos sempre ligado, a "caixa de entrada" da loja fica no aparelho.
   */
  async saveStoreOrder(order: Order): Promise<void> {
    const all = await storageGet<Order[]>(STORAGE_KEYS.STORE_ORDERS, []);
    await storageSet(STORAGE_KEYS.STORE_ORDERS, [order, ...all.filter((o) => o.id !== order.id)]);
  },

  /**
   * Pedidos recebidos por uma loja (os mais novos primeiro).
   */
  async getStoreOrders(restaurantId: string): Promise<Order[]> {
    const all = await storageGet<Order[]>(STORAGE_KEYS.STORE_ORDERS, []);
    return all.filter((o) => o.restaurantId === restaurantId);
  },

  /**
   * O empreendedor muda o status do pedido (aceitar, preparar, enviar).
   * Atualiza a lista da loja e também a lista de pedidos do cliente.
   */
  async updateStoreOrderStatus(order: Order, status: OrderStatus): Promise<void> {
    const all = await storageGet<Order[]>(STORAGE_KEYS.STORE_ORDERS, []);
    await storageSet(
      STORAGE_KEYS.STORE_ORDERS,
      all.map((o) => (o.id === order.id ? { ...o, status } : o))
    );

    if (order.customerId) {
      const key = ordersKeyOf(order.customerId);
      const customerOrders = await storageGet<Order[]>(key, []);
      await storageSet(
        key,
        customerOrders.map((o) => (o.id === order.id ? { ...o, status } : o))
      );
    }

    sendInBackground(`/orders/${encodeURIComponent(order.id)}/status`, "PATCH", { status });
  },

  /**
   * Adiciona novo produto ao cardápio da loja parceira
   */
  async addStoreProduct(
    restaurantId: string,
    productData: NewProductInput
  ): Promise<Product | null> {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      restaurantId,
      name: productData.name,
      description: productData.description || "",
      // Sem foto escolhida: sugere uma pelo nome e categoria (antes era sempre hambúrguer)
      image: productData.image || suggestFoodImage(productData.name ?? "", productData.category ?? ""),
      price: Number(productData.price),
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
        body: JSON.stringify({ ...productData, id: newProduct.id }), // mesmo id no app e no servidor
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Servidor mock offline
    }
    return newProduct;
  },

  // ====================================================================
  // HIERARQUIA GEOGRÁFICA (CIDADES E BAIRROS DE SANTA INÊS - MA)
  // ====================================================================
  async getCities(): Promise<City[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/geo/cities`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return [
      { id: "cid-santaines", estadoId: "MA", name: "Santa Inês", isActive: true },
    ];
  },

  async getNeighborhoods(cityId = "cid-santaines"): Promise<Neighborhood[]> {
    const defaultList: Neighborhood[] = [
      { id: "b-centro", cidadeId: "cid-santaines", name: "Centro", zone: "central" },
      { id: "b-sabbak", cidadeId: "cid-santaines", name: "Sabbak", zone: "urbana" },
      { id: "b-vila-militar", cidadeId: "cid-santaines", name: "Vila Militar", zone: "urbana" },
      { id: "b-pq-santa-cruz", cidadeId: "cid-santaines", name: "Parque Santa Cruz", zone: "urbana" },
      { id: "b-canecao", cidadeId: "cid-santaines", name: "Canecão", zone: "urbana" },
      { id: "b-aeroporto", cidadeId: "cid-santaines", name: "Aeroporto", zone: "urbana" },
      { id: "b-jardim-brasilia", cidadeId: "cid-santaines", name: "Jardim Brasília", zone: "urbana" },
      { id: "b-nova-santa-ines", cidadeId: "cid-santaines", name: "Nova Santa Inês", zone: "urbana" },
      { id: "b-vila-adelaide-cabral", cidadeId: "cid-santaines", name: "Vila Adelaide Cabral", zone: "urbana" },
      { id: "b-bairro-novo", cidadeId: "cid-santaines", name: "Bairro Novo", zone: "urbana" },
      { id: "b-palmeira", cidadeId: "cid-santaines", name: "Palmeira", zone: "urbana" },
      { id: "b-santo-antonio", cidadeId: "cid-santaines", name: "Santo Antônio", zone: "urbana" },
      { id: "b-sao-benedito", cidadeId: "cid-santaines", name: "São Benedito", zone: "urbana" },
      { id: "b-coheb", cidadeId: "cid-santaines", name: "Coheb", zone: "urbana" },
      { id: "b-mutirao", cidadeId: "cid-santaines", name: "Mutirão", zone: "urbana" },
      { id: "b-sol-nascente", cidadeId: "cid-santaines", name: "Sol Nascente", zone: "urbana" },
      { id: "b-eco-ville", cidadeId: "cid-santaines", name: "Residencial Eco Ville", zone: "urbana" },
      { id: "b-conjunto-jucara", cidadeId: "cid-santaines", name: "Conjunto Juçara", zone: "urbana" },
      { id: "b-vila-marcony", cidadeId: "cid-santaines", name: "Vila Marcony", zone: "urbana" },
      { id: "b-laranjeiras", cidadeId: "cid-santaines", name: "Laranjeiras", zone: "urbana" },
      { id: "b-vila-conceicao", cidadeId: "cid-santaines", name: "Vila Conceição", zone: "urbana" },
      { id: "b-angelim", cidadeId: "cid-santaines", name: "Angelim", zone: "urbana" },
      { id: "b-barreiros", cidadeId: "cid-santaines", name: "Barreiros", zone: "urbana" },
      { id: "b-canaa", cidadeId: "cid-santaines", name: "Canaã", zone: "urbana" },
      { id: "b-jardim-abreu", cidadeId: "cid-santaines", name: "Jardim Abreu", zone: "urbana" },
      { id: "b-vila-edmundo-rios", cidadeId: "cid-santaines", name: "Vila Edmundo Rios", zone: "urbana" },
      { id: "b-vila-olimpica", cidadeId: "cid-santaines", name: "Vila Olímpica", zone: "urbana" },
      { id: "b-pq-buritis", cidadeId: "cid-santaines", name: "Parque dos Buritis", zone: "urbana" },
      { id: "b-morada-nova", cidadeId: "cid-santaines", name: "Morada Nova", zone: "urbana" },
    ];

    try {
      const res = await fetchWithTimeout(`${API_BASE}/geo/cities/${encodeURIComponent(cityId)}/neighborhoods`);
      if (res.ok) {
        const remoteList: Neighborhood[] = await res.json();
        if (remoteList && remoteList.length > 0) return remoteList;
      }
    } catch {
      // Servidor offline, usa local
    }

    const custom = await storageGet<Neighborhood[]>(STORAGE_KEYS.NEIGHBORHOODS, []);
    const merged = [...defaultList];
    for (const c of custom) {
      if (!merged.some((m) => m.name.toLowerCase() === c.name.toLowerCase())) {
        merged.push(c);
      }
    }
    return merged;
  },

  async addNeighborhood(
    cityId: string,
    nameOrData: string | { name: string; zone?: string },
    defaultZone = "urbana"
  ): Promise<Neighborhood> {
    const cleanName = typeof nameOrData === "string" ? nameOrData.trim() : nameOrData.name.trim();
    const zone = typeof nameOrData === "object" && nameOrData.zone ? nameOrData.zone : defaultZone;
    const newBairro: Neighborhood = {
      id: `b-${Date.now()}`,
      cidadeId: cityId,
      name: cleanName,
      zone,
    };

    const existing = await storageGet<Neighborhood[]>(STORAGE_KEYS.NEIGHBORHOODS, []);
    await storageSet(STORAGE_KEYS.NEIGHBORHOODS, [newBairro, ...existing]);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/geo/cities/${encodeURIComponent(cityId)}/neighborhoods`, {
        method: "POST",
        body: JSON.stringify(newBairro),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return newBairro;
  },

  // ====================================================================
  // TAXAS DE ENTREGA DA LOJA POR BAIRRO
  // ====================================================================
  async getStoreDeliveryRates(restaurantId: string): Promise<StoreDeliveryRate[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}/delivery-rates`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline
    }

    const all = await storageGet<StoreDeliveryRate[]>(STORAGE_KEYS.STORE_DELIVERY_RATES, []);
    return all.filter((r) => r.restaurantId === restaurantId);
  },

  async saveStoreDeliveryRate(
    restaurantId: string,
    bairroIdOrData: string | { bairroId: string; deliveryFee: number; estimatedTime?: string },
    rateValue?: number,
    estimatedMinutes?: number
  ): Promise<StoreDeliveryRate> {
    const bairroId = typeof bairroIdOrData === "string" ? bairroIdOrData : bairroIdOrData.bairroId;
    const deliveryFee = typeof bairroIdOrData === "object" ? Number(bairroIdOrData.deliveryFee) : Number(rateValue ?? 0);
    const estimatedTime =
      typeof bairroIdOrData === "object" && bairroIdOrData.estimatedTime
        ? bairroIdOrData.estimatedTime
        : estimatedMinutes
        ? `${estimatedMinutes} min`
        : "30-45 min";

    const newRate: StoreDeliveryRate = {
      id: `tb-${restaurantId}-${Date.now()}`,
      restaurantId,
      bairroId,
      neighborhoodId: bairroId,
      deliveryFee,
      rate: deliveryFee,
      estimatedTime,
      isActive: true,
    };

    const all = await storageGet<StoreDeliveryRate[]>(STORAGE_KEYS.STORE_DELIVERY_RATES, []);
    const updated = [
      newRate,
      ...all.filter((r) => !(r.restaurantId === restaurantId && (r.bairroId === bairroId || r.neighborhoodId === bairroId))),
    ];
    await storageSet(STORAGE_KEYS.STORE_DELIVERY_RATES, updated);

    try {
      await fetchWithTimeout(`${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}/delivery-rates`, {
        method: "POST",
        headers: {
          "x-user-role": "partner",
          "x-store-id": restaurantId,
        },
        body: JSON.stringify(newRate),
      });
    } catch {
      // Offline
    }
    return newRate;
  },

  async deleteStoreDeliveryRate(restaurantId: string, rateId: string): Promise<void> {
    const all = await storageGet<StoreDeliveryRate[]>(STORAGE_KEYS.STORE_DELIVERY_RATES, []);
    await storageSet(
      STORAGE_KEYS.STORE_DELIVERY_RATES,
      all.filter((r) => r.id !== rateId)
    );

    sendInBackground(
      `/restaurants/${encodeURIComponent(restaurantId)}/delivery-rates/${encodeURIComponent(rateId)}`,
      "DELETE"
    );
  },

  // ====================================================================
  // CÁLCULO DE TAXAS (MOTOBOYS AUTÔNOMOS E LOJAS)
  // ====================================================================
  async calculateDeliveryFee(
    restaurantId: string,
    bairroId: string,
    mode?: "own_courier" | "independent_couriers"
  ): Promise<{
    deliveryFee: number;
    estimatedTime: string;
    source: string;
    courierFee?: number;
    platformFee?: number;
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/delivery/calculate-fee`, {
        method: "POST",
        body: JSON.stringify({ restaurantId, bairroId, mode }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline calculation
    }

    // Fallback local: verifica se há taxa cadastrada pela loja
    const rates = await this.getStoreDeliveryRates(restaurantId);
    const storeRate = rates.find((r) => r.bairroId === bairroId);
    if (storeRate) {
      return {
        deliveryFee: storeRate.deliveryFee,
        estimatedTime: storeRate.estimatedTime || "30-45 min",
        source: "store_fixed",
        courierFee: 0,
      };
    }

    // Motoboy autônomo padrão (R$ 6,00 base)
    const baseFee = 6.0;
    const courierPayout = Math.round(baseFee * 0.85 * 100) / 100;
    return {
      deliveryFee: baseFee,
      estimatedTime: "25-40 min",
      source: "independent_courier",
      courierFee: courierPayout,
      platformFee: Math.round((baseFee - courierPayout) * 100) / 100,
    };
  },

  // ====================================================================
  // UPLOAD DE IMAGENS PONT-TO-PONTA (PERSISTÊNCIA DOCKER + FALLBACK)
  // ====================================================================
  async uploadImage(
    base64OrOptions: string | { base64: string; fileName?: string; folder?: string },
    defaultFolder: "avatars" | "foods" | "restaurants" | "general" = "general"
  ): Promise<{ success: boolean; url: string; error?: string }> {
    const base64Image = typeof base64OrOptions === "string" ? base64OrOptions : base64OrOptions.base64;
    const folder =
      typeof base64OrOptions === "object" && base64OrOptions.folder
        ? (base64OrOptions.folder as any)
        : defaultFolder;

    try {
      const res = await fetchWithTimeout(`${API_BASE}/upload`, {
        method: "POST",
        body: JSON.stringify({ image: base64Image, folder }),
      });
      if (res.ok) {
        const data = await res.json();
        const fullUrl = data.url.startsWith("http") ? data.url : `${API_HOST}${data.url}`;
        return { success: true, url: fullUrl };
      }
    } catch {
      // Offline fallback: se servidor não estiver rodando, a imagem base64 é válida no RN
    }

    // Se estiver offline ou servidor inativo, retorna a própria imagem base64 diretamente
    return {
      success: true,
      url: base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`,
    };
  },

  // ====================================================================
  // ENTREGADORES / MOTOBOYS (DASHBOARD, DISPONIBILIDADE E CORRIDAS)
  // ====================================================================
  async getCourierProfile(userId: string): Promise<CourierProfile | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/couriers/${encodeURIComponent(userId)}`);
      if (res.ok) return await res.json();
    } catch {
      // Offline
    }

    const saved = await storageGet<CourierProfile | null>(STORAGE_KEYS.COURIER_PROFILE, null);
    if (saved && (saved.userId === userId || saved.id === userId)) return saved;

    // Entregador demo padrão
    return {
      id: "c-policarpo",
      userId,
      name: "Policarpo de Sousa",
      phone: "(98) 98765-4321",
      vehicle: "Honda CG 160 Fan",
      vehicleType: "moto",
      plate: "NXR-2026",
      mode: "independent",
      status: "online",
      rating: 4.9,
      isActive: true,
      isOnline: true,
      totalDeliveries: 48,
      completedDeliveries: 4,
      totalEarnings: 384.0,
      todayEarnings: 32.5,
    };
  },

  async setCourierStatus(
    courierId: string,
    statusOrIsOnline: boolean | "online" | "offline"
  ): Promise<CourierProfile> {
    const isOnline = typeof statusOrIsOnline === "boolean" ? statusOrIsOnline : statusOrIsOnline === "online";
    const status = isOnline ? "online" : "offline";

    let profile = await storageGet<CourierProfile | null>(STORAGE_KEYS.COURIER_PROFILE, null);
    if (profile) {
      profile = { ...profile, isOnline, status };
      await storageSet(STORAGE_KEYS.COURIER_PROFILE, profile);
    } else {
      profile = {
        id: courierId,
        userId: courierId,
        name: "Entregador",
        phone: "",
        vehicle: "Moto",
        vehicleType: "moto",
        mode: "independent",
        status,
        rating: 5.0,
        isActive: true,
        isOnline,
        totalDeliveries: 0,
        completedDeliveries: 0,
        totalEarnings: 0,
        todayEarnings: 0,
      };
      await storageSet(STORAGE_KEYS.COURIER_PROFILE, profile);
    }
    sendInBackground(`/couriers/${encodeURIComponent(courierId)}/status`, "PATCH", { isOnline, status });
    return profile;
  },

  async getAvailableDeliveries(cityId?: string): Promise<Order[]> {
    try {
      const url = cityId
        ? `${API_BASE}/couriers/any/available-orders?cityId=${encodeURIComponent(cityId)}`
        : `${API_BASE}/couriers/any/available-orders`;
      const res = await fetchWithTimeout(url);
      if (res.ok) return await res.json();
    } catch {
      // Offline
    }

    const storeOrders = await storageGet<Order[]>(STORAGE_KEYS.STORE_ORDERS, []);
    return storeOrders.filter(
      (o) =>
        o.status === "preparing" ||
        o.status === "ready" ||
        (o.status === "placed" && !o.courierName)
    );
  },

  async acceptDelivery(
    orderId: string,
    courierId: string,
    courierName = "Entregador Parceiro"
  ): Promise<Order> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/orders/${encodeURIComponent(orderId)}/accept-delivery`, {
        method: "POST",
        body: JSON.stringify({ courierId, courierName }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Offline
    }

    // Atualização local
    const storeOrders = await storageGet<Order[]>(STORAGE_KEYS.STORE_ORDERS, []);
    const updated = storeOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            courierId,
            courierName,
            status: "on_the_way" as OrderStatus,
          }
        : o
    );
    await storageSet(STORAGE_KEYS.STORE_ORDERS, updated);

    // Registra na lista de corridas do entregador
    const courierOrders = await storageGet<Order[]>(STORAGE_KEYS.COURIER_ORDERS, []);
    const active = updated.find((o) => o.id === orderId);
    if (active) {
      await storageSet(STORAGE_KEYS.COURIER_ORDERS, [active, ...courierOrders.filter((o) => o.id !== orderId)]);
    }

    return active || storeOrders[0];
  },

  async completeDelivery(orderId: string, courierIdOrFee: string | number = 6.0): Promise<void> {
    const courierFee = typeof courierIdOrFee === "number" ? courierIdOrFee : 6.0;
    try {
      await fetchWithTimeout(`${API_BASE}/orders/${encodeURIComponent(orderId)}/complete-delivery`, {
        method: "PATCH",
        body: JSON.stringify({ courierFee }),
      });
    } catch {
      // Offline
    }

    // Atualiza status localmente
    const storeOrders = await storageGet<Order[]>(STORAGE_KEYS.STORE_ORDERS, []);
    await storageSet(
      STORAGE_KEYS.STORE_ORDERS,
      storeOrders.map((o) => (o.id === orderId ? { ...o, status: "delivered" as OrderStatus } : o))
    );

    // Atualiza saldo do entregador
    const profile = await storageGet<CourierProfile | null>(STORAGE_KEYS.COURIER_PROFILE, null);
    if (profile) {
      await storageSet(STORAGE_KEYS.COURIER_PROFILE, {
        ...profile,
        totalDeliveries: profile.totalDeliveries + 1,
        completedDeliveries: (profile.completedDeliveries ?? 0) + 1,
        totalEarnings: profile.totalEarnings + courierFee,
        todayEarnings: (profile.todayEarnings ?? 0) + courierFee,
      });
    }
  },
};

