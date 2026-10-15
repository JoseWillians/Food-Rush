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
  userName: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
};

export type OrderStatus =
  | "placed"
  | "preparing"
  | "out_for_delivery"
  | "arriving"
  | "delivered";

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
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
  courierName?: string;
  courierRating?: number;
  estimatedTime?: string;
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

export type UserRole = "customer" | "partner";

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
  addresses?: UserAddress[];
  savedPaymentMethods?: SavedPaymentMethod[];
  notifications?: NotificationPreferences;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

