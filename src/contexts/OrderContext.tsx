import React, { createContext, useContext, useEffect, useState } from "react";
import { CartItem, Order, OrderStatus, PaymentMethod } from "@/src/types";
import { mockOrders } from "@/src/mocks/orders";
import { STORAGE_KEYS, storageGet, storageSet } from "@/src/utils/storage";
import { api } from "@/src/services/api";
import { useAuth } from "@/src/contexts/AuthContext";

type CreateOrderInput = {
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
};

type OrderContextData = {
  orders: Order[];
  activeOrder: Order | null;
  createOrder: (input: CreateOrderInput) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  setActiveOrder: (order: Order | null) => void;
};

const OrderContext = createContext<OrderContextData>({} as OrderContextData);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const getStorageKey = () => {
    return user?.id ? `${STORAGE_KEYS.ORDERS}_${user.id}` : STORAGE_KEYS.ORDERS;
  };

  useEffect(() => {
    async function loadOrders() {
      // Se não há usuário logado, zera o estado
      if (!user) {
        setOrders([]);
        setActiveOrder(null);
        return;
      }

      const key = `${STORAGE_KEYS.ORDERS}_${user.id}`;
      const stored = await storageGet<Order[] | null>(key, null);

      if (stored !== null) {
        setOrders(stored);
        const inProgress = stored.find((o) => o.status !== "delivered");
        setActiveOrder(inProgress || null);
      } else {
        // Se for o usuário demo padrão inicial (u-1), oferece os mocks
        if (user.id === "u-1") {
          setOrders(mockOrders);
          const inProgress = mockOrders.find((o) => o.status !== "delivered");
          setActiveOrder(inProgress || null);
          await storageSet(key, mockOrders);
        } else {
          // Novo cliente / novo usuário: abre 100% ZERADO (sem pedidos em andamento ou histórico)
          setOrders([]);
          setActiveOrder(null);
          await storageSet(key, []);
        }
      }
    }

    loadOrders();
  }, [user?.id]);

  const createOrder = (input: CreateOrderInput): Order => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} às ${now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      restaurantImage: input.restaurantImage,
      items: input.items,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.total,
      createdAt: formattedDate,
      status: "out_for_delivery",
      deliveryAddress: input.deliveryAddress,
      paymentMethod: input.paymentMethod,
      courierName: "Policarpo de Sousa",
      courierRating: 4.9,
      estimatedTime: "20-30 min",
    };

    const key = getStorageKey();

    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      storageSet(key, updated);
      return updated;
    });

    setActiveOrder(newOrder);

    // Sincroniza em background com o mock server (se ativo) sem travar a UI
    api.createOrder(newOrder).catch(() => {});

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const key = getStorageKey();

    setOrders((prev) => {
      const updated = prev.map((ord) =>
        ord.id === orderId ? { ...ord, status } : ord
      );
      storageSet(key, updated);
      return updated;
    });

    setActiveOrder((prev) =>
      prev && prev.id === orderId ? { ...prev, status } : prev
    );

    // Sincroniza status em background com o mock server
    api.updateOrderStatus(orderId, status).catch(() => {});
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeOrder,
        createOrder,
        updateOrderStatus,
        setActiveOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders(): OrderContextData {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders deve ser utilizado dentro de um OrderProvider");
  }
  return context;
}

