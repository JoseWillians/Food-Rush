export type Restaurant = {
  id: string;
  name: string;
  image: string;
  category: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  favorite?: boolean;
  isOpen?: boolean; // false = loja fechada (não aceita pedidos)
  cityId?: string;
  cityName?: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  deliveryMode?: "own_courier" | "independent_couriers" | "both";
};

export type Product = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  category: string;
};

export type Review = {
  id: string;
  restaurantId: string; // loja que recebeu a avaliação
  orderId?: string; // pedido avaliado (só nas avaliações feitas pelo app)
  userName: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
};

export type OrderStatus =
  | "placed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "on_the_way"
  | "arriving"
  | "delivered"
  | "cancelled";

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  note?: string; // observação do cliente, ex.: "sem cebola"
};

export type PaymentMethod = "pix" | "credit" | "debit" | "cash";

export type Order = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  status: OrderStatus;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  courierId?: string;
  courierName?: string;
  courierRating?: number;
  estimatedTime?: string;
  reviewed?: boolean; // true depois que o cliente avalia o pedido
  customerId?: string; // quem fez o pedido (usado no painel do empreendedor)
  customerName?: string;
  bairroId?: string;
  bairroName?: string;
  deliveryMode?: "own_courier" | "independent_courier" | "independent_couriers";
  courierFee?: number;
  storeEarning?: number;
  courierRequested?: boolean;
  storeCourierId?: string;
  vehicle?: string;
};

export type UserAddress = {
  id: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  isDefault?: boolean;
};

export type SavedPaymentMethod = {
  id: string;
  type: "credit" | "debit" | "pix";
  title: string;
  details: string;
  isDefault?: boolean;
};

export type NotificationPreferences = {
  orderUpdates: boolean;
  promotions: boolean;
  whatsappUpdates: boolean;
};

export type UserRole = "customer" | "partner" | "courier" | "admin";

export type CourierMode = "independent" | "store_partner";
export type VehicleType = "moto" | "bicicleta" | "carro";

export type City = {
  id: string;
  estadoId: string;
  name: string;
  ibgeCode?: string;
  isActive: boolean;
};

export type Neighborhood = {
  id: string;
  cidadeId: string;
  name: string;
  zone?: string;
};

export type StoreDeliveryRate = {
  id: string;
  restaurantId: string;
  bairroId: string;
  neighborhoodId?: string;
  bairroName?: string;
  deliveryFee: number;
  rate?: number;
  estimatedTime?: string;
  isActive?: boolean;
};

export type CourierRateConfig = {
  cityId: string;
  baseFee: number;
  extraPerZone: number;
  courierPayoutPct: number;
  platformFeePct: number;
};

export type CourierProfile = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicle: string;
  vehicleType?: VehicleType;
  plate?: string;
  mode: CourierMode;
  status?: "online" | "offline" | "busy";
  storeId?: string;
  storeName?: string;
  rating: number;
  isActive: boolean;
  isOnline: boolean;
  totalDeliveries: number;
  completedDeliveries?: number;
  totalEarnings: number;
  todayEarnings?: number;
};

export type PartnerStore = {
  id: string;
  name: string;
  category: string;
  image?: string;
  deliveryTime?: string;
  deliveryFee?: number;
  address?: string;
  phone?: string;
  isOpen?: boolean;
  cityId?: string;
  cityName?: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  deliveryMode?: "own_courier" | "independent_couriers" | "both";
};

export type User = {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  address?: string;
  role?: UserRole;
  store?: PartnerStore;
  courier?: CourierProfile;
  courierProfile?: CourierProfile;
  vehicleType?: VehicleType;
  vehiclePlate?: string;
  courierMode?: CourierMode;
  cityId?: string;
  cityName?: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  addresses?: UserAddress[];
  savedPaymentMethods?: SavedPaymentMethod[];
  notifications?: NotificationPreferences;
};

// Dados enviados ao cadastrar uma loja de empreendedor
export type PartnerRegistration = {
  id?: string;
  storeName: string;
  category: string;
  deliveryTime?: string;
  deliveryFee?: number;
  address?: string;
  phone?: string;
  image?: string;
  ownerName?: string;
  ownerEmail?: string;
  cityId?: string;
  cityName?: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  deliveryMode?: string;
};

// Dados de um prato novo enviados pelo empreendedor
export type NewProductInput = {
  name: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

/**
 * Motoboy / Entregador próprio vinculado diretamente a uma loja parceira
 */
export type StoreCourier = {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  vehicle: string;
  vehicleType: "moto" | "bicicleta" | "carro";
  plate?: string;
  isActive: boolean;
  createdAt?: string;
};


